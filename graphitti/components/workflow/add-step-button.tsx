"use client";

import {
  getSimpleBezierPath,
  Position,
  useEdges,
  useInternalNode,
  useNodes,
} from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useMemo } from "react";
import {
  addNodeAtom,
  autosaveAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  isPanelAnimatingAtom,
  isSidebarCollapsedAtom,
  nodesAtom,
  propertiesPanelActiveTabAtom,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/workflow-store";

const NODE_SIZE = 192;
const NODE_GAP = 80;
const BUTTON_DISTANCE = 12;
const BEZIER_FACTOR = 0.035;
const EDGE_CLEARANCE = 20;
const MAX_OFFSET = 25;

function outgoingSourceHandle(
  actionType: string | undefined
): string | undefined {
  if (actionType === "Condition") {
    return "true";
  }
  if (actionType === "For Each") {
    return "loop";
  }
  return;
}

type AddStepButtonProps = {
  sourceNodeId: string;
};

export function AddStepButton({
  sourceNodeId,
}: AddStepButtonProps): React.ReactNode {
  const edges = useEdges();
  const nodes = useNodes();
  const sourceNode = useInternalNode(sourceNodeId);
  const addNode = useSetAtom(addNodeAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setActiveTab = useSetAtom(propertiesPanelActiveTabAtom);
  const setIsPanelAnimating = useSetAtom(isPanelAnimatingAtom);
  const isSidebarCollapsed = useAtomValue(isSidebarCollapsedAtom);
  const setSidebarCollapsed = useSetAtom(isSidebarCollapsedAtom);
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);
  const triggerAutosave = useSetAtom(autosaveAtom);

  const outgoingEdges = useMemo(
    () => edges.filter((edge) => edge.source === sourceNodeId),
    [edges, sourceNodeId]
  );

  const buttonOffsetY = useMemo(() => {
    if (outgoingEdges.length === 0 || !sourceNode) {
      return 0;
    }

    const sourceAbsY = sourceNode.internals.positionAbsolute.y;
    let maxDown = 0;
    let maxUp = 0;

    for (const edge of outgoingEdges) {
      const target = nodes.find((node) => node.id === edge.target);
      if (target) {
        const displacement = (target.position.y - sourceAbsY) * BEZIER_FACTOR;
        if (displacement > 0) {
          maxDown = Math.max(maxDown, displacement);
        } else {
          maxUp = Math.min(maxUp, displacement);
        }
      }
    }

    if (maxDown >= Math.abs(maxUp)) {
      return Math.max(-(maxDown + EDGE_CLEARANCE), -MAX_OFFSET);
    }
    return Math.min(Math.abs(maxUp) + EDGE_CLEARANCE, MAX_OFFSET);
  }, [outgoingEdges, nodes, sourceNode]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!sourceNode) {
        return;
      }

      const sourceX =
        sourceNode.internals.positionAbsolute.x + NODE_SIZE + NODE_GAP;
      const sourceY = sourceNode.internals.positionAbsolute.y;

      let newY = sourceY;
      if (outgoingEdges.length > 0) {
        const targetIds = new Set(outgoingEdges.map((edge) => edge.target));
        const targetNodes = nodes.filter((node) => targetIds.has(node.id));
        if (targetNodes.length > 0) {
          const maxY = Math.max(...targetNodes.map((node) => node.position.y));
          newY = maxY + NODE_SIZE + NODE_GAP;
        }
      }

      const newNodeId = nanoid();
      const newNode: WorkflowNode = {
        id: newNodeId,
        type: "action",
        position: { x: sourceX, y: newY },
        data: {
          label: "",
          description: "",
          type: "action",
          config: {},
          status: "idle",
        },
        selected: true,
      };

      addNode(newNode);
      setActiveTab("properties");
      if (isSidebarCollapsed) {
        setIsPanelAnimating(true);
        setSidebarCollapsed(false);
        setTimeout(() => setIsPanelAnimating(false), 350);
      }

      setTimeout(() => {
        setNodes((currentNodes) =>
          currentNodes.map((node) =>
            node.selected !== (node.id === newNodeId)
              ? { ...node, selected: node.id === newNodeId }
              : node
          )
        );
      }, 50);

      const sourceActionType = (
        sourceNode.data as {
          config?: { actionType?: string };
        }
      )?.config?.actionType;
      const sourceHandle = outgoingSourceHandle(sourceActionType);

      const newEdge: WorkflowEdge = {
        id: nanoid(),
        source: sourceNodeId,
        target: newNodeId,
        type: "animated",
        ...(sourceHandle ? { sourceHandle } : {}),
      };
      requestAnimationFrame(() => {
        setEdges((currentEdges) => [...currentEdges, newEdge]);
        setHasUnsavedChanges(true);
        triggerAutosave({ immediate: true });
      });
    },
    [
      sourceNode,
      sourceNodeId,
      outgoingEdges,
      nodes,
      addNode,
      setEdges,
      setNodes,
      setActiveTab,
      isSidebarCollapsed,
      setIsPanelAnimating,
      setSidebarCollapsed,
      setHasUnsavedChanges,
      triggerAutosave,
    ]
  );

  const hasNoTargets = outgoingEdges.length === 0;
  const [connectorPath] = getSimpleBezierPath({
    sourceX: 0,
    sourceY: 0,
    sourcePosition: Position.Right,
    targetX: BUTTON_DISTANCE,
    targetY: buttonOffsetY,
    targetPosition: Position.Left,
  });

  return (
    <>
      <button
        aria-label={hasNoTargets ? "Add step" : "Add branch"}
        className="add-step-button group nopan nodrag -translate-y-1/2 absolute"
        data-testid="add-step-button"
        onClick={handleClick}
        style={{
          left: `calc(100% + ${BUTTON_DISTANCE}px)`,
          top: `calc(50% + ${buttonOffsetY}px)`,
        }}
        title={hasNoTargets ? "Add step" : "Add branch"}
        type="button"
      >
        <span className="flex size-7 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all duration-150 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary">
          <Plus className="size-4" strokeWidth={2} />
        </span>
      </button>
      <svg
        aria-hidden="true"
        className="add-step-connector pointer-events-none absolute"
        role="presentation"
        style={{
          left: "100%",
          top: "50%",
          overflow: "visible",
          width: 1,
          height: 1,
        }}
      >
        <path
          d={connectorPath}
          fill="none"
          stroke="var(--border)"
          strokeDasharray="4 3"
          strokeWidth="1.5"
        />
      </svg>
    </>
  );
}
