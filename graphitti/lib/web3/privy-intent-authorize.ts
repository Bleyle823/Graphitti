import { createPrivateKey, sign } from "node:crypto";
import {
  canonicalizeJson,
  parseJsonBody,
} from "@/lib/web3/privy-authorization";

const WALLET_AUTH_PREFIX = /^wallet-auth:/;
const WHITESPACE = /\s+/g;
const PEM_LINE = /.{1,64}/g;

export type IntentRequestDetails = {
  method: string;
  url: string;
  body: unknown;
};

export type IntentAuthorizationSignInput = {
  version: 1;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body: unknown;
  timestamp: number;
  intent_id: string;
  headers: {
    "privy-app-id": string;
  };
};

function authorizationKeyToPem(rawKey: string): string {
  const stripped = rawKey.replace(WALLET_AUTH_PREFIX, "").trim();
  if (stripped.includes("BEGIN PRIVATE KEY")) {
    return stripped;
  }

  const body = stripped.replace(WHITESPACE, "");
  const wrapped = body.match(PEM_LINE)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
}

export function buildIntentAuthorizationSignInput(
  intentId: string,
  requestDetails: IntentRequestDetails,
  appId: string,
  timestamp = Date.now()
): IntentAuthorizationSignInput {
  const method = requestDetails.method.toUpperCase();
  if (
    method !== "POST" &&
    method !== "PUT" &&
    method !== "PATCH" &&
    method !== "DELETE"
  ) {
    throw new Error(
      `Unsupported intent request method: ${requestDetails.method}`
    );
  }

  return {
    version: 1,
    method,
    url: requestDetails.url,
    body: parseJsonBody(requestDetails.body),
    timestamp,
    intent_id: intentId,
    headers: { "privy-app-id": appId },
  };
}

export function signIntentAuthorizationPayload(
  payload: IntentAuthorizationSignInput,
  authorizationKey: string
): string {
  const serialized = canonicalizeJson(payload);
  const privateKey = createPrivateKey({
    key: authorizationKeyToPem(authorizationKey),
    format: "pem",
  });
  return sign("sha256", Buffer.from(serialized), privateKey).toString("base64");
}
