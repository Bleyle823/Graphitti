import "server-only";

import { ARC_GENESIS, getIrisAttestation } from "@/lib/arc/app-kit-flows";
import { CIRCLE_IRIS, circleFetch } from "@/lib/circle/client";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { encodeApprove } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";
import {
  CCTP_DOMAINS,
  encodeDepositForBurn,
  encodeReceiveMessage,
  explorerTx,
  irisBase,
  lookupToken,
  messageTransmitter,
  tokenMessenger,
} from "../shared";

export type CctpInput = StepInput & {
  network?: string;
  destinationNetwork?: string;
  amount?: string;
  mintRecipient?: string;
  burnToken?: string;
  tokenSymbol?: string;
  destinationCaller?: string;
  maxFee?: string;
  transferSpeed?: string;
  transactionHash?: string;
  sourceDomain?: string;
  message?: string;
  attestation?: string;
};

const DOMAINS = [
  { network: "ethereum", domain: 0, usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  { network: "base", domain: 6, usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  { network: "arbitrum", domain: 3, usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  { network: "optimism", domain: 2, usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" },
  { network: "polygon", domain: 7, usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" },
  { network: "arc-testnet", domain: 26, usdc: ARC_GENESIS.usdcErc20 },
];

async function depositForBurn(input: CctpInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network || !input.destinationNetwork || !input.amount || !input.mintRecipient) {
    return fail("network, destinationNetwork, amount, and mintRecipient are required");
  }
  try {
    const chain = requireChain(input.network);
    const destDomain = CCTP_DOMAINS[input.destinationNetwork];
    if (destDomain === undefined) {
      return fail(`Unsupported destination network "${input.destinationNetwork}"`);
    }
    const symbol = input.tokenSymbol === "EURC" ? "EURC" : "USDC";
    const token = input.burnToken || lookupToken(symbol, input.network)?.address;
    if (!token) {
      return fail(`No ${symbol} address for ${input.network}. Pass burnToken.`);
    }
    const amount = parseUnits(input.amount, 6);
    const messenger = tokenMessenger(input.network);
    const approveHash = (
      await sendSponsoredTransaction({
        walletId: wallet.wallet.privyWalletId,
        chain,
        to: token,
        data: encodeApprove(messenger, amount),
      })
    ).hash;
    const minFinality = input.transferSpeed === "standard" ? 2000 : 1000;
    const maxFee = input.maxFee ? parseUnits(input.maxFee, 6) : BigInt(0);
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: messenger,
      data: encodeDepositForBurn({
        amount,
        destinationDomain: destDomain,
        mintRecipient: input.mintRecipient,
        burnToken: token,
        destinationCaller: input.destinationCaller,
        maxFee,
        minFinalityThreshold: minFinality,
      }),
    });
    return ok({
      approveHash,
      hash,
      sourceDomain: CCTP_DOMAINS[input.network],
      destinationDomain: destDomain,
      token,
      amount: input.amount,
      explorer: explorerTx(input.network, hash),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function irisAttestation(input: CctpInput) {
  if (!input.transactionHash) {
    return fail("transactionHash is required");
  }
  try {
    if (!input.sourceDomain || input.sourceDomain === "26") {
      const result = await getIrisAttestation(input.transactionHash);
      if (result.error) {
        return fail(result.error);
      }
      return ok(result.data);
    }
    const base = irisBase(input.network || "ethereum");
    const result = await circleFetch({
      baseUrl: input.network ? base : CIRCLE_IRIS,
      path: `/v2/messages/${encodeURIComponent(input.sourceDomain)}?transactionHash=${encodeURIComponent(input.transactionHash)}`,
    });
    if (result.error) {
      return fail(result.error);
    }
    return ok(result.data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function receiveMint(input: CctpInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network || !input.message || !input.attestation) {
    return fail("network, message, and attestation are required");
  }
  try {
    const chain = requireChain(input.network);
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: messageTransmitter(input.network),
      data: encodeReceiveMessage(input.message, input.attestation),
    });
    return ok({
      hash,
      transmitter: messageTransmitter(input.network),
      explorer: explorerTx(input.network, hash),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function getDomains() {
  return ok({
    domains: DOMAINS,
    note: "CCTP V2 moves USDC and EURC. Arc Testnet is domain 26.",
  });
}

export async function depositForBurnStep(input: CctpInput) {
  "use step";
  return withStepLogging(input, () => depositForBurn(input));
}

export async function getIrisAttestationStep(input: CctpInput) {
  "use step";
  return withStepLogging(input, () => irisAttestation(input));
}

export async function receiveMintStep(input: CctpInput) {
  "use step";
  return withStepLogging(input, () => receiveMint(input));
}

export async function getDomainsStep(input: CctpInput) {
  "use step";
  return withStepLogging(input, () => getDomains());
}

export const _integrationType = "circle";
