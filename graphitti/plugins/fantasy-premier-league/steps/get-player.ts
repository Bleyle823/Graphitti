import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import {
  PLAYER_FIELDS,
  fplGraphql,
  parseRequiredInt,
  runFplStep,
} from "./graphql-core";

type GetPlayerResult =
  | { success: true; data: Record<string, unknown> }
  | ReturnType<typeof fail>;

export type GetPlayerCoreInput = {
  playerId?: string;
};

export type GetPlayerInput = StepInput &
  GetPlayerCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetPlayerCoreInput,
  credentials: FantasyPremierLeagueCredentials
): Promise<GetPlayerResult> {
  const playerId = parseRequiredInt(input.playerId, "Player ID");
  if (!playerId.ok) {
    return playerId.error;
  }

  const result = await fplGraphql<{ element: Record<string, unknown> | null }>(
    credentials,
    `query GetPlayer($id: Int!) {
      element(id: $id) { ${PLAYER_FIELDS} }
    }`,
    { id: playerId.value },
    "get-player"
  );
  if (!result.success) {
    return result;
  }
  if (!result.data.element) {
    return fail(`Player ${playerId.value} was not found`);
  }
  return ok(result.data.element);
}

export async function getPlayerStep(
  input: GetPlayerInput
): Promise<GetPlayerResult> {
  "use step";
  return runFplStep(input, "get-player", (credentials) =>
    stepHandler(input, credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
