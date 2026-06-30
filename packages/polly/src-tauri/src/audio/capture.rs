// T-094 Stage A + B — WASAPI loopback-захват системного звука → 16-бит PCM WAV.
//
//   • Stage A (record_loopback): ВЕСЬ системный звук с default render endpoint
//     (синхронная активация IMMDevice::Activate, polling-цикл).
//   • Stage B (record_process_loopback): звук ОДНОГО процесса (и его дерева),
//     по-дискордовски, через ActivateAudioInterfaceAsync + process-loopback
//     PROPVARIANT (event-driven цикл).
//
// Общая часть (разбор формата, конверсия в i16, дренаж пакетов, запись WAV) —
// переиспользуется. Это verification-артефакт (WAV); мост в LiveKit — Stage C.
// Компилируется только на Windows (см. `#[cfg(windows)]` в mod.rs).

use std::fs::File;
use std::io::{Seek, SeekFrom, Write};
use std::mem::size_of;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use windows::core::{implement, Interface, GUID, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, HANDLE, WAIT_OBJECT_0};
use windows::Win32::Media::Audio::{
    eConsole, eRender, ActivateAudioInterfaceAsync, IActivateAudioInterfaceAsyncOperation,
    IActivateAudioInterfaceCompletionHandler, IActivateAudioInterfaceCompletionHandler_Impl,
    IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator,
    AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM, AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
    AUDCLNT_STREAMFLAGS_LOOPBACK, AUDIOCLIENT_ACTIVATION_PARAMS,
    AUDIOCLIENT_ACTIVATION_PARAMS_0, AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
    AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS, PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE,
    VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK, WAVEFORMATEX, WAVEFORMATEXTENSIBLE,
};
use windows::Win32::System::Com::StructuredStorage::PROPVARIANT;
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, BLOB, CLSCTX_ALL, COINIT_MULTITHREADED,
};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Threading::{CreateEventW, SetEvent, WaitForSingleObject};
use windows::Win32::System::Variant::VT_BLOB;

/// AUDCLNT_BUFFERFLAGS_SILENT — данные пакета считать тишиной. Берём литералом,
/// чтобы не зависеть от типа константы в конкретной версии windows-crate.
const BUFFERFLAGS_SILENT: u32 = 0x2;

/// Формат, который запрашиваем для process-loopback (там своего endpoint-микса
/// нет, формат задаём сами). 48 кГц/16 бит/стерео + AUTOCONVERTPCM — движок сам
/// приведёт любой источник к этому. 48к — то, что дальше нужно Opus (Stage C).
const PROC_SAMPLE_RATE: u32 = 48_000;
const PROC_CHANNELS: u16 = 2;
const PROC_BITS: u16 = 16;

/// Итог записи — путь к WAV + параметры потока (отдаётся в JS).
pub struct CaptureSummary {
    pub path: PathBuf,
    pub sample_rate: u32,
    pub channels: u16,
    pub frames: u64,
    pub bytes: u64,
}

/// Процесс для пикера (PID + имя exe).
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
}

#[derive(Clone, Copy)]
enum SampleKind {
    Float,
    Int,
}

/// Разобранный формат потока (что отдаёт GetMixFormat / что мы задали сами).
struct SrcFormat {
    kind: SampleKind,
    bits: u16,
    channels: u16,
    sample_rate: u32,
    block_align: u16,
}

/// CoUninitialize при выходе из функции (в т.ч. по `?`).
struct ComGuard;
impl Drop for ComGuard {
    fn drop(&mut self) {
        unsafe { CoUninitialize() };
    }
}

/// CloseHandle при выходе (event-хэндлы, снапшоты).
struct HandleGuard(HANDLE);
impl Drop for HandleGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.0);
        }
    }
}

// ───────────────────────── Stage A: весь системный звук ─────────────────────

/// Записывает `seconds` секунд ВСЕГО системного звука в `path` (16-бит PCM WAV).
pub fn record_loopback(seconds: u32, path: PathBuf) -> Result<CaptureSummary, String> {
    unsafe { record_loopback_inner(seconds, path) }
}

unsafe fn record_loopback_inner(seconds: u32, path: PathBuf) -> Result<CaptureSummary, String> {
    CoInitializeEx(None, COINIT_MULTITHREADED)
        .ok()
        .map_err(|e| format!("CoInitializeEx: {e}"))?;
    let _com = ComGuard;

    let enumerator: IMMDeviceEnumerator =
        CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
    // Loopback читаем С ВЫХОДНОГО устройства (eRender) — это «весь звук, что
    // играет на колонках/в наушниках».
    let device = enumerator
        .GetDefaultAudioEndpoint(eRender, eConsole)
        .map_err(|e| e.to_string())?;
    let client: IAudioClient = device.Activate(CLSCTX_ALL, None).map_err(|e| e.to_string())?;

    let pwfx = client.GetMixFormat().map_err(|e| e.to_string())?;
    if pwfx.is_null() {
        return Err("GetMixFormat returned null".into());
    }
    let fmt = classify_format(pwfx)?;

    client
        .Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK,
            10_000_000, // буфер 1 с (в единицах 100 нс)
            0,
            pwfx,
            None,
        )
        .map_err(|e| e.to_string())?;

    let capture: IAudioCaptureClient = client.GetService().map_err(|e| e.to_string())?;

    let mut wav = WavWriter::create(&path, fmt.channels, fmt.sample_rate)?;
    let mut total_frames: u64 = 0;
    let mut scratch: Vec<i16> = Vec::new();

    client.Start().map_err(|e| e.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(seconds as u64);
    while Instant::now() < deadline {
        // Поллинг ~10 мс: буфер 1 с, переполнения не будет. Событийную модель
        // здесь не берём — для системного loopback при тишине события не приходят.
        std::thread::sleep(Duration::from_millis(10));
        drain_packets(&capture, &fmt, &mut wav, &mut scratch, &mut total_frames)?;
    }
    client.Stop().map_err(|e| e.to_string())?;

    let bytes = wav.finalize()? as u64;
    Ok(CaptureSummary {
        path,
        sample_rate: fmt.sample_rate,
        channels: fmt.channels,
        frames: total_frames,
        bytes,
    })
}

// ──────────────────── Stage B: звук одного процесса (дерева) ────────────────

/// Хэндлер завершения асинхронной активации: сигналит event, который ждёт
/// вызывающий поток. Сам результат забираем через GetActivateResult на op.
#[implement(IActivateAudioInterfaceCompletionHandler)]
struct ActivationHandler {
    done: HANDLE,
}

impl IActivateAudioInterfaceCompletionHandler_Impl for ActivationHandler_Impl {
    fn ActivateCompleted(
        &self,
        _operation: windows::core::Ref<'_, IActivateAudioInterfaceAsyncOperation>,
    ) -> windows::core::Result<()> {
        unsafe {
            let _ = SetEvent(self.done);
        }
        Ok(())
    }
}

/// Записывает `seconds` секунд звука процесса `pid` (и его дочерних) в `path`.
pub fn record_process_loopback(
    pid: u32,
    seconds: u32,
    path: PathBuf,
) -> Result<CaptureSummary, String> {
    unsafe { record_process_loopback_inner(pid, seconds, path) }
}

unsafe fn record_process_loopback_inner(
    pid: u32,
    seconds: u32,
    path: PathBuf,
) -> Result<CaptureSummary, String> {
    CoInitializeEx(None, COINIT_MULTITHREADED)
        .ok()
        .map_err(|e| format!("CoInitializeEx: {e}"))?;
    let _com = ComGuard;

    let client = activate_process_loopback_client(pid)?;

    // Формат задаём сами — у виртуального process-loopback устройства нет
    // endpoint-микса. AUTOCONVERTPCM просит движок привести источник к нему.
    let mut format = WAVEFORMATEX {
        wFormatTag: 1, // WAVE_FORMAT_PCM
        nChannels: PROC_CHANNELS,
        nSamplesPerSec: PROC_SAMPLE_RATE,
        nAvgBytesPerSec: PROC_SAMPLE_RATE * PROC_CHANNELS as u32 * (PROC_BITS as u32 / 8),
        nBlockAlign: PROC_CHANNELS * (PROC_BITS / 8),
        wBitsPerSample: PROC_BITS,
        cbSize: 0,
    };
    let fmt = SrcFormat {
        kind: SampleKind::Int,
        bits: PROC_BITS,
        channels: PROC_CHANNELS,
        sample_rate: PROC_SAMPLE_RATE,
        block_align: format.nBlockAlign,
    };

    // Process loopback в shared-режиме работает event-driven (как в MS-сэмпле
    // ApplicationLoopback). periodicity = 0 (для shared обязательно 0).
    client
        .Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK
                | AUDCLNT_STREAMFLAGS_EVENTCALLBACK
                | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
            2_000_000, // буфер ~200 мс
            0,
            &mut format,
            None,
        )
        .map_err(|e| format!("Initialize(process loopback): {e}"))?;

    let sample_ready = CreateEventW(None, false, false, PCWSTR::null()).map_err(|e| e.to_string())?;
    let _ev_guard = HandleGuard(sample_ready);
    client.SetEventHandle(sample_ready).map_err(|e| e.to_string())?;

    let capture: IAudioCaptureClient = client.GetService().map_err(|e| e.to_string())?;

    let mut wav = WavWriter::create(&path, fmt.channels, fmt.sample_rate)?;
    let mut total_frames: u64 = 0;
    let mut scratch: Vec<i16> = Vec::new();

    client.Start().map_err(|e| e.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(seconds as u64);
    while Instant::now() < deadline {
        // Ждём событие «готов сэмпл» с таймаутом, чтобы выйти по дедлайну даже
        // когда процесс молчит (события не приходят при тишине).
        WaitForSingleObject(sample_ready, 200);
        drain_packets(&capture, &fmt, &mut wav, &mut scratch, &mut total_frames)?;
    }
    client.Stop().map_err(|e| e.to_string())?;

    let bytes = wav.finalize()? as u64;
    Ok(CaptureSummary {
        path,
        sample_rate: fmt.sample_rate,
        channels: fmt.channels,
        frames: total_frames,
        bytes,
    })
}

/// Асинхронно активирует IAudioClient для process-loopback указанного PID
/// (включая дочерние процессы) и блокируется до завершения активации.
unsafe fn activate_process_loopback_client(pid: u32) -> Result<IAudioClient, String> {
    // Параметры активации: захват дерева процессов целевого PID.
    let mut params = AUDIOCLIENT_ACTIVATION_PARAMS {
        ActivationType: AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
        Anonymous: AUDIOCLIENT_ACTIVATION_PARAMS_0 {
            ProcessLoopbackParams: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
                TargetProcessId: pid,
                ProcessLoopbackMode: PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE,
            },
        },
    };

    // Упаковываем параметры в PROPVARIANT как VT_BLOB. КРИТИЧНО: НЕ давать
    // сработать Drop у PROPVARIANT — он зовёт PropVariantClear, который для
    // VT_BLOB делает CoTaskMemFree(pBlobData). А pBlobData указывает на `params`
    // на СТЕКЕ → free() стекового адреса → STATUS_HEAP_CORRUPTION. Оборачиваем в
    // ManuallyDrop: своей heap-памяти этот PROPVARIANT не владеет, «течь» нечему.
    let mut prop = std::mem::ManuallyDrop::new(PROPVARIANT::default());
    {
        let inner = &mut prop.Anonymous.Anonymous;
        inner.vt = VT_BLOB;
        inner.Anonymous.blob = BLOB {
            cbSize: size_of::<AUDIOCLIENT_ACTIVATION_PARAMS>() as u32,
            pBlobData: &mut params as *mut _ as *mut u8,
        };
    }

    let event = CreateEventW(None, false, false, PCWSTR::null()).map_err(|e| e.to_string())?;
    let _guard = HandleGuard(event);

    let handler: IActivateAudioInterfaceCompletionHandler =
        ActivationHandler { done: event }.into();

    let op: IActivateAudioInterfaceAsyncOperation = ActivateAudioInterfaceAsync(
        VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
        &IAudioClient::IID,
        Some(&*prop),
        &handler,
    )
    .map_err(|e| format!("ActivateAudioInterfaceAsync: {e}"))?;

    // Ждём завершения (до 5 с) — handler сигналит event.
    if WaitForSingleObject(event, 5000) != WAIT_OBJECT_0 {
        return Err("activation timed out".into());
    }

    let mut activate_hr = windows::core::HRESULT(0);
    let mut activated: Option<windows::core::IUnknown> = None;
    op.GetActivateResult(&mut activate_hr, &mut activated)
        .map_err(|e| e.to_string())?;
    activate_hr.ok().map_err(|e| format!("activation result: {e}"))?;

    let unknown = activated.ok_or_else(|| "activation returned no interface".to_string())?;
    unknown.cast::<IAudioClient>().map_err(|e| e.to_string())
}

/// Список процессов (PID + имя exe) для пикера. Возвращает все процессы; фильтр
/// «только звучащие» — возможное улучшение (B2, через IAudioSessionManager2).
pub fn list_processes() -> Result<Vec<ProcessInfo>, String> {
    unsafe { list_processes_inner() }
}

unsafe fn list_processes_inner() -> Result<Vec<ProcessInfo>, String> {
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0).map_err(|e| e.to_string())?;
    let _guard = HandleGuard(snapshot);

    let mut entry = PROCESSENTRY32W {
        dwSize: size_of::<PROCESSENTRY32W>() as u32,
        ..Default::default()
    };

    let mut out = Vec::new();
    if Process32FirstW(snapshot, &mut entry).is_ok() {
        loop {
            let len = entry
                .szExeFile
                .iter()
                .position(|&c| c == 0)
                .unwrap_or(entry.szExeFile.len());
            let name = String::from_utf16_lossy(&entry.szExeFile[..len]);
            if entry.th32ProcessID != 0 {
                out.push(ProcessInfo {
                    pid: entry.th32ProcessID,
                    name,
                });
            }
            if Process32NextW(snapshot, &mut entry).is_err() {
                break;
            }
        }
    }
    Ok(out)
}

// ───────── Stage C, шаг 1: непрерывный стрим PCM (мост в LiveKit) ─────────

/// Фиксированный формат стрима: 48к/16/стерео — один для system и process
/// (через AUTOCONVERTPCM движок сам приводит источник к нему). JS знает формат
/// заранее, ресемплинг не нужен (48к — то, что хочет Opus/WebRTC в Stage C).
fn stream_format() -> (WAVEFORMATEX, SrcFormat) {
    let block_align = PROC_CHANNELS * (PROC_BITS / 8);
    let wfx = WAVEFORMATEX {
        wFormatTag: 1, // WAVE_FORMAT_PCM
        nChannels: PROC_CHANNELS,
        nSamplesPerSec: PROC_SAMPLE_RATE,
        nAvgBytesPerSec: PROC_SAMPLE_RATE * PROC_CHANNELS as u32 * (PROC_BITS as u32 / 8),
        nBlockAlign: block_align,
        wBitsPerSample: PROC_BITS,
        cbSize: 0,
    };
    let fmt = SrcFormat {
        kind: SampleKind::Int,
        bits: PROC_BITS,
        channels: PROC_CHANNELS,
        sample_rate: PROC_SAMPLE_RATE,
        block_align,
    };
    (wfx, fmt)
}

/// Непрерывный стрим PCM (48к/16/стерео) до выставления `stop`. На каждый дренаж
/// зовёт `sink` с интерливленными i16-сэмплами. pid=None → весь системный звук,
/// Some → конкретный процесс (и дерево). Не пишет WAV — это транспорт в LiveKit.
pub fn stream_capture(
    pid: Option<u32>,
    stop: Arc<AtomicBool>,
    sink: impl FnMut(&[i16]) -> Result<(), String>,
) -> Result<(), String> {
    unsafe { stream_capture_inner(pid, stop, sink) }
}

unsafe fn stream_capture_inner(
    pid: Option<u32>,
    stop: Arc<AtomicBool>,
    mut sink: impl FnMut(&[i16]) -> Result<(), String>,
) -> Result<(), String> {
    CoInitializeEx(None, COINIT_MULTITHREADED)
        .ok()
        .map_err(|e| format!("CoInitializeEx: {e}"))?;
    let _com = ComGuard;

    let (wfx, fmt) = stream_format();
    let mut scratch: Vec<i16> = Vec::new();

    match pid {
        None => {
            // Весь системный звук: endpoint loopback + AUTOCONVERTPCM (приводим к
            // фикс-формату), polling-цикл (как в Stage A).
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
            let device = enumerator
                .GetDefaultAudioEndpoint(eRender, eConsole)
                .map_err(|e| e.to_string())?;
            let client: IAudioClient = device.Activate(CLSCTX_ALL, None).map_err(|e| e.to_string())?;
            client
                .Initialize(
                    AUDCLNT_SHAREMODE_SHARED,
                    AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
                    2_000_000,
                    0,
                    &wfx,
                    None,
                )
                .map_err(|e| format!("Initialize(system stream): {e}"))?;
            let capture: IAudioCaptureClient = client.GetService().map_err(|e| e.to_string())?;
            client.Start().map_err(|e| e.to_string())?;
            while !stop.load(Ordering::Relaxed) {
                std::thread::sleep(Duration::from_millis(10));
                drain_to_sink(&capture, &fmt, &mut scratch, &mut sink)?;
            }
            client.Stop().map_err(|e| e.to_string())?;
        }
        Some(pid) => {
            // Процесс: async-активация (как в Stage B) + event-driven цикл.
            let client = activate_process_loopback_client(pid)?;
            client
                .Initialize(
                    AUDCLNT_SHAREMODE_SHARED,
                    AUDCLNT_STREAMFLAGS_LOOPBACK
                        | AUDCLNT_STREAMFLAGS_EVENTCALLBACK
                        | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
                    2_000_000,
                    0,
                    &wfx,
                    None,
                )
                .map_err(|e| format!("Initialize(process stream): {e}"))?;
            let event =
                CreateEventW(None, false, false, PCWSTR::null()).map_err(|e| e.to_string())?;
            let _ev = HandleGuard(event);
            client.SetEventHandle(event).map_err(|e| e.to_string())?;
            let capture: IAudioCaptureClient = client.GetService().map_err(|e| e.to_string())?;
            client.Start().map_err(|e| e.to_string())?;
            while !stop.load(Ordering::Relaxed) {
                WaitForSingleObject(event, 200);
                drain_to_sink(&capture, &fmt, &mut scratch, &mut sink)?;
            }
            client.Stop().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Как drain_packets, но вместо WAV отдаёт сэмплы в callback (стрим).
unsafe fn drain_to_sink(
    capture: &IAudioCaptureClient,
    fmt: &SrcFormat,
    scratch: &mut Vec<i16>,
    sink: &mut impl FnMut(&[i16]) -> Result<(), String>,
) -> Result<(), String> {
    let channels = fmt.channels as usize;
    let block_align = fmt.block_align as usize;
    let bytes_per_sample = (fmt.bits / 8) as usize;
    loop {
        let packet = capture.GetNextPacketSize().map_err(|e| e.to_string())?;
        if packet == 0 {
            break;
        }
        let mut p_data: *mut u8 = std::ptr::null_mut();
        let mut num_frames: u32 = 0;
        let mut flags: u32 = 0;
        capture
            .GetBuffer(&mut p_data, &mut num_frames, &mut flags, None, None)
            .map_err(|e| e.to_string())?;
        let frames = num_frames as usize;
        scratch.clear();
        scratch.reserve(frames * channels);
        if (flags & BUFFERFLAGS_SILENT) != 0 || p_data.is_null() {
            scratch.resize(frames * channels, 0);
        } else {
            let data = std::slice::from_raw_parts(p_data, frames * block_align);
            for f in 0..frames {
                let frame_off = f * block_align;
                for c in 0..channels {
                    let off = frame_off + c * bytes_per_sample;
                    scratch.push(sample_to_i16(&data[off..off + bytes_per_sample], fmt.kind, fmt.bits));
                }
            }
        }
        if !scratch.is_empty() {
            sink(scratch)?;
        }
        capture.ReleaseBuffer(num_frames).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─────────────────────────── общая часть (A и B) ───────────────────────────

/// Вычитывает все доступные сейчас пакеты capture-клиента, конвертит в 16-бит и
/// пишет в WAV. Общая для Stage A (polling) и Stage B (event-driven).
unsafe fn drain_packets(
    capture: &IAudioCaptureClient,
    fmt: &SrcFormat,
    wav: &mut WavWriter,
    scratch: &mut Vec<i16>,
    total_frames: &mut u64,
) -> Result<(), String> {
    let channels = fmt.channels as usize;
    let block_align = fmt.block_align as usize;
    let bytes_per_sample = (fmt.bits / 8) as usize;
    loop {
        let packet = capture.GetNextPacketSize().map_err(|e| e.to_string())?;
        if packet == 0 {
            break;
        }
        let mut p_data: *mut u8 = std::ptr::null_mut();
        let mut num_frames: u32 = 0;
        let mut flags: u32 = 0;
        capture
            .GetBuffer(&mut p_data, &mut num_frames, &mut flags, None, None)
            .map_err(|e| e.to_string())?;

        let frames = num_frames as usize;
        scratch.clear();
        scratch.reserve(frames * channels);
        if (flags & BUFFERFLAGS_SILENT) != 0 || p_data.is_null() {
            scratch.resize(frames * channels, 0);
        } else {
            let data = std::slice::from_raw_parts(p_data, frames * block_align);
            for f in 0..frames {
                let frame_off = f * block_align;
                for c in 0..channels {
                    let off = frame_off + c * bytes_per_sample;
                    scratch.push(sample_to_i16(&data[off..off + bytes_per_sample], fmt.kind, fmt.bits));
                }
            }
        }
        wav.write_i16(scratch)?;
        *total_frames += num_frames as u64;
        capture.ReleaseBuffer(num_frames).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Разбирает WAVEFORMATEX(EXTENSIBLE): float vs int + битность.
unsafe fn classify_format(pwfx: *const WAVEFORMATEX) -> Result<SrcFormat, String> {
    let wfx = &*pwfx;
    // 1 = WAVE_FORMAT_PCM, 3 = WAVE_FORMAT_IEEE_FLOAT, 0xFFFE = EXTENSIBLE.
    let kind = match wfx.wFormatTag {
        1 => SampleKind::Int,
        3 => SampleKind::Float,
        0xFFFE => {
            // WAVEFORMATEXTENSIBLE — #[repr(packed)], поэтому ссылку на поле
            // SubFormat (GUID, выравнивание 4) брать нельзя (UB). Читаем через
            // raw-указатель с read_unaligned в локальную копию.
            let ext = pwfx as *const WAVEFORMATEXTENSIBLE;
            let subformat = std::ptr::addr_of!((*ext).SubFormat).read_unaligned();
            // Фиксированные KSDATAFORMAT_SUBTYPE_* GUID'ы (захардкожены).
            const SUBTYPE_PCM: GUID = GUID::from_u128(0x00000001_0000_0010_8000_00aa00389b71);
            const SUBTYPE_FLOAT: GUID = GUID::from_u128(0x00000003_0000_0010_8000_00aa00389b71);
            if subformat == SUBTYPE_FLOAT {
                SampleKind::Float
            } else if subformat == SUBTYPE_PCM {
                SampleKind::Int
            } else {
                return Err(format!("unsupported extensible subformat {subformat:?}"));
            }
        }
        other => return Err(format!("unsupported wFormatTag {other}")),
    };
    Ok(SrcFormat {
        kind,
        bits: wfx.wBitsPerSample,
        channels: wfx.nChannels,
        sample_rate: wfx.nSamplesPerSec,
        block_align: wfx.nBlockAlign,
    })
}

/// Нормализует один сэмпл к i16 (через f32 в [-1,1]). float32/64 и PCM int 16/24/32.
fn sample_to_i16(bytes: &[u8], kind: SampleKind, bits: u16) -> i16 {
    let norm = match (kind, bits) {
        (SampleKind::Float, 32) => f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]),
        (SampleKind::Float, 64) => f64::from_le_bytes([
            bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
        ]) as f32,
        (SampleKind::Int, 16) => i16::from_le_bytes([bytes[0], bytes[1]]) as f32 / 32_768.0,
        (SampleKind::Int, 24) => {
            let raw = (bytes[0] as i32) | ((bytes[1] as i32) << 8) | ((bytes[2] as i32) << 16);
            let signed = (raw << 8) >> 8; // знаковое расширение 24→32
            signed as f32 / 8_388_608.0
        }
        (SampleKind::Int, 32) => {
            i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) as f32 / 2_147_483_648.0
        }
        _ => 0.0,
    };
    (norm.clamp(-1.0, 1.0) * 32_767.0).round() as i16
}

/// Минимальный потоковый WAV-писатель (16-бит PCM). Заголовок пишется с нулевыми
/// размерами и патчится в finalize (файл seekable).
struct WavWriter {
    file: File,
    data_bytes: u32,
}

impl WavWriter {
    fn create(path: &PathBuf, channels: u16, sample_rate: u32) -> Result<Self, String> {
        let mut file = File::create(path).map_err(|e| e.to_string())?;
        write_wav_header(&mut file, channels, sample_rate, 0).map_err(|e| e.to_string())?;
        Ok(Self { file, data_bytes: 0 })
    }

    fn write_i16(&mut self, samples: &[i16]) -> Result<(), String> {
        let mut buf = Vec::with_capacity(samples.len() * 2);
        for s in samples {
            buf.extend_from_slice(&s.to_le_bytes());
        }
        self.file.write_all(&buf).map_err(|e| e.to_string())?;
        self.data_bytes = self.data_bytes.saturating_add(buf.len() as u32);
        Ok(())
    }

    fn finalize(mut self) -> Result<u32, String> {
        self.file.seek(SeekFrom::Start(4)).map_err(|e| e.to_string())?;
        self.file
            .write_all(&(36 + self.data_bytes).to_le_bytes())
            .map_err(|e| e.to_string())?;
        self.file.seek(SeekFrom::Start(40)).map_err(|e| e.to_string())?;
        self.file
            .write_all(&self.data_bytes.to_le_bytes())
            .map_err(|e| e.to_string())?;
        Ok(self.data_bytes)
    }
}

fn write_wav_header(
    file: &mut File,
    channels: u16,
    sample_rate: u32,
    data_bytes: u32,
) -> std::io::Result<()> {
    let byte_rate = sample_rate * channels as u32 * 2;
    let block_align = channels * 2;
    file.write_all(b"RIFF")?;
    file.write_all(&(36 + data_bytes).to_le_bytes())?;
    file.write_all(b"WAVE")?;
    file.write_all(b"fmt ")?;
    file.write_all(&16u32.to_le_bytes())?;
    file.write_all(&1u16.to_le_bytes())?; // PCM
    file.write_all(&channels.to_le_bytes())?;
    file.write_all(&sample_rate.to_le_bytes())?;
    file.write_all(&byte_rate.to_le_bytes())?;
    file.write_all(&block_align.to_le_bytes())?;
    file.write_all(&16u16.to_le_bytes())?; // bits per sample
    file.write_all(b"data")?;
    file.write_all(&data_bytes.to_le_bytes())?;
    Ok(())
}
