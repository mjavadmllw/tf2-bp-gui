const SteamUser = require("steam-user");
const TF2 = require("tf2");
const SteamCommunity = require("steamcommunity");
const EventEmitter = require("events");

const EXPANDER_DEFINDEX = 5050;
const TF2_APP_ID = 440;
const TF2_CONTEXT_ID = 2;

const ERROR_MESSAGES = {
  5: "Incorrect username or password.",
  63: "This account requires Steam Guard confirmation from a new device.",
  65: "The Steam Guard code you entered is incorrect.",
  84: "Too many login attempts. Please wait a moment and try again.",
  18: "This Steam account does not exist.",
};

function friendlyError(err) {
  if (err && err.eresult && ERROR_MESSAGES[err.eresult]) {
    return ERROR_MESSAGES[err.eresult];
  }
  return (err && err.message) || "An unknown error occurred.";
}

function imageUrlFor(iconUrl) {
  return iconUrl ? `https://steamcommunity-a.akamaihd.net/economy/image/${iconUrl}/` : null;
}

class SteamBotService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.tf2 = null;
    this.community = null;
    this.loggedIn = false;
    this.inGame = true;
    this.descriptions = new Map(); // id -> { name, imageUrl, type, marketHashName }
    this._pendingGuardCallback = null;
  }

  login({ username, password }) {
    if (this.client) {
      this._teardown();
    }

    this.client = new SteamUser();
    this.tf2 = new TF2(this.client);
    this.community = new SteamCommunity();
    this.descriptions = new Map();

    this.emit("status", { state: "connecting", message: "Connecting to Steam..." });

    this.client.logOn({ accountName: username, password });

    this.client.on("loggedOn", () => {
      this.loggedIn = true;
      this.emit("status", {
        state: "loggedOn",
        message: "Logged into Steam.",
        steamId: this.client.steamID.getSteamID64(),
      });
      this.client.setPersona(SteamUser.EPersonaState.Online);
      this.inGame = true;
      this.client.gamesPlayed([TF2_APP_ID]);
      this.emit("gameStateUpdate", { inGame: true });

      this.client.getPersonas([this.client.steamID], (err, personas) => {
        if (err || !this.client) return;
        const persona = personas[this.client.steamID.getSteamID64()];
        if (persona) {
          this.emit("accountInfo", {
            name: persona.player_name,
            avatarUrl: persona.avatar_url_medium || persona.avatar_url_full || persona.avatar_url_icon || null,
          });
        }
      });
    });

    this.client.on("webSession", (sessionID, cookies) => {
      this.community.setCookies(cookies);
      this._fetchFullInventory();
    });

    this.client.on("steamGuard", (domain, callback) => {
      this._pendingGuardCallback = callback;
      this.emit("guardRequired", { domain: domain || null });
    });

    this.client.on("error", (err) => {
      this.loggedIn = false;
      this.emit("status", { state: "error", message: friendlyError(err) });
    });

    this.client.on("disconnected", () => {
      if (this.loggedIn) {
        this.loggedIn = false;
        this.emit("status", { state: "disconnected", message: "Disconnected from Steam." });
      }
    });

    this.tf2.on("error", (err) => {
      this.emit("status", { state: "error", message: "TF2 Game Coordinator error: " + (err.message || err) });
    });

    this.tf2.on("connectedToGC", () => {
      this.emit("status", { state: "connectedToGC", message: "Connected to the Game Coordinator." });
    });

    this.tf2.on("accountLoaded", () => {
      this._checkDataLoaded();
    });

    this.tf2.on("backpackLoaded", () => {
      this._checkDataLoaded();
    });

    this.tf2.on("accountUpdate", () => {
      this.emit("slotsUpdate", {
        slots: this.tf2.backpackSlots,
        maxSlots: this.tf2.premium ? 4000 : 3750,
      });
      this.rescanBackpack();
      this._emitFullInventory();
    });

    this.tf2.on("itemAcquired", () => {
      this.rescanBackpack();
      this._emitFullInventory();
    });

    this.tf2.on("itemChanged", () => {
      this._emitFullInventory();
    });

    this.tf2.on("itemRemoved", (item) => {
      if (item.def_index === EXPANDER_DEFINDEX) {
        this.emit("useResult", { success: true, itemId: item.id });
      }
      this.emit("deleteResult", { success: true, itemId: item.id });
      this.rescanBackpack();
      this._emitFullInventory();
    });
  }

  submitGuardCode(code) {
    if (this._pendingGuardCallback) {
      const cb = this._pendingGuardCallback;
      this._pendingGuardCallback = null;
      cb(code.trim());
    }
  }

  _checkDataLoaded() {
    if (this.tf2.backpack && this.tf2.backpackSlots !== undefined) {
      this.emit("status", { state: "ready", message: "Backpack loaded." });
      this.rescanBackpack();
      this._emitFullInventory();
    }
  }

  _fetchFullInventory() {
    if (!this.client.steamID) return;

    this.community.getUserInventoryContents(
      this.client.steamID,
      TF2_APP_ID,
      TF2_CONTEXT_ID,
      false,
      (err, items) => {
        if (err) {
          this.emit("status", { state: "warning", message: "Could not load item images: " + err.message });
          return;
        }

        this.descriptions = new Map();
        for (const item of items) {
          this.descriptions.set(String(item.id), {
            name: item.name || item.market_hash_name || "Unknown Item",
            imageUrl: item.getLargeImageURL ? item.getLargeImageURL() : imageUrlFor(item.icon_url_large || item.icon_url),
            type: item.type || "",
            marketHashName: item.market_hash_name || "",
          });
        }

        this.rescanBackpack();
        this._emitFullInventory();
      }
    );
  }

  rescanBackpack() {
    if (!this.tf2 || !this.tf2.backpack) {
      this.emit("inventoryUpdate", { found: false, slots: 0, maxSlots: 0, premium: false, loaded: false });
      return;
    }

    const maxSlots = this.tf2.premium ? 4000 : 3750;
    const expanders = this.tf2.backpack.filter((item) => item.def_index === EXPANDER_DEFINDEX);
    const first = expanders[0];
    const description = first ? this.descriptions.get(String(first.id)) : null;

    this.emit("inventoryUpdate", {
      found: expanders.length > 0,
      count: expanders.length,
      itemId: first ? first.id : null,
      name: (description && description.name) || "Backpack Expander",
      imageUrl: description ? description.imageUrl : null,
      slots: this.tf2.backpackSlots,
      maxSlots,
      premium: !!this.tf2.premium,
      atMax: this.tf2.backpackSlots >= maxSlots,
      loaded: true,
    });
  }

  refreshFullInventory() {
    this._emitFullInventory();
  }

  _emitFullInventory() {
    if (!this.tf2 || !this.tf2.backpack) {
      this.emit("fullInventoryUpdate", []);
      return;
    }

    const items = this.tf2.backpack.map((item) => {
      const description = this.descriptions.get(String(item.id));
      return {
        id: item.id,
        defindex: item.def_index,
        quality: item.quality,
        name: (description && description.name) || `Item #${item.def_index}`,
        imageUrl: description ? description.imageUrl : null,
        type: (description && description.type) || "",
      };
    });

    this.emit("fullInventoryUpdate", items);
  }

  useExpander(itemId) {
    if (!this.tf2 || !this.tf2.haveGCSession) {
      this.emit("useResult", { success: false, error: "Not connected to the Game Coordinator." });
      return;
    }

    try {
      this.tf2.useItem(itemId);
      setTimeout(() => {
        if (!this.tf2 || !this.tf2.backpack) return;
        const stillThere = this.tf2.backpack.some((i) => i.id === itemId);
        if (stillThere) {
          this.emit("useResult", { success: false, error: "The item is still in your backpack. It may have failed to use." });
        }
      }, 10000);
    } catch (err) {
      this.emit("useResult", { success: false, error: friendlyError(err) });
    }
  }

  deleteItem(itemId) {
    if (!this.tf2 || !this.tf2.haveGCSession) {
      this.emit("deleteResult", { success: false, itemId, error: "Not connected to the Game Coordinator." });
      return;
    }

    try {
      this.tf2.deleteItem(itemId);
      setTimeout(() => {
        if (!this.tf2 || !this.tf2.backpack) return;
        const stillThere = this.tf2.backpack.some((i) => i.id === itemId);
        if (stillThere) {
          this.emit("deleteResult", { success: false, itemId, error: "The item is still in your backpack. Deletion may have failed." });
        }
      }, 10000);
    } catch (err) {
      this.emit("deleteResult", { success: false, itemId, error: friendlyError(err) });
    }
  }

  toggleGame() {
    if (!this.client || !this.loggedIn) return;
    this.inGame = !this.inGame;
    this.client.gamesPlayed(this.inGame ? [TF2_APP_ID] : []);
    this.emit("gameStateUpdate", { inGame: this.inGame });
    this.emit("status", {
      state: this.inGame ? "connecting" : "outOfGame",
      message: this.inGame ? "Rejoining Team Fortress 2..." : "Left Team Fortress 2.",
    });
  }

  logout() {
    this._teardown();
    this.emit("status", { state: "loggedOut", message: "Logged out." });
  }

  _teardown() {
    if (this.client) {
      try {
        this.client.logOff();
      } catch (e) {
        // ignore
      }
      this.client.removeAllListeners();
    }
    if (this.tf2) {
      this.tf2.removeAllListeners();
    }
    this.client = null;
    this.tf2 = null;
    this.community = null;
    this.loggedIn = false;
    this.descriptions = new Map();
    this._pendingGuardCallback = null;
  }
}

module.exports = { SteamBotService, EXPANDER_DEFINDEX };
