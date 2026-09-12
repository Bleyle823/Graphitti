import type { WorkflowTemplate } from "./normalize-export";

const TOP_TWO_PRIZES = ["5", "3"] as const;

function rankLeagueTopTwoCode(): string {
  return `function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^\\w]+/g, "");
}

function findRosterAddress(entryName, playerName) {
  const teamKey = normalizeKey(entryName);
  const managerKey = normalizeKey(playerName);
  for (var i = 0; i < roster.length; i++) {
    var row = roster[i];
    if (normalizeKey(row.team) === teamKey && normalizeKey(row.manager) === managerKey) {
      return row.address;
    }
  }
  for (var j = 0; j < roster.length; j++) {
    var fallback = roster[j];
    if (normalizeKey(fallback.team) === teamKey) {
      return fallback.address;
    }
  }
  return "";
}

const gameweekId = Number("{{@fpl-prev-gw:Get Previous Gameweek.events.0.id}}" || "0");
const gameweekName = "{{@fpl-prev-gw:Get Previous Gameweek.events.0.name}}" || "";
const leagueId = "{{@fpl-standings:Get League Standings.league.id}}" || "";

// Edit team names, managers, and Arc payout wallets for your league.
const roster = [
  { team: "TRAP 38", manager: "Matt Herman", address: "0xdEBC58A3CE140Ef84E5757013c1998FdAfDB44D6" },
  { team: "Wantam!", manager: "Alpha Jay", address: "0xc67c0d1d4e12D838f3ed2fC6241D8e65Dfb3100B" },
  { team: "LilUziWirtz", manager: "Roy Beka", address: "0xe62803A1A219Be5f0D437ed9F84F2e4CDc8A3Ca1" },
  { team: "Kippstars", manager: "kipp ace", address: "0xF6599D1f2DF4266922cE8E25cF7511dFeCfDcdf5" },
];

const results = {{@fpl-standings:Get League Standings.standings.results}} || [];
const prizes = ${JSON.stringify([...TOP_TWO_PRIZES])};

const ranked = results.map(function (row) {
  var entryName = (row && row.entry_name) || "";
  var playerName = (row && row.player_name) || "";
  return {
    entry: Number(row && row.entry) || 0,
    entryName: entryName,
    playerName: playerName,
    rank: Number(row && row.rank) || 0,
    points: Number(row && (row.event_total != null ? row.event_total : row.total)) || 0,
    address: findRosterAddress(entryName, playerName),
  };
}).sort(function (a, b) {
  if (b.points !== a.points) {
    return b.points - a.points;
  }
  return a.rank - b.rank;
});

const top2 = ranked.slice(0, 2).map(function (team, index) {
  return {
    place: index + 1,
    entry: team.entry,
    entryName: team.entryName,
    playerName: team.playerName,
    points: team.points,
    address: team.address,
    prizeUsdc: prizes[index],
  };
});

const first = top2[0] || { address: "", prizeUsdc: "0" };
const second = top2[1] || { address: "", prizeUsdc: "0" };
var totalPrizeUsdc = 0;
if (first.address) {
  totalPrizeUsdc += Number(first.prizeUsdc) || 0;
}
if (second.address) {
  totalPrizeUsdc += Number(second.prizeUsdc) || 0;
}
const ready = totalPrizeUsdc > 0;

return {
  gameweekId: gameweekId,
  gameweekName: gameweekName,
  leagueId: leagueId,
  participants: ranked.length,
  ready: ready,
  totalPrizeUsdc: String(totalPrizeUsdc),
  first: first,
  second: second,
  ranking: ranked,
};`;
}

function prizePoolCheckCode(): string {
  return `const ready = {{@fpl-rank:Rank Top Two.result.ready}};
const balance = Number("{{@circle-balance:Get Prize Pool USDC.nativeBalance}}" || "0");
const required = Number("{{@fpl-rank:Rank Top Two.result.totalPrizeUsdc}}" || "0");
return {
  funded: ready === true && balance >= required,
  nativeBalance: balance,
  required: required,
};`;
}

const FPL_CANVAS_IMAGE = {
  id: "fpl-payout-image",
  type: "image" as const,
  dragHandle: ".canvas-image-drag-handle",
  width: 320,
  height: 180,
  position: { x: -360, y: 420 },
  data: {
    label: "Image",
    type: "image" as const,
    config: {
      src: "https://img.chelseafc.com/image/upload/f_auto,c_fill,ar_16:9,w_1176,q_90/video/2026/08/28/CFCxCircle-FOS_Partnership_1920x1080-LOCKUP.png",
      alt: "Chelsea FC and Circle partnership",
    },
    status: "idle" as const,
  },
};

export const FPL_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "FPL League Top Two USDC Payouts",
    description:
      "After a finished gameweek, load classic FPL league standings, match top two teams to roster wallets (emoji-safe names), and send 5 / 3 USDC on Arc to 1st / 2nd.",
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
        height: 260,
        position: { x: -360, y: 120 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Set classic league ID on Get League Standings. Edit the roster array in Rank Top Two (team, manager, Arc wallet). Team names match FPL entry_name with emojis stripped. Set prize-pool address on Get Prize Pool USDC (same wallet that sends via Arc). Pays 5 / 3 native USDC to mapped 1st / 2nd only.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      FPL_CANVAS_IMAGE,
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
          label: "Rank Top Two",
          type: "action",
          config: {
            actionType: "code/run-code",
            code: rankLeagueTopTwoCode(),
          },
          status: "idle",
          description:
            "Sorts by gameweek score and maps roster wallets to 1st / 2nd",
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
            "Requires at least one mapped top-two wallet and enough pool USDC",
        },
      },
      {
        id: "fpl-funded-condition",
        type: "action",
        position: { x: 2000, y: 200 },
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
        id: "fpl-pay-first-condition",
        type: "action",
        position: { x: 2300, y: 60 },
        data: {
          label: "Pay 1st?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              'String({{@fpl-rank:Rank Top Two.result.first.address}} || "").length >= 42',
          },
          status: "idle",
          description: "Mapped roster wallet for gameweek leader",
        },
      },
      {
        id: "fpl-pay-second-condition",
        type: "action",
        position: { x: 2300, y: 340 },
        data: {
          label: "Pay 2nd?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              'String({{@fpl-rank:Rank Top Two.result.second.address}} || "").length >= 42',
          },
          status: "idle",
          description: "Mapped roster wallet for runner-up",
        },
      },
      {
        id: "arc-pay-first",
        type: "action",
        position: { x: 2600, y: 60 },
        data: {
          label: "Pay 1st Place",
          type: "action",
          config: {
            actionType: "arc/send-on-arc",
            token: "USDC",
            to: "{{@fpl-rank:Rank Top Two.result.first.address}}",
            amount: "{{@fpl-rank:Rank Top Two.result.first.prizeUsdc}}",
          },
          status: "idle",
          description: "5 native USDC on Arc Testnet",
        },
      },
      {
        id: "arc-pay-second",
        type: "action",
        position: { x: 2600, y: 340 },
        data: {
          label: "Pay 2nd Place",
          type: "action",
          config: {
            actionType: "arc/send-on-arc",
            token: "USDC",
            to: "{{@fpl-rank:Rank Top Two.result.second.address}}",
            amount: "{{@fpl-rank:Rank Top Two.result.second.prizeUsdc}}",
          },
          status: "idle",
          description: "3 native USDC on Arc Testnet",
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
        id: "e-fpl-funded-first-branch",
        source: "fpl-funded-condition",
        target: "fpl-pay-first-condition",
        sourceHandle: "true",
      },
      {
        id: "e-fpl-funded-second-branch",
        source: "fpl-funded-condition",
        target: "fpl-pay-second-condition",
        sourceHandle: "true",
      },
      {
        id: "e-fpl-pay-first",
        source: "fpl-pay-first-condition",
        target: "arc-pay-first",
        sourceHandle: "true",
      },
      {
        id: "e-fpl-pay-second",
        source: "fpl-pay-second-condition",
        target: "arc-pay-second",
        sourceHandle: "true",
      },
    ],
  },
];
