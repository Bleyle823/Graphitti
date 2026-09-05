import "server-only";

import { ARC_GENESIS } from "@/lib/arc/app-kit-flows";
import { circleFetch } from "@/lib/circle/client";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { CCTP_DOMAINS, gatewayApi } from "../shared";

export type GatewayInput = StepInput & {
  network?: string;
  address?: string;
  token?: string;
  destinationDomain?: string;
  destinationAddress?: string;
  amount?: string;
  sourcesJson?: string;
};

async function getBalances(input: GatewayInput) {
  if (!input.address && !input.sourcesJson) {
    return fail("address or sourcesJson is required");
  }
  try {
    const sources = input.sourcesJson
      ? (JSON.parse(input.sourcesJson) as Array<{ domain: number; depositor: string }>)
      : Object.values(CCTP_DOMAINS).map((domain) => ({
          domain,
          depositor: input.address as string,
        }));
    const result = await circleFetch({
      baseUrl: gatewayApi(input.network || "arc-testnet"),
      path: "/v1/balances",
      method: "POST",
      body: {
        token: input.token || "USDC",
        sources,
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

async function createTransfer(input: GatewayInput) {
  if (!input.destinationAddress || !input.amount) {
    return fail("destinationAddress and amount are required");
  }
  try {
    const destDomain = input.destinationDomain
      ? Number(input.destinationDomain)
      : ARC_GENESIS.cctpDomain;
    const result = await circleFetch({
      baseUrl: gatewayApi(input.network || "arc-testnet"),
      path: "/v1/transfer",
      method: "POST",
      body: {
        destination: {
          domain: destDomain,
          recipient: input.destinationAddress,
        },
        amount: input.amount,
        token: input.token || "USDC",
        ...(input.sourcesJson ? { sources: JSON.parse(input.sourcesJson) } : {}),
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

export async function getGatewayBalancesStep(input: GatewayInput) {
  "use step";
  return withStepLogging(input, () => getBalances(input));
}

export async function createGatewayTransferStep(input: GatewayInput) {
  "use step";
  return withStepLogging(input, () => createTransfer(input));
}

export const _integrationType = "circle";
