import type { Severity } from "@/lib/types";

export interface PathCheck {
  path: string;
  severity: Severity;
  title: string;
}

export const PATH_CHECKS: PathCheck[] = [
  { path: "/.env", severity: "critical", title: "Environment file is publicly readable" },
  { path: "/.env.local", severity: "critical", title: "Local environment file is publicly readable" },
  { path: "/.env.production", severity: "critical", title: "Production environment file is publicly readable" },
  { path: "/.git/HEAD", severity: "high", title: "Git HEAD is publicly readable" },
  { path: "/.git/config", severity: "high", title: "Git config is publicly readable" },
  { path: "/wp-config.php", severity: "critical", title: "WordPress configuration is publicly readable" },
  { path: "/phpinfo.php", severity: "high", title: "phpinfo page is publicly readable" },
  { path: "/server-status", severity: "medium", title: "server-status is publicly readable" },
  { path: "/elmah.axd", severity: "high", title: "ELMAH error log is publicly readable" },
  { path: "/backup.zip", severity: "high", title: "Backup archive is publicly readable" },
  { path: "/web.config", severity: "medium", title: "web.config is publicly readable" },
  { path: "/package.json", severity: "medium", title: "package.json is publicly readable" },
  { path: "/.DS_Store", severity: "low", title: "Directory metadata file is publicly readable" },
  { path: "/swagger.json", severity: "low", title: "Swagger document is publicly readable" },
  { path: "/openapi.json", severity: "low", title: "OpenAPI document is publicly readable" },
  { path: "/actuator/health", severity: "info", title: "Actuator health endpoint is publicly readable" },
];
