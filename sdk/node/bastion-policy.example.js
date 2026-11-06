// Example only. Generate the real deny list from the policy editor.
const denied = new Set(["gptbot", "claudebot", "bytespider", "ccbot"]);

export function bastionPolicy(req, res, next) {
  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  for (const name of denied) {
    if (ua.includes(name)) {
      res.status(403).type("text/plain").send("This crawler is disallowed by the site operator.");
      return;
    }
  }
  next();
}
