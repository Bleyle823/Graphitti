import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { CircleCredentials } from "../credentials";
import {
  circleApi,
  entitySecretCiphertext,
  newIdempotencyKey,
  requireApiKey,
} from "../shared";

export type ContractInput = StepInput & {
  integrationId?: string;
  contractId?: string;
  address?: string;
  blockchain?: string;
  name?: string;
  description?: string;
  abiFunctionSignature?: string;
  abiParameters?: string;
  bytecode?: string;
  abiJson?: string;
  templateId?: string;
  constructorParameters?: string;
  walletId?: string;
  feeLevel?: string;
  eventName?: string;
  monitorId?: string;
  status?: string;
  from?: string;
  to?: string;
};

async function creds(input: ContractInput): Promise<CircleCredentials> {
  return input.integrationId ? await fetchCredentials(input.integrationId) : {};
}

function parseJson(value: string | undefined, fallback: unknown = []) {
  if (!value) {
    return fallback;
  }
  return JSON.parse(value);
}

async function importContract(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.address || !input.blockchain) {
    return fail("address and blockchain are required");
  }
  return circleApi({
    path: "/v1/w3s/contracts/import",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      address: input.address,
      blockchain: input.blockchain,
      name: input.name,
      description: input.description,
    },
  });
}

async function listContracts(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  const params = new URLSearchParams();
  if (input.blockchain) {
    params.set("blockchain", input.blockchain);
  }
  const query = params.toString();
  return circleApi({
    path: `/v1/w3s/contracts${query ? `?${query}` : ""}`,
    apiKey: key.apiKey,
  });
}

async function getContract(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.contractId) {
    return fail("contractId is required");
  }
  return circleApi({
    path: `/v1/w3s/contracts/${encodeURIComponent(input.contractId)}`,
    apiKey: key.apiKey,
  });
}

async function updateContract(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.contractId) {
    return fail("contractId is required");
  }
  return circleApi({
    path: `/v1/w3s/contracts/${encodeURIComponent(input.contractId)}`,
    apiKey: key.apiKey,
    method: "PATCH",
    body: {
      name: input.name,
      description: input.description,
    },
  });
}

async function queryContract(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.contractId && !input.address) {
    return fail("contractId or address is required");
  }
  return circleApi({
    path: "/v1/w3s/contracts/query",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      id: input.contractId,
      address: input.address,
      blockchain: input.blockchain,
      abiFunctionSignature: input.abiFunctionSignature,
      abiParameters: parseJson(input.abiParameters),
    },
  });
}

async function deployBytecode(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.bytecode || !input.blockchain || !input.walletId) {
    return fail("bytecode, blockchain, and walletId are required");
  }
  const secret = await entitySecretCiphertext(credentials);
  if (!secret.success) {
    return secret;
  }
  return circleApi({
    path: "/v1/w3s/contracts/deploy",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      entitySecretCiphertext: secret.ciphertext,
      bytecode: input.bytecode,
      abiJson: input.abiJson,
      blockchain: input.blockchain,
      walletId: input.walletId,
      name: input.name,
      description: input.description,
      constructorParameters: parseJson(input.constructorParameters),
      feeLevel: input.feeLevel || "MEDIUM",
    },
  });
}

async function deployTemplate(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.templateId || !input.blockchain || !input.walletId) {
    return fail("templateId, blockchain, and walletId are required");
  }
  const secret = await entitySecretCiphertext(credentials);
  if (!secret.success) {
    return secret;
  }
  return circleApi({
    path: `/v1/w3s/templates/${encodeURIComponent(input.templateId)}/deploy`,
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      entitySecretCiphertext: secret.ciphertext,
      blockchain: input.blockchain,
      walletId: input.walletId,
      name: input.name,
      templateParameters: parseJson(input.constructorParameters, {}),
      feeLevel: input.feeLevel || "MEDIUM",
    },
  });
}

async function estimateDeployFee(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.blockchain || !input.walletId) {
    return fail("blockchain and walletId are required");
  }
  const path = input.templateId
    ? `/v1/w3s/templates/${encodeURIComponent(input.templateId)}/deploy/estimateFee`
    : "/v1/w3s/contracts/deploy/estimateFee";
  return circleApi({
    path,
    apiKey: key.apiKey,
    method: "POST",
    body: {
      blockchain: input.blockchain,
      walletId: input.walletId,
      bytecode: input.bytecode,
      abiJson: input.abiJson,
      constructorParameters: parseJson(input.constructorParameters),
    },
  });
}

async function createEventMonitor(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.contractId || !input.eventName) {
    return fail("contractId and eventName are required");
  }
  return circleApi({
    path: "/v1/w3s/contracts/eventMonitors",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      contractId: input.contractId,
      eventName: input.eventName,
    },
  });
}

async function listEventMonitors(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  const params = new URLSearchParams();
  if (input.contractId) {
    params.set("contractId", input.contractId);
  }
  const query = params.toString();
  return circleApi({
    path: `/v1/w3s/contracts/eventMonitors${query ? `?${query}` : ""}`,
    apiKey: key.apiKey,
  });
}

async function updateEventMonitor(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.monitorId) {
    return fail("monitorId is required");
  }
  return circleApi({
    path: `/v1/w3s/contracts/eventMonitors/${encodeURIComponent(input.monitorId)}`,
    apiKey: key.apiKey,
    method: "PUT",
    body: { status: input.status || "ENABLED" },
  });
}

async function deleteEventMonitor(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.monitorId) {
    return fail("monitorId is required");
  }
  return circleApi({
    path: `/v1/w3s/contracts/eventMonitors/${encodeURIComponent(input.monitorId)}`,
    apiKey: key.apiKey,
    method: "DELETE",
  });
}

async function listEventLogs(input: ContractInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  const params = new URLSearchParams();
  if (input.contractId) {
    params.set("contractId", input.contractId);
  }
  if (input.from) {
    params.set("from", input.from);
  }
  if (input.to) {
    params.set("to", input.to);
  }
  const query = params.toString();
  return circleApi({
    path: `/v1/w3s/contracts/events${query ? `?${query}` : ""}`,
    apiKey: key.apiKey,
  });
}

export async function importContractStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => importContract(input));
}

export async function listContractsStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => listContracts(input));
}

export async function getContractStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => getContract(input));
}

export async function updateContractStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => updateContract(input));
}

export async function queryContractStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => queryContract(input));
}

export async function deployBytecodeStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => deployBytecode(input));
}

export async function deployTemplateStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => deployTemplate(input));
}

export async function estimateDeployFeeStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => estimateDeployFee(input));
}

export async function createEventMonitorStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => createEventMonitor(input));
}

export async function listEventMonitorsStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => listEventMonitors(input));
}

export async function updateEventMonitorStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => updateEventMonitor(input));
}

export async function deleteEventMonitorStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => deleteEventMonitor(input));
}

export async function listEventLogsStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => listEventLogs(input));
}

export const _integrationType = "circle";
