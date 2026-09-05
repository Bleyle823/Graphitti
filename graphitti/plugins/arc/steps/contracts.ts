import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { padAddress, padUint } from "@/lib/web3/abi";
import { requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { ethCall } from "@/lib/web3/rpc";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";
import { ARC_ADDRESSES } from "../shared";

export type ArcContractInput = StepInput & {
  target?: string;
  data?: string;
  value?: string;
  memo?: string;
  bytecode?: string;
  salt?: string;
  contractAddress?: string;
  registryAddress?: string;
  agentUri?: string;
  jobCalldata?: string;
};

async function attachMemo(input: ArcContractInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.target || !input.data) {
    return fail("target and data are required");
  }
  try {
    const chain = requireChain("arc-testnet");
    const inner = input.data.startsWith("0x") ? input.data.slice(2) : input.data;
    const padded = inner + (inner.length % 64 === 0 ? "" : "0".repeat(64 - (inner.length % 64)));
    const calldata = `0x${padAddress(input.target)}${padUint(64)}${padUint(inner.length / 2)}${padded}`;
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: ARC_ADDRESSES.memo,
      data: calldata,
      value: input.value,
    });
    return ok({
      hash,
      memo: input.memo,
      target: input.target,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function deployOnArc(input: ArcContractInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.bytecode) {
    return fail("bytecode is required");
  }
  try {
    const chain = requireChain("arc-testnet");
    const salt = (input.salt || "0".repeat(64)).replace(/^0x/, "").padStart(64, "0");
    const init = input.bytecode.startsWith("0x") ? input.bytecode.slice(2) : input.bytecode;
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: ARC_ADDRESSES.create2,
      data: `0x${salt}${init}`,
    });
    return ok({
      hash,
      factory: ARC_ADDRESSES.create2,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
      note: "Deployed via CREATE2 factory with USDC gas. SCP template deploy stays on the Circle plugin.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function readContract(input: ArcContractInput) {
  if (!input.contractAddress || !input.data) {
    return fail("contractAddress and data are required");
  }
  try {
    const result = await ethCall({
      network: "arc-testnet",
      to: input.contractAddress,
      data: input.data,
    });
    return ok({ result });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function writeContract(input: ArcContractInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.contractAddress || !input.data) {
    return fail("contractAddress and data are required");
  }
  try {
    const chain = requireChain("arc-testnet");
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: input.contractAddress,
      data: input.data,
      value: input.value,
    });
    return ok({
      hash,
      from: wallet.wallet.address,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function erc8004Register(input: ArcContractInput) {
  if (!input.registryAddress || !input.agentUri) {
    return fail("registryAddress and agentUri are required");
  }
  const encoded = Buffer.from(input.agentUri, "utf8").toString("hex");
  const padded = encoded + (encoded.length % 64 === 0 ? "" : "0".repeat(64 - (encoded.length % 64)));
  const data = `0x${padUint(32)}${padUint(encoded.length / 2)}${padded}`;
  return writeContract({
    ...input,
    contractAddress: input.registryAddress,
    data,
  });
}

async function erc8183CreateJob(input: ArcContractInput) {
  if (!input.registryAddress || !input.jobCalldata) {
    return fail("registryAddress and jobCalldata are required");
  }
  return writeContract({
    ...input,
    contractAddress: input.registryAddress,
    data: input.jobCalldata,
  });
}

async function usycInfo() {
  return ok({
    usyc: ARC_ADDRESSES.usyc,
    entitlements: ARC_ADDRESSES.usycEntitlements,
    teller: ARC_ADDRESSES.usycTeller,
    decimals: 6,
    eligibility:
      "USYC Teller mint is allowlisted. Institutions outside the United States, subject to eligibility and a $100,000 minimum. Request allowlisting via Circle Support before calling the Teller.",
  });
}

export async function attachMemoStep(input: ArcContractInput) {
  "use step";
  return withStepLogging(input, () => attachMemo(input));
}

export async function deployOnArcStep(input: ArcContractInput) {
  "use step";
  return withStepLogging(input, () => deployOnArc(input));
}

export async function readContractStep(input: ArcContractInput) {
  "use step";
  return withStepLogging(input, () => readContract(input));
}

export async function writeContractStep(input: ArcContractInput) {
  "use step";
  return withStepLogging(input, () => writeContract(input));
}

export async function erc8004RegisterStep(input: ArcContractInput) {
  "use step";
  return withStepLogging(input, () => erc8004Register(input));
}

export async function erc8183CreateJobStep(input: ArcContractInput) {
  "use step";
  return withStepLogging(input, () => erc8183CreateJob(input));
}

export async function usycInfoStep(input: ArcContractInput) {
  "use step";
  return withStepLogging(input, () => usycInfo());
}

export const _integrationType = "arc";
