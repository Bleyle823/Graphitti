import "server-only";

import { fplGet } from "@/lib/fpl/client";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";

const POSITION_ALIASES: Record<string, number> = {
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

type FplTeam = {
  id: number;
  name: string;
  short_name: string;
};

type FplElementType = {
  id: number;
  singular_name: string;
  singular_name_short: string;
  plural_name: string;
  plural_name_short: string;
};

type FplElement = {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  status: string;
};

type FplBootstrap = {
  events: unknown[];
  elements: FplElement[];
  teams: FplTeam[];
  element_types: FplElementType[];
};

export type FplStepInput = StepInput & {
  playerId?: string;
  managerId?: string;
  gameweek?: string;
  leagueId?: string;
  event?: string;
  name?: string;
  team?: string;
  position?: string;
  status?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireValue(value: string | undefined, label: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { ok: false as const, error: fail(`${label} is required`) };
  }
  return { ok: true as const, value: trimmed };
}

async function fplOk<T>(path: string) {
  try {
    return ok(await fplGet<T>(path));
  } catch (error) {
    return fail(errorMessage(error));
  }
}

function nameMatches(element: FplElement, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const fullName = `${element.first_name} ${element.second_name}`.toLowerCase();
  return (
    element.web_name.toLowerCase().includes(needle) ||
    element.first_name.toLowerCase().includes(needle) ||
    element.second_name.toLowerCase().includes(needle) ||
    fullName.includes(needle)
  );
}

function teamMatches(
  element: FplElement,
  teams: FplTeam[],
  filter: string
): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  if (String(element.team) === needle) {
    return true;
  }
  const team = teams.find((entry) => entry.id === element.team);
  if (!team) {
    return false;
  }
  return (
    team.name.toLowerCase().includes(needle) ||
    team.short_name.toLowerCase() === needle
  );
}

function positionMatches(
  element: FplElement,
  types: FplElementType[],
  filter: string
): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const aliased = POSITION_ALIASES[needle];
  if (aliased !== undefined) {
    return element.element_type === aliased;
  }
  if (String(element.element_type) === needle) {
    return true;
  }
  const type = types.find((entry) => entry.id === element.element_type);
  if (!type) {
    return false;
  }
  return (
    type.singular_name.toLowerCase() === needle ||
    type.singular_name_short.toLowerCase() === needle ||
    type.plural_name.toLowerCase() === needle ||
    type.plural_name_short.toLowerCase() === needle
  );
}

function statusMatches(status: string, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const current = status.toLowerCase();
  if (current === needle) {
    return true;
  }
  if (needle === "available") {
    return current === "a";
  }
  if (needle === "doubtful") {
    return current === "d";
  }
  if (needle === "injured") {
    return current === "i";
  }
  if (needle === "suspended") {
    return current === "s";
  }
  if (needle === "unavailable") {
    return current === "n" || current === "u";
  }
  return false;
}

async function bootstrapHandler() {
  return fplOk<FplBootstrap>("/bootstrap-static/");
}

async function searchPlayersHandler(input: FplStepInput) {
  try {
    const bootstrap = await fplGet<FplBootstrap>("/bootstrap-static/");
    const teams = Array.isArray(bootstrap.teams) ? bootstrap.teams : [];
    const types = Array.isArray(bootstrap.element_types)
      ? bootstrap.element_types
      : [];
    const elements = Array.isArray(bootstrap.elements) ? bootstrap.elements : [];
    const players = elements.filter(
      (element) =>
        nameMatches(element, input.name ?? "") &&
        teamMatches(element, teams, input.team ?? "") &&
        positionMatches(element, types, input.position ?? "") &&
        statusMatches(element.status, input.status ?? "")
    );
    return ok({
      players: players.map((element) => {
        const team = teams.find((entry) => entry.id === element.team);
        const type = types.find((entry) => entry.id === element.element_type);
        return {
          ...element,
          teamName: team?.name,
          teamShortName: team?.short_name,
          position: type?.singular_name_short,
        };
      }),
      count: players.length,
    });
  } catch (error) {
    return fail(errorMessage(error));
  }
}

async function playerHandler(input: FplStepInput) {
  const playerId = requireValue(input.playerId, "Player ID");
  if (!playerId.ok) {
    return playerId.error;
  }
  return fplOk(`/element-summary/${encodeURIComponent(playerId.value)}/`);
}

async function fixturesHandler(input: FplStepInput) {
  const event = input.event?.trim();
  const path = event
    ? `/fixtures/?event=${encodeURIComponent(event)}`
    : "/fixtures/";
  try {
    const fixtures = await fplGet<unknown[]>(path);
    return ok({ fixtures });
  } catch (error) {
    return fail(errorMessage(error));
  }
}

async function gameweekLiveHandler(input: FplStepInput) {
  const gameweek = requireValue(input.gameweek, "Gameweek");
  if (!gameweek.ok) {
    return gameweek.error;
  }
  return fplOk(`/event/${encodeURIComponent(gameweek.value)}/live/`);
}

async function managerHandler(input: FplStepInput) {
  const managerId = requireValue(input.managerId, "Manager ID");
  if (!managerId.ok) {
    return managerId.error;
  }
  return fplOk(`/entry/${encodeURIComponent(managerId.value)}/`);
}

async function managerHistoryHandler(input: FplStepInput) {
  const managerId = requireValue(input.managerId, "Manager ID");
  if (!managerId.ok) {
    return managerId.error;
  }
  return fplOk(`/entry/${encodeURIComponent(managerId.value)}/history/`);
}

async function managerPicksHandler(input: FplStepInput) {
  const managerId = requireValue(input.managerId, "Manager ID");
  if (!managerId.ok) {
    return managerId.error;
  }
  const gameweek = requireValue(input.gameweek, "Gameweek");
  if (!gameweek.ok) {
    return gameweek.error;
  }
  return fplOk(
    `/entry/${encodeURIComponent(managerId.value)}/event/${encodeURIComponent(gameweek.value)}/picks/`
  );
}

async function managerTransfersHandler(input: FplStepInput) {
  const managerId = requireValue(input.managerId, "Manager ID");
  if (!managerId.ok) {
    return managerId.error;
  }
  try {
    const transfers = await fplGet<unknown[]>(
      `/entry/${encodeURIComponent(managerId.value)}/transfers/`
    );
    return ok({ transfers });
  } catch (error) {
    return fail(errorMessage(error));
  }
}

async function classicStandingsHandler(input: FplStepInput) {
  const leagueId = requireValue(input.leagueId, "League ID");
  if (!leagueId.ok) {
    return leagueId.error;
  }
  return fplOk(
    `/leagues-classic/${encodeURIComponent(leagueId.value)}/standings/`
  );
}

async function h2hStandingsHandler(input: FplStepInput) {
  const leagueId = requireValue(input.leagueId, "League ID");
  if (!leagueId.ok) {
    return leagueId.error;
  }
  return fplOk(`/leagues-h2h/${encodeURIComponent(leagueId.value)}/standings/`);
}

export async function getBootstrapStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => bootstrapHandler());
}

export async function searchPlayersStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => searchPlayersHandler(input));
}

export async function getPlayerStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => playerHandler(input));
}

export async function getFixturesStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => fixturesHandler(input));
}

export async function getGameweekLiveStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => gameweekLiveHandler(input));
}

export async function getManagerStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => managerHandler(input));
}

export async function getManagerHistoryStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => managerHistoryHandler(input));
}

export async function getManagerPicksStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => managerPicksHandler(input));
}

export async function getManagerTransfersStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => managerTransfersHandler(input));
}

export async function getClassicStandingsStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => classicStandingsHandler(input));
}

export async function getH2hStandingsStep(input: FplStepInput) {
  "use step";
  return withStepLogging(input, () => h2hStandingsHandler(input));
}

export const _integrationType = "fantasy-premier-league";
