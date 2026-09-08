import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import {
  defaultEndpointForNetwork,
  packageSpkgUrl,
  searchSubstreamsPackages,
} from "@/lib/the-graph/substreams-registry";
import { loadTheGraphCredentials, type TheGraphCredentials } from "../credentials";
import { aliasNetwork, asRecordArray, asString, isRecord } from "./shared";

type SubstreamsInput = StepInput & {
  integrationId?: string;
  query?: string;
  organization?: string;
  featured?: string;
  page?: string;
  slug?: string;
  version?: string;
  network?: string;
};

function packageName(item: Record<string, unknown>): string | undefined {
  return asString(item.slug) ?? asString(item.name) ?? asString(item.id);
}

function latestVersion(item: Record<string, unknown>): string | undefined {
  return (
    asString(item.latestVersion) ??
    asString(item.version) ??
    asString(item.latest_version)
  );
}

async function searchHandler(
  input: SubstreamsInput,
  credentials: TheGraphCredentials
) {
  try {
    const body = await searchSubstreamsPackages({
      query: input.query?.trim(),
      organization: input.organization?.trim(),
      featured: input.featured?.trim(),
      page: input.page?.trim(),
      apiKey: credentials.SUBSTREAMS_API_KEY?.trim(),
    });
    const record = isRecord(body) ? body : { packages: [] };
    const packages = asRecordArray(record.packages);
    return ok({
      packages,
      hasMore: record.hasMore ?? false,
      count: packages.length,
      query_url: "https://substreams.dev/v1/registry/packages",
      query_url_x402: "",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function getPackageHandler(
  input: SubstreamsInput,
  credentials: TheGraphCredentials
) {
  const slug = input.slug?.trim();
  if (!slug) {
    return fail("slug is required");
  }

  try {
    let version = input.version?.trim();
    let matched: Record<string, unknown> | undefined;

    const body = await searchSubstreamsPackages({
      query: slug,
      apiKey: credentials.SUBSTREAMS_API_KEY?.trim(),
    });
    const record = isRecord(body) ? body : { packages: [] };
    const packages = asRecordArray(record.packages);
    matched = packages.find((item) => {
      const name = packageName(item);
      return name?.toLowerCase() === slug.toLowerCase();
    });
    if (!version) {
      version = matched ? latestVersion(matched) : undefined;
    }
    if (!version) {
      return fail(
        `Could not resolve a version for package "${slug}". Pass version (for example v0.1.0).`
      );
    }

    const spkg = packageSpkgUrl(slug, version);
    const reference = `https://api.substreams.dev/v1/packages/${slug}/${version}`;
    return ok({
      slug,
      version,
      spkg,
      reference,
      package: matched ?? null,
      latestVersion: matched ? latestVersion(matched) : version,
      query_url: reference,
      query_url_x402: "",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function endpointHandler(input: SubstreamsInput) {
  const network = aliasNetwork(input.network) ?? input.network?.trim();
  if (!network) {
    return fail("network is required");
  }
  const endpoint =
    defaultEndpointForNetwork(network) ??
    defaultEndpointForNetwork(input.network?.trim() ?? "");
  if (!endpoint) {
    return fail(
      `No default Substreams endpoint for "${network}". Use ethereum, base, arbitrum, optimism, polygon, or solana.`
    );
  }
  return ok({
    network,
    endpoint,
    note: "HTTP discovery only. Do not run WASM or stream gRPC from this step. graph_out EntityChanges and db_out DatabaseChanges are not interchangeable.",
    query_url: endpoint,
    query_url_x402: "",
  });
}

function withCreds(
  input: SubstreamsInput,
  handler: (
    input: SubstreamsInput,
    credentials: TheGraphCredentials
  ) => Promise<ReturnType<typeof ok> | ReturnType<typeof fail>>
) {
  return withStepLogging(input, async () => {
    const credentials = await loadTheGraphCredentials(input.integrationId);
    return handler(input, credentials);
  });
}

export async function searchSubstreamsPackagesStep(input: SubstreamsInput) {
  "use step";
  return withCreds(input, searchHandler);
}

export async function getPackageStep(input: SubstreamsInput) {
  "use step";
  return withCreds(input, getPackageHandler);
}

export async function getDefaultEndpointStep(input: SubstreamsInput) {
  "use step";
  return withStepLogging(input, () => endpointHandler(input));
}

export const _integrationType = "the-graph";
