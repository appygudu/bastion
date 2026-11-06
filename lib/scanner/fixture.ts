import type { ScanObservation } from "@/lib/types";

/** Recorded observation used for the labelled demo workspace. No network call is made. */
export function demoObservation(): ScanObservation {
  return {
    requestedUrl: "https://shop.northwind.example/",
    finalUrl: "https://shop.northwind.example/",
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      server: "nginx/1.18.0",
      "x-powered-by": "Express",
      "set-cookie": "session=demo; Path=/",
      "access-control-allow-origin": "*",
    },
    bodySample:
      "<!doctype html><html><head><meta name=\"generator\" content=\"Northwind/2.4\"></head><body><script src=\"http://cdn.northwind.example/app.js\"></script><img src=\"http://cdn.northwind.example/logo.png\"></body></html>",
    tls: {
      protocol: "TLSv1.2",
      cipher: "ECDHE-RSA-AES128-GCM-SHA256",
      authorized: true,
      authorizationError: null,
      validFrom: "2025-11-01T00:00:00.000Z",
      validTo: "2026-12-01T00:00:00.000Z",
      subject: "CN=shop.northwind.example",
      issuer: "CN=Northwind Demo CA",
      daysRemaining: 40,
    },
    pathProbes: [
      { path: "/.env", status: 200, contentType: "text/plain", contentLength: "420", gitRef: null },
      { path: "/.env.local", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/.env.production", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/.git/HEAD", status: 200, contentType: "text/plain", contentLength: "23", gitRef: "ref: refs/heads/main" },
      { path: "/.git/config", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/wp-config.php", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/phpinfo.php", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/server-status", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/elmah.axd", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/backup.zip", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/web.config", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/package.json", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/.DS_Store", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/swagger.json", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/openapi.json", status: 404, contentType: null, contentLength: null, gitRef: null },
      { path: "/actuator/health", status: 404, contentType: null, contentLength: null, gitRef: null },
    ],
    robotsTxt: { status: 200, body: "User-agent: *\nAllow: /\n" },
    aiTxt: { status: 404, body: null },
    cors: {
      requestOrigin: "https://bastion-probe.invalid",
      allowOrigin: "*",
      allowCredentials: null,
    },
  };
}
