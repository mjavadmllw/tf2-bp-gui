const { contextBridge, ipcRenderer } = require("electron");

function on(channel, callback) {
  const listener = (event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("api", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),

  getCredentials: () => ipcRenderer.invoke("credentials:get"),

  login: (data) => ipcRenderer.invoke("auth:login", data),
  submitGuardCode: (code) => ipcRenderer.invoke("auth:submitGuard", code),
  logout: () => ipcRenderer.invoke("auth:logout"),
  clearAllData: () => ipcRenderer.invoke("app:clearData"),

  logError: (payload) => ipcRenderer.invoke("log:rendererError", payload),

  reloadInventory: () => ipcRenderer.invoke("inventory:reload"),
  toggleGame: () => ipcRenderer.invoke("game:toggle"),
  useItem: (itemId) => ipcRenderer.invoke("item:use", itemId),
  deleteItem: (itemId) => ipcRenderer.invoke("item:delete", itemId),
  craftItems: (itemIds) => ipcRenderer.invoke("item:craft", itemIds),
  sortBackpackByName: () => ipcRenderer.invoke("backpack:sortByName"),
  sortBackpackDefault: () => ipcRenderer.invoke("backpack:sortDefault"),

  onStatus: (cb) => on("bot:status", cb),
  onAccountInfo: (cb) => on("bot:accountInfo", cb),
  onGuardRequired: (cb) => on("bot:guardRequired", cb),
  onInventoryUpdate: (cb) => on("bot:inventoryUpdate", cb),
  onFullInventoryUpdate: (cb) => on("bot:fullInventoryUpdate", cb),
  onUseResult: (cb) => on("bot:useResult", cb),
  onDeleteResult: (cb) => on("bot:deleteResult", cb),
  onCraftResult: (cb) => on("bot:craftResult", cb),
  onSortResult: (cb) => on("bot:sortResult", cb),
  onSlotsUpdate: (cb) => on("bot:slotsUpdate", cb),
  onGameStateUpdate: (cb) => on("bot:gameStateUpdate", cb),
});
