import "server-only";

import { getIrisAttestation as irisAttest } from "@/lib/arc/app-kit-flows";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { encodeApprove } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";
import { ARC_ADDRESSES, encodeDepositForBurn, encodeReceiveMessage } from "../shared";

export type BridgeInput = StepInput & {
  integrationId?: string;
  fromNetwork?: string;
  toNetwork?: string;
  amount?: string;
  recipient?: string;
  transferSpeed?: string;
  maxFee?: string;
  burnTxHash?: string;
  message?: string;
  attestation?: string;
};

const DOMAINS: Record<string, number> = {
  ethereum: 0,
  base: 6,
  arbitrum: 3,
  optimism: 2,
  polygon: 7,
  "arc-testnet": 26,
};

const MESSENGER: Record<string, string> = {
  ethereum: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  base: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  arbitrum: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  optimism: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  polygon: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  "arc-testnet": ARC_ADDRESSES.tokenMessenger,
};

const USDC: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "arc-testnet": ARC_ADDRESSES.usdcErc20,
};

async function bridgeUsdc(input: BridgeInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.fromNetwork || !input.toNetwork || !input.amount) {
    return fail("fromNetwork, toNetwork, and amount are required");
  }
  if (input.fromNetwork !== "arc-testnet" && input.toNetwork !== "arc-testnet") {
    return fail("Arc plugin bridges require Arc Testnet as from or to");
  }
  try {
    const chain = requireChain(input.fromNetwork);
    const destDomain = DOMAINS[input.toNetwork];
    const messenger = MESSENGER[input.fromNetwork];
    const token = USDC[input.fromNetwork];
    if (destDomain === undefined || !messenger || !token) {
      return fail("Unsupported CCTP route");
    }
    const amount = parseUnits(input.amount, 6);
    const recipient = input.recipient || wallet.wallet.address;
    await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: token,
      data: encodeApprove(messenger, amount),
    });
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: messenger,
      data: encodeDepositForBurn({
        amount,
        destinationDomain: destDomain,
        mintRecipient: recipient,
        burnToken: token,
        maxFee: input.maxFee ? parseUnits(input.maxFee, 6) : BigInt(0),
        minFinalityThreshold: input.transferSpeed === "standard" ? 2000 : 1000,
      }),
    });
    return ok({
      hash,
      fromNetwork: input.fromNetwork,
      toNetwork: input.toNetwork,
      destinationDomain: destDomain,
      recipient,
      amount: input.amount,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function retryBridge(input: BridgeInput) {
  if (!input.burnTxHash && (!input.message || !input.attestation)) {
    return fail("Provide burnTxHash or message + attestation from the failed step");
  }
  try {
    let message = input.message;
    let attestation = input.attestation;
    if (input.burnTxHash && (!message || !attestation)) {
      const iris = await irisAttest(input.burnTxHash);
      if (iris.error) {
        return fail(iris.error);
      }
      const payload = iris.data as {
        messages?: Array<{ message?: string; attestation?: string }>;
      };
      message = payload.messages?.[0]?.message;
      attestation = payload.messages?.[0]?.attestation;
    }
    if (!message || !attestation || attestation === "PENDING") {
      return fail("Iris attestation is not ready yet. Retry after finality.");
    }
    const dest = input.toNetwork || "arc-testnet";
    const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
    if (!wallet.success) {
      return wallet;
    }
    const chain = requireChain(dest);
    const transmitter =
      dest === "arc-testnet"
        ? ARC_ADDRESSES.messageTransmitter
        : "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64";
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: transmitter,
      data: encodeReceiveMessage(message, attestation),
    });
    return ok({ hash, message, attestation });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function estimateBridge(input: BridgeInput) {
  if (!input.fromNetwork || !input.toNetwork || !input.amount) {
    return fail("fromNetwork, toNetwork, and amount are required");
  }
  const fast = input.transferSpeed !== "standard";
  return ok({
    fromNetwork: input.fromNetwork,
    toNetwork: input.toNetwork,
    amount: input.amount,
    minFinalityThreshold: fast ? 1000 : 2000,
    estimatedMaxFee: input.maxFee || "0",
    note: "CCTP Fast uses finality 1000. Standard uses 2000. Gas is paid on the source chain.",
  });
}

export async function bridgeUsdcStep(input: BridgeInput) {
  "use step";
  return withStepLogging(input, () => bridgeUsdc(input));
}

export async function retryBridgeStep(input: BridgeInput) {
  "use step";
  return withStepLogging(input, () => retryBridge(input));
}

export async function estimateBridgeStep(input: BridgeInput) {
  "use step";
  return withStepLogging(input, () => estimateBridge(input));
}

export const _integrationType = "arc";
