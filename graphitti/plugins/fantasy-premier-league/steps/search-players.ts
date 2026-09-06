import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import {
  PLAYER_FIELDS,
  fplGraphql,
  parseFirst,
  parseOptionalFloat,
  resolvePosition,
  resolveStatus,
  resolveTeamId,
  runFplStep,
} from "./graphql-core";

const ELEMENT_ORDER_FIELDS = new Set([
  "id",
  "web_name",
  "now_cost",
  "total_points",
  "event_points",
  "form",
  "selected_by_percent",
  "goals_scored",
  "assists",
  "clean_sheets",
  "minutes",
  "bonus",
  "bps",
  "expected_goals",
  "expected_assists",
  "ict_index",
  "transfers_in_event",
  "transfers_out_event",
  "cost_change_event",
]);

type Player = Record<string, unknown>;

type SearchPlayersResult =
  | {
      success: true;
      data: { players: Player[]; count: number; total: number };
    }
  | ReturnType<typeof fail>;

export type SearchPlayersCoreInput = {
  name?: string;
  team?: string;
  position?: string;
  status?: string;
  minForm?: string;
  maxOwnership?: string;
  orderBy?: string;
  direction?: string;
  first?: string;
};

export type SearchPlayersInput = StepInput &
  SearchPlayersCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: SearchPlayersCoreInput,
  credentials: FantasyPremierLeagueCredentials
): Promise<SearchPlayersResult> {
  const team = await resolveTeamId(credentials, input.team, "search-players");
  if (!team.ok) {
    return team.error;
  }

  const minForm = parseOptionalFloat(input.minForm, "Min form");
  if (!minForm.ok) {
    return minForm.error;
  }
  const maxOwnership = parseOptionalFloat(
    input.maxOwnership,
    "Max ownership %"
  );
  if (!maxOwnership.ok) {
    return maxOwnership.error;
  }

  const where: Record<string, unknown> = {};
  const name = input.name?.trim();
  if (name) {
    where.web_name = { contains: name };
  }
  if (team.id !== undefined) {
    where.team = { eq: team.id };
  }
  const position = resolvePosition(input.position);
  if (input.position?.trim() && position === undefined) {
    return fail(
      "Position must be GKP, DEF, MID, FWD, or a position id (1-4)"
    );
  }
  if (position !== undefined) {
    where.element_type = { eq: position };
  }
  const status = resolveStatus(input.status);
  if (status) {
    where.status = { eq: status };
  }
  if (minForm.value !== undefined) {
    where.form = { gte: minForm.value };
  }
  if (maxOwnership.value !== undefined) {
    where.selected_by_percent = { lte: maxOwnership.value };
  }

  const orderField = input.orderBy?.trim() || "total_points";
  if (!ELEMENT_ORDER_FIELDS.has(orderField)) {
    return fail(`Unsupported orderBy field: ${orderField}`);
  }
  const direction =
    input.direction?.trim().toUpperCase() === "ASC" ? "ASC" : "DESC";

  const result = await fplGraphql<{
    elements: { items: Player[]; meta: { total: number } };
  }>(
    credentials,
    `query SearchPlayers($where: ElementFilter, $orderBy: ElementOrderBy, $first: Int) {
      elements(where: $where, orderBy: $orderBy, first: $first) {
        items { ${PLAYER_FIELDS} }
        meta { total }
      }
    }`,
    {
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { field: orderField, direction },
      first: parseFirst(input.first),
    },
    "search-players"
  );

  if (!result.success) {
    return result;
  }

  const players = result.data.elements.items;
  return ok({
    players,
    count: players.length,
    total: result.data.elements.meta.total,
  });
}

export async function searchPlayersStep(
  input: SearchPlayersInput
): Promise<SearchPlayersResult> {
  "use step";
  return runFplStep(input, "search-players", (credentials) =>
    stepHandler(input, credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
