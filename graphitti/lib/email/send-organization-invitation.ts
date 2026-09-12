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
  | {
      sent: false;
      /**
       * `not_configured` — no API key/from address.
       * `recipient_not_allowed` — Resend test mode only mails the account owner.
       * `send_failed` — anything else.
       */
      reason: "not_configured" | "recipient_not_allowed" | "send_failed";
      detail: string;
    };

const lastInviteEmailById = new Map<string, SendOrganizationInvitationResult>();

export function takeInviteEmailResult(
  invitationId: string
): SendOrganizationInvitationResult | null {
  const result = lastInviteEmailById.get(invitationId) ?? null;
  lastInviteEmailById.delete(invitationId);
  return result;
}

export function rememberInviteEmailResult(
  invitationId: string,
  result: SendOrganizationInvitationResult
): void {
  lastInviteEmailById.set(invitationId, result);
}

export async function sendOrganizationInvitationEmail(
  input: SendOrganizationInvitationInput
): Promise<SendOrganizationInvitationResult> {
  // Values pasted into hosting dashboards often carry trailing newlines, which
  // would corrupt the Authorization header and the From address.
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!(apiKey && from)) {
    return {
      sent: false,
      reason: "not_configured",
      detail: "RESEND_API_KEY or RESEND_FROM_EMAIL is not set",
    };
  }

  const inviter = input.inviterName?.trim() || "A teammate";
  const html = `
    <p>${inviter} invited you to join <strong>${input.orgName}</strong> on Graphitti.</p>
    <p><a href="${input.acceptUrl}">Accept invitation</a></p>
    <p>If the button does not work, copy this link:</p>
    <p>${input.acceptUrl}</p>
  `.trim();

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: `Join ${input.orgName} on Graphitti`,
      html,
      text: `${inviter} invited you to join ${input.orgName} on Graphitti. Accept: ${input.acceptUrl}`,
    });

    if (!error) {
      return { sent: true };
    }

    const detail = error.message ?? "Resend rejected the request";
    const isTestModeRecipient =
      /only send testing emails to your own email address/i.test(detail);
    return {
      sent: false,
      reason: isTestModeRecipient ? "recipient_not_allowed" : "send_failed",
      detail,
    };
  } catch (error) {
    return {
      sent: false,
      reason: "send_failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
