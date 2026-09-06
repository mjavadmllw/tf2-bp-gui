(() => {
  const $ = (id) => document.getElementById(id);

  // Item names, types, and the Steam persona name are attacker-influenceable
  // (e.g. via a Name Tag) — never interpolate them into innerHTML unescaped.
  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

  const BATCH_SIZE = 48;
  const BUY_BACKPACK_URL = "http://store.steampowered.com/buyitem/440/5050/";
  const ACTIVITY_LOG_LIMIT = 100;

  const QUALITY_NAMES = {
    0: "Normal",
    1: "Genuine",
    3: "Vintage",
    5: "Unusual",
    6: "Unique",
    7: "Community",
    8: "Valve",
    9: "Self-Made",
    11: "Strange",
    13: "Haunted",
    14: "Collector's",
    15: "Decorated",
  };

  const CRAFT_RECIPES = [
    {
      id: "scrap-to-reclaimed",
      group: "combine",
      actionLabel: "Combine",
      from: "Scrap Metal",
      fromQty: 3,
      to: "Reclaimed Metal",
      toQty: 1,
    },
    {
      id: "reclaimed-to-refined",
      group: "combine",
      actionLabel: "Combine",
      from: "Reclaimed Metal",
      fromQty: 3,
      to: "Refined Metal",
      toQty: 1,
    },
    {
      id: "refined-to-reclaimed",
      group: "smelt",
      actionLabel: "Smelt",
      from: "Refined Metal",
      fromQty: 1,
      to: "Reclaimed Metal",
      toQty: 3,
    },
    {
      id: "reclaimed-to-scrap",
      group: "smelt",
      actionLabel: "Smelt",
      from: "Reclaimed Metal",
      fromQty: 1,
      to: "Scrap Metal",
      toQty: 3,
    },
  ];

  window.addEventListener("error", (e) => {
    window.api.logError({ message: e.message, stack: e.error && e.error.stack });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    window.api.logError({
      message: "Unhandled promise rejection: " + (reason && reason.message ? reason.message : String(reason)),
      stack: reason && reason.stack,
    });
  });

  const els = {
    viewLogin: $("view-login"),
    viewDashboard: $("view-dashboard"),

    inputUsername: $("input-username"),
    inputPassword: $("input-password"),
    btnTogglePass: $("btn-toggle-pass"),
    inputRemember: $("input-remember"),
    btnLogin: $("btn-login"),
    loginError: $("login-error"),

    profileAvatar: $("profile-avatar"),
    profileName: $("profile-name"),
    statusDot: $("status-dot"),
    statusText: $("status-text"),
    btnLogout: $("btn-logout"),
    btnToggleGame: $("btn-toggle-game"),

    statSlots: $("stat-slots"),
    statPremium: $("stat-premium"),

    tabBackpack: $("tab-backpack"),
    tabInventory: $("tab-inventory"),
    tabCraft: $("tab-craft"),
    tabActivity: $("tab-activity"),
    tabContent: $("tab-content"),
    panelBackpack: $("panel-backpack"),
    panelInventory: $("panel-inventory"),
    panelCraft: $("panel-craft"),
    panelActivity: $("panel-activity"),
    outOfGameOverlay: $("out-of-game-overlay"),
    btnJoinFromOverlay: $("btn-join-from-overlay"),

    itemCard: $("item-card"),
    btnReload: $("btn-reload"),
    btnUse: $("btn-use"),

    btnNeedBackpack: $("btn-need-backpack"),
    modalBuyBackpack: $("modal-buy-backpack"),
    inputBuyQuantity: $("input-buy-quantity"),
    btnBuyCancel: $("btn-buy-cancel"),
    linkBuyConfirm: $("link-buy-confirm"),

    inputSearch: $("input-search"),
    btnInventoryReload: $("btn-inventory-reload"),
    inventoryGrid: $("inventory-grid"),
    inventoryEmpty: $("inventory-empty"),
    inventoryCount: $("inventory-count"),

    inputSelectAll: $("input-select-all"),
    selectQualityFilter: $("select-quality-filter"),
    selectTypeFilter: $("select-type-filter"),

    inventoryBulkBar: $("inventory-bulk-bar"),
    inventoryBulkCount: $("inventory-bulk-count"),
    btnBulkCancel: $("btn-bulk-cancel"),
    btnBulkDelete: $("btn-bulk-delete"),

    craftList: $("craft-list"),
    btnCraftReload: $("btn-craft-reload"),
    btnCraftHelp: $("btn-craft-help"),
    modalCraftHelp: $("modal-craft-help"),
    craftHelpDiagram: $("craft-help-diagram"),
    btnCraftHelpClose: $("btn-craft-help-close"),

    btnSort: $("btn-sort"),
    modalSortChoice: $("modal-sort-choice"),
    btnSortChoiceCancel: $("btn-sort-choice-cancel"),
    btnSortChoiceConfirm: $("btn-sort-choice-confirm"),

    modalSortProgress: $("modal-sort-progress"),
    sortProgressTitle: $("sort-progress-title"),
    sortProgressIcon: $("sort-progress-icon"),
    sortProgressText: $("sort-progress-text"),
    btnSortProgressClose: $("btn-sort-progress-close"),

    activityList: $("activity-list"),
    activityEmpty: $("activity-empty"),

    modalBulkDelete: $("modal-bulk-delete"),
    bulkDeleteCount: $("bulk-delete-count"),
    btnBulkDeleteCancel: $("btn-bulk-delete-cancel"),
    btnBulkDeleteConfirm: $("btn-bulk-delete-confirm"),

    modalBulkProgress: $("modal-bulk-progress"),
    bulkProgressTitle: $("bulk-progress-title"),
    bulkProgressFill: $("bulk-progress-fill"),
    bulkProgressText: $("bulk-progress-text"),
    btnBulkProgressClose: $("btn-bulk-progress-close"),

    modalGuard: $("modal-guard"),
    guardDomainText: $("guard-domain-text"),
    inputGuardCode: $("input-guard-code"),
    btnGuardSubmit: $("btn-guard-submit"),

    modalConfirm: $("modal-confirm"),
    btnConfirmCancel: $("btn-confirm-cancel"),
    btnConfirmUse: $("btn-confirm-use"),

    modalDelete: $("modal-delete"),
    deleteItemName: $("delete-item-name"),
    btnDeleteCancel: $("btn-delete-cancel"),
    btnDeleteConfirm: $("btn-delete-confirm"),

    modalLogout: $("modal-logout"),
    btnLogoutCancel: $("btn-logout-cancel"),
    btnLogoutConfirm: $("btn-logout-confirm"),

    btnAbout: $("btn-about"),
    modalAbout: $("modal-about"),
    btnAboutClose: $("btn-about-close"),

    btnClearData: $("btn-clear-data"),
    modalClearData: $("modal-clear-data"),
    btnClearDataCancel: $("btn-clear-data-cancel"),
    btnClearDataConfirm: $("btn-clear-data-confirm"),

    btnMinimize: $("btn-minimize"),
    btnClose: $("btn-close"),

    toastContainer: $("toast-container"),
  };

  const state = {
    currentItemId: null,
    usePending: false,
    fullInventory: [],
    filteredInventory: [],
    renderedCount: 0,
    pendingDeleteId: null,
    searchDebounce: null,
    selectedIds: new Set(),
    bulkResolvers: new Map(),
    tabsLocked: false,
    pendingDeleteName: null,
    pendingUseName: null,
    activityLog: [],
    craftPending: false,
    lastCraftLabel: null,
    sortInProgress: false,
    sortSettleTimer: null,
    sortFallbackTimer: null,
  };

  // ---------- View / modal helpers ----------
  function showView(name) {
    els.viewLogin.classList.toggle("active", name === "login");
    els.viewDashboard.classList.toggle("active", name === "dashboard");
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("visible"));
  }

  function closeModal(modal) {
    modal.classList.remove("visible");
    setTimeout(() => modal.classList.add("hidden"), 200);
  }

  function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    els.toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add("visible"));
    setTimeout(() => {
      el.classList.remove("visible");
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  // Some image URLs we build ourselves (schema-derived icon guesses) won't always
  // resolve — fall back to the placeholder box instead of showing a broken image.
  function swapImgOnError(img, placeholderOuterHtml) {
    if (!img) return;
    img.addEventListener(
      "error",
      () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = placeholderOuterHtml.trim();
        img.replaceWith(wrapper.firstElementChild);
      },
      { once: true }
    );
  }

  // ---------- Activity log ----------
  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function logActivity(message, success) {
    state.activityLog.unshift({ message, success, time: Date.now() });
    if (state.activityLog.length > ACTIVITY_LOG_LIMIT) state.activityLog.length = ACTIVITY_LOG_LIMIT;
    renderActivityLog();
  }

  function renderActivityLog() {
    if (state.activityLog.length === 0) {
      els.activityList.innerHTML = "";
      els.activityEmpty.classList.remove("hidden");
      return;
    }
    els.activityEmpty.classList.add("hidden");
    els.activityList.innerHTML = state.activityLog
      .map(
        (entry) => `
      <div class="activity-item ${entry.success ? "success" : "error"}">
        <span class="activity-icon">${entry.success ? "✅" : "⚠️"}</span>
        <div class="activity-body">
          <div class="activity-message">${escapeHtml(entry.message)}</div>
          <div class="activity-time">${formatTime(entry.time)}</div>
        </div>
      </div>`
      )
      .join("");
  }

  // ---------- Window controls ----------
  els.btnMinimize.addEventListener("click", () => window.api.minimize());
  els.btnClose.addEventListener("click", () => window.api.close());

  // ---------- About ----------
  els.btnAbout.addEventListener("click", () => openModal(els.modalAbout));
  els.btnAboutClose.addEventListener("click", () => closeModal(els.modalAbout));

  els.btnClearData.addEventListener("click", () => openModal(els.modalClearData));
  els.btnClearDataCancel.addEventListener("click", () => closeModal(els.modalClearData));

  els.btnClearDataConfirm.addEventListener("click", () => {
    els.btnClearDataConfirm.disabled = true;
    els.btnClearDataCancel.disabled = true;
    window.api.clearAllData();
  });

  // ---------- Need backpack? ----------
  function updateBuyLink() {
    const raw = parseInt(els.inputBuyQuantity.value, 10);
    const qty = Number.isFinite(raw) && raw > 0 ? raw : 1;
    els.linkBuyConfirm.href = BUY_BACKPACK_URL + qty;
  }

  els.btnNeedBackpack.addEventListener("click", () => {
    els.inputBuyQuantity.value = 1;
    updateBuyLink();
    openModal(els.modalBuyBackpack);
  });

  els.inputBuyQuantity.addEventListener("input", updateBuyLink);
  els.btnBuyCancel.addEventListener("click", () => closeModal(els.modalBuyBackpack));
  els.linkBuyConfirm.addEventListener("click", () => closeModal(els.modalBuyBackpack));

  // ---------- Password toggle ----------
  els.btnTogglePass.addEventListener("click", () => {
    const isPassword = els.inputPassword.type === "password";
    els.inputPassword.type = isPassword ? "text" : "password";
    els.btnTogglePass.textContent = isPassword ? "🙈" : "👁";
  });

  // ---------- Prefill remembered credentials ----------
  window.api.getCredentials().then((creds) => {
    if (creds.remembered) {
      els.inputUsername.value = creds.username || "";
      els.inputPassword.value = creds.password || "";
      els.inputRemember.checked = true;
    }
  });

  // ---------- Login ----------
  function setLoginLoading(loading) {
    els.btnLogin.disabled = loading;
    els.btnLogin.querySelector(".btn-label").classList.toggle("hidden", loading);
    els.btnLogin.querySelector(".spinner").classList.toggle("hidden", !loading);
  }

  els.btnLogin.addEventListener("click", () => {
    const username = els.inputUsername.value.trim();
    const password = els.inputPassword.value;

    if (!username || !password) {
      els.loginError.textContent = "Enter your username and password.";
      els.loginError.classList.remove("hidden");
      return;
    }

    els.loginError.classList.add("hidden");
    setLoginLoading(true);
    window.api.login({ username, password, remember: els.inputRemember.checked });
  });

  els.btnLogout.addEventListener("click", () => {
    openModal(els.modalLogout);
  });

  els.btnLogoutCancel.addEventListener("click", () => closeModal(els.modalLogout));

  els.btnLogoutConfirm.addEventListener("click", () => {
    closeModal(els.modalLogout);
    window.api.logout();
  });

  // ---------- Game toggle ----------
  function setOutOfGameOverlay(show) {
    els.outOfGameOverlay.classList.toggle("hidden", !show);
    els.tabContent.classList.toggle("blocked", show);
  }

  els.btnToggleGame.addEventListener("click", () => {
    els.btnToggleGame.disabled = true;
    window.api.toggleGame();
  });

  els.btnJoinFromOverlay.addEventListener("click", () => {
    els.btnJoinFromOverlay.disabled = true;
    els.btnToggleGame.disabled = true;
    window.api.toggleGame();
  });

  window.api.onGameStateUpdate(({ inGame }) => {
    els.btnToggleGame.disabled = false;
    els.btnToggleGame.textContent = inGame ? "Leave Game" : "Join Game";
    els.btnJoinFromOverlay.disabled = false;
    setOutOfGameOverlay(!inGame);
  });

  // ---------- Tabs ----------
  function switchTab(tab) {
    if (state.tabsLocked) return;
    els.tabBackpack.classList.toggle("active", tab === "backpack");
    els.tabInventory.classList.toggle("active", tab === "inventory");
    els.tabCraft.classList.toggle("active", tab === "craft");
    els.tabActivity.classList.toggle("active", tab === "activity");
    els.panelBackpack.classList.toggle("active", tab === "backpack");
    els.panelInventory.classList.toggle("active", tab === "inventory");
    els.panelCraft.classList.toggle("active", tab === "craft");
    els.panelActivity.classList.toggle("active", tab === "activity");
  }

  function setTabsLocked(locked) {
    state.tabsLocked = locked;
    els.tabBackpack.disabled = locked;
    els.tabInventory.disabled = locked;
    els.tabCraft.disabled = locked;
    els.tabActivity.disabled = locked;
    els.btnSort.disabled = locked;
    els.btnBulkDelete.disabled = locked;
    renderCraftTab();
  }

  els.tabBackpack.addEventListener("click", () => switchTab("backpack"));
  els.tabInventory.addEventListener("click", () => switchTab("inventory"));
  els.tabCraft.addEventListener("click", () => switchTab("craft"));
  els.tabActivity.addEventListener("click", () => switchTab("activity"));

  // ---------- Account info ----------
  window.api.onAccountInfo(({ name, avatarUrl }) => {
    els.profileName.textContent = name || "Steam User";
    if (avatarUrl) {
      els.profileAvatar.innerHTML = `<img class="profile-avatar-img" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name || "Steam avatar")}" />`;
    }
  });

  function resetProfile() {
    els.profileName.textContent = "Loading...";
    els.profileAvatar.innerHTML = "🙂";
  }

  // ---------- Bot status ----------
  window.api.onStatus((payload) => {
    const { state: s, message } = payload;

    if (s === "error") {
      if (els.viewLogin.classList.contains("active")) {
        setLoginLoading(false);
        els.loginError.textContent = message;
        els.loginError.classList.remove("hidden");
      } else {
        toast(message, "error");
        els.statusDot.className = "status-dot error";
      }
      return;
    }

    if (s === "warning") {
      toast(message, "error");
      return;
    }

    if (s === "connecting") {
      els.statusText.textContent = message;
      return;
    }

    if (s === "loggedOn") {
      setLoginLoading(false);
      showView("dashboard");
      els.statusDot.className = "status-dot";
      els.statusText.textContent = message;
      return;
    }

    if (s === "connectedToGC") {
      els.statusText.textContent = message;
      return;
    }

    if (s === "ready") {
      els.statusDot.className = "status-dot online";
      els.statusText.textContent = "Connected and ready";
      return;
    }

    if (s === "outOfGame") {
      els.statusDot.className = "status-dot";
      els.statusText.textContent = message;
      return;
    }

    if (s === "disconnected" || s === "loggedOut") {
      showView("login");
      setLoginLoading(false);
      resetDashboard();
      return;
    }
  });

  function resetDashboard() {
    state.currentItemId = null;
    state.fullInventory = [];
    state.filteredInventory = [];
    state.renderedCount = 0;
    state.selectedIds.clear();
    state.bulkResolvers.clear();
    state.activityLog = [];
    state.craftPending = false;
    state.sortInProgress = false;
    clearTimeout(state.sortSettleTimer);
    clearTimeout(state.sortFallbackTimer);
    setTabsLocked(false);
    closeModal(els.modalBulkDelete);
    closeModal(els.modalBulkProgress);
    closeModal(els.modalSortChoice);
    closeModal(els.modalSortProgress);
    els.statSlots.textContent = "–";
    els.statPremium.textContent = "–";
    els.btnUse.disabled = true;
    els.inventoryGrid.innerHTML = "";
    els.inventoryEmpty.classList.add("hidden");
    els.inventoryCount.textContent = "– items";
    els.selectQualityFilter.innerHTML = '<option value="">All qualities</option>';
    els.selectTypeFilter.innerHTML = '<option value="">All types</option>';
    updateBulkBar();
    renderActivityLog();
    els.btnToggleGame.textContent = "Leave Game";
    els.btnToggleGame.disabled = false;
    setOutOfGameOverlay(false);
    switchTab("backpack");
    renderSkeleton();
    resetProfile();
  }

  // ---------- Steam Guard ----------
  window.api.onGuardRequired(({ domain }) => {
    els.guardDomainText.textContent = domain
      ? `Enter the code sent to your email (${domain})`
      : "Enter the code from your Steam Mobile app";
    els.inputGuardCode.value = "";
    openModal(els.modalGuard);
    setTimeout(() => els.inputGuardCode.focus(), 250);
  });

  els.btnGuardSubmit.addEventListener("click", submitGuard);
  els.inputGuardCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitGuard();
  });

  function submitGuard() {
    const code = els.inputGuardCode.value.trim();
    if (!code) return;
    window.api.submitGuardCode(code);
    closeModal(els.modalGuard);
  }

  // ---------- Backpack tab ----------
  function renderSkeleton() {
    els.itemCard.className = "item-card";
    els.itemCard.innerHTML = `
      <div class="item-skeleton">
        <div class="skeleton-img shimmer"></div>
        <div class="skeleton-line shimmer"></div>
        <div class="skeleton-line short shimmer"></div>
      </div>`;
  }

  function renderFound(payload) {
    els.itemCard.className = "item-card found";
    const imgHtml = payload.imageUrl
      ? `<img class="item-image" src="${escapeHtml(payload.imageUrl)}" alt="${escapeHtml(payload.name)}" />`
      : `<div class="item-placeholder">🎒</div>`;
    els.itemCard.innerHTML = `
      ${imgHtml}
      <div class="item-name">${escapeHtml(payload.name)}</div>
      <div class="item-count">${payload.count} in your backpack</div>`;

    if (payload.imageUrl) {
      swapImgOnError(els.itemCard.querySelector(".item-image"), '<div class="item-placeholder">🎒</div>');
    }
  }

  function renderNotFound(atMax) {
    els.itemCard.className = "item-card";
    els.itemCard.innerHTML = `
      <div class="item-empty-icon">📦</div>
      <div class="item-name">${atMax ? "Maximum capacity reached" : "No item found"}</div>
      <div class="item-count">${atMax ? "You can't use another expander" : "No Backpack Expander in your inventory"}</div>`;
  }

  window.api.onInventoryUpdate((payload) => {
    if (!payload.loaded) {
      renderSkeleton();
      return;
    }

    els.statSlots.textContent = `${payload.slots} / ${payload.maxSlots}`;
    els.statPremium.textContent = payload.premium ? "Premium" : "Free";

    if (payload.found && !payload.atMax) {
      state.currentItemId = payload.itemId;
      els.btnUse.disabled = false;
      renderFound(payload);
    } else {
      state.currentItemId = null;
      els.btnUse.disabled = true;
      renderNotFound(payload.atMax);
    }
  });

  window.api.onSlotsUpdate(({ slots, maxSlots }) => {
    els.statSlots.style.opacity = 0;
    setTimeout(() => {
      els.statSlots.textContent = `${slots} / ${maxSlots}`;
      els.statSlots.style.opacity = 1;
    }, 150);
  });

  els.btnReload.addEventListener("click", () => {
    const icon = els.btnReload.querySelector(".refresh-icon");
    icon.classList.add("spinning");
    window.api.reloadInventory();
    setTimeout(() => icon.classList.remove("spinning"), 600);
  });

  els.btnUse.addEventListener("click", () => {
    if (!state.currentItemId) return;
    openModal(els.modalConfirm);
  });

  els.btnConfirmCancel.addEventListener("click", () => closeModal(els.modalConfirm));

  els.btnConfirmUse.addEventListener("click", () => {
    if (!state.currentItemId) return;
    closeModal(els.modalConfirm);
    state.usePending = true;
    state.pendingUseName = els.itemCard.querySelector(".item-name")?.textContent || "Backpack Expander";
    els.btnUse.disabled = true;
    toast("Using item...", "info");
    window.api.useItem(state.currentItemId);
  });

  window.api.onUseResult(({ success, error }) => {
    state.usePending = false;
    const name = state.pendingUseName || "Backpack Expander";
    if (success) {
      toast("✅ Item used successfully", "success");
      logActivity(`Used ${name}`, true);
    } else {
      toast(error || "Failed to use item", "error");
      els.btnUse.disabled = !state.currentItemId;
      logActivity(`Failed to use ${name}: ${error || "unknown error"}`, false);
    }
    state.pendingUseName = null;
  });

  // ---------- Craft tab ----------
  function itemsByName(name) {
    return state.fullInventory.filter((item) => item.name === name);
  }

  function craftCardHtml(recipe) {
    const haveFrom = itemsByName(recipe.from).length;
    const haveTo = itemsByName(recipe.to).length;
    const canCraft = haveFrom >= recipe.fromQty && !state.craftPending && !state.tabsLocked;
    return `
      <div class="craft-card">
        <div class="craft-card-info">
          <div class="craft-card-title">${recipe.fromQty}× ${recipe.from} → ${recipe.toQty}× ${recipe.to}</div>
          <div class="craft-card-sub">You have: ${haveFrom} ${recipe.from}, ${haveTo} ${recipe.to}</div>
        </div>
        <button class="ghost-btn small craft-card-btn" data-recipe="${recipe.id}" ${canCraft ? "" : "disabled"}>${recipe.actionLabel}</button>
      </div>`;
  }

  function renderCraftTab() {
    if (!els.craftList) return;
    const combineHtml = CRAFT_RECIPES.filter((r) => r.group === "combine").map(craftCardHtml).join("");
    const smeltHtml = CRAFT_RECIPES.filter((r) => r.group === "smelt").map(craftCardHtml).join("");
    els.craftList.innerHTML = `
      <div class="craft-section-label">Combine</div>
      ${combineHtml}
      <div class="craft-section-label">Smelt down</div>
      ${smeltHtml}
    `;
    els.craftList.querySelectorAll(".craft-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => requestCraft(btn.dataset.recipe));
    });
  }

  function requestCraft(recipeId) {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || state.craftPending || state.tabsLocked) return;

    const available = itemsByName(recipe.from);
    if (available.length < recipe.fromQty) return;

    const ids = available.slice(0, recipe.fromQty).map((item) => item.id);
    state.craftPending = true;
    state.lastCraftLabel = `${recipe.fromQty}× ${recipe.from} → ${recipe.toQty}× ${recipe.to}`;
    renderCraftTab();
    toast(`${recipe.actionLabel === "Smelt" ? "Smelting" : "Combining"}...`, "info");
    window.api.craftItems(ids);
  }

  window.api.onCraftResult(({ success, error, itemsGained }) => {
    state.craftPending = false;
    const label = state.lastCraftLabel || "Craft";
    if (success) {
      toast(`✅ ${label} succeeded`, "success");
      logActivity(`${label} succeeded`, true);
    } else {
      toast(error || `${label} failed`, "error");
      logActivity(`${label} failed: ${error || "unknown error"}`, false);
    }
    state.lastCraftLabel = null;
    renderCraftTab();
  });

  function craftHelpIconHtml(name) {
    const item = itemsByName(name)[0];
    return item && item.imageUrl
      ? `<img class="craft-help-icon" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(name)}" />`
      : `<div class="craft-help-icon craft-help-icon-placeholder">📦</div>`;
  }

  function craftHelpItemCell(name) {
    return `<div class="craft-help-item">${craftHelpIconHtml(name)}<span>${name}</span></div>`;
  }

  function craftHelpArrowCell(text) {
    return `<div class="craft-help-arrow">${text}</div>`;
  }

  function renderCraftHelpDiagram() {
    els.craftHelpDiagram.innerHTML = `
      <div class="craft-help-section-label">Combine (up)</div>
      <div class="craft-help-row">
        ${craftHelpItemCell("Scrap Metal")}
        ${craftHelpArrowCell("3 → 1")}
        ${craftHelpItemCell("Reclaimed Metal")}
        ${craftHelpArrowCell("3 → 1")}
        ${craftHelpItemCell("Refined Metal")}
      </div>
      <div class="craft-help-section-label">Smelt (down)</div>
      <div class="craft-help-row">
        ${craftHelpItemCell("Refined Metal")}
        ${craftHelpArrowCell("1 → 3")}
        ${craftHelpItemCell("Reclaimed Metal")}
        ${craftHelpArrowCell("1 → 3")}
        ${craftHelpItemCell("Scrap Metal")}
      </div>
    `;

    els.craftHelpDiagram.querySelectorAll("img.craft-help-icon").forEach((img) => {
      swapImgOnError(img, '<div class="craft-help-icon craft-help-icon-placeholder">📦</div>');
    });
  }

  els.btnCraftHelp.addEventListener("click", () => {
    renderCraftHelpDiagram();
    openModal(els.modalCraftHelp);
  });

  els.btnCraftHelpClose.addEventListener("click", () => closeModal(els.modalCraftHelp));

  els.btnCraftReload.addEventListener("click", () => {
    const icon = els.btnCraftReload.querySelector(".refresh-icon");
    icon.classList.add("spinning");
    window.api.reloadInventory();
    setTimeout(() => icon.classList.remove("spinning"), 600);
  });

  // ---------- Sort backpack ----------
  els.btnSort.addEventListener("click", () => {
    if (state.fullInventory.length === 0) {
      toast("Your backpack is empty.", "error");
      return;
    }
    openModal(els.modalSortChoice);
  });

  els.btnSortChoiceCancel.addEventListener("click", () => closeModal(els.modalSortChoice));

  els.btnSortChoiceConfirm.addEventListener("click", () => {
    const checked = document.querySelector('input[name="sort-basis"]:checked');
    const basis = checked ? checked.value : "name";
    closeModal(els.modalSortChoice);
    startSort(basis);
  });

  function startSort(basis) {
    state.sortInProgress = true;
    setTabsLocked(true);
    els.sortProgressTitle.textContent = "Sorting backpack...";
    els.sortProgressText.textContent = "This can take a few seconds. Please wait.";
    els.sortProgressIcon.className = "sort-spinner";
    els.sortProgressIcon.textContent = "";
    els.btnSortProgressClose.classList.add("hidden");
    openModal(els.modalSortProgress);

    if (basis === "name") window.api.sortBackpackByName();
    else window.api.sortBackpackDefault();

    scheduleSortSettle();
    clearTimeout(state.sortFallbackTimer);
    state.sortFallbackTimer = setTimeout(() => finishSort(true), 20000);
  }

  function scheduleSortSettle() {
    clearTimeout(state.sortSettleTimer);
    state.sortSettleTimer = setTimeout(() => finishSort(false), 700);
  }

  function finishSort(timedOut) {
    if (!state.sortInProgress) return;
    clearTimeout(state.sortSettleTimer);
    clearTimeout(state.sortFallbackTimer);
    state.sortInProgress = false;
    setTabsLocked(false);
    els.sortProgressTitle.textContent = "Done";
    els.sortProgressText.textContent = timedOut
      ? "Taking longer than expected — check your backpack, it may still be updating."
      : "Your backpack has been sorted.";
    els.sortProgressIcon.className = "sort-progress-check";
    els.sortProgressIcon.textContent = timedOut ? "⏱️" : "✅";
    els.btnSortProgressClose.classList.remove("hidden");
    toast(timedOut ? "Sort request sent, but taking a while to confirm" : "✅ Backpack sorted", timedOut ? "info" : "success");
    logActivity(timedOut ? "Sorted backpack (unconfirmed — timed out)" : "Sorted backpack", true);
  }

  els.btnSortProgressClose.addEventListener("click", () => closeModal(els.modalSortProgress));

  window.api.onSortResult(({ success, error }) => {
    if (!success) {
      clearTimeout(state.sortSettleTimer);
      clearTimeout(state.sortFallbackTimer);
      state.sortInProgress = false;
      setTabsLocked(false);
      closeModal(els.modalSortProgress);
      toast(error || "Failed to sort backpack", "error");
      logActivity(`Sort failed: ${error || "unknown error"}`, false);
    }
  });

  // ---------- Inventory tab ----------
  function applyFilter() {
    const query = els.inputSearch.value.trim().toLowerCase();
    const qualityFilter = els.selectQualityFilter.value;
    const typeFilter = els.selectTypeFilter.value;

    state.filteredInventory = state.fullInventory.filter((item) => {
      if (query && !item.name.toLowerCase().includes(query)) return false;
      if (qualityFilter !== "" && String(item.quality) !== qualityFilter) return false;
      if (typeFilter !== "" && item.type !== typeFilter) return false;
      return true;
    });
  }

  function populateFilterOptions() {
    const qualities = new Set();
    const types = new Set();
    for (const item of state.fullInventory) {
      qualities.add(item.quality);
      if (item.type) types.add(item.type);
    }

    const prevQuality = els.selectQualityFilter.value;
    els.selectQualityFilter.innerHTML =
      '<option value="">All qualities</option>' +
      Array.from(qualities)
        .sort((a, b) => a - b)
        .map((q) => `<option value="${q}">${QUALITY_NAMES[q] || `Quality ${q}`}</option>`)
        .join("");
    if (Array.from(els.selectQualityFilter.options).some((o) => o.value === prevQuality)) {
      els.selectQualityFilter.value = prevQuality;
    }

    const prevType = els.selectTypeFilter.value;
    els.selectTypeFilter.innerHTML =
      '<option value="">All types</option>' +
      Array.from(types)
        .sort()
        .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
        .join("");
    if (Array.from(els.selectTypeFilter.options).some((o) => o.value === prevType)) {
      els.selectTypeFilter.value = prevType;
    }
  }

  els.selectQualityFilter.addEventListener("change", resetInventoryRender);
  els.selectTypeFilter.addEventListener("change", resetInventoryRender);

  function resetInventoryRender() {
    applyFilter();
    pruneSelection();
    state.renderedCount = 0;
    els.inventoryGrid.innerHTML = "";
    els.inventoryEmpty.classList.toggle("hidden", state.filteredInventory.length > 0);
    updateInventoryCount();
    renderInventoryBatch();
  }

  // ---------- Bulk select ----------
  function pruneSelection() {
    if (state.selectedIds.size > 0) {
      const idSet = new Set(state.fullInventory.map((item) => item.id));
      for (const id of state.selectedIds) {
        if (!idSet.has(id)) state.selectedIds.delete(id);
      }
    }
    updateBulkBar();
  }

  function updateBulkBar() {
    const count = state.selectedIds.size;
    els.inventoryBulkBar.classList.toggle("visible", count > 0);
    els.inventoryBulkCount.textContent = `${count} selected`;
    updateSelectAllCheckbox();
  }

  function toggleSelect(itemId, checked, card) {
    if (checked) state.selectedIds.add(itemId);
    else state.selectedIds.delete(itemId);
    if (card) card.classList.toggle("selected", checked);
    updateBulkBar();
  }

  function clearSelection() {
    state.selectedIds.clear();
    els.inventoryGrid.querySelectorAll(".inv-card.selected").forEach((card) => card.classList.remove("selected"));
    els.inventoryGrid.querySelectorAll(".inv-card-select").forEach((cb) => (cb.checked = false));
    updateBulkBar();
  }

  function selectableIds() {
    return state.filteredInventory.filter((item) => !item.protected).map((item) => item.id);
  }

  function updateSelectAllCheckbox() {
    const selectable = selectableIds();
    if (selectable.length === 0) {
      els.inputSelectAll.checked = false;
      els.inputSelectAll.indeterminate = false;
      els.inputSelectAll.disabled = true;
      return;
    }
    els.inputSelectAll.disabled = false;
    const selectedCount = selectable.filter((id) => state.selectedIds.has(id)).length;
    els.inputSelectAll.checked = selectedCount === selectable.length;
    els.inputSelectAll.indeterminate = selectedCount > 0 && selectedCount < selectable.length;
  }

  els.inputSelectAll.addEventListener("change", (e) => {
    const checked = e.target.checked;
    const selectable = selectableIds();
    if (checked) selectable.forEach((id) => state.selectedIds.add(id));
    else selectable.forEach((id) => state.selectedIds.delete(id));

    const idIndex = new Map(state.filteredInventory.map((item) => [String(item.id), item]));
    els.inventoryGrid.querySelectorAll(".inv-card").forEach((card) => {
      const item = idIndex.get(card.dataset.id);
      if (!item || item.protected) return;
      const isSelected = state.selectedIds.has(item.id);
      card.classList.toggle("selected", isSelected);
      const cb = card.querySelector(".inv-card-select");
      if (cb) cb.checked = isSelected;
    });

    updateBulkBar();
  });

  els.btnBulkCancel.addEventListener("click", () => clearSelection());

  els.btnBulkDelete.addEventListener("click", () => {
    if (state.selectedIds.size === 0) return;
    els.bulkDeleteCount.textContent = String(state.selectedIds.size);
    openModal(els.modalBulkDelete);
  });

  els.btnBulkDeleteCancel.addEventListener("click", () => closeModal(els.modalBulkDelete));

  els.btnBulkDeleteConfirm.addEventListener("click", () => {
    closeModal(els.modalBulkDelete);
    startBulkDelete(Array.from(state.selectedIds));
  });

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function deleteItemAwait(itemId) {
    return new Promise((resolve) => {
      state.bulkResolvers.set(itemId, resolve);
      window.api.deleteItem(itemId);
    });
  }

  function updateBulkProgress(done, total) {
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    els.bulkProgressFill.style.width = `${pct}%`;
    els.bulkProgressText.textContent = `${done} of ${total} deleted`;
  }

  async function startBulkDelete(ids) {
    const total = ids.length;
    if (total === 0) return;

    setTabsLocked(true);
    els.bulkProgressTitle.textContent = "Deleting items...";
    els.btnBulkProgressClose.classList.add("hidden");
    updateBulkProgress(0, total);
    openModal(els.modalBulkProgress);

    let done = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      const result = await deleteItemAwait(ids[i]);
      done++;
      if (!result.success) failed++;
      updateBulkProgress(done, total);

      if (i < ids.length - 1) {
        await sleep(900 + Math.random() * 200);
      }
    }

    setTabsLocked(false);
    els.bulkProgressTitle.textContent = failed === 0 ? "Done" : `Done (${failed} failed)`;
    els.btnBulkProgressClose.classList.remove("hidden");

    const summary =
      failed === 0
        ? `Bulk deleted ${total} item${total === 1 ? "" : "s"}`
        : `Bulk deleted ${total - failed} of ${total} items (${failed} failed)`;
    toast(failed === 0 ? `🗑️ ${summary}` : summary, failed === 0 ? "success" : "error");
    logActivity(summary, failed === 0);
  }

  els.btnBulkProgressClose.addEventListener("click", () => closeModal(els.modalBulkProgress));

  function updateInventoryCount() {
    const total = state.fullInventory.length;
    const shown = state.filteredInventory.length;
    els.inventoryCount.textContent =
      shown === total ? `${total} item${total === 1 ? "" : "s"}` : `${shown} of ${total} items`;
  }

  function renderInventoryBatch() {
    const next = state.filteredInventory.slice(state.renderedCount, state.renderedCount + BATCH_SIZE);
    const fragment = document.createDocumentFragment();

    for (const item of next) {
      const isSelected = state.selectedIds.has(item.id);
      const card = document.createElement("div");
      card.className = "inv-card" + (isSelected ? " selected" : "") + (item.protected ? " protected" : "");
      card.dataset.id = item.id;

      const imgHtml = item.imageUrl
        ? `<img class="inv-card-img" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" />`
        : `<div class="inv-card-placeholder">📦</div>`;

      const selectHtml = item.protected
        ? `<div class="inv-card-protected" title="Protected: ${escapeHtml(item.protectedReason || "high-value item")}">🔒</div>`
        : `<label class="inv-card-select-wrap">
             <input type="checkbox" class="inv-card-select" ${isSelected ? "checked" : ""} />
           </label>`;

      card.innerHTML = `
        ${selectHtml}
        ${imgHtml}
        <div class="inv-card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <button class="inv-card-delete" title="Delete item">✕</button>`;

      card.querySelector(".inv-card-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        requestDelete(item.id, item.name);
      });

      if (item.imageUrl) {
        swapImgOnError(card.querySelector(".inv-card-img"), '<div class="inv-card-placeholder">📦</div>');
      }

      const checkbox = card.querySelector(".inv-card-select");
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          toggleSelect(item.id, e.target.checked, card);
        });
      }

      fragment.appendChild(card);
    }

    els.inventoryGrid.appendChild(fragment);
    state.renderedCount += next.length;
  }

  els.inventoryGrid.addEventListener("scroll", () => {
    const { scrollTop, scrollHeight, clientHeight } = els.inventoryGrid;
    if (scrollTop + clientHeight >= scrollHeight - 120) {
      renderInventoryBatch();
    }
  });

  els.inputSearch.addEventListener("input", () => {
    clearTimeout(state.searchDebounce);
    state.searchDebounce = setTimeout(resetInventoryRender, 150);
  });

  els.btnInventoryReload.addEventListener("click", () => {
    const icon = els.btnInventoryReload.querySelector(".refresh-icon");
    icon.classList.add("spinning");
    window.api.reloadInventory();
    setTimeout(() => icon.classList.remove("spinning"), 600);
  });

  window.api.onFullInventoryUpdate((items) => {
    // Reflect the real backpack slot order (position) rather than raw arrival order,
    // so the list actually matches what an in-game sort (or our own "sort by name") produced.
    state.fullInventory = [...items].sort((a, b) => a.position - b.position);
    populateFilterOptions();
    resetInventoryRender();
    renderCraftTab();
    if (state.sortInProgress) scheduleSortSettle();
  });

  function requestDelete(itemId, itemName) {
    state.pendingDeleteId = itemId;
    state.pendingDeleteName = itemName;
    els.deleteItemName.textContent = itemName;
    openModal(els.modalDelete);
  }

  els.btnDeleteCancel.addEventListener("click", () => {
    state.pendingDeleteId = null;
    closeModal(els.modalDelete);
  });

  els.btnDeleteConfirm.addEventListener("click", () => {
    if (state.pendingDeleteId === null) return;
    closeModal(els.modalDelete);
    window.api.deleteItem(state.pendingDeleteId);
  });

  window.api.onDeleteResult(({ success, itemId, error }) => {
    const isOwnRequest = state.pendingDeleteId === itemId;
    const bulkResolve = state.bulkResolvers.get(itemId);

    if (success) {
      const index = state.fullInventory.findIndex((item) => item.id === itemId);
      if (index !== -1) state.fullInventory.splice(index, 1);
      const filteredIndex = state.filteredInventory.findIndex((item) => item.id === itemId);
      if (filteredIndex !== -1) {
        state.filteredInventory.splice(filteredIndex, 1);
        state.renderedCount = Math.max(0, state.renderedCount - 1);
      }
      state.selectedIds.delete(itemId);
      updateInventoryCount();
      updateBulkBar();

      const card = els.inventoryGrid.querySelector(`[data-id="${itemId}"]`);
      if (card) {
        card.classList.add("removing");
        setTimeout(() => card.remove(), 250);
      }

      if (isOwnRequest) {
        toast("🗑️ Item deleted", "success");
        logActivity(`Deleted ${state.pendingDeleteName || "item"}`, true);
      }
    } else if (isOwnRequest) {
      toast(error || "Failed to delete item", "error");
      logActivity(`Failed to delete ${state.pendingDeleteName || "item"}: ${error || "unknown error"}`, false);
    }

    if (isOwnRequest) {
      state.pendingDeleteId = null;
      state.pendingDeleteName = null;
    }

    if (bulkResolve) {
      state.bulkResolvers.delete(itemId);
      bulkResolve({ success, error });
    }
  });

  renderCraftTab();
})();
