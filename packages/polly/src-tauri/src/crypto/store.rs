// T-101 — зашифрованный локальный стор крипто-состояния (device-bound).
//
// Здесь живут четыре стора libsignal (Identity / Session / PreKey / SignedPreKey)
// + Kyber-стор (PQXDH в v0.96.4). РЕАЛИЗАЦИЯ САМИХ СТОРОВ — тонкая обёртка над
// libsignal: мы НЕ пишем крипту, только держим сериализованные записи самого
// libsignal (record.serialize()) в map'ах, которыми владеем, чтобы уметь
// снять весь снапшот целиком и зашифровать его на диск.
//
// Почему не InMemSignalProtocolStore: он не даёт перечислить сессии/identity —
// снапшот целиком снять нельзя. Поэтому держим байты сами.
//
// At-rest: весь снапшот (serde_json) шифруется AES-256-GCM ключом DEK. DEK —
// маленький секрет, который ДОЛЖЕН запечатываться железом (Android Keystore).
// Здесь — seam `KeyProvider`; пока единственная реализация софтварная (см.
// SoftwareKeyProvider) — это тот же уровень, что at-rest стор токена в
// lib/host/secrets.ts. Аппаратное запечатывание DEK Keystore'ом — оставшийся
// нативный шаг (Kotlin-плагин), он подменяет ТОЛЬКО KeyProvider, не трогая
// крипто-ядро.

use std::collections::HashMap;
use std::path::Path;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use libsignal_protocol::{
    Direction, GenericSignedPreKey, IdentityChange, IdentityKey, IdentityKeyPair, KyberPreKeyId,
    KyberPreKeyRecord, PreKeyId, PreKeyRecord, ProtocolAddress, PublicKey, SessionRecord,
    SignalProtocolError, SignedPreKeyId, SignedPreKeyRecord,
};
use libsignal_protocol::{IdentityKeyStore, KyberPreKeyStore, PreKeyStore, SessionStore, SignedPreKeyStore};

use crate::error::CmdError;
use crate::sealed::{self, KeyProvider};

// ───────── helpers ─────────

/// Стабильный строковый ключ для (name, device) адреса. UUID не содержит '.',
/// device_id числовой — коллизий нет.
fn addr_key(a: &ProtocolAddress) -> String {
    format!("{}.{}", a.name(), u32::from(a.device_id()))
}

// ───────── сериализуемое крипто-состояние ─────────
//
// Все поля — простые типы (байты/числа/строки), поэтому весь стор сериализуется
// напрямую. Байты записей — это libsignal'овский record.serialize() (protobuf),
// мы их только переносим, не интерпретируем.

#[derive(Serialize, Deserialize)]
pub struct KdIdentityStore {
    /// IdentityKeyPair::serialize() — приватный identity-ключ. НИКОГДА не уезжает
    /// с устройства и не попадает в публичный бандл.
    key_pair: Vec<u8>,
    registration_id: u32,
    /// Наш собственный userId — нужен как local_address и для safety number.
    self_user_id: String,
    /// addr_key -> IdentityKey::serialize() (публичные ключи собеседников, TOFU).
    known: HashMap<String, Vec<u8>>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct KdSessionStore {
    /// addr_key -> SessionRecord::serialize() (состояние Double Ratchet).
    sessions: HashMap<String, Vec<u8>>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct KdPreKeyStore {
    /// keyId -> PreKeyRecord::serialize() (одноразовые prekey'и, с приватной частью).
    keys: HashMap<u32, Vec<u8>>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct KdSignedPreKeyStore {
    keys: HashMap<u32, Vec<u8>>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct KdKyberPreKeyStore {
    keys: HashMap<u32, Vec<u8>>,
    /// Защита от повторного использования base-ключа с last-resort kyber prekey
    /// (см. KyberPreKeyStore::mark_kyber_pre_key_used в libsignal).
    base_keys_seen: HashMap<String, Vec<Vec<u8>>>,
}

/// Полный снапшот крипто-состояния устройства. Это и есть «источник истины»
/// сессий (device-bound).
#[derive(Serialize, Deserialize)]
pub struct KdProtocolStore {
    pub identity: KdIdentityStore,
    pub sessions: KdSessionStore,
    pub pre_keys: KdPreKeyStore,
    pub signed_pre_keys: KdSignedPreKeyStore,
    pub kyber_pre_keys: KdKyberPreKeyStore,
    /// Монотонный счётчик id одноразовых prekey'ев (уникальность keyId).
    pub next_one_time_id: u32,
    /// id текущего signed/kyber prekey (генерируются один раз при первом publish).
    pub signed_prekey_id: Option<u32>,
    pub kyber_prekey_id: Option<u32>,
}

impl KdProtocolStore {
    pub fn new(key_pair: &IdentityKeyPair, registration_id: u32, self_user_id: String) -> Self {
        Self {
            identity: KdIdentityStore {
                key_pair: key_pair.serialize().to_vec(),
                registration_id,
                self_user_id,
                known: HashMap::new(),
            },
            sessions: KdSessionStore::default(),
            pre_keys: KdPreKeyStore::default(),
            signed_pre_keys: KdSignedPreKeyStore::default(),
            kyber_pre_keys: KdKyberPreKeyStore::default(),
            next_one_time_id: 1,
            signed_prekey_id: None,
            kyber_prekey_id: None,
        }
    }

    pub fn self_user_id(&self) -> &str {
        &self.identity.self_user_id
    }

    pub fn identity_key_pair(&self) -> Result<IdentityKeyPair, CmdError> {
        IdentityKeyPair::try_from(self.identity.key_pair.as_slice())
            .map_err(|_| CmdError::internal("identity-corrupt", "identity key pair unreadable"))
    }

    pub fn registration_id(&self) -> u32 {
        self.identity.registration_id
    }

    /// Публичный identity-ключ собеседника по userId (для safety number).
    pub fn known_identity(&self, user_id: &str) -> Option<IdentityKey> {
        let key = format!("{}.1", user_id);
        self.identity
            .known
            .get(&key)
            .and_then(|b| IdentityKey::decode(b).ok())
    }

    /// Есть ли установленная сессия с собеседником (device 1).
    pub fn has_session(&self, user_id: &str) -> bool {
        self.sessions.sessions.contains_key(&format!("{user_id}.1"))
    }

    /// Забыть сессию И сохранённый identity-ключ собеседника. Нужно, когда у
    /// собеседника сменился ключ (переустановка): после очистки следующий
    /// `process_bundle` примет новый identity (TOFU заново) и поднимет свежую
    /// сессию. Возвращает true, если что-то удалили.
    pub fn clear_session(&mut self, user_id: &str) -> bool {
        let key = format!("{user_id}.1");
        let had_session = self.sessions.sessions.remove(&key).is_some();
        let had_identity = self.identity.known.remove(&key).is_some();
        had_session || had_identity
    }
}

// ───────── трейты libsignal поверх байтовых map'ов ─────────
//
// КАЖДЫЙ трейт реализован на СВО�ём суб-сторе (отдельное поле KdProtocolStore),
// а не на верхней структуре. Это обязательно: message_encrypt/process_prekey_bundle
// берут &mut session_store И &mut identity_store одновременно — это разные поля,
// поэтому Rust разрешает непересекающиеся заимствования. Реализация на одной
// структуре дала бы двойной &mut. Записи десериализуются на чтение и
// сериализуются на запись — крипту делает libsignal, мы перекладываем байты.

#[async_trait(?Send)]
impl IdentityKeyStore for KdIdentityStore {
    async fn get_identity_key_pair(&self) -> Result<IdentityKeyPair, SignalProtocolError> {
        IdentityKeyPair::try_from(self.key_pair.as_slice())
    }

    async fn get_local_registration_id(&self) -> Result<u32, SignalProtocolError> {
        Ok(self.registration_id)
    }

    async fn save_identity(
        &mut self,
        address: &ProtocolAddress,
        identity: &IdentityKey,
    ) -> Result<IdentityChange, SignalProtocolError> {
        let key = addr_key(address);
        let bytes = identity.serialize().to_vec();
        match self.known.get(&key) {
            Some(existing) if existing.as_slice() == bytes.as_slice() => {
                Ok(IdentityChange::NewOrUnchanged)
            }
            Some(_) => {
                self.known.insert(key, bytes);
                Ok(IdentityChange::ReplacedExisting)
            }
            None => {
                self.known.insert(key, bytes);
                Ok(IdentityChange::NewOrUnchanged)
            }
        }
    }

    async fn is_trusted_identity(
        &self,
        address: &ProtocolAddress,
        identity: &IdentityKey,
        _direction: Direction,
    ) -> Result<bool, SignalProtocolError> {
        match self.known.get(&addr_key(address)) {
            None => Ok(true), // первое использование (TOFU) — как InMem-референс
            Some(existing) => Ok(existing.as_slice() == identity.serialize().as_ref()),
        }
    }

    async fn get_identity(
        &self,
        address: &ProtocolAddress,
    ) -> Result<Option<IdentityKey>, SignalProtocolError> {
        match self.known.get(&addr_key(address)) {
            None => Ok(None),
            Some(b) => Ok(Some(IdentityKey::decode(b)?)),
        }
    }
}

#[async_trait(?Send)]
impl PreKeyStore for KdPreKeyStore {
    async fn get_pre_key(&self, id: PreKeyId) -> Result<PreKeyRecord, SignalProtocolError> {
        let b = self
            .keys
            .get(&u32::from(id))
            .ok_or(SignalProtocolError::InvalidPreKeyId)?;
        PreKeyRecord::deserialize(b)
    }

    async fn save_pre_key(
        &mut self,
        id: PreKeyId,
        record: &PreKeyRecord,
    ) -> Result<(), SignalProtocolError> {
        self.keys.insert(u32::from(id), record.serialize()?);
        Ok(())
    }

    async fn remove_pre_key(&mut self, id: PreKeyId) -> Result<(), SignalProtocolError> {
        // Одноразовый prekey израсходован при установке сессии — удаляем (forward secrecy).
        self.keys.remove(&u32::from(id));
        Ok(())
    }
}

#[async_trait(?Send)]
impl SignedPreKeyStore for KdSignedPreKeyStore {
    async fn get_signed_pre_key(
        &self,
        id: SignedPreKeyId,
    ) -> Result<SignedPreKeyRecord, SignalProtocolError> {
        let b = self
            .keys
            .get(&u32::from(id))
            .ok_or(SignalProtocolError::InvalidSignedPreKeyId)?;
        SignedPreKeyRecord::deserialize(b)
    }

    async fn save_signed_pre_key(
        &mut self,
        id: SignedPreKeyId,
        record: &SignedPreKeyRecord,
    ) -> Result<(), SignalProtocolError> {
        self.keys.insert(u32::from(id), record.serialize()?);
        Ok(())
    }
}

#[async_trait(?Send)]
impl KyberPreKeyStore for KdKyberPreKeyStore {
    async fn get_kyber_pre_key(
        &self,
        id: KyberPreKeyId,
    ) -> Result<KyberPreKeyRecord, SignalProtocolError> {
        let b = self
            .keys
            .get(&u32::from(id))
            .ok_or(SignalProtocolError::InvalidKyberPreKeyId)?;
        KyberPreKeyRecord::deserialize(b)
    }

    async fn save_kyber_pre_key(
        &mut self,
        id: KyberPreKeyId,
        record: &KyberPreKeyRecord,
    ) -> Result<(), SignalProtocolError> {
        self.keys.insert(u32::from(id), record.serialize()?);
        Ok(())
    }

    async fn mark_kyber_pre_key_used(
        &mut self,
        kyber_prekey_id: KyberPreKeyId,
        ec_prekey_id: SignedPreKeyId,
        base_key: &PublicKey,
    ) -> Result<(), SignalProtocolError> {
        // last-resort kyber prekey НЕ удаляется, но один и тот же base-ключ нельзя
        // принять дважды (защита от replay при установке сессии).
        let map_key = format!("{}.{}", u32::from(kyber_prekey_id), u32::from(ec_prekey_id));
        let seen = self.base_keys_seen.entry(map_key).or_default();
        let bk = base_key.serialize().to_vec();
        if seen.iter().any(|s| s.as_slice() == bk.as_slice()) {
            return Err(SignalProtocolError::InvalidMessage(
                libsignal_protocol::CiphertextMessageType::PreKey,
                "reused base key".to_owned(),
            ));
        }
        seen.push(bk);
        Ok(())
    }
}

#[async_trait(?Send)]
impl SessionStore for KdSessionStore {
    async fn load_session(
        &self,
        address: &ProtocolAddress,
    ) -> Result<Option<SessionRecord>, SignalProtocolError> {
        match self.sessions.get(&addr_key(address)) {
            None => Ok(None),
            Some(b) => Ok(Some(SessionRecord::deserialize(b)?)),
        }
    }

    async fn store_session(
        &mut self,
        address: &ProtocolAddress,
        record: &SessionRecord,
    ) -> Result<(), SignalProtocolError> {
        self.sessions
            .insert(addr_key(address), record.serialize()?);
        Ok(())
    }
}

// ───────── persist / load (AES-256-GCM at-rest, через crate::sealed) ─────────

const STORE_FILE: &str = "secret-store.bin";

/// Зашифровать (serde_json + AES-256-GCM) и атомарно записать снапшот.
pub fn persist(
    dir: &Path,
    key_provider: &dyn KeyProvider,
    store: &KdProtocolStore,
) -> Result<(), CmdError> {
    let plaintext = serde_json::to_vec(store)
        .map_err(|e| CmdError::internal("serialize", &format!("snapshot serialize: {e}")))?;
    sealed::write_sealed(&dir.join(STORE_FILE), key_provider, &plaintext)
}

/// Прочитать и расшифровать снапшот. None — если файла ещё нет (не инициализировано).
pub fn load(
    dir: &Path,
    key_provider: &dyn KeyProvider,
) -> Result<Option<KdProtocolStore>, CmdError> {
    match sealed::read_sealed(&dir.join(STORE_FILE), key_provider)? {
        None => Ok(None),
        Some(plaintext) => {
            let store = serde_json::from_slice(&plaintext)
                .map_err(|e| CmdError::internal("deserialize", &format!("snapshot deserialize: {e}")))?;
            Ok(Some(store))
        }
    }
}
