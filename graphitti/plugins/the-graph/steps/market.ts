import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { marketGet } from "@/lib/the-graph/market";
import type { TheGraphCredentials } from "../credentials";
import { loadTheGraphCredentials } from "../load-credentials";
import { requireMarketBearer } from "./shared";

type MarketInput = StepInput & {
  integrationId?: string;
  organizationId?: string;
  deploymentId?: string;
  limit?: string;
  tailLines?: string;
  previous?: string;
};

const PORTAL = "/sf.portalapi.v1.PortalApi";
const HOSTED = "/sf.portalapi.v1.HostedService";

function withOrg(path: string, organizationId?: string) {
  if (!organizationId?.trim()) {
    return path;
  }
  const url = new URL(path, "https://admin.streamingfast.io");
  url.searchParams.set("organization_id", organizationId.trim());
  return `${url.pathname}${url.search}`;
}

function withParams(
  path: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(path, "https://admin.streamingfast.io");
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) {
      url.searchParams.set(key, value.trim());
    }
  }
  return `${url.pathname}${url.search}`;
}

async function readMarket(
  credentials: TheGraphCredentials,
  path: string
) {
  const bearer = requireMarketBearer(credentials);
  if (typeof bearer !== "string") {
    return bearer;
  }
  const result = await marketGet(path, bearer);
  if (result.error) {
    return fail(result.error);
  }
  return ok({
    result: result.data,
    httpStatus: result.httpStatus,
    query_url: `https://admin.streamingfast.io${path}`,
    query_url_x402: "",
  });
}

async function subscriptionHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  try {
    return await readMarket(
      credentials,
      withOrg(`${PORTAL}/GetOrganizationSubscription`, input.organizationId)
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function usageHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  try {
    return await readMarket(
      credentials,
      withOrg(
        `${PORTAL}/MultiServiceUsageSummaryByOrganization`,
        input.organizationId
      )
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function billPreviewHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  try {
    return await readMarket(
      credentials,
      withParams(`${PORTAL}/GetUsageBilling`, {
        organization_id: input.organizationId,
        usage: "{}",
      })
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function connectionsHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  try {
    return await readMarket(
      credentials,
      withOrg(`${PORTAL}/ActiveConnections`, input.organizationId)
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function listDeploymentsHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  try {
    return await readMarket(
      credentials,
      withOrg(`${HOSTED}/ListDeployments`, input.organizationId)
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function deploymentStateHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  const deploymentId = input.deploymentId?.trim();
  if (!deploymentId) {
    return fail("deploymentId is required");
  }
  try {
    return await readMarket(
      credentials,
      withParams(`${HOSTED}/GetDeploymentState`, {
        deployment_id: deploymentId,
        organization_id: input.organizationId,
      })
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function deploymentEventsHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  const deploymentId = input.deploymentId?.trim();
  if (!deploymentId) {
    return fail("deploymentId is required");
  }
  try {
    return await readMarket(
      credentials,
      withParams(`${HOSTED}/GetDeploymentEvents`, {
        deployment_id: deploymentId,
        organization_id: input.organizationId,
        limit: input.limit?.trim() || "20",
      })
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function deploymentLogsHandler(
  input: MarketInput,
  credentials: TheGraphCredentials
) {
  const deploymentId = input.deploymentId?.trim();
  if (!deploymentId) {
    return fail("deploymentId is required");
  }
  try {
    return await readMarket(
      credentials,
      withParams(`${HOSTED}/Logs`, {
        deployment_id: deploymentId,
        organization_id: input.organizationId,
        tail_lines: input.tailLines?.trim() || "200",
        previous: input.previous?.trim(),
      })
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function withCreds(
  input: MarketInput,
  handler: (
    input: MarketInput,
    credentials: TheGraphCredentials
  ) => Promise<ReturnType<typeof ok> | ReturnType<typeof fail>>
) {
  return withStepLogging(input, async () => {
    const credentials = await loadTheGraphCredentials(input.integrationId);
    return handler(input, credentials);
  });
}

export async function getSubscriptionStep(input: MarketInput) {
  "use step";
  return withCreds(input, subscriptionHandler);
}

export async function getUsageSummaryStep(input: MarketInput) {
  "use step";
  return withCreds(input, usageHandler);
}

export async function getBillPreviewStep(input: MarketInput) {
  "use step";
  return withCreds(input, billPreviewHandler);
}

export async function getActiveConnectionsStep(input: MarketInput) {
  "use step";
  return withCreds(input, connectionsHandler);
}

export async function listHostedDeploymentsStep(input: MarketInput) {
  "use step";
  return withCreds(input, listDeploymentsHandler);
}

export async function getDeploymentStateStep(input: MarketInput) {
  "use step";
  return withCreds(input, deploymentStateHandler);
}

export async function getDeploymentEventsStep(input: MarketInput) {
  "use step";
  return withCreds(input, deploymentEventsHandler);
}

export async function getDeploymentLogsStep(input: MarketInput) {
  "use step";
  return withCreds(input, deploymentLogsHandler);
}

export const _integrationType = "the-graph";
