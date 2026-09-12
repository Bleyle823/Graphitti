import type { WorkflowTemplate } from "./normalize-export";

const DEFAULT_ROSTER_JSON = JSON.stringify(
  [
    {
      team: "TRAP 38",
      manager: "Matt Herman",
      address: "0xdEBC58A3CE140Ef84E5757013c1998FdAfDB44D6",
    },
    {
      team: "Wantam!",
      manager: "Alpha Jay",
      address: "0xc67c0d1d4e12D838f3ed2fC6241D8e65Dfb3100B",
    },
    {
      team: "LilUziWirtz",
      manager: "Roy Beka",
      address: "0xe62803A1A219Be5f0D437ed9F84F2e4CDc8A3Ca1",
    },
    {
      team: "Kippstars",
      manager: "kipp ace",
      address: "0xF6599D1f2DF4266922cE8E25cF7511dFeCfDcdf5",
    },
  ],
  null,
  2
);

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
            text: "Set classic league ID on Get League Standings. Edit the roster JSON on Rank Top Two (team, manager, Arc wallet). Team names match FPL entry_name with emojis stripped. Set prize-pool address on Get Prize Pool USDC (same wallet that sends via Arc). Pays 5 / 3 native USDC to mapped 1st / 2nd only.",
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
            leagueId: "962707",
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
            actionType: "fantasy-premier-league/rank-top-two",
            standings:
              "{{@fpl-standings:Get League Standings.standings.results}}",
            roster: DEFAULT_ROSTER_JSON,
            firstPrizeUsdc: "5",
            secondPrizeUsdc: "3",
            gameweekId: "{{@fpl-prev-gw:Get Previous Gameweek.events.0.id}}",
            gameweekName:
              "{{@fpl-prev-gw:Get Previous Gameweek.events.0.name}}",
            leagueId: "{{@fpl-standings:Get League Standings.league.id}}",
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
            address: "0xfb526dC52755ba99F7d952e8385bBAAc572F00c9",
          },
          status: "idle",
          description: "Native 18-dec and ERC-20 6-dec USDC on Arc Testnet",
        },
      },
      {
        id: "fpl-funded-condition",
        type: "action",
        position: { x: 1680, y: 200 },
        data: {
          label: "Prize Pool Funded?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              '{{@fpl-rank:Rank Top Two.ready}} === true && Number("{{@circle-balance:Get Prize Pool USDC.nativeBalance}}") >= Number("{{@fpl-rank:Rank Top Two.totalPrizeUsdc}}")',
          },
          status: "idle",
          description:
            "Requires at least one mapped top-two wallet and enough pool USDC",
        },
      },
      {
        id: "fpl-pay-first-condition",
        type: "action",
        position: { x: 2000, y: 60 },
        data: {
          label: "Pay 1st?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              'String({{@fpl-rank:Rank Top Two.first.address}} || "").length >= 42',
          },
          status: "idle",
          description: "Mapped roster wallet for gameweek leader",
        },
      },
      {
        id: "fpl-pay-second-condition",
        type: "action",
        position: { x: 2000, y: 340 },
        data: {
          label: "Pay 2nd?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              'String({{@fpl-rank:Rank Top Two.second.address}} || "").length >= 42',
          },
          status: "idle",
          description: "Mapped roster wallet for runner-up",
        },
      },
      {
        id: "arc-pay-first",
        type: "action",
        position: { x: 2300, y: 60 },
        data: {
          label: "Pay 1st Place",
          type: "action",
          config: {
            actionType: "arc/send-on-arc",
            token: "USDC",
            to: "{{@fpl-rank:Rank Top Two.first.address}}",
            amount: "{{@fpl-rank:Rank Top Two.first.prizeUsdc}}",
          },
          status: "idle",
          description: "5 native USDC on Arc Testnet",
        },
      },
      {
        id: "arc-pay-second",
        type: "action",
        position: { x: 2300, y: 340 },
        data: {
          label: "Pay 2nd Place",
          type: "action",
          config: {
            actionType: "arc/send-on-arc",
            token: "USDC",
            to: "{{@fpl-rank:Rank Top Two.second.address}}",
            amount: "{{@fpl-rank:Rank Top Two.second.prizeUsdc}}",
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
