import type { WorkflowTemplate } from "./normalize-export";

const PRIZES = ["5", "3", "2"] as const;

function rankLeagueTopThreeCode(): string {
  return `const gameweekId = Number("{{@fpl-prev-gw:Get Previous Gameweek.events.0.id}}" || "0");
const gameweekName = "{{@fpl-prev-gw:Get Previous Gameweek.events.0.name}}" || "";
const leagueId = "{{@fpl-standings:Get League Standings.league.id}}" || "";

// Map FPL entry id -> Arc payout wallet (replace with your league members).
const payoutByEntry = {
  "REPLACE_ENTRY_ID_1": "0xTEAM_01_PAYOUT_ADDRESS",
  "REPLACE_ENTRY_ID_2": "0xTEAM_02_PAYOUT_ADDRESS",
  "REPLACE_ENTRY_ID_3": "0xTEAM_03_PAYOUT_ADDRESS",
};

const results = {{@fpl-standings:Get League Standings.standings.results}} || [];
const prizes = ${JSON.stringify([...PRIZES])};
const placeholder = "PAYOUT_ADDRESS";

const ranked = results.map(function (row) {
  return {
    entry: Number(row && row.entry) || 0,
    name: (row && (row.entry_name || row.player_name)) || "",
    rank: Number(row && row.rank) || 0,
    points: Number(row && (row.event_total != null ? row.event_total : row.total)) || 0,
  };
}).sort(function (a, b) {
  if (b.points !== a.points) {
    return b.points - a.points;
  }
  return a.rank - b.rank;
});

const top3 = ranked.slice(0, 3).map(function (team, index) {
  const address = payoutByEntry[String(team.entry)] || "";
  return {
    place: index + 1,
    entry: team.entry,
    name: team.name,
    points: team.points,
    address: address,
    prizeUsdc: prizes[index],
  };
});

const first = top3[0] || null;
const second = top3[1] || null;
const third = top3[2] || null;
const ready = Boolean(
  first &&
    second &&
    third &&
    String(first.address).indexOf(placeholder) === -1 &&
    String(second.address).indexOf(placeholder) === -1 &&
    String(third.address).indexOf(placeholder) === -1
);

return {
  gameweekId: gameweekId,
  gameweekName: gameweekName,
  leagueId: leagueId,
  participants: ranked.length,
  ready: ready,
  totalPrizeUsdc: "10",
  first: first,
  second: second,
  third: third,
  ranking: ranked,
};`;
}

function prizePoolCheckCode(): string {
  return `const ready = {{@fpl-rank:Rank Top Three.result.ready}};
const balance = Number("{{@circle-balance:Get Prize Pool USDC.nativeBalance}}" || "0");
const required = Number("{{@fpl-rank:Rank Top Three.result.totalPrizeUsdc}}" || "0");
return {
  funded: ready === true && balance >= required,
  nativeBalance: balance,
  required: required,
};`;
}

export const FPL_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "FPL League Top Three USDC Payouts",
    description:
      "After a finished gameweek, load classic FPL league standings, rank the top three teams by score, and send 5 / 3 / 2 USDC on Arc to their payout wallets.",
    nodes: [
      {
        id: "fpl-payout-trigger",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Manual Trigger",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
          description:
            "Run after a gameweek is finalized. Switch to 0 10 * * 2 UTC for weekly Tuesday payouts.",
        },
      },
      {
        id: "fpl-payout-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 300,
        height: 240,
        position: { x: -360, y: 160 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Set your classic league ID on Get League Standings. After the gameweek finishes, standings.event_total is used for weekly score (falls back to total). Edit payoutByEntry in Rank Top Three: map each FPL entry id to an Arc wallet. Set the prize-pool address on Get Prize Pool USDC. Pays 5 / 3 / 2 native USDC to 1st / 2nd / 3rd.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "fpl-prev-gw",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "Get Previous Gameweek",
          type: "action",
          config: {
            actionType: "fantasy-premier-league/get-events",
            filter: "previous",
          },
          status: "idle",
          description: "Finished gameweek used for scoring",
        },
      },
      {
        id: "fpl-gw-finished",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Gameweek Finished?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@fpl-prev-gw:Get Previous Gameweek.events.0.finished}} === true",
          },
          status: "idle",
          description: "Skip payouts until FPL has finalized the gameweek",
        },
      },
      {
        id: "fpl-standings",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Get League Standings",
          type: "action",
          config: {
            actionType: "fantasy-premier-league/get-classic-standings",
            leagueId: "YOUR_CLASSIC_LEAGUE_ID",
          },
          status: "idle",
          description:
            "Classic mini-league standings from FPL (top teams ranked by gameweek score)",
        },
      },
      {
        id: "fpl-rank",
        type: "action",
        position: { x: 1120, y: 200 },
        data: {
          label: "Rank Top Three",
          type: "action",
          config: {
            actionType: "code/run-code",
            code: rankLeagueTopThreeCode(),
          },
          status: "idle",
          description:
            "Sorts league members by score and assigns 5 / 3 / 2 USDC prizes",
        },
      },
      {
        id: "circle-lookup-usdc",
        type: "action",
        position: { x: 1400, y: 80 },
        data: {
          label: "Lookup USDC",
          type: "action",
          config: {
            actionType: "circle/lookup-token-address",
            network: "arc-testnet",
            symbol: "USDC",
          },
          status: "idle",
          description: "Confirm Arc USDC token metadata",
        },
      },
      {
        id: "circle-balance",
        type: "action",
        position: { x: 1400, y: 320 },
        data: {
          label: "Get Prize Pool USDC",
          type: "action",
          config: {
            actionType: "circle/get-usdc-balance",
            network: "arc-testnet",
            address: "0xYOUR_PRIZE_POOL_ADDRESS",
          },
          status: "idle",
          description: "Native 18-dec and ERC-20 6-dec USDC on Arc Testnet",
        },
      },
      {
        id: "fpl-funded",
        type: "action",
        position: { x: 1680, y: 200 },
        data: {
          label: "Prize Pool Check",
          type: "action",
          config: {
            actionType: "code/run-code",
            code: prizePoolCheckCode(),
          },
          status: "idle",
          description:
            "Requires payout addresses and at least 10 native USDC in the pool",
        },
      },
      {
        id: "fpl-funded-condition",
        type: "action",
        position: { x: 1960, y: 200 },
        data: {
          label: "Prize Pool Funded?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@fpl-funded:Prize Pool Check.result.funded}} === true",
          },
          status: "idle",
        },
      },
      {
        id: "arc-pay-first",
        type: "action",
        position: { x: 2240, y: 80 },
        data: {
          label: "Pay 1st Place",
          type: "action",
          config: {
            actionType: "arc/send-on-arc",
            token: "USDC",
            to: "{{@fpl-rank:Rank Top Three.result.first.address}}",
            amount: "{{@fpl-rank:Rank Top Three.result.first.prizeUsdc}}",
          },
          status: "idle",
          description: "5 native USDC on Arc Testnet",
        },
      },
      {
        id: "arc-pay-second",
        type: "action",
        position: { x: 2520, y: 200 },
        data: {
          label: "Pay 2nd Place",
          type: "action",
          config: {
            actionType: "arc/send-on-arc",
            token: "USDC",
            to: "{{@fpl-rank:Rank Top Three.result.second.address}}",
            amount: "{{@fpl-rank:Rank Top Three.result.second.prizeUsdc}}",
          },
          status: "idle",
          description: "3 native USDC on Arc Testnet",
        },
      },
      {
        id: "arc-pay-third",
        type: "action",
        position: { x: 2800, y: 320 },
        data: {
          label: "Pay 3rd Place",
          type: "action",
          config: {
            actionType: "arc/send-on-arc",
            token: "USDC",
            to: "{{@fpl-rank:Rank Top Three.result.third.address}}",
            amount: "{{@fpl-rank:Rank Top Three.result.third.prizeUsdc}}",
          },
          status: "idle",
          description: "2 native USDC on Arc Testnet",
        },
      },
    ],
    edges: [
      {
        id: "e-fpl-trigger-gw",
        source: "fpl-payout-trigger",
        target: "fpl-prev-gw",
      },
      {
        id: "e-fpl-gw-condition",
        source: "fpl-prev-gw",
        target: "fpl-gw-finished",
      },
      {
        id: "e-fpl-gw-standings",
        source: "fpl-gw-finished",
        target: "fpl-standings",
        sourceHandle: "true",
      },
      {
        id: "e-fpl-standings-rank",
        source: "fpl-standings",
        target: "fpl-rank",
      },
      {
        id: "e-fpl-rank-lookup",
        source: "fpl-rank",
        target: "circle-lookup-usdc",
      },
      {
        id: "e-fpl-lookup-balance",
        source: "circle-lookup-usdc",
        target: "circle-balance",
      },
      {
        id: "e-fpl-balance-funded",
        source: "circle-balance",
        target: "fpl-funded",
      },
      {
        id: "e-fpl-funded-condition",
        source: "fpl-funded",
        target: "fpl-funded-condition",
      },
      {
        id: "e-fpl-pay-first",
        source: "fpl-funded-condition",
        target: "arc-pay-first",
        sourceHandle: "true",
      },
      {
        id: "e-fpl-pay-second",
        source: "arc-pay-first",
        target: "arc-pay-second",
      },
      {
        id: "e-fpl-pay-third",
        source: "arc-pay-second",
        target: "arc-pay-third",
      },
    ],
  },
];
