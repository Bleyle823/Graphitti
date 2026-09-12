import "server-only";

import { fplGet } from "@/lib/fpl/client";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";

export type FplStepInput = StepInput & {
  managerId?: string;
  gameweek?: string;
  leagueId?: string;
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

export async function fetchClassicStandings(leagueId: string) {
  return classicStandingsHandler({ leagueId });
}

async function h2hStandingsHandler(input: FplStepInput) {
  const leagueId = requireValue(input.leagueId, "League ID");
  if (!leagueId.ok) {
    return leagueId.error;
  }
  return fplOk(`/leagues-h2h/${encodeURIComponent(leagueId.value)}/standings/`);
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
