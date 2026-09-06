const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const LOGS_DIR = path.join(app.getPath("userData"), "logs");

function timestamp() {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fileNameForNow() {
  const parts = new Date().toISOString().replace(/[:.]/g, "-").split("T");
  return `${parts[0]}_${parts[1]}.log`;
}

class Logger {
  constructor() {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    this.filePath = path.join(LOGS_DIR, fileNameForNow());
    this._writeLine(`[${timestamp()}] Log started: ${this.filePath}`);
  }

  // Synchronous by design: this logger exists to capture crash forensics,
  // so entries must hit disk before a process.exit()/app.exit() can happen.
  _writeLine(line) {
    try {
      fs.appendFileSync(this.filePath, line + "\n");
    } catch (e) {
      // Nothing we can do if the disk write itself fails.
    }
  }

  info(message) {
    this._writeLine(`[${timestamp()}] [INFO] ${message}`);
  }

  warn(message) {
    this._writeLine(`[${timestamp()}] [WARN] ${message}`);
  }

  error(message, err) {
    let line = `[${timestamp()}] [ERROR] ${message}`;
    if (err) {
      const detail = err.stack || err.message || String(err);
      line += `\n${detail}`;
    }
    this._writeLine(line);
  }
}

module.exports = new Logger();
module.exports.logsDir = LOGS_DIR;
