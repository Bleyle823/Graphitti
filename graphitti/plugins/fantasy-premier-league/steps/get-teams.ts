import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import { TEAM_FIELDS, fplGraphql, parseFirst, runFplStep } from "./graphql-core";

const TEAM_ORDER_FIELDS = new Set([
  "id",
  "name",
  "points",
  "position",
  "strength",
  "strength_overall_home",
  "strength_overall_away",
  "strength_attack_home",
  "strength_attack_away",
  "strength_defence_home",
  "strength_defence_away",
  "played",
  "win",
  "draw",
  "loss",
]);

type Team = Record<string, unknown>;

type GetTeamsResult =
  | {
      success: true;
      data: { teams: Team[]; count: number; total: number };
    }
  | ReturnType<typeof fail>;

export type GetTeamsCoreInput = {
  orderBy?: string;
  direction?: string;
  first?: string;
};

export type GetTeamsInput = StepInput &
  GetTeamsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetTeamsCoreInput,
  credentials: FantasyPremierLeagueCredentials
): Promise<GetTeamsResult> {
  const orderField = input.orderBy?.trim() || "position";
  if (!TEAM_ORDER_FIELDS.has(orderField)) {
    return fail(`Unsupported orderBy field: ${orderField}`);
  }
  const direction =
    input.direction?.trim().toUpperCase() === "DESC" ? "DESC" : "ASC";

  const result = await fplGraphql<{
    teams: { items: Team[]; meta: { total: number } };
  }>(
    credentials,
    `query GetTeams($orderBy: TeamOrderBy, $first: Int) {
      teams(orderBy: $orderBy, first: $first) {
        items { ${TEAM_FIELDS} }
        meta { total }
      }
    }`,
    {
      orderBy: { field: orderField, direction },
      first: parseFirst(input.first, 20),
    },
    "get-teams"
  );
  if (!result.success) {
    return result;
  }
  const teams = result.data.teams.items;
  return ok({
    teams,
    count: teams.length,
    total: result.data.teams.meta.total,
  });
}

export async function getTeamsStep(
  input: GetTeamsInput
): Promise<GetTeamsResult> {
  "use step";
  return runFplStep(input, "get-teams", (credentials) =>
    stepHandler(input, credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
