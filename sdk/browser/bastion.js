/**
 * First-party browser snippet for a site you operate.
 * Anyone who can read the page can copy the key and forge events.
 * Those events are stored with source "browser" and flagged untrusted.
 * Prefer the server middleware for an authoritative ledger.
 * Disclose this collection in your privacy notice.
 *
 * sendBeacon cannot set an Authorization header, so this snippet uses fetch.
 */
(function () {
  var script = document.currentScript;
  if (!script || !window.fetch) return;
  var ingest = script.getAttribute("data-ingest");
  var key = script.getAttribute("data-key");
  if (!ingest || !key) return;
  fetch(ingest, {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/json" },
    body: JSON.stringify({
      method: "GET",
      path: location.pathname + location.search,
      status: 200,
      userAgent: navigator.userAgent,
      referer: document.referrer || "",
      source: "browser",
    }),
    keepalive: true,
  }).catch(function () {});
})();
