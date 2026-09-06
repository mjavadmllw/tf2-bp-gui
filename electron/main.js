const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const { SteamBotService } = require("./bot.js");
const credentialStore = require("./credentialStore.js");
const logger = require("./logger.js");

let mainWindow;
let bot;

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception in main process", err);
  // Node's default behavior for an uncaught exception is to terminate the
  // process. Registering this listener suppresses that default, so without
  // an explicit exit here the process would become an invisible zombie
  // (no window, but still running) instead of actually crashing.
  app.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection in main process", reason);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 760,
    resizable: false,
    frame: false,
    backgroundColor: "#111318",
    show: false,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function createBot() {
  bot = new SteamBotService();
  bot.on("status", (payload) => {
    if (payload.state === "error" || payload.state === "warning") {
      logger.error(`Bot status [${payload.state}]: ${payload.message}`);
    }
    send("bot:status", payload);
  });
  bot.on("accountInfo", (payload) => send("bot:accountInfo", payload));
  bot.on("guardRequired", (payload) => send("bot:guardRequired", payload));
  bot.on("inventoryUpdate", (payload) => send("bot:inventoryUpdate", payload));
  bot.on("fullInventoryUpdate", (payload) => send("bot:fullInventoryUpdate", payload));
  bot.on("useResult", (payload) => {
    if (!payload.success) logger.error(`Use item failed: ${payload.error}`);
    send("bot:useResult", payload);
  });
  bot.on("deleteResult", (payload) => {
    if (!payload.success) logger.error(`Delete item failed (item ${payload.itemId}): ${payload.error}`);
    send("bot:deleteResult", payload);
  });
  bot.on("craftResult", (payload) => {
    if (!payload.success) logger.error(`Craft failed: ${payload.error}`);
    send("bot:craftResult", payload);
  });
  bot.on("sortResult", (payload) => {
    if (!payload.success) logger.error(`Sort backpack failed: ${payload.error}`);
    send("bot:sortResult", payload);
  });
  bot.on("slotsUpdate", (payload) => send("bot:slotsUpdate", payload));
  bot.on("gameStateUpdate", (payload) => send("bot:gameStateUpdate", payload));
}

app.whenReady().then(() => {
  createWindow();
  createBot();

  ipcMain.handle("window:minimize", () => mainWindow.minimize());
  ipcMain.handle("window:close", () => mainWindow.close());

  ipcMain.handle("credentials:get", () => {
    const saved = credentialStore.load();
    return saved ? { username: saved.username, password: saved.password, remembered: true } : { remembered: false };
  });

  ipcMain.handle("auth:login", (event, { username, password, remember }) => {
    if (remember) {
      try {
        credentialStore.save({ username, password });
      } catch (err) {
        send("bot:status", { state: "warning", message: "Could not save credentials: " + err.message });
      }
    } else {
      credentialStore.clear();
    }
    bot.login({ username, password });
  });

  ipcMain.handle("auth:submitGuard", (event, code) => {
    bot.submitGuardCode(code);
  });

  ipcMain.handle("auth:logout", () => {
    bot.logout();
  });

  ipcMain.handle("inventory:reload", () => {
    bot.rescanBackpack();
    bot.refreshFullInventory();
  });

  ipcMain.handle("item:use", (event, itemId) => {
    bot.useExpander(itemId);
  });

  ipcMain.handle("item:delete", (event, itemId) => {
    bot.deleteItem(itemId);
  });

  ipcMain.handle("item:craft", (event, itemIds) => {
    bot.craftItems(itemIds);
  });

  ipcMain.handle("backpack:sortByName", () => {
    bot.sortBackpackByName();
  });

  ipcMain.handle("backpack:sortDefault", () => {
    bot.sortBackpackDefault();
  });

  ipcMain.handle("game:toggle", () => {
    bot.toggleGame();
  });

  ipcMain.handle("log:rendererError", (event, { message, stack }) => {
    logger.error(`Renderer error: ${message}`, stack ? { stack } : null);
  });

  ipcMain.handle("app:clearData", () => {
    if (bot) bot.logout();
    try {
      credentialStore.clearAll();
    } catch (err) {
      logger.error("Failed to clear credential store", err);
    }
    try {
      if (fs.existsSync(logger.logsDir)) {
        fs.rmSync(logger.logsDir, { recursive: true, force: true });
      }
    } catch (err) {
      // Best-effort: the app is about to quit either way.
    }
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (bot) bot.logout();
  if (process.platform !== "darwin") app.quit();
});
