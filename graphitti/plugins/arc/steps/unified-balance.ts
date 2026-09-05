import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { encodeApprove, decodeUint } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { ethCall } from "@/lib/web3/rpc";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";
import {
  ARC_ADDRESSES,
  circleFetch,
  encodeAddressUint,
  encodeDepositFor,
  encodeTwoAddresses,
  gatewayApi,
  SELECTORS,
} from "../shared";

export type UbInput = StepInput & {
  network?: string;
  amount?: string;
  tokenAddress?: string;
  recipient?: string;
  delegate?: string;
  depositor?: string;
  signedBurnIntent?: string;
  destinationAddress?: string;
  destinationDomain?: string;
};

function token(input: UbInput) {
  return input.tokenAddress || ARC_ADDRESSES.usdcErc20;
}

async function ubDeposit(input: UbInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.amount) {
    return fail("amount is required");
  }
  try {
    const network = input.network || "arc-testnet";
    const chain = requireChain(network);
    const usdc = token(input);
    const amount = parseUnits(input.amount, 6);
    const gateway = ARC_ADDRESSES.gatewayWallet;
    await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: usdc,
      data: encodeApprove(gateway, amount),
    });
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: gateway,
      data: encodeAddressUint(SELECTORS.gatewayDeposit, usdc, amount),
    });
    return ok({ hash, gateway, token: usdc, amount: input.amount });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubDepositFor(input: UbInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.amount || !input.recipient) {
    return fail("amount and recipient are required");
  }
  try {
    const network = input.network || "arc-testnet";
    const chain = requireChain(network);
    const usdc = token(input);
    const amount = parseUnits(input.amount, 6);
    const gateway = ARC_ADDRESSES.gatewayWallet;
    await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: usdc,
      data: encodeApprove(gateway, amount),
    });
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: gateway,
      data: encodeDepositFor(usdc, input.recipient, amount),
    });
    return ok({ hash, creditedTo: input.recipient, amount: input.amount });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubSpend(input: UbInput) {
  if (!input.delegate) {
    return fail(
      "Gateway spend requires a delegate. Privy server wallets cannot sign Gateway spends directly. Add a delegate first."
    );
  }
  if (!input.signedBurnIntent) {
    return fail(
      "Submit a burn intent signed by the authorized delegate. Do not sign Gateway spend with the Privy server wallet."
    );
  }
  try {
    const body = JSON.parse(input.signedBurnIntent);
    const result = await circleFetch({
      baseUrl: gatewayApi(input.network || "arc-testnet"),
      path: "/v1/transfer",
      method: "POST",
      body,
    });
    if (result.error) {
      return fail(result.error);
    }
    return ok({
      data: result.data,
      delegate: input.delegate,
      note: "Spend submitted with a delegate-signed burn intent.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubAddDelegate(input: UbInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.delegate) {
    return fail("delegate is required");
  }
  try {
    const chain = requireChain(input.network || "arc-testnet");
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: ARC_ADDRESSES.gatewayWallet,
      data: encodeTwoAddresses(SELECTORS.gatewayAddDelegate, token(input), input.delegate),
    });
    return ok({ hash, delegate: input.delegate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubRemoveDelegate(input: UbInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.delegate) {
    return fail("delegate is required");
  }
  try {
    const chain = requireChain(input.network || "arc-testnet");
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: ARC_ADDRESSES.gatewayWallet,
      data: encodeTwoAddresses(SELECTORS.gatewayRemoveDelegate, token(input), input.delegate),
    });
    return ok({ hash, delegate: input.delegate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubDelegateStatus(input: UbInput) {
  if (!input.depositor || !input.delegate) {
    return fail("depositor and delegate are required");
  }
  try {
    const raw = await ethCall({
      network: input.network || "arc-testnet",
      to: ARC_ADDRESSES.gatewayWallet,
      data: `${SELECTORS.isAuthorizedForBalance}${token(input).slice(2).padStart(64, "0")}${input.depositor.slice(2).padStart(64, "0")}${input.delegate.slice(2).padStart(64, "0")}`,
    });
    return ok({
      depositor: input.depositor,
      delegate: input.delegate,
      authorized: decodeUint(raw) !== BigInt(0),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubInitiateRemoveFund(input: UbInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.amount) {
    return fail("amount is required");
  }
  try {
    const chain = requireChain(input.network || "arc-testnet");
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: ARC_ADDRESSES.gatewayWallet,
      data: encodeAddressUint(
        SELECTORS.gatewayInitiateWithdrawal,
        token(input),
        parseUnits(input.amount, 6)
      ),
    });
    return ok({ hash, amount: input.amount });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubCompleteRemoveFund(input: UbInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  try {
    const chain = requireChain(input.network || "arc-testnet");
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: ARC_ADDRESSES.gatewayWallet,
      data: `${SELECTORS.gatewayWithdraw}${token(input).slice(2).padStart(64, "0")}`,
    });
    return ok({ hash });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function ubGetBalances(input: UbInput) {
  if (!input.depositor) {
    return fail("depositor is required");
  }
  try {
    const result = await circleFetch({
      baseUrl: gatewayApi(input.network || "arc-testnet"),
      path: "/v1/balances",
      method: "POST",
      body: {
        token: "USDC",
        sources: [{ domain: 26, depositor: input.depositor }],
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

async function estimateSpend(input: UbInput) {
  return ok({
    destinationDomain: input.destinationDomain || "26",
    destinationAddress: input.destinationAddress,
    amount: input.amount,
    note: "Spend is signed by a Gateway delegate, not the Privy server wallet.",
  });
}

export async function ubDepositStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubDeposit(input));
}

export async function ubDepositForStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubDepositFor(input));
}

export async function ubSpendStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubSpend(input));
}

export async function ubAddDelegateStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubAddDelegate(input));
}

export async function ubRemoveDelegateStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubRemoveDelegate(input));
}

export async function ubDelegateStatusStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubDelegateStatus(input));
}

export async function ubInitiateRemoveFundStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubInitiateRemoveFund(input));
}

export async function ubCompleteRemoveFundStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubCompleteRemoveFund(input));
}

export async function ubGetBalancesStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => ubGetBalances(input));
}

export async function estimateSpendStep(input: UbInput) {
  "use step";
  return withStepLogging(input, () => estimateSpend(input));
}

export const _integrationType = "arc";
