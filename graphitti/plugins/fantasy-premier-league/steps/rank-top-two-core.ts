import { fail, ok } from "@/lib/http-json";

type RosterRow = {
  team: string;
  manager: string;
  address: string;
};

type StandingRow = {
  entry?: number;
  entry_name?: string;
  player_name?: string;
  rank?: number;
  event_total?: number | null;
  total?: number;
};

type RankedTeam = {
  place: number;
  entry: number;
  entryName: string;
  playerName: string;
  points: number;
  address: string;
  prizeUsdc: string;
};

export function normalizeKey(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w]+/g, "");
}

export function findRosterAddress(
  entryName: string,
  playerName: string,
  roster: RosterRow[]
): string {
  const teamKey = normalizeKey(entryName);
  const managerKey = normalizeKey(playerName);
  for (const row of roster) {
    if (
      normalizeKey(row.team) === teamKey &&
      normalizeKey(row.manager) === managerKey
    ) {
      return row.address;
    }
  }
  for (const row of roster) {
    if (normalizeKey(row.team) === teamKey) {
      return row.address;
    }
  }
  return "";
}

function parseJsonArray<T>(raw: string | undefined): T[] | null {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed as T[];
  } catch {
    return null;
  }
}

export type RankTopTwoCoreInput = {
  standings?: string;
  roster?: string;
  firstPrizeUsdc?: string;
  secondPrizeUsdc?: string;
  gameweekId?: string;
  gameweekName?: string;
  leagueId?: string;
};

export function rankTopTwoHandler(input: RankTopTwoCoreInput) {
  const results = parseJsonArray<StandingRow>(input.standings);
  if (results === null) {
    return fail("Standings must be a JSON array");
  }

  const roster = parseJsonArray<RosterRow>(input.roster);
  if (roster === null) {
    return fail("Roster must be a JSON array of { team, manager, address }");
  }

  const prizes = [
    input.firstPrizeUsdc?.trim() || "5",
    input.secondPrizeUsdc?.trim() || "3",
  ];

  const ranked = results
    .map((row) => {
      const entryName = row?.entry_name || "";
      const playerName = row?.player_name || "";
      return {
        entry: Number(row?.entry) || 0,
        entryName,
        playerName,
        rank: Number(row?.rank) || 0,
        points:
          Number(
            row && (row.event_total != null ? row.event_total : row.total)
          ) || 0,
        address: findRosterAddress(entryName, playerName, roster),
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.rank - b.rank;
    });

  const top2: RankedTeam[] = ranked.slice(0, 2).map((team, index) => ({
    place: index + 1,
    entry: team.entry,
    entryName: team.entryName,
    playerName: team.playerName,
    points: team.points,
    address: team.address,
    prizeUsdc: prizes[index] ?? "0",
  }));

  const first = top2[0] ?? {
    place: 1,
    entry: 0,
    entryName: "",
    playerName: "",
    points: 0,
    address: "",
    prizeUsdc: "0",
  };
  const second = top2[1] ?? {
    place: 2,
    entry: 0,
    entryName: "",
    playerName: "",
    points: 0,
    address: "",
    prizeUsdc: "0",
  };

  let totalPrizeUsdc = 0;
  if (first.address) {
    totalPrizeUsdc += Number(first.prizeUsdc) || 0;
  }
  if (second.address) {
    totalPrizeUsdc += Number(second.prizeUsdc) || 0;
  }

  const gameweekId = Number(input.gameweekId?.trim() || "0");
  const gameweekName = input.gameweekName?.trim() || "";
  const leagueId = input.leagueId?.trim() || "";

  return ok({
    gameweekId,
    gameweekName,
    leagueId,
    participants: ranked.length,
    ready: totalPrizeUsdc > 0,
    totalPrizeUsdc: String(totalPrizeUsdc),
    first,
    second,
    ranking: ranked,
  });
}
