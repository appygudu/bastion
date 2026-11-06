import { appOrigin, securityContact } from "@/lib/public-env";
import { securityTxt } from "@/lib/security/security-txt";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(securityTxt(appOrigin(), securityContact()), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
