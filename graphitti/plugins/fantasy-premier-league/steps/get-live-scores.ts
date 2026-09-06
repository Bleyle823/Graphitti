import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import { FIXTURE_FIELDS, fplGraphql, runFplStep } from "./graphql-core";

type LiveFixture = {
  id: number;
  minutes: number | null;
  team_h_score: number | null;
  team_a_score: number | null;
  kickoff_time: string | null;
  team_h: { id: number; name: string; short_name: string | null } | null;
  team_a: { id: number; name: string; short_name: string | null } | null;
};

type GetLiveScoresResult =
  | {
      success: true;
      data: { fixtures: LiveFixture[]; count: number; total: number };
    }
  | ReturnType<typeof fail>;

export type GetLiveScoresInput = StepInput & {
  integrationId?: string;
};

async function stepHandler(
  credentials: FantasyPremierLeagueCredentials
): Promise<GetLiveScoresResult> {
  const result = await fplGraphql<{
    fixtures: { items: LiveFixture[]; meta: { total: number } };
  }>(
    credentials,
    `query GetLiveScores {
      fixtures(where: { started: { eq: true }, finished: { eq: false } }) {
        items { ${FIXTURE_FIELDS} }
        meta { total }
      }
    }`,
    undefined,
    "get-live-scores"
  );
  if (!result.success) {
    return result;
  }
  const fixtures = result.data.fixtures.items;
  return ok({
    fixtures,
    count: fixtures.length,
    total: result.data.fixtures.meta.total,
  });
}

export async function getLiveScoresStep(
  input: GetLiveScoresInput
): Promise<GetLiveScoresResult> {
  "use step";
  return runFplStep(input, "get-live-scores", (credentials) =>
    stepHandler(credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
