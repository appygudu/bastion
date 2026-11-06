export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  owasp: string[];
  nistCsf: string[];
  evidence: string;
  fix: string;
}

export interface Pass {
  id: string;
  title: string;
  evidence: string;
}

export interface TlsObservation {
  protocol: string | null;
  cipher: string | null;
  authorized: boolean;
  authorizationError: string | null;
  validFrom: string | null;
  validTo: string | null;
  subject: string | null;
  issuer: string | null;
  daysRemaining: number | null;
}

export interface PathProbe {
  path: string;
  status: number | null;
  contentType: string | null;
  contentLength: string | null;
  gitRef: string | null;
  error?: string;
}

export interface TextFetch {
  status: number | null;
  body: string | null;
  error?: string;
}

export interface CorsObservation {
  requestOrigin: string;
  allowOrigin: string | null;
  allowCredentials: string | null;
  error?: string;
}

export interface ScanObservation {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string | string[]>;
  bodySample: string;
  tls: TlsObservation | null;
  pathProbes: PathProbe[];
  robotsTxt: TextFetch;
  aiTxt: TextFetch;
  cors: CorsObservation | null;
}

export interface Fingerprint {
  server: string | null;
  poweredBy: string | null;
  generator: string | null;
}

export interface Analysis {
  findings: Finding[];
  passes: Pass[];
  fingerprint: Fingerprint;
}
