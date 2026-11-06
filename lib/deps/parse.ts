export interface PackageRef {
  name: string;
  ecosystem: "npm" | "PyPI";
  version: string | null;
  exact: boolean;
  note: string;
}

function npmVersion(spec: string): { version: string | null; exact: boolean; note: string } {
  const value = spec.trim();
  if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
    return { version: value, exact: true, note: "exact" };
  }
  const ranged = value.match(/^[\^~](\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/);
  if (ranged) {
    return { version: ranged[1], exact: false, note: "range operator removed; OSV is queried at the declared base version" };
  }
  return { version: null, exact: false, note: "version is not a single semver, so OSV was not queried" };
}

function addNpm(out: PackageRef[], block: unknown) {
  if (!block || typeof block !== "object") return;
  for (const [name, spec] of Object.entries(block as Record<string, unknown>)) {
    if (typeof spec !== "string") continue;
    const parsed = npmVersion(spec);
    out.push({ name, ecosystem: "npm", version: parsed.version, exact: parsed.exact, note: parsed.note });
  }
}

export function parseManifest(text: string, kind: "package.json" | "requirements.txt"): PackageRef[] {
  if (text.length > 200_000) throw new Error("Manifest is too large.");
  if (kind === "package.json") {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("package.json is not valid JSON.");
    }
    if (!json || typeof json !== "object") throw new Error("package.json must be an object.");
    const record = json as Record<string, unknown>;
    const out: PackageRef[] = [];
    addNpm(out, record.dependencies);
    addNpm(out, record.devDependencies);
    addNpm(out, record.optionalDependencies);
    return out;
  }
  const out: PackageRef[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line || line.startsWith("-")) continue;
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*([=<>!~]=.*)?$/);
    if (!match) continue;
    const name = match[1];
    const spec = (match[2] ?? "").trim();
    const exact = spec.match(/^==\s*([A-Za-z0-9*_.+-]+)$/);
    if (exact && !exact[1].includes("*")) {
      out.push({ name, ecosystem: "PyPI", version: exact[1], exact: true, note: "exact" });
    } else {
      out.push({
        name,
        ecosystem: "PyPI",
        version: null,
        exact: false,
        note: spec ? "version is not pinned with ==, so OSV was not queried" : "version is missing, so OSV was not queried",
      });
    }
  }
  return out;
}
