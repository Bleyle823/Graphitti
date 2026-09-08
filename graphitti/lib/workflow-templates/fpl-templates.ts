import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import type { WorkflowTemplate } from "./normalize-export";

const PARTICIPANT_COUNT = 5;
const PRIZES = ["5", "3", "2"] as const;

function managerHistoryNodes(): WorkflowNode[] {
  return Array.from({ length: PARTICIPANT_COUNT }, (_, index) => {
    const n = index + 1;
    return {
      id: `fpl-mgr-${n}`,
      type: "action" as const,
      position: { x: 840, y: 24 + index * 88 },
      data: {
        label: `Manager ${n} History`,
        type: "action" as const,
        config: {
          actionType: "fantasy-premier-league/get-manager-history",
          managerId: String(n),
        },
        status: "idle" as const,
        description: `Gameweek points for mini-league slot ${n}. Replace managerId with your FPL entry id.`,
      },
    };
  });
}

function managerHistoryEdges(): WorkflowEdge[] {
  const edges: WorkflowEdge[] = [
    {
      id: "e-fpl-gw-finished",
      source: "fpl-gw-finished",
      target: "fpl-mgr-1",
    },
  ];
  for (let n = 1; n < PARTICIPANT_COUNT; n += 1) {
    edges.push({
      id: `e-fpl-mgr-${n}-to-${n + 1}`,
      source: `fpl-mgr-${n}`,
      target: `fpl-mgr-${n + 1}`,
    });
  }
  edges.push({
    id: "e-fpl-mgr-to-rank",
    source: `fpl-mgr-${PARTICIPANT_COUNT}`,
    target: "fpl-rank",
  });
  return edges;
}

function rankTopThreeCode(): string {
  const roster = Array.from({ length: PARTICIPANT_COUNT }, (_, index) => {
    const n = index + 1;
    const slot = String(n).padStart(2, "0");
    return `  { slot: ${n}, managerId: "${n}", name: "Team ${n}", address: "0xTEAM_${slot}_PAYOUT_ADDRESS" },`;
  }).join("\n");

  const histories = Array.from({ length: PARTICIPANT_COUNT }, (_, index) => {
    const n = index + 1;
    return `  [{{@fpl-mgr-${n}:Manager ${n} History.current}}].flat(),`;
  }).join("\n");

  return `const gameweekId = Number("{{@fpl-prev-gw:Get Previous Gameweek.events.0.id}}" || "0");
const gameweekName = "{{@fpl-prev-gw:Get Previous Gameweek.events.0.name}}" || "";

const roster = [
${roster}
];

const histories = [
${histories}
];

function pointsForEvent(history, eventId) {
  if (!Array.isArray(history)) {
    return 0;
  }
  const row = history.find(function (item) {
    return Number(item && item.event) === eventId;
  });
  return row ? Number(row.points) || 0 : 0;
}

const prizes = ${JSON.stringify([...PRIZES])};
const ranked = roster.map(function (team, index) {
  return {
    slot: team.slot,
    managerId: team.managerId,
    name: team.name,
    address: team.address,
    points: pointsForEvent(histories[index], gameweekId),
  };
}).sort(function (a, b) {
  if (b.points !== a.points) {
    return b.points - a.points;
  }
  return a.slot - b.slot;
});

const top3 = ranked.slice(0, 3).map(function (team, index) {
  return {
    place: index + 1,
    managerId: team.managerId,
    name: team.name,
    address: team.address,
    points: team.points,
    prizeUsdc: prizes[index],
  };
});

const first = top3[0] || null;
const second = top3[1] || null;
const third = top3[2] || null;
const placeholder = "PAYOUT_ADDRESS";
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
    name: "FPL Mini-League USDC Payouts",
    description:
      "After a finished gameweek, rank 5 FPL managers by points and send 5 / 3 / 2 USDC on Arc to the top three payout wallets. Circle checks the prize-pool balance first.",
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
        width: 280,
        height: 220,
        position: { x: -340, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect FPL, Circle, and Arc. Link your Privy wallet. Replace manager IDs 1-5 and the 5 payout wallets in Rank Top Three (keep the same order). Set the prize-pool address on Get Prize Pool USDC. Pays 5 / 3 / 2 native USDC on Arc Testnet to 1st / 2nd / 3rd.",
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
      ...managerHistoryNodes(),
      {
        id: "fpl-rank",
        type: "action",
        position: { x: 1160, y: 200 },
        data: {
          label: "Rank Top Three",
          type: "action",
          config: {
            actionType: "code/run-code",
            code: rankTopThreeCode(),
          },
          status: "idle",
          description:
            "Sorts the 5 managers by that gameweek's points and assigns 5 / 3 / 2 USDC",
        },
      },
      {
        id: "circle-lookup-usdc",
        type: "action",
        position: { x: 1440, y: 80 },
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
        position: { x: 1440, y: 320 },
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
        position: { x: 1720, y: 200 },
        data: {
          label: "Prize Pool Check",
          type: "action",
          config: {
            actionType: "code/run-code",
            code: prizePoolCheckCode(),
          },
          status: "idle",
          description:
            "Requires replaced payout addresses and at least 10 native USDC",
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
        id: "arc-pay-first",
        type: "action",
        position: { x: 2280, y: 80 },
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
        position: { x: 2560, y: 200 },
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
        position: { x: 2840, y: 320 },
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
      ...managerHistoryEdges(),
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
