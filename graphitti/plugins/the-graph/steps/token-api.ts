import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { tokenApiGet } from "@/lib/the-graph/token-api";
import type { TheGraphCredentials } from "../credentials";
import { loadTheGraphCredentials } from "../load-credentials";
import { aliasNetwork, requireGatewayKey } from "./shared";

type TokenApiInput = StepInput & {
  integrationId?: string;
  network?: string;
  address?: string;
  token?: string;
  pool?: string;
  startTime?: string;
  endTime?: string;
  age?: string;
};

function tokenNetwork(network?: string): string | undefined {
  const aliased = aliasNetwork(network);
  if (aliased === "arbitrum") {
    return "arbitrum-one";
  }
  return aliased;
}

async function tokenGet(
  credentials: TheGraphCredentials,
  path: string,
  searchParams: Record<string, string | undefined>
) {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return apiKey;
  }
  const result = await tokenApiGet(path, apiKey, searchParams);
  const requestUrl = `https://token-api.thegraph.com${path}`;
  if (result.error) {
    return fail(result.error);
  }
  return ok({
    result: result.data,
    httpStatus: result.httpStatus,
    query_url: requestUrl,
    query_url_x402: "",
  });
}

async function balancesHandler(
  input: TokenApiInput,
  credentials: TheGraphCredentials
) {
  const network = tokenNetwork(input.network);
  const address = input.address?.trim();
  if (!network || !address) {
    return fail("network and address are required");
  }
  try {
    return await tokenGet(credentials, "/v1/evm/balances", { network, address });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function transfersHandler(
  input: TokenApiInput,
  credentials: TheGraphCredentials
) {
  const network = tokenNetwork(input.network);
  const address = input.address?.trim();
  if (!network || !address) {
    return fail("network and address are required");
  }
  try {
    return await tokenGet(credentials, "/v1/evm/transfers", {
      network,
      address,
      startTime: input.startTime?.trim(),
      endTime: input.endTime?.trim(),
      age: input.age?.trim(),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function holdersHandler(
  input: TokenApiInput,
  credentials: TheGraphCredentials
) {
  const network = tokenNetwork(input.network);
  const token = input.token?.trim();
  if (!network || !token) {
    return fail("network and token are required");
  }
  try {
    return await tokenGet(credentials, "/v1/evm/holders", { network, token });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function swapsHandler(
  input: TokenApiInput,
  credentials: TheGraphCredentials
) {
  const network = tokenNetwork(input.network);
  if (!network) {
    return fail("network is required");
  }
  try {
    return await tokenGet(credentials, "/v1/evm/swaps", {
      network,
      pool: input.pool?.trim(),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function nftHandler(
  input: TokenApiInput,
  credentials: TheGraphCredentials
) {
  const network = tokenNetwork(input.network);
  const address = input.address?.trim();
  if (!network || !address) {
    return fail("network and address are required");
  }
  try {
    return await tokenGet(credentials, "/v1/evm/nft/transfers", {
      network,
      address,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function withCreds(
  input: TokenApiInput,
  handler: (
    input: TokenApiInput,
    credentials: TheGraphCredentials
  ) => Promise<ReturnType<typeof ok> | ReturnType<typeof fail>>
) {
  return withStepLogging(input, async () => {
    const credentials = await loadTheGraphCredentials(input.integrationId);
    return handler(input, credentials);
  });
}

export async function getTokenBalancesStep(input: TokenApiInput) {
  "use step";
  return withCreds(input, balancesHandler);
}

export async function getTokenTransfersStep(input: TokenApiInput) {
  "use step";
  return withCreds(input, transfersHandler);
}

export async function getTokenHoldersStep(input: TokenApiInput) {
  "use step";
  return withCreds(input, holdersHandler);
}

export async function getDexSwapsStep(input: TokenApiInput) {
  "use step";
  return withCreds(input, swapsHandler);
}

export async function getNftActivityStep(input: TokenApiInput) {
  "use step";
  return withCreds(input, nftHandler);
}

export const _integrationType = "the-graph";
