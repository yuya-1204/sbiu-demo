(function () {
  "use strict";

  const ACCESS_KEY = "workStepDemoAccessV1";
  const ALLOWED_PAGES = new Set([
    "portal.html",
    "game.html",
    "label-work.html",
    "cleaning-work.html",
    "assembly-work.html",
  ]);

  function hasValidAccess() {
    try {
      const state = JSON.parse(localStorage.getItem(ACCESS_KEY) || "null");
      return state && state.granted === true && Number(state.expiresAt) > Date.now();
    } catch {
      return false;
    }
  }

  if (!hasValidAccess()) {
    try {
      localStorage.removeItem(ACCESS_KEY);
    } catch {
      // The gate will still redirect when storage is unavailable.
    }
    const currentPage = location.pathname.split("/").pop() || "portal.html";
    const returnTo = ALLOWED_PAGES.has(currentPage) ? currentPage : "portal.html";
    location.replace("./index.html?return=" + encodeURIComponent(returnTo));
  }
})();
