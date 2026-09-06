const https = require("https");
const SteamUser = require("steam-user");
const TF2 = require("tf2");
const SteamCommunity = require("steamcommunity");
const EventEmitter = require("events");
const logger = require("./logger.js");

const EXPANDER_DEFINDEX = 5050;
const TF2_APP_ID = 440;
const TF2_CONTEXT_ID = 2;
const FETCH_MIN_INTERVAL_MS = 5000;

// Public, unauthenticated mirror of TF2's own resource file — used purely as a
// name/icon fallback for items the Steam Community inventory endpoint can't see yet
// (that endpoint doesn't reflect changes made in-game — crafting, deleting, etc. —
// until the game session ends, no matter how many times it's re-fetched).
const TF2_LANG_URL = "https://raw.githubusercontent.com/SteamDatabase/GameTracking-TF2/master/tf/resource/tf_english.txt";

let cachedLangText = null;

function fetchLanguageFile() {
  if (cachedLangText) return Promise.resolve(cachedLangText);

  return new Promise((resolve, reject) => {
    https
      .get(TF2_LANG_URL, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          cachedLangText = Buffer.concat(chunks).toString("utf8");
          resolve(cachedLangText);
        });
      })
      .on("error", reject);
  });
}

// Falls back to TF2's own item schema (fetched via the GC, not Steam) for the name
// and icon of an item the Community inventory fetch hasn't resolved a description
// for. image_inventory is a raw game-asset path, not a CDN URL — Valve does serve a
// rendered icon at this basename under apps/440/icons/, at least for simple/stock
// items like crafting materials (verified for Scrap/Reclaimed/Refined Metal).
function resolveSchemaInfo(itemSchema, langLower, defindex) {
  if (!itemSchema || !itemSchema.items) return null;
  const entry = itemSchema.items[String(defindex)];
  if (!entry) return null;

  let name = null;
  const token = entry.item_name;
  if (token) {
    if (!token.startsWith("#")) {
      name = token;
    } else if (langLower) {
      name = langLower.get(token.slice(1).toLowerCase()) || null;
    }
  }

  let imageUrl = null;
  if (entry.image_inventory) {
    const base = entry.image_inventory.split("/").pop();
    imageUrl = `https://steamcdn-a.akamaihd.net/apps/440/icons/${base}.png`;
  }

  return { name, imageUrl };
}

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

// Qualities and item categories that are easy to delete by mistake in a bulk
// selection and are either high-value or awkward/costly to replace.
const PROTECTED_QUALITIES = {
  5: "Unusual quality",
  14: "Collector's quality",
};

const PROTECTED_NAME_PATTERNS = [
  { pattern: /\bkey\b/i, reason: "Key" },
  { pattern: /\bticket\b/i, reason: "Ticket" },
];

function getProtectionReason(item, description) {
  if (item.def_index === EXPANDER_DEFINDEX) return "Backpack Expander";
  if (PROTECTED_QUALITIES[item.quality]) return PROTECTED_QUALITIES[item.quality];

  const name = (description && description.name) || "";
  for (const { pattern, reason } of PROTECTED_NAME_PATTERNS) {
    if (pattern.test(name)) return reason;
  }
  return null;
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
    this._fullInventoryDebounce = null;
    this._descriptionRetryTimer = null;
    this._fetchingInventory = false;
    this._lastInventoryFetchAt = 0;
    this._langLower = null;
  }

  login({ username, password }) {
    if (this.client) {
      this._teardown();
    }

    this.client = new SteamUser();
    this.tf2 = new TF2(this.client);
    this.community = new SteamCommunity();
    this.descriptions = new Map();
    this._langLower = null;

    fetchLanguageFile()
      .then((text) => {
        if (!this.tf2) return;
        this.tf2.setLang(text);
        this._langLower = new Map(Object.keys(this.tf2.lang || {}).map((k) => [k.toLowerCase(), this.tf2.lang[k]]));
      })
      .catch((err) => {
        logger.warn("Could not load TF2 localization file (schema name/icon fallback disabled): " + err.message);
      });

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
      // A backpack-wide sort can fire hundreds/thousands of these back-to-back;
      // debounce so we broadcast the full inventory once it settles instead of once per item.
      this._scheduleFullInventoryEmit();
    });

    this.tf2.on("itemRemoved", (item) => {
      if (item.def_index === EXPANDER_DEFINDEX) {
        this.emit("useResult", { success: true, itemId: item.id });
      }
      this.emit("deleteResult", { success: true, itemId: item.id });
      this.rescanBackpack();
      this._emitFullInventory();
    });

    this.tf2.on("craftingComplete", (recipe, itemsGained) => {
      if (recipe === -1) {
        this.emit("craftResult", { success: false, error: "The game didn't recognize that as a valid recipe." });
      } else {
        this.emit("craftResult", { success: true, itemsGained });
      }
      this.rescanBackpack();
      this._emitFullInventory();
      // Crafted items are brand new, so they'll show up with no name/image until
      // the user reloads the inventory — deliberately not auto-fetching here to
      // avoid hitting Steam's Community API rate limit after repeated crafts.
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

    // Steam's Community inventory endpoint rejects requests that come in too soon
    // after a previous one ("duplicate request... ignored this time") — never let
    // two overlap, and never fire again within FETCH_MIN_INTERVAL_MS of the last one.
    // Anything that arrives too soon is deferred instead of dropped.
    const elapsed = Date.now() - this._lastInventoryFetchAt;
    if (this._fetchingInventory || elapsed < FETCH_MIN_INTERVAL_MS) {
      clearTimeout(this._descriptionRetryTimer);
      this._descriptionRetryTimer = setTimeout(
        () => this._fetchFullInventory(),
        this._fetchingInventory ? 1000 : FETCH_MIN_INTERVAL_MS - elapsed
      );
      return;
    }

    clearTimeout(this._descriptionRetryTimer);
    this._fetchingInventory = true;
    this._lastInventoryFetchAt = Date.now();

    this.community.getUserInventoryContents(
      this.client.steamID,
      TF2_APP_ID,
      TF2_CONTEXT_ID,
      false,
      (err, items) => {
        this._fetchingInventory = false;

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
        // Note: while the current TF2 game session is active, this snapshot is
        // whatever it was before this session started — items crafted, deleted, or
        // otherwise changed in-game won't show up here until the session ends.
        // Retrying wouldn't help; the schema-based fallback in _emitFullInventory
        // covers the name/icon for anything Community doesn't know about yet.
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
    // Re-fetch descriptions from Steam Community too, not just the GC backpack cache —
    // otherwise items that appeared since the last description fetch (e.g. after a
    // manual reload) show up with no name/image because they were never resolved.
    this._fetchFullInventory();
  }

  _scheduleFullInventoryEmit() {
    clearTimeout(this._fullInventoryDebounce);
    this._fullInventoryDebounce = setTimeout(() => this._emitFullInventory(), 200);
  }

  _emitFullInventory() {
    if (!this.tf2 || !this.tf2.backpack) {
      this.emit("fullInventoryUpdate", []);
      return;
    }

    const items = this.tf2.backpack.map((item) => {
      const description = this.descriptions.get(String(item.id));
      const schemaInfo = description ? null : resolveSchemaInfo(this.tf2.itemSchema, this._langLower, item.def_index);
      const protectedReason = getProtectionReason(item, description || schemaInfo);
      return {
        id: item.id,
        defindex: item.def_index,
        quality: item.quality,
        name: (description && description.name) || (schemaInfo && schemaInfo.name) || `Item #${item.def_index}`,
        imageUrl: description ? description.imageUrl : schemaInfo ? schemaInfo.imageUrl : null,
        type: (description && description.type) || "",
        position: item.position || 0,
        protected: !!protectedReason,
        protectedReason,
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

  craftItems(itemIds) {
    if (!this.tf2 || !this.tf2.haveGCSession) {
      this.emit("craftResult", { success: false, error: "Not connected to the Game Coordinator." });
      return;
    }

    try {
      this.tf2.craft(itemIds);
    } catch (err) {
      this.emit("craftResult", { success: false, error: friendlyError(err) });
    }
  }

  sortBackpackByName() {
    if (!this.tf2 || !this.tf2.haveGCSession) {
      this.emit("sortResult", { success: false, error: "Not connected to the Game Coordinator." });
      return;
    }
    if (!this.tf2.backpack || this.tf2.backpack.length === 0) {
      this.emit("sortResult", { success: false, error: "Your backpack is empty." });
      return;
    }

    try {
      const sorted = [...this.tf2.backpack].sort((a, b) => {
        const nameA = (this.descriptions.get(String(a.id)) || {}).name || "";
        const nameB = (this.descriptions.get(String(b.id)) || {}).name || "";
        return nameA.localeCompare(nameB);
      });
      const itemPositions = sorted.map((item, index) => ({ item_id: item.id, position: index + 1 }));
      this.tf2.setPositions(itemPositions);
      this.emit("sortResult", { success: true });
    } catch (err) {
      this.emit("sortResult", { success: false, error: friendlyError(err) });
    }
  }

  sortBackpackDefault() {
    if (!this.tf2 || !this.tf2.haveGCSession) {
      this.emit("sortResult", { success: false, error: "Not connected to the Game Coordinator." });
      return;
    }
    if (!this.tf2.backpack || this.tf2.backpack.length === 0) {
      this.emit("sortResult", { success: false, error: "Your backpack is empty." });
      return;
    }

    try {
      // The GC's sort_type codes for its native backpack sort aren't publicly
      // documented anywhere (even node-tf2's own author says so) — 0 is the
      // field's protocol-level default value, used here as the best-effort choice.
      this.tf2.sortBackpack(0);
      this.emit("sortResult", { success: true });
    } catch (err) {
      this.emit("sortResult", { success: false, error: friendlyError(err) });
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
    clearTimeout(this._fullInventoryDebounce);
    clearTimeout(this._descriptionRetryTimer);
    this._fetchingInventory = false;
    this._lastInventoryFetchAt = 0;
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
    this._langLower = null;
  }
}

module.exports = { SteamBotService, EXPANDER_DEFINDEX };
