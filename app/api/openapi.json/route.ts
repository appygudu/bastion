import { openApiSpec } from "@/lib/openapi";
import { appOrigin } from "@/lib/public-env";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(openApiSpec(appOrigin()), {
    headers: { "cache-control": "no-store" },
  });
}
