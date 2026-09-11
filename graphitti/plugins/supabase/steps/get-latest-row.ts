import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { SupabaseCredentials } from "../credentials";
import { queryPostgrestTable } from "./postgrest-client";
import { flattenLatestRow } from "./row-output";

type GetLatestRowResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: { message: string } };

export type GetLatestRowCoreInput = {
  table: string;
  orderBy?: string;
  orderDirection?: string;
  select?: string;
  schema?: string;
};

export type GetLatestRowInput = StepInput &
  GetLatestRowCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetLatestRowCoreInput,
  credentials: SupabaseCredentials
): Promise<GetLatestRowResult> {
  const table = input.table?.trim();
  if (!table) {
    return { success: false, error: { message: "table is required" } };
  }

  const result = await queryPostgrestTable(credentials, {
    table,
    select: input.select?.trim() || "*",
    orderBy: input.orderBy?.trim() || "id",
    orderDirection: input.orderDirection?.trim() || "desc",
    limit: 1,
    schema: input.schema,
  });

  if (!result.ok) {
    return { success: false, error: { message: result.message } };
  }

  const latest = result.latest;
  if (!latest) {
    return {
      success: false,
      error: {
        message: `No rows found in "${table}". Confirm the table exists and your SQL sink or app is writing data.`,
      },
    };
  }

  return {
    success: true,
    data: {
      rows: result.rows,
      count: result.rows.length,
      latest,
      has_match: true,
      ...flattenLatestRow(latest),
    },
  };
}

export async function getLatestRowStep(
  input: GetLatestRowInput
): Promise<GetLatestRowResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "supabase";
