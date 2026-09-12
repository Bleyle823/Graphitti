import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { takeInviteEmailResult } from "@/lib/email/send-organization-invitation";

function requestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (!host) {
    return new URL(request.url).origin;
  }
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      email?: string;
      role?: "member" | "admin";
      organizationId?: string;
    };
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const created = await auth.api.createInvitation({
      headers: request.headers,
      body: {
        email,
        role: body.role ?? "member",
        organizationId: body.organizationId,
        resend: true,
      },
    });

    const invitationId =
      created && typeof created === "object" && "id" in created
        ? String(created.id)
        : "";
    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation was not created" },
        { status: 500 }
      );
    }
    const acceptUrl = `${requestOrigin(request)}/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
    const emailResult = takeInviteEmailResult(invitationId) ?? {
      sent: false as const,
      reason: "send_failed" as const,
      detail: "Invitation was created but email status was not recorded",
    };

    return NextResponse.json({
      invitationId,
      acceptUrl,
      email: emailResult,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to invite member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
