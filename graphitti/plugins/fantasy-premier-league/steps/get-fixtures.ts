import "server-only";

import { fail, ok } from "@/lib/http-json";
import type { StepInput } from "@/lib/steps/step-handler";
import type { FantasyPremierLeagueCredentials } from "../credentials";
import {
  FIXTURE_FIELDS,
  fplGraphql,
  parseFirst,
  parseOptionalInt,
  resolveTeamId,
  runFplStep,
} from "./graphql-core";

type Fixture = Record<string, unknown>;
type FixturesPage = { items: Fixture[]; meta: { total: number } };

type GetFixturesResult =
  | {
      success: true;
      data: { fixtures: Fixture[]; count: number; total: number };
    }
  | ReturnType<typeof fail>;

export type GetFixturesCoreInput = {
  event?: string;
  team?: string;
  status?: string;
  first?: string;
};

export type GetFixturesInput = StepInput &
  GetFixturesCoreInput & {
    integrationId?: string;
  };

function statusWhere(
  status: string | undefined
):
  | { ok: true; where: Record<string, unknown> }
  | { ok: false; error: ReturnType<typeof fail> } {
  const value = status?.trim().toLowerCase() || "all";
  if (value === "all") {
    return { ok: true, where: {} };
  }
  if (value === "live") {
    return {
      ok: true,
      where: { started: { eq: true }, finished: { eq: false } },
    };
  }
  if (value === "upcoming") {
    return { ok: true, where: { started: { eq: false } } };
  }
  if (value === "finished") {
    return { ok: true, where: { finished: { eq: true } } };
  }
  if (value === "bonus-pending") {
    return {
      ok: true,
      where: { finished_provisional: { eq: true }, finished: { eq: false } },
    };
  }
  return {
    ok: false,
    error: fail(
      "Status must be all, live, upcoming, finished, or bonus-pending"
    ),
  };
}

async function queryFixtures(
  credentials: FantasyPremierLeagueCredentials,
  where: Record<string, unknown> | undefined,
  first: number
) {
  return fplGraphql<{ fixtures: FixturesPage }>(
    credentials,
    `query GetFixtures($where: FixtureFilter, $first: Int) {
      fixtures(
        where: $where
        orderBy: { field: kickoff_time, direction: ASC }
        first: $first
      ) {
        items { ${FIXTURE_FIELDS} }
        meta { total }
      }
    }`,
    {
      where:
        where && Object.keys(where).length > 0 ? where : undefined,
      first,
    },
    "get-fixtures"
  );
}

async function stepHandler(
  input: GetFixturesCoreInput,
  credentials: FantasyPremierLeagueCredentials
): Promise<GetFixturesResult> {
  const event = parseOptionalInt(input.event, "Event");
  if (!event.ok) {
    return event.error;
  }
  const team = await resolveTeamId(credentials, input.team, "get-fixtures");
  if (!team.ok) {
    return team.error;
  }
  const status = statusWhere(input.status);
  if (!status.ok) {
    return status.error;
  }

  const first = parseFirst(input.first, 50);
  const baseWhere: Record<string, unknown> = { ...status.where };
  if (event.value !== undefined) {
    baseWhere.event = { eq: event.value };
  }

  if (team.id === undefined) {
    const result = await queryFixtures(credentials, baseWhere, first);
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

  const [home, away] = await Promise.all([
    queryFixtures(credentials, { ...baseWhere, team_h: { eq: team.id } }, first),
    queryFixtures(credentials, { ...baseWhere, team_a: { eq: team.id } }, first),
  ]);
  if (!home.success) {
    return home;
  }
  if (!away.success) {
    return away;
  }

  const merged = new Map<number, Fixture>();
  for (const fixture of [
    ...home.data.fixtures.items,
    ...away.data.fixtures.items,
  ]) {
    const id = Number(fixture.id);
    if (!Number.isNaN(id)) {
      merged.set(id, fixture);
    }
  }

  const fixtures = [...merged.values()].sort((left, right) =>
    String(left.kickoff_time ?? "").localeCompare(
      String(right.kickoff_time ?? "")
    )
  );

  return ok({
    fixtures,
    count: fixtures.length,
    total: fixtures.length,
  });
}

export async function getFixturesStep(
  input: GetFixturesInput
): Promise<GetFixturesResult> {
  "use step";
  return runFplStep(input, "get-fixtures", (credentials) =>
    stepHandler(input, credentials)
  );
}

export const _integrationType = "fantasy-premier-league";
