import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { decodeUint, encodeAllowance, encodeApprove } from "@/lib/web3/abi";
import { formatUnits, parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { ethCall } from "@/lib/web3/rpc";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type ApproveInput = StepInput & {
  network: string;
  tokenAddress: string;
  spender: string;
  amount?: string;
  owner?: string;
  decimals?: string;
};

async function approveHandler(input: ApproveInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.tokenAddress || !input.spender || !input.amount) {
    return fail("Token address, spender, and amount are required");
  }
  try {
    const chain = requireChain(input.network);
    const decimals = Number(input.decimals || "18");
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: input.tokenAddress,
      data: encodeApprove(input.spender, parseUnits(input.amount, decimals)),
    });
    return ok({
      hash,
      tokenAddress: input.tokenAddress,
      spender: input.spender,
      amount: input.amount,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function allowanceHandler(input: ApproveInput) {
  if (!input.tokenAddress || !input.spender || !input.owner) {
    return fail("Token address, owner, and spender are required");
  }
  try {
    const raw = await ethCall({
      network: input.network,
      to: input.tokenAddress,
      data: encodeAllowance(input.owner, input.spender),
    });
    const decimals = Number(input.decimals || "18");
    return ok({
      owner: input.owner,
      spender: input.spender,
      tokenAddress: input.tokenAddress,
      allowanceRaw: decodeUint(raw).toString(),
      allowance: formatUnits(raw, decimals),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function approveTokenStep(input: ApproveInput) {
  "use step";
  return withStepLogging(input, () => approveHandler(input));
}

export async function checkAllowanceStep(input: ApproveInput) {
  "use step";
  return withStepLogging(input, () => allowanceHandler(input));
}

export const _integrationType = "web3";
