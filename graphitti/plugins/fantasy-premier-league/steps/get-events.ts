import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import {
  EVENT_FIELDS,
  fplGraphql,
  parseFirst,
  parseRequiredInt,
  runFplStep,
} from "./graphql-core";

type EventRow = Record<string, unknown>;

type GetEventsResult =
  | {
      success: true;
      data: { events: EventRow[]; count: number; total: number };
    }
  | ReturnType<typeof fail>;

export type GetEventsCoreInput = {
  filter?: string;
  eventId?: string;
  first?: string;
};

export type GetEventsInput = StepInput &
  GetEventsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetEventsCoreInput,
  credentials: FantasyPremierLeagueCredentials
): Promise<GetEventsResult> {
  const filter = input.filter?.trim().toLowerCase() || "current";

  if (filter === "id") {
    const eventId = parseRequiredInt(input.eventId, "Event ID");
    if (!eventId.ok) {
      return eventId.error;
    }
    const result = await fplGraphql<{ event: EventRow | null }>(
      credentials,
      `query GetEvent($id: Int!) {
        event(id: $id) { ${EVENT_FIELDS} }
      }`,
      { id: eventId.value },
      "get-events"
    );
    if (!result.success) {
      return result;
    }
    if (!result.data.event) {
      return fail(`Gameweek ${eventId.value} was not found`);
    }
    return ok({ events: [result.data.event], count: 1, total: 1 });
  }

  if (filter === "current") {
    const result = await fplGraphql<{ currentEvent: EventRow | null }>(
      credentials,
      `query GetCurrentEvent {
        currentEvent { ${EVENT_FIELDS} }
      }`,
      undefined,
      "get-events"
    );
    if (!result.success) {
      return result;
    }
    if (!result.data.currentEvent) {
      return fail("No current gameweek is available");
    }
    return ok({
      events: [result.data.currentEvent],
      count: 1,
      total: 1,
    });
  }

  const where =
    filter === "next"
      ? { is_next: { eq: true } }
      : filter === "previous"
        ? { is_previous: { eq: true } }
        : undefined;

  if (filter !== "all" && filter !== "next" && filter !== "previous") {
    return fail("Filter must be current, next, previous, all, or id");
  }

  const result = await fplGraphql<{
    events: { items: EventRow[]; meta: { total: number } };
  }>(
    credentials,
    `query GetEvents($where: EventFilter, $first: Int) {
      events(
        where: $where
        orderBy: { field: id, direction: ASC }
        first: $first
      ) {
        items { ${EVENT_FIELDS} }
        meta { total }
      }
    }`,
    {
      where,
      first: parseFirst(input.first, filter === "all" ? 38 : 5),
    },
    "get-events"
  );
  if (!result.success) {
    return result;
  }
  const events = result.data.events.items;
  return ok({
    events,
    count: events.length,
    total: result.data.events.meta.total,
  });
}

export async function getEventsStep(
  input: GetEventsInput
): Promise<GetEventsResult> {
  "use step";
  return runFplStep(input, "get-events", (credentials) =>
    stepHandler(input, credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
