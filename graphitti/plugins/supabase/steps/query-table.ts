import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { SupabaseCredentials } from "../credentials";

type QueryTableResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: { message: string } };

export type QueryTableCoreInput = {
  table: string;
  select?: string;
  orderBy?: string;
  orderDirection?: string;
  limit?: string | number;
  filters?: string;
  schema?: string;
};

export type QueryTableInput = StepInput &
  QueryTableCoreInput & {
    integrationId?: string;
  };

function parseLimit(raw: string | number | undefined): number {
  if (raw === undefined || raw === "") {
    return 1;
  }
  const parsed =
    typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, 1000);
}

function appendFilters(url: URL, filters: string | undefined): void {
  if (!filters?.trim()) {
    return;
  }

  const normalized = filters.trim().replace(/^\?/, "");
  const params = new URLSearchParams(normalized);
  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }
}

function kelpAliases(
  latest: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!latest) {
    return {};
  }

  return {
    should_alert: latest.should_alert,
    deviation_bps: latest.deviation_bps,
    bridge_deviation_bps: latest.bridge_deviation_bps,
    block_number: latest.block_number,
    mainnet_supply: latest.mainnet_supply,
    arb_supply: latest.arb_supply,
    total_backing: latest.total_backing,
    excess: latest.excess,
    effective_supply: latest.effective_supply,
  };
}

async function stepHandler(
  input: QueryTableCoreInput,
  credentials: SupabaseCredentials
): Promise<QueryTableResult> {
  const baseUrl = credentials.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = credentials.SUPABASE_ANON_KEY?.trim();

  if (!baseUrl) {
    return {
      success: false,
      error: {
        message:
          "SUPABASE_URL is not configured. Please add it in Project Integrations.",
      },
    };
  }

  if (!anonKey) {
    return {
      success: false,
      error: {
        message:
          "SUPABASE_ANON_KEY is not configured. Please add it in Project Integrations.",
      },
    };
  }

  const table = input.table?.trim();
  if (!table) {
    return {
      success: false,
      error: { message: "table is required" },
    };
  }

  const select = input.select?.trim() || "*";
  const orderBy = input.orderBy?.trim();
  const orderDirection = (input.orderDirection?.trim() || "desc").toLowerCase();
  const limit = parseLimit(input.limit);

  try {
    const url = new URL(`${baseUrl}/rest/v1/${encodeURIComponent(table)}`);
    url.searchParams.set("select", select);

    if (orderBy) {
      url.searchParams.set(
        "order",
        `${orderBy}.${orderDirection === "asc" ? "asc" : "desc"}`
      );
    }

    url.searchParams.set("limit", String(limit));
    appendFilters(url, input.filters);

    const headers: Record<string, string> = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    };

    const schema = input.schema?.trim();
    if (schema) {
      headers["Accept-Profile"] = schema;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: { message: "Supabase rejected the anon key (HTTP 401/403)" },
      };
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body: unknown = await response.json();
        if (
          body &&
          typeof body === "object" &&
          "message" in body &&
          typeof (body as { message: unknown }).message === "string"
        ) {
          detail = `: ${(body as { message: string }).message}`;
        }
      } catch {
        // ignore JSON parse errors
      }

      return {
        success: false,
        error: {
          message: `Supabase REST error: HTTP ${response.status}${detail}`,
        },
      };
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>;
    const latest = rows[0] ?? null;

    return {
      success: true,
      data: {
        rows,
        count: rows.length,
        latest,
        has_match: rows.length > 0,
        ...kelpAliases(latest),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function queryTableStep(
  input: QueryTableInput
): Promise<QueryTableResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "supabase";
