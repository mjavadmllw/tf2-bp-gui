(() => {
  const $ = (id) => document.getElementById(id);
  const BATCH_SIZE = 48;
  const BUY_BACKPACK_URL = "http://store.steampowered.com/buyitem/440/5050/";

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
    tabContent: $("tab-content"),
    panelBackpack: $("panel-backpack"),
    panelInventory: $("panel-inventory"),
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

  // ---------- Window controls ----------
  els.btnMinimize.addEventListener("click", () => window.api.minimize());
  els.btnClose.addEventListener("click", () => window.api.close());

  // ---------- About ----------
  els.btnAbout.addEventListener("click", () => openModal(els.modalAbout));
  els.btnAboutClose.addEventListener("click", () => closeModal(els.modalAbout));

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
    els.tabBackpack.classList.toggle("active", tab === "backpack");
    els.tabInventory.classList.toggle("active", tab === "inventory");
    els.panelBackpack.classList.toggle("active", tab === "backpack");
    els.panelInventory.classList.toggle("active", tab === "inventory");
  }

  els.tabBackpack.addEventListener("click", () => switchTab("backpack"));
  els.tabInventory.addEventListener("click", () => switchTab("inventory"));

  // ---------- Account info ----------
  window.api.onAccountInfo(({ name, avatarUrl }) => {
    els.profileName.textContent = name || "Steam User";
    if (avatarUrl) {
      els.profileAvatar.innerHTML = `<img class="profile-avatar-img" src="${avatarUrl}" alt="${name || "Steam avatar"}" />`;
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
    els.statSlots.textContent = "–";
    els.statPremium.textContent = "–";
    els.btnUse.disabled = true;
    els.inventoryGrid.innerHTML = "";
    els.inventoryEmpty.classList.add("hidden");
    els.inventoryCount.textContent = "– items";
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
      ? `<img class="item-image" src="${payload.imageUrl}" alt="${payload.name}" />`
      : `<div class="item-placeholder">🎒</div>`;
    els.itemCard.innerHTML = `
      ${imgHtml}
      <div class="item-name">${payload.name}</div>
      <div class="item-count">${payload.count} in your backpack</div>`;
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
    els.btnUse.disabled = true;
    toast("Using item...", "info");
    window.api.useItem(state.currentItemId);
  });

  window.api.onUseResult(({ success, error }) => {
    state.usePending = false;
    if (success) {
      toast("✅ Item used successfully", "success");
    } else {
      toast(error || "Failed to use item", "error");
      els.btnUse.disabled = !state.currentItemId;
    }
  });

  // ---------- Inventory tab ----------
  function applyFilter() {
    const query = els.inputSearch.value.trim().toLowerCase();
    state.filteredInventory = query
      ? state.fullInventory.filter((item) => item.name.toLowerCase().includes(query))
      : state.fullInventory;
  }

  function resetInventoryRender() {
    applyFilter();
    state.renderedCount = 0;
    els.inventoryGrid.innerHTML = "";
    els.inventoryEmpty.classList.toggle("hidden", state.filteredInventory.length > 0);
    updateInventoryCount();
    renderInventoryBatch();
  }

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
      const card = document.createElement("div");
      card.className = "inv-card";
      card.dataset.id = item.id;

      const imgHtml = item.imageUrl
        ? `<img class="inv-card-img" src="${item.imageUrl}" alt="${item.name}" />`
        : `<div class="inv-card-placeholder">📦</div>`;

      card.innerHTML = `
        ${imgHtml}
        <div class="inv-card-name" title="${item.name}">${item.name}</div>
        <button class="inv-card-delete" title="Delete item">✕</button>`;

      card.querySelector(".inv-card-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        requestDelete(item.id, item.name);
      });

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
    state.fullInventory = items;
    resetInventoryRender();
  });

  function requestDelete(itemId, itemName) {
    state.pendingDeleteId = itemId;
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

    if (success) {
      const index = state.fullInventory.findIndex((item) => item.id === itemId);
      if (index !== -1) state.fullInventory.splice(index, 1);
      const filteredIndex = state.filteredInventory.findIndex((item) => item.id === itemId);
      if (filteredIndex !== -1) {
        state.filteredInventory.splice(filteredIndex, 1);
        state.renderedCount = Math.max(0, state.renderedCount - 1);
      }
      updateInventoryCount();

      const card = els.inventoryGrid.querySelector(`[data-id="${itemId}"]`);
      if (card) {
        card.classList.add("removing");
        setTimeout(() => card.remove(), 250);
      }

      if (isOwnRequest) toast("🗑️ Item deleted", "success");
    } else if (isOwnRequest) {
      toast(error || "Failed to delete item", "error");
    }

    if (isOwnRequest) state.pendingDeleteId = null;
  });
})();
