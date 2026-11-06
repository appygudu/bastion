import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme";
import { ToastProvider } from "@/components/toast";
import { appOrigin } from "@/lib/public-env";
import "./globals.css";

const origin = appOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: "Bastion", template: "%s · Bastion" },
  description: "Defensive control plane for the websites and agents you own. Passive findings, a hash-chained bot ledger, and executive briefs.",
  openGraph: {
    title: "Bastion",
    description: "Defensive control plane for the websites and agents you own.",
    url: origin,
    siteName: "Bastion",
    type: "website",
  },
  twitter: { card: "summary", title: "Bastion", description: "Defensive control plane for the websites and agents you own." },
  robots: { index: true, follow: true },
};

const themeScript = `(function(){try{var t=localStorage.getItem("bastion-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <ToastProvider>
            {children}
            <SiteFooter />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
