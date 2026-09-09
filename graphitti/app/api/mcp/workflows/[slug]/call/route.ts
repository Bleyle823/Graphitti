import { NextResponse } from "next/server";
import {
  executeListingCall,
  listingCorsHeaders,
} from "@/lib/marketplace/call-listing";

export function OPTIONS() {
  return NextResponse.json({}, { headers: listingCorsHeaders });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  return executeListingCall(slug, request);
}
