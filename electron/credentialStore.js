const { app, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");

const STORE_DIR = path.join(app.getPath("userData"), "store");
const STORE_FILE = path.join(STORE_DIR, "credentials.json");

function isAvailable() {
  return safeStorage.isEncryptionAvailable();
}

function save({ username, password }) {
  if (!isAvailable()) {
    throw new Error("Encrypted storage is not available on this system.");
  }
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
  const encrypted = safeStorage.encryptString(password).toString("base64");
  fs.writeFileSync(STORE_FILE, JSON.stringify({ username, password: encrypted }, null, 2));
}

function load() {
  if (!fs.existsSync(STORE_FILE) || !isAvailable()) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    const password = safeStorage.decryptString(Buffer.from(data.password, "base64"));
    return { username: data.username, password };
  } catch (err) {
    return null;
  }
}

function clear() {
  if (fs.existsSync(STORE_FILE)) {
    fs.unlinkSync(STORE_FILE);
  }
}

function clearAll() {
  if (fs.existsSync(STORE_DIR)) {
    fs.rmSync(STORE_DIR, { recursive: true, force: true });
  }
}

module.exports = { isAvailable, save, load, clear, clearAll };
