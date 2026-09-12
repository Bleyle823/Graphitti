import { describe, expect, it } from "vitest";
import {
  findRosterAddress,
  normalizeKey,
  rankTopTwoHandler,
} from "@/plugins/fantasy-premier-league/steps/rank-top-two-core";

describe("rankTopTwoHandler", () => {
  const roster = JSON.stringify([
    { team: "TRAP 38", manager: "Matt Herman", address: "0xFirst" },
    { team: "Wantam!", manager: "Alpha Jay", address: "0xSecond" },
  ]);

  it("ranks by points and assigns prizes to mapped wallets", () => {
    const standings = JSON.stringify([
      {
        entry: 1,
        entry_name: "TRAP 38",
        player_name: "Matt Herman",
        rank: 2,
        event_total: 80,
      },
      {
        entry: 2,
        entry_name: "Wantam!",
        player_name: "Alpha Jay",
        rank: 1,
        event_total: 70,
      },
    ]);

    const result = rankTopTwoHandler({
      standings,
      roster,
      firstPrizeUsdc: "5",
      secondPrizeUsdc: "3",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.ready).toBe(true);
    expect(result.data.totalPrizeUsdc).toBe("8");
    expect(result.data.first.address).toBe("0xFirst");
    expect(result.data.first.prizeUsdc).toBe("5");
    expect(result.data.second.address).toBe("0xSecond");
    expect(result.data.second.points).toBe(70);
  });

  it("matches team name when emoji-stripped keys align", () => {
    expect(normalizeKey("Wantam! 🔥")).toBe(normalizeKey("Wantam!"));
    expect(
      findRosterAddress("Wantam!", "Alpha Jay", JSON.parse(roster) as [])
    ).toBe("0xSecond");
  });
});
