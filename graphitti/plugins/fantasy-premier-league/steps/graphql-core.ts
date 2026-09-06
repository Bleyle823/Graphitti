import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { ErrorCategory, logUserError } from "@/lib/logging";
import { withPluginMetrics } from "@/lib/metrics/instrumentation/plugin";
import {
  assertUrlIsPublic,
  safeFetch,
  SsrfBlockedError,
} from "@/lib/safe-fetch";
import {
  type StepInput,
  withStepLogging,
} from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FantasyPremierLeagueCredentials } from "../credentials";

export const DEFAULT_FPL_GRAPHQL_URL =
  "https://fpl-api-6h0d.onrender.com/graphql";

const TRAILING_SLASH_RE = /\/+$/;
const PLUGIN_NAME = "fantasy-premier-league";

export const DEFAULT_FIRST = 20;
export const MAX_FIRST = 100;

export const POSITION_ALIASES: Record<string, number> = {
  "1": 1,
  gkp: 1,
  gk: 1,
  goalkeeper: 1,
  goalkeepers: 1,
  "2": 2,
  def: 2,
  defender: 2,
  defenders: 2,
  "3": 3,
  mid: 3,
  midfielder: 3,
  midfielders: 3,
  "4": 4,
  fwd: 4,
  fw: 4,
  forward: 4,
  forwards: 4,
};

export const PLAYER_FIELDS = `
  id
  code
  web_name
  first_name
  second_name
  now_cost
  status
  news
  total_points
  goals_scored
  assists
  clean_sheets
  minutes
  bonus
  bps
  expected_goals
  expected_assists
  ict_index
  form
  points_per_game
  selected_by_percent
  transfers_in_event
  transfers_out_event
  cost_change_event
  in_dreamteam
  chance_of_playing_next_round
  team { id name short_name }
  element_type { id singular_name singular_name_short }
`;

export const TEAM_FIELDS = `
  id
  code
  name
  short_name
  played
  win
  draw
  loss
  points
  position
  form
  strength
  strength_overall_home
  strength_overall_away
  strength_attack_home
  strength_attack_away
  strength_defence_home
  strength_defence_away
`;

export const FIXTURE_FIELDS = `
  id
  code
  event
  kickoff_time
  minutes
  started
  finished
  finished_provisional
  provisional_start_time
  team_h_score
  team_a_score
  team_h_difficulty
  team_a_difficulty
  pulse_id
  team_h { id name short_name }
  team_a { id name short_name }
`;

export const EVENT_FIELDS = `
  id
  name
  deadline_time
  average_entry_score
  finished
  is_previous
  is_current
  is_next
  highest_score
  most_selected { id web_name }
  most_transferred_in { id web_name }
  top_element { id web_name }
  most_captained { id web_name }
  most_vice_captained { id web_name }
`;

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export type FplOk<T> = { success: true; data: T };
export type FplFail = ReturnType<typeof fail>;
export type FplResult<T> = FplOk<T> | FplFail;

export function resolveGraphqlUrl(
  credentials: FantasyPremierLeagueCredentials
): string {
  const override = credentials.FPL_GRAPHQL_URL?.trim();
  if (override) {
    return override.replace(TRAILING_SLASH_RE, "");
  }
  return DEFAULT_FPL_GRAPHQL_URL;
}

export function parseFirst(
  value: string | number | undefined,
  fallback = DEFAULT_FIRST
): number {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), MAX_FIRST);
}

export function parseRequiredInt(
  value: string | number | undefined,
  label: string
): { ok: true; value: number } | { ok: false; error: FplFail } {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: fail(`${label} is required`) };
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return {
      ok: false,
      error: fail(`${label} must be a positive integer`),
    };
  }
  return { ok: true, value: parsed };
}

export function parseOptionalInt(
  value: string | number | undefined,
  label: string
): { ok: true; value: number | undefined } | { ok: false; error: FplFail } {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return { ok: true, value: undefined };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: fail(`${label} must be a number`) };
  }
  return { ok: true, value: parsed };
}

export function parseOptionalFloat(
  value: string | number | undefined,
  label: string
): { ok: true; value: number | undefined } | { ok: false; error: FplFail } {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return { ok: true, value: undefined };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: fail(`${label} must be a number`) };
  }
  return { ok: true, value: parsed };
}

export function resolvePosition(filter: string | undefined): number | undefined {
  const needle = filter?.trim().toLowerCase();
  if (!needle) {
    return undefined;
  }
  return POSITION_ALIASES[needle];
}

export function resolveStatus(filter: string | undefined): string | undefined {
  const needle = filter?.trim().toLowerCase();
  if (!needle) {
    return undefined;
  }
  if (needle === "available") {
    return "a";
  }
  if (needle === "doubtful") {
    return "d";
  }
  if (needle === "injured") {
    return "i";
  }
  if (needle === "suspended") {
    return "s";
  }
  if (needle === "unavailable") {
    return "u";
  }
  if (needle.length === 1) {
    return needle;
  }
  return needle;
}

export async function fplGraphql<T>(
  credentials: FantasyPremierLeagueCredentials,
  query: string,
  variables: Record<string, unknown> | undefined,
  actionName: string
): Promise<FplResult<T>> {
  const url = resolveGraphqlUrl(credentials);

  try {
    await assertUrlIsPublic(url);

    const response = await safeFetch(url, {
      plugin: PLUGIN_NAME,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logUserError(
        ErrorCategory.EXTERNAL_SERVICE,
        "[FPL] GraphQL HTTP error:",
        { status: response.status, body: text.slice(0, 240) },
        {
          plugin_name: PLUGIN_NAME,
          action_name: actionName,
          service: "footy-api",
        }
      );
      return fail(
        `FPL GraphQL HTTP ${response.status}: ${text || response.statusText}`
      );
    }

    const payload = (await response.json()) as GraphqlResponse<T>;
    const graphqlError = payload.errors
      ?.map((item) => item.message)
      .filter(Boolean)
      .join("; ");
    if (graphqlError) {
      return fail(graphqlError);
    }
    if (payload.data === undefined) {
      return fail("FPL GraphQL returned no data");
    }
    return ok(payload.data);
  } catch (error) {
    if (error instanceof SsrfBlockedError) {
      logUserError(
        ErrorCategory.VALIDATION,
        "[FPL] Blocked SSRF target",
        error.message,
        { plugin_name: PLUGIN_NAME, action_name: actionName }
      );
      return fail(`FPL GraphQL URL is not allowed: ${error.message}`);
    }
    logUserError(
      ErrorCategory.EXTERNAL_SERVICE,
      "[FPL] GraphQL network error:",
      error,
      {
        plugin_name: PLUGIN_NAME,
        action_name: actionName,
        service: "footy-api",
      }
    );
    return fail(`Failed to reach FPL GraphQL API: ${getErrorMessage(error)}`);
  }
}

type TeamRow = {
  id: number;
  name?: string | null;
  short_name?: string | null;
};

export async function resolveTeamId(
  credentials: FantasyPremierLeagueCredentials,
  team: string | undefined,
  actionName: string
): Promise<{ ok: true; id?: number } | { ok: false; error: FplFail }> {
  const needle = team?.trim();
  if (!needle) {
    return { ok: true, id: undefined };
  }
  if (/^\d+$/.test(needle)) {
    return { ok: true, id: Number(needle) };
  }

  const result = await fplGraphql<{ teams: { items: TeamRow[] } }>(
    credentials,
    `query ResolveTeams {
      teams(first: 20) {
        items { id name short_name }
      }
    }`,
    undefined,
    actionName
  );
  if (!result.success) {
    return { ok: false, error: result };
  }

  const match = result.data.teams.items.find((entry) => {
    const name = entry.name?.toLowerCase() ?? "";
    const shortName = entry.short_name?.toLowerCase() ?? "";
    const lowered = needle.toLowerCase();
    return shortName === lowered || name === lowered || name.includes(lowered);
  });
  if (!match) {
    return {
      ok: false,
      error: fail(`No Premier League team matched "${needle}"`),
    };
  }
  return { ok: true, id: match.id };
}

export async function runFplStep<T>(
  input: StepInput & { integrationId?: string },
  actionName: string,
  handler: (
    credentials: FantasyPremierLeagueCredentials
  ) => Promise<T>
): Promise<T> {
  const credentials = input.integrationId
    ? ((await fetchCredentials(input.integrationId, {
        organizationId: input._context?.organizationId ?? null,
      })) as FantasyPremierLeagueCredentials)
    : {};

  return withPluginMetrics(
    {
      pluginName: PLUGIN_NAME,
      actionName,
      executionId: input._context?.executionId,
    },
    () => withStepLogging(input, () => handler(credentials))
  );
}
