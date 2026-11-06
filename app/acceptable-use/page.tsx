import { readFile } from "node:fs/promises";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Acceptable use" };

export default async function AcceptableUsePage() {
  const text = await readFile("ACCEPTABLE_USE.md", "utf8");
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl px-5 pb-20">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-muted">{text}</pre>
      </article>
    </div>
  );
}
