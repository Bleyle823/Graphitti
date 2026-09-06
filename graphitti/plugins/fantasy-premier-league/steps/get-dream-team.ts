import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import {
  fplGraphql,
  parseOptionalInt,
  runFplStep,
} from "./graphql-core";

type DreamTeamPlayer = {
  points: number | null;
  position: number | null;
  element: {
    id: number;
    web_name: string | null;
    now_cost: number | null;
    team: { id: number; short_name: string | null } | null;
    element_type: { singular_name_short: string | null } | null;
  } | null;
};

type DreamTeam = {
  id: number;
  event_id: number;
  top_element_points: number | null;
  top_element: { id: number; web_name: string | null } | null;
  team: DreamTeamPlayer[] | null;
};

type GetDreamTeamResult =
  | { success: true; data: DreamTeam }
  | ReturnType<typeof fail>;

export type GetDreamTeamCoreInput = {
  eventId?: string;
};

export type GetDreamTeamInput = StepInput &
  GetDreamTeamCoreInput & {
    integrationId?: string;
  };

async function resolveEventId(
  credentials: FantasyPremierLeagueCredentials,
  eventId: string | undefined
): Promise<{ ok: true; value: number } | { ok: false; error: ReturnType<typeof fail> }> {
  const parsed = parseOptionalInt(eventId, "Event ID");
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value !== undefined) {
    return { ok: true, value: parsed.value };
  }

  const current = await fplGraphql<{
    currentEvent: { id: number } | null;
  }>(
    credentials,
    `query CurrentEventId {
      currentEvent { id }
    }`,
    undefined,
    "get-dream-team"
  );
  if (!current.success) {
    return { ok: false, error: current };
  }
  if (!current.data.currentEvent) {
    return {
      ok: false,
      error: fail("No current gameweek is available to load a dream team"),
    };
  }
  return { ok: true, value: current.data.currentEvent.id };
}

async function stepHandler(
  input: GetDreamTeamCoreInput,
  credentials: FantasyPremierLeagueCredentials
): Promise<GetDreamTeamResult> {
  const eventId = await resolveEventId(credentials, input.eventId);
  if (!eventId.ok) {
    return eventId.error;
  }

  const result = await fplGraphql<{ dreamTeam: DreamTeam | null }>(
    credentials,
    `query GetDreamTeam($eventId: Int!) {
      dreamTeam(event_id: $eventId) {
        id
        event_id
        top_element_points
        top_element { id web_name }
        team {
          points
          position
          element {
            id
            web_name
            now_cost
            team { id short_name }
            element_type { singular_name_short }
          }
        }
      }
    }`,
    { eventId: eventId.value },
    "get-dream-team"
  );
  if (!result.success) {
    return result;
  }
  if (!result.data.dreamTeam) {
    return fail(`No dream team is available for gameweek ${eventId.value}`);
  }
  return ok(result.data.dreamTeam);
}

export async function getDreamTeamStep(
  input: GetDreamTeamInput
): Promise<GetDreamTeamResult> {
  "use step";
  return runFplStep(input, "get-dream-team", (credentials) =>
    stepHandler(input, credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
