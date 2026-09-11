import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { b2bError, b2bOptions } from "@/lib/auth/b2b-response";
import { executeListingCall } from "@/lib/marketplace/call-listing";

export function OPTIONS() {
  return b2bOptions();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const authResult = await requireB2bAuth(
    request.headers.get("Authorization"),
    ["marketplace:call"]
  );
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const { slug } = await context.params;
  return executeListingCall(slug, request);
}
