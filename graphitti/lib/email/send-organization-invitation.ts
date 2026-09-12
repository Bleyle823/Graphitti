import "server-only";

import { Resend } from "resend";

export type SendOrganizationInvitationInput = {
  to: string;
  inviterName: string | null | undefined;
  orgName: string;
  acceptUrl: string;
};

export type SendOrganizationInvitationResult =
  | { sent: true }
  | { sent: false; reason: string };

export async function sendOrganizationInvitationEmail(
  input: SendOrganizationInvitationInput
): Promise<SendOrganizationInvitationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!(apiKey && from)) {
    console.warn(
      "[invite] RESEND_API_KEY or RESEND_FROM_EMAIL is not configured; invitation email skipped"
    );
    return { sent: false, reason: "email_not_configured" };
  }

  const inviter = input.inviterName?.trim() || "A teammate";
  const subject = `Join ${input.orgName} on Graphitti`;
  const html = `
    <p>${inviter} invited you to join <strong>${input.orgName}</strong> on Graphitti.</p>
    <p><a href="${input.acceptUrl}">Accept invitation</a></p>
    <p>If the button does not work, copy this link:</p>
    <p>${input.acceptUrl}</p>
  `.trim();

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    html,
    text: `${inviter} invited you to join ${input.orgName} on Graphitti. Accept: ${input.acceptUrl}`,
  });

  if (error) {
    console.error("[invite] Resend error:", error);
    return { sent: false, reason: error.message ?? "send_failed" };
  }

  return { sent: true };
}
