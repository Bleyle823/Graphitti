import "server-only";

import { fail } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { fetchClassicStandings } from "./fpl";
import {
  type RankTopTwoCoreInput,
  rankTopTwoHandler,
  standingsInputNeedsFetch,
} from "./rank-top-two-core";

export type { RankTopTwoCoreInput } from "./rank-top-two-core";
export {
  findRosterAddress,
  normalizeKey,
  rankTopTwoHandler,
  standingsInputNeedsFetch,
} from "./rank-top-two-core";

export type RankTopTwoInput = StepInput & RankTopTwoCoreInput;

const DEFAULT_LEAGUE_ID = "962707";

type ClassicStandingsPayload = {
  league?: { id?: number };
  standings?: { results?: unknown[] };
};

async function resolveStandingsJson(
  input: RankTopTwoCoreInput
): Promise<{ standings?: string; leagueId?: string; error?: string }> {
  if (!standingsInputNeedsFetch(input.standings)) {
    return { standings: input.standings, leagueId: input.leagueId };
  }

  const leagueId = input.leagueId?.trim() || DEFAULT_LEAGUE_ID;
  const fetched = await fetchClassicStandings(leagueId);
  if (!fetched.success) {
    const message =
      typeof fetched.error === "string"
        ? fetched.error
        : fetched.error?.message || "Failed to load league standings";
    return { error: message };
  }

  const payload = fetched.data as ClassicStandingsPayload;
  const results = payload.standings?.results ?? [];
  return {
    standings: JSON.stringify(results),
    leagueId: String(payload.league?.id ?? leagueId),
  };
}

export async function rankTopTwoStep(input: RankTopTwoInput) {
  "use step";
  return withStepLogging(input, async () => {
    const resolved = await resolveStandingsJson(input);
    if (resolved.error) {
      return fail(resolved.error);
    }
    return rankTopTwoHandler({
      ...input,
      standings: resolved.standings,
      leagueId: resolved.leagueId ?? input.leagueId,
    });
  });
}

export const _integrationType = "fantasy-premier-league";
