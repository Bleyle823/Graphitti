import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import {
  fplGraphql,
  parseFirst,
  parseOptionalInt,
  runFplStep,
} from "./graphql-core";

type EventWinner = {
  id: number;
  event_id: number;
  rank: number;
  rank_sort: number;
  team_name: string;
  entry_id: number;
  points: number;
  entry_url: string;
  team_url: string;
  first_name: string;
  last_name: string;
};

type GetEventWinnersResult =
  | {
      success: true;
      data: { winners: EventWinner[]; count: number; total: number };
    }
  | ReturnType<typeof fail>;

export type GetEventWinnersCoreInput = {
  eventId?: string;
  first?: string;
  orderBy?: string;
};

export type GetEventWinnersInput = StepInput &
  GetEventWinnersCoreInput & {
    integrationId?: string;
  };

const WINNER_FIELDS = `
  id
  event_id
  rank
  rank_sort
  team_name
  entry_id
  points
  entry_url
  team_url
  first_name
  last_name
`;

async function stepHandler(
  input: GetEventWinnersCoreInput,
  credentials: FantasyPremierLeagueCredentials
): Promise<GetEventWinnersResult> {
  const eventId = parseOptionalInt(input.eventId, "Event ID");
  if (!eventId.ok) {
    return eventId.error;
  }

  const orderField =
    input.orderBy?.trim() || (eventId.value === undefined ? "points" : "rank");
  if (orderField !== "rank" && orderField !== "points") {
    return fail("Order by must be rank or points");
  }
  const direction = orderField === "points" ? "DESC" : "ASC";

  const where =
    eventId.value === undefined ? undefined : { event_id: { eq: eventId.value } };

  const result = await fplGraphql<{
    event_winners: { items: EventWinner[]; meta: { total: number } };
  }>(
    credentials,
    `query GetEventWinners($where: EventWinnerFilter, $orderBy: EventWinnerOrderBy, $first: Int) {
      event_winners(where: $where, orderBy: $orderBy, first: $first) {
        items { ${WINNER_FIELDS} }
        meta { total }
      }
    }`,
    {
      where,
      orderBy: { field: orderField, direction },
      first: parseFirst(input.first, 10),
    },
    "get-event-winners"
  );
  if (!result.success) {
    return result;
  }

  const winners = result.data.event_winners.items;
  return ok({
    winners,
    count: winners.length,
    total: result.data.event_winners.meta.total,
  });
}

export async function getEventWinnersStep(
  input: GetEventWinnersInput
): Promise<GetEventWinnersResult> {
  "use step";
  return runFplStep(input, "get-event-winners", (credentials) =>
    stepHandler(input, credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
