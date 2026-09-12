import "server-only";

import { CIRCLE_API, circleFetch } from "@/lib/circle/client";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { encodeApprove } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction, signTypedDataV4 } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";
import {
  encodeDepositForBurn,
  encodeGatewayDeposit,
  explorerTx,
  faucetNote,
  gatewayApi,
  gatewayWallet,
  lookupToken,
  rejectGraphX402,
  SELECTORS,
  tokenMessenger,
} from "../shared";

export type NanoInput = StepInput & {
  network?: string;
  amount?: string;
  tokenAddress?: string;
  address?: string;
  url?: string;
  payTo?: string;
  nonce?: string;
  validAfter?: string;
  validBefore?: string;
  authorizationJson?: string;
  destinationNetwork?: string;
  mintRecipient?: string;
  httpMethod?: string;
  requestBody?: string;
};

async function depositToGateway(input: NanoInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network || !input.amount) {
    return fail("network and amount are required");
  }
  try {
    const chain = requireChain(input.network);
    const token = input.tokenAddress || lookupToken("USDC", input.network)?.address;
    if (!token) {
      return fail("USDC address unknown for this network. Pass tokenAddress.");
    }
    const amount = parseUnits(input.amount, 6);
    const gateway = gatewayWallet(input.network);
    const approveHash = (
      await sendSponsoredTransaction({
        walletId: wallet.wallet.privyWalletId,
        chain,
        to: token,
        data: encodeApprove(gateway, amount),
      })
    ).hash;
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: gateway,
      data: encodeGatewayDeposit(token, amount),
    });
    return ok({
      approveHash,
      hash,
      gateway,
      token,
      amount: input.amount,
      faucet: faucetNote(),
      explorer: explorerTx(input.network, hash),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function getNanopaymentBalance(input: NanoInput) {
  if (!input.address) {
    return fail("address is required");
  }
  try {
    const result = await circleFetch({
      baseUrl: gatewayApi(input.network || "arc-testnet"),
      path: "/v1/balances",
      method: "POST",
      body: {
        token: "USDC",
        sources: [{ domain: input.network === "arc-testnet" ? 26 : 0, depositor: input.address }],
      },
    });
    if (result.error) {
      return fail(result.error);
    }
    return ok(result.data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function decodePaymentHeader(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Not base64 JSON
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function asAccepts(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object"
  );
}

function pickGatewayAccept(
  header: Record<string, unknown> | null,
  body: unknown
): Record<string, unknown> | null {
  const fromHeader = asAccepts(header?.accepts);
  const bodyRecord =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const fromBody = asAccepts(bodyRecord?.accepts);
  const accepts = fromHeader.length > 0 ? fromHeader : fromBody;
  const gateway = accepts.find((entry) => {
    const extra = entry.extra;
    return (
      extra &&
      typeof extra === "object" &&
      (extra as { name?: unknown }).name === "GatewayWalletBatched"
    );
  });
  return gateway ?? accepts[0] ?? null;
}

function parseJsonBody(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function checkX402Support(input: NanoInput) {
  if (!input.url) {
    return fail("url is required");
  }
  const blocked = rejectGraphX402(input.url);
  if (blocked) {
    return blocked;
  }
  try {
    const method = (input.httpMethod || "GET").toUpperCase();
    const response = await fetch(input.url, {
      method,
      headers:
        method === "GET"
          ? undefined
          : { "Content-Type": "application/json" },
      body:
        method === "GET"
          ? undefined
          : input.requestBody || "{}",
    });
    const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
    const decoded = decodePaymentHeader(paymentRequired);
    const body = parseJsonBody(await response.text());
    const accept = pickGatewayAccept(decoded, body);
    const extra = accept?.extra;
    const extraName =
      extra && typeof extra === "object"
        ? (extra as { name?: unknown }).name
        : undefined;
    return ok({
      httpStatus: response.status,
      paymentRequired: response.status === 402,
      paymentRequiredHeader: paymentRequired,
      acceptsGatewayWalletBatched: extraName === "GatewayWalletBatched",
      accept,
      body,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function payX402(input: NanoInput) {
  if (!input.url) {
    return fail("url is required");
  }
  const blocked = rejectGraphX402(input.url);
  if (blocked) {
    return blocked;
  }
  const wallet = await requireLinkedWalletForExecution(
    input._context?.executionId
  );
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network) {
    return fail("network is required");
  }
  try {
    const chain = requireChain(input.network);
    const method = (input.httpMethod || (input.requestBody ? "POST" : "GET")).toUpperCase();
    const probeHeaders: Record<string, string> = {};
    if (method !== "GET") {
      probeHeaders["Content-Type"] = "application/json";
    }
    const probe = await fetch(input.url, {
      method,
      headers: probeHeaders,
      body: method === "GET" ? undefined : input.requestBody || "{}",
    });
    const probeText = await probe.text();
    const probeBody = parseJsonBody(probeText);
    if (probe.status !== 402) {
      return ok({
        httpStatus: probe.status,
        body: probeBody,
        paid: false,
        note: "Resource did not require payment.",
      });
    }

    const challenge = decodePaymentHeader(probe.headers.get("PAYMENT-REQUIRED"));
    const accept = pickGatewayAccept(challenge, probeBody);
    if (!accept) {
      return fail("402 response did not include payment requirements");
    }
    const extra =
      accept.extra && typeof accept.extra === "object"
        ? (accept.extra as Record<string, unknown>)
        : {};
    const verifyingContract =
      (typeof extra.verifyingContract === "string" && extra.verifyingContract) ||
      gatewayWallet(input.network);
    const payTo =
      (typeof accept.payTo === "string" && accept.payTo) || input.payTo;
    const atomic =
      (typeof accept.amount === "string" && accept.amount) ||
      (typeof accept.maxAmountRequired === "string" &&
        accept.maxAmountRequired) ||
      (input.amount ? parseUnits(input.amount, 6).toString() : undefined);
    if (!payTo || !atomic) {
      return fail("payTo and amount are required (from 402 or step inputs)");
    }

    const nonce =
      input.nonce ||
      `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}`;
    const validBefore =
      input.validBefore ||
      String(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 5);
    const authorization = {
      from: wallet.wallet.address,
      to: payTo,
      value: atomic,
      validAfter: input.validAfter || "0",
      validBefore,
      nonce,
    };
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      domain: {
        name:
          (typeof extra.name === "string" && extra.name) ||
          "GatewayWalletBatched",
        version: (typeof extra.version === "string" && extra.version) || "1",
        chainId: chain.chainId,
        verifyingContract,
      },
      primaryType: "TransferWithAuthorization",
      message: authorization,
    };
    const { signature } = await signTypedDataV4({
      walletId: wallet.wallet.privyWalletId,
      typedData,
      chain,
    });
    const paymentPayload = {
      x402Version: 2,
      accepted: accept,
      payload: { signature, authorization },
    };
    const retryHeaders: Record<string, string> = {
      "PAYMENT-SIGNATURE": Buffer.from(
        JSON.stringify(paymentPayload),
        "utf8"
      ).toString("base64"),
    };
    if (method !== "GET") {
      retryHeaders["Content-Type"] = "application/json";
    }
    const retry = await fetch(input.url, {
      method,
      headers: retryHeaders,
      body: method === "GET" ? undefined : input.requestBody || "{}",
    });
    const body = parseJsonBody(await retry.text());
    return ok({
      signature,
      nonce,
      httpStatus: retry.status,
      paymentResponse: retry.headers.get("PAYMENT-RESPONSE"),
      body,
      note: "Nanopayments use EIP-3009 ecrecover only. SCA / ERC-1271 is not supported.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function settleX402(input: NanoInput) {
  if (!input.authorizationJson && !input.nonce) {
    return fail("authorizationJson or nonce is required");
  }
  try {
    const parsed = input.authorizationJson
      ? (JSON.parse(input.authorizationJson) as unknown)
      : { nonce: input.nonce };
    const record =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    const isX402Payload = Boolean(
      record && (record.payload || record.accepted || record.paymentPayload)
    );
    const path = isX402Payload
      ? "/v1/x402/settle"
      : input.authorizationJson
        ? "/v1/transfer"
        : `/v1/transfers?nonce=${encodeURIComponent(input.nonce || "")}`;
    const body = isX402Payload
      ? {
          paymentPayload: record?.paymentPayload ?? parsed,
          paymentRequirements: record?.paymentRequirements ?? record?.accepted,
        }
      : input.authorizationJson
        ? parsed
        : undefined;
    const result = await circleFetch({
      baseUrl: gatewayApi(input.network || "arc-testnet"),
      path,
      method: input.authorizationJson || isX402Payload ? "POST" : "GET",
      body,
    });
    if (result.error) {
      return fail(result.error);
    }
    return ok(result.data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function discoverAgentServices() {
  try {
    const result = await circleFetch({
      baseUrl: CIRCLE_API,
      path: "/v2/x402/discovery/resources",
    });
    if (result.error) {
      return fail(result.error);
    }
    return ok(result.data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function withdrawFromGateway(input: NanoInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network || !input.amount) {
    return fail("network and amount are required");
  }
  try {
    const chain = requireChain(input.network);
    const dest = input.destinationNetwork || input.network;
    if (dest === input.network) {
      const token = input.tokenAddress || lookupToken("USDC", input.network)?.address;
      if (!token) {
        return fail("USDC address unknown. Pass tokenAddress.");
      }
      const { hash } = await sendSponsoredTransaction({
        walletId: wallet.wallet.privyWalletId,
        chain,
        to: gatewayWallet(input.network),
        data: `${SELECTORS.gatewayInitiateWithdrawal}${token.slice(2).padStart(64, "0")}${parseUnits(input.amount, 6).toString(16).padStart(64, "0")}`,
      });
      return ok({
        hash,
        kind: "same-chain-initiate-withdraw",
        explorer: explorerTx(input.network, hash),
      });
    }
    const token = input.tokenAddress || lookupToken("USDC", input.network)?.address;
    if (!token) {
      return fail("USDC address unknown. Pass tokenAddress.");
    }
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: tokenMessenger(input.network),
      data: encodeDepositForBurn({
        amount: parseUnits(input.amount, 6),
        destinationDomain: dest === "arc-testnet" ? 26 : 0,
        mintRecipient: input.mintRecipient || wallet.wallet.address,
        burnToken: token,
        maxFee: BigInt(0),
        minFinalityThreshold: 1000,
      }),
    });
    return ok({
      hash,
      kind: "cross-chain-mint",
      explorer: explorerTx(input.network, hash),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function depositToGatewayStep(input: NanoInput) {
  "use step";
  return withStepLogging(input, () => depositToGateway(input));
}

export async function getNanopaymentBalanceStep(input: NanoInput) {
  "use step";
  return withStepLogging(input, () => getNanopaymentBalance(input));
}

export async function checkX402SupportStep(input: NanoInput) {
  "use step";
  return withStepLogging(input, () => checkX402Support(input));
}

export async function payX402Step(input: NanoInput) {
  "use step";
  return withStepLogging(input, () => payX402(input));
}

export async function settleX402Step(input: NanoInput) {
  "use step";
  return withStepLogging(input, () => settleX402(input));
}

export async function discoverAgentServicesStep(input: NanoInput) {
  "use step";
  return withStepLogging(input, () => discoverAgentServices());
}

export async function withdrawFromGatewayStep(input: NanoInput) {
  "use step";
  return withStepLogging(input, () => withdrawFromGateway(input));
}

export const _integrationType = "circle";
