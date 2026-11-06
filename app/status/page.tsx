import { SiteHeader } from "@/components/site-header";
import { StatusPanel } from "@/components/status-panel";

export const metadata = {
  title: "Status",
  description: "Whether this Bastion deployment is responding, and when the threat feeds last loaded.",
};

export default function StatusPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-3xl px-4 py-12 sm:px-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Status</p>
        <h1 className="mt-3 font-serif text-4xl">This deployment, right now</h1>
        <p className="mt-4 text-sm leading-6 text-muted">This page checks the application and the threat-feed cache. It does not report an uptime percentage, because this deployment does not store one.</p>
        <div className="mt-8">
          <StatusPanel />
        </div>
      </main>
    </div>
  );
}
