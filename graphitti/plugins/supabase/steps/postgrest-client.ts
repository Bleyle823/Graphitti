import type { SupabaseCredentials } from "../credentials";

export type PostgrestQueryInput = {
  table: string;
  select?: string;
  orderBy?: string;
  orderDirection?: string;
  limit?: string | number;
  filters?: string;
  schema?: string;
};

export type PostgrestQueryResult =
  | {
      ok: true;
      rows: Array<Record<string, unknown>>;
      latest: Record<string, unknown> | null;
    }
  | { ok: false; message: string };

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

export function resolveSupabaseCredentials(
  credentials: SupabaseCredentials
): { baseUrl: string; anonKey: string } | { error: string } {
  const baseUrl = credentials.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = credentials.SUPABASE_ANON_KEY?.trim();

  if (!baseUrl) {
    return {
      error:
        "SUPABASE_URL is not configured. Add your project URL in Project Integrations → Supabase.",
    };
  }

  if (!anonKey) {
    return {
      error:
        "SUPABASE_ANON_KEY is not configured. Add your anon key in Project Integrations → Supabase.",
    };
  }

  return { baseUrl, anonKey };
}

export async function queryPostgrestTable(
  credentials: SupabaseCredentials,
  input: PostgrestQueryInput
): Promise<PostgrestQueryResult> {
  const resolved = resolveSupabaseCredentials(credentials);
  if ("error" in resolved) {
    return { ok: false, message: resolved.error };
  }

  const table = input.table?.trim();
  if (!table) {
    return { ok: false, message: "table is required" };
  }

  const select = input.select?.trim() || "*";
  const orderBy = input.orderBy?.trim();
  const orderDirection = (input.orderDirection?.trim() || "desc").toLowerCase();
  const limit = parseLimit(input.limit);

  try {
    const url = new URL(
      `${resolved.baseUrl}/rest/v1/${encodeURIComponent(table)}`
    );
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
      apikey: resolved.anonKey,
      Authorization: `Bearer ${resolved.anonKey}`,
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
        ok: false,
        message:
          "Supabase rejected the anon key. Check RLS allows SELECT on this table for the anon role.",
      };
    }

    if (response.status === 404) {
      return {
        ok: false,
        message: `Table "${table}" was not found in Supabase.`,
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
        ok: false,
        message: `Supabase REST error: HTTP ${response.status}${detail}`,
      };
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return {
      ok: true,
      rows,
      latest: rows[0] ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
