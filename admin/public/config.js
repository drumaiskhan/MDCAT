// Runtime configuration (URLs only, never secrets). Edit on the server any time - no rebuild needed.
// Set API_ORIGIN to your cPanel API address: https, no /api, no trailing slash. Example: "https://api.example.com"
(function () {
  var API_ORIGIN = "";
  var h = location.hostname;
  var local = h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
  // Local dev: blank = same-origin /api (Vite proxy). Live site: API_ORIGIN.
  window.__MDCAT_CONFIG__ = { apiOrigin: local ? "" : API_ORIGIN };
})();
