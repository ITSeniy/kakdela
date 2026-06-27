// Общий слой шифрования-at-rest для device-bound секретов (T-101/T-102).
//
// Один DEK (data encryption key) запечатывает И крипто-стор сессий libsignal
// (crypto/store.rs), И локальную историю секретных чатов (store/local_db.rs) —
// это одно «секретное хранилище устройства», лежащее в `<app_data>/kd-secret/`.
//
// DEK добывается через `KeyProvider`. Сейчас единственная реализация —
// `SoftwareKeyProvider` (ключ файлом рядом со стором, программный уровень, как
// `lib/host/secrets.ts`). Аппаратное запечатывание DEK через Android Keystore
// подменяет ТОЛЬКО `KeyProvider`, не трогая формат файлов и крипто-ядро.
//
// Формат запечатанного файла: [12 байт nonce][AES-256-GCM ciphertext+tag].

use std::fs;
use std::path::{Path, PathBuf};

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use rand::{rngs::OsRng, RngCore, TryRngCore};

use crate::error::CmdError;

/// Инфолибельный CSPRNG из rand 0.9 (как делает сам libsignal внутри).
pub fn os_rng() -> impl RngCore + rand::CryptoRng {
    OsRng.unwrap_err()
}

/// Каталог секретных данных устройства. Создаётся при первом обращении.
pub fn data_dir(app_data_dir: &Path) -> Result<PathBuf, CmdError> {
    let dir = app_data_dir.join("kd-secret");
    fs::create_dir_all(&dir)
        .map_err(|e| CmdError::internal("dir-create", &format!("cannot create store dir: {e}")))?;
    Ok(dir)
}

/// Источник 32-байтного DEK. На Android должен быть ключ, запечатанный Keystore
/// (StrongBox если доступен). `Send + Sync` — провайдер живёт в managed-state.
pub trait KeyProvider: Send + Sync {
    fn data_key(&self) -> Result<[u8; 32], CmdError>;
}

/// СОФТВАРНЫЙ провайдер: DEK лежит файлом `dek.bin` в каталоге секретов. Это
/// dev/desktop-уровень (секретные чаты — мобайл-онли). Без Keystore at-rest
/// защищает лишь от «прочитал файл», не от рутового доступа.
pub struct SoftwareKeyProvider {
    path: PathBuf,
}

impl SoftwareKeyProvider {
    pub fn new(dir: &Path) -> Self {
        Self {
            path: dir.join("dek.bin"),
        }
    }
}

impl KeyProvider for SoftwareKeyProvider {
    fn data_key(&self) -> Result<[u8; 32], CmdError> {
        if let Ok(b) = fs::read(&self.path) {
            if b.len() == 32 {
                let mut k = [0u8; 32];
                k.copy_from_slice(&b);
                return Ok(k);
            }
        }
        let mut k = [0u8; 32];
        os_rng().fill_bytes(&mut k);
        fs::write(&self.path, k)
            .map_err(|e| CmdError::internal("dek-write", &format!("cannot persist DEK: {e}")))?;
        Ok(k)
    }
}

fn cipher(dek: &[u8; 32]) -> Aes256Gcm {
    Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(dek))
}

/// Запечатать произвольный plaintext: [nonce][ciphertext+tag].
pub fn seal(dek: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, CmdError> {
    let mut nonce = [0u8; 12];
    os_rng().fill_bytes(&mut nonce);
    let ct = cipher(dek)
        .encrypt(Nonce::from_slice(&nonce), plaintext)
        .map_err(|_| CmdError::internal("encrypt", "sealing failed"))?;
    let mut out = Vec::with_capacity(12 + ct.len());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Распечатать [nonce][ciphertext+tag] обратно в plaintext.
pub fn unseal(dek: &[u8; 32], raw: &[u8]) -> Result<Vec<u8>, CmdError> {
    if raw.len() < 12 {
        return Err(CmdError::internal("store-corrupt", "sealed blob truncated"));
    }
    let (nonce, ct) = raw.split_at(12);
    cipher(dek)
        .decrypt(Nonce::from_slice(nonce), ct)
        .map_err(|_| CmdError::internal("decrypt", "unsealing failed"))
}

/// Записать запечатанный снапшот атомарно (tmp + rename). Обрыв на записи иначе
/// оставил бы битый стор и нерасшифровываемую историю/ratchet-состояние.
pub fn write_sealed(
    path: &Path,
    key_provider: &dyn KeyProvider,
    plaintext: &[u8],
) -> Result<(), CmdError> {
    let dek = key_provider.data_key()?;
    let sealed = seal(&dek, plaintext)?;
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, &sealed)
        .map_err(|e| CmdError::internal("store-write", &format!("cannot write store: {e}")))?;
    fs::rename(&tmp, path)
        .map_err(|e| CmdError::internal("store-rename", &format!("cannot commit store: {e}")))?;
    Ok(())
}

/// Прочитать и распечатать снапшот. None — если файла ещё нет.
pub fn read_sealed(
    path: &Path,
    key_provider: &dyn KeyProvider,
) -> Result<Option<Vec<u8>>, CmdError> {
    let raw = match fs::read(path) {
        Ok(b) => b,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => {
            return Err(CmdError::internal("store-read", &format!("cannot read store: {e}")))
        }
    };
    let dek = key_provider.data_key()?;
    Ok(Some(unseal(&dek, &raw)?))
}
