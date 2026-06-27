// Единый тип ошибки, отдаваемый из tauri-команд в JS. Формат `{ code, message }`
// совпадает с REST-ошибками проекта ({ error: { code, message } } разворачивается
// на клиенте). ВАЖНО (CONVENTIONS, security): сюда НЕ кладётся секретный материал —
// только код и человекочитаемое описание типа ошибки, без байтов ключей/плейнтекста.

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CmdError {
    pub code: String,
    pub message: String,
}

impl CmdError {
    pub fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
        }
    }

    /// Внутренняя/инфраструктурная ошибка (I/O, шифрование стора).
    pub fn internal(code: &str, message: &str) -> Self {
        Self::new(code, message)
    }
}

impl From<libsignal_protocol::SignalProtocolError> for CmdError {
    fn from(e: libsignal_protocol::SignalProtocolError) -> Self {
        use libsignal_protocol::SignalProtocolError;
        // Смена identity-ключа собеседника (переустановка приложения) — это
        // СИГНАЛ БЕЗОПАСНОСТИ, а не рядовая ошибка: UI должен показать «ключ
        // изменился» и заблокировать отправку. Выделяем отдельным кодом.
        match e {
            SignalProtocolError::UntrustedIdentity(_) => {
                CmdError::new("untrusted-identity", "peer identity key changed")
            }
            // e.to_string() описывает ТИП ошибки протокола, а не байты ключей.
            other => CmdError::new("crypto-failure", &other.to_string()),
        }
    }
}
