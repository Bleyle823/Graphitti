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

async function checkX402Support(input: NanoInput) {
  if (!input.url) {
    return fail("url is required");
  }
  const blocked = rejectGraphX402(input.url);
  if (blocked) {
    return blocked;
  }
  try {
    const response = await fetch(input.url, { method: "GET" });
    const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
    const bodyText = await response.text();
    let body: unknown = bodyText;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }
    const acceptsGateway =
      paymentRequired?.includes("GatewayWalletBatched") ||
      JSON.stringify(body).includes("GatewayWalletBatched");
    return ok({
      httpStatus: response.status,
      paymentRequired: response.status === 402,
      paymentRequiredHeader: paymentRequired,
      acceptsGatewayWalletBatched: Boolean(acceptsGateway),
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
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network || !input.payTo || !input.amount) {
    return fail("network, payTo, and amount are required");
  }
  try {
    const chain = requireChain(input.network);
    const token = input.tokenAddress || lookupToken("USDC", input.network)?.address;
    if (!token) {
      return fail("USDC address unknown. Pass tokenAddress.");
    }
    const nonce =
      input.nonce ||
      `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}`;
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
        name: "USD Coin",
        version: "2",
        chainId: chain.chainId,
        verifyingContract: token,
      },
      primaryType: "TransferWithAuthorization",
      message: {
        from: wallet.wallet.address,
        to: input.payTo,
        value: parseUnits(input.amount, 6).toString(),
        validAfter: input.validAfter || "0",
        validBefore: input.validBefore || String(Math.floor(Date.now() / 1000) + 3600),
        nonce,
      },
    };
    const { signature } = await signTypedDataV4({
      walletId: wallet.wallet.privyWalletId,
      typedData,
      chain,
    });
    const retry = await fetch(input.url, {
      method: "GET",
      headers: {
        "PAYMENT-SIGNATURE": signature,
        "PAYMENT-REQUIRED": JSON.stringify(typedData.message),
      },
    });
    const text = await retry.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return ok({
      signature,
      nonce,
      httpStatus: retry.status,
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
    const body = input.authorizationJson
      ? JSON.parse(input.authorizationJson)
      : { nonce: input.nonce };
    const path = input.authorizationJson ? "/v1/transfer" : `/v1/transfers?nonce=${encodeURIComponent(input.nonce || "")}`;
    const result = await circleFetch({
      baseUrl: gatewayApi(input.network || "arc-testnet"),
      path,
      method: input.authorizationJson ? "POST" : "GET",
      body: input.authorizationJson ? body : undefined,
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
