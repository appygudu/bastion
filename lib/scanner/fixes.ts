export function headerSnippet(name: string, value: string): string {
  return `# nginx
add_header ${name} "${value}" always;

# Apache
Header always set ${name} "${value}"

# Express
res.setHeader(${JSON.stringify(name)}, ${JSON.stringify(value)});
`;
}

export const CSP_VALUE =
  "default-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests";

export const HSTS_VALUE = "max-age=63072000; includeSubDomains";

export function pathDenySnippet(path: string): string {
  return `# nginx — return 404 for this path on the vhost you operate
location = ${path} { return 404; }

# Apache
<Location "${path}">
  Require all denied
</Location>

# Express
app.use((req, res, next) => {
  if (req.path === ${JSON.stringify(path)}) return res.status(404).end();
  next();
});
`;
}
