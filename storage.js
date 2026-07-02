// src/storage.js
// ─────────────────────────────────────────────────────────────────────────────
// Firebase Realtime Database を使った複数デバイス間リアルタイム同期
// 設定方法は README.md の STEP 4 を参照
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, off } from "firebase/database";

// ↓↓↓ ここをあなたのFirebaseプロジェクトの値に差し替えてください ↓↓↓
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
// ↑↑↑ ここまで ↑↑↑

let db = null;
let firebaseReady = false;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  firebaseReady = firebaseConfig.apiKey !== "YOUR_API_KEY";
} catch (e) {
  console.warn("Firebase init failed, falling back to localStorage only:", e.message);
}

const PREFIX = "wc26/";

// ── localStorage フォールバック（Firebase未設定時・オフライン時）────────────
function localGet(key) {
  try {
    const raw = localStorage.getItem("wc26local:" + key);
    return raw !== null ? JSON.parse(raw) : null;
  } catch { return null; }
}
function localSet(key, value) {
  try { localStorage.setItem("wc26local:" + key, JSON.stringify(value)); return true; }
  catch { return false; }
}

// 同一デバイス内タブ間のフォールバック同期
let channel = null;
try { channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("wc26_sync") : null; } catch {}
const localListeners = {};
if (channel) {
  channel.onmessage = (e) => {
    const { key, value } = e.data || {};
    if (key && localListeners[key]) localListeners[key].forEach(cb => cb(value));
  };
}

// ── 公開API ──────────────────────────────────────────────────────────────
export function storageGet(key) {
  // 同期APIとして使われている既存コードとの互換のため、
  // Firebase利用時は直近のキャッシュ値を返す（非同期取得は subscribe 側で行う）
  return localGet(key); // キャッシュとして常にlocalStorageにもミラーする
}

export async function storageGetAsync(key) {
  if (firebaseReady && db) {
    try {
      const snap = await get(ref(db, PREFIX + key));
      const val = snap.exists() ? snap.val() : null;
      if (val !== null) localSet(key, val);
      return val;
    } catch (e) {
      console.warn("Firebase get failed, using local cache:", e.message);
      return localGet(key);
    }
  }
  return localGet(key);
}

export function storageSet(key, value) {
  localSet(key, value); // 即時ローカル反映（楽観的更新）
  if (channel) channel.postMessage({ key, value });
  if (localListeners[key]) localListeners[key].forEach(cb => cb(value));

  if (firebaseReady && db) {
    set(ref(db, PREFIX + key), value).catch(e => {
      console.warn("Firebase set failed:", e.message);
    });
  }
  return true;
}

export function storageSubscribe(key, callback) {
  // ローカル即時通知用リスナー登録
  if (!localListeners[key]) localListeners[key] = new Set();
  localListeners[key].add(callback);
  const initial = localGet(key);
  if (initial !== null) callback(initial);

  let unsubFirebase = () => {};
  if (firebaseReady && db) {
    const r = ref(db, PREFIX + key);
    const handler = (snap) => {
      const val = snap.exists() ? snap.val() : null;
      if (val !== null) {
        localSet(key, val);
        callback(val);
      }
    };
    onValue(r, handler, (err) => console.warn("Firebase subscribe error:", err.message));
    unsubFirebase = () => off(r, "value", handler);
  }

  return () => {
    localListeners[key]?.delete(callback);
    unsubFirebase();
  };
}

export const isFirebaseConfigured = () => firebaseReady;
