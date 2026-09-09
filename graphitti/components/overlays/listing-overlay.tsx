"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Overlay } from "@/components/overlays/overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import type { OverlayComponentProps } from "@/components/overlays/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SchemaBuilder,
  type SchemaField,
} from "@/components/workflow/config/schema-builder";
import { api } from "@/lib/api-client";
import { NETWORK_SELECT_OPTIONS } from "@/lib/web3/chains";

type ListingOverlayProps = OverlayComponentProps<{
  workflowId: string;
  workflowName: string;
  existingSlug?: string | null;
  existingPrice?: string | null;
  existingCategory?: string | null;
  existingChain?: string | null;
  existingType?: "read" | "write";
  existingSchema?: Record<string, unknown> | null;
  isListed?: boolean;
}>;

function fieldsToJsonSchema(fields: SchemaField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.name) {
      continue;
    }
    properties[field.name] = {
      type: field.type,
      ...(field.description ? { description: field.description } : {}),
    };
  }
  return {
    type: "object",
    properties,
  };
}

export function ListingOverlay({
  overlayId,
  workflowId,
  workflowName,
  existingSlug,
  existingPrice,
  existingCategory,
  existingChain,
  existingType,
  existingSchema,
  isListed,
}: ListingOverlayProps) {
  const { closeAll } = useOverlay();
  const [slug, setSlug] = useState(existingSlug ?? "");
  const [price, setPrice] = useState(existingPrice ?? "0");
  const [category, setCategory] = useState(existingCategory ?? "general");
  const [chain, setChain] = useState(existingChain ?? "arc-testnet");
  const [workflowType, setWorkflowType] = useState<"read" | "write">(
    existingType ?? "read"
  );
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [outputField, setOutputField] = useState("");
  const [saving, setSaving] = useState(false);
  const slugLocked = Boolean(existingSlug);

  const publish = async (listed: boolean) => {
    try {
      setSaving(true);
      await api.marketplace.list({
        workflowId,
        slug: slug || undefined,
        priceUsdcPerCall: price,
        category,
        chain,
        workflowType,
        inputSchema: fieldsToJsonSchema(
          schema.length
            ? schema
            : [
                ...(existingSchema
                  ? []
                  : [{ name: "input", type: "string" as const }]),
              ]
        ),
        outputMapping: outputField ? { field: outputField } : undefined,
        listed,
      });
      toast.success(listed ? "Workflow listed" : "Workflow unlisted");
      closeAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Listing failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay
      actions={[
        { label: "Cancel", variant: "outline", onClick: closeAll },
        ...(isListed
          ? [
              {
                label: "Unlist",
                variant: "outline" as const,
                onClick: () => publish(false),
                loading: saving,
              },
            ]
          : []),
        {
          label: isListed ? "Update listing" : "List workflow",
          onClick: () => publish(true),
          loading: saving,
        },
      ]}
      overlayId={overlayId}
      title={`List ${workflowName}`}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Paid listings settle in Arc USDC. Link a Privy wallet before setting a
          price greater than 0. The slug cannot change after the first publish.
        </p>
        <div className="space-y-2">
          <Label htmlFor="listing-slug">Slug</Label>
          <Input
            disabled={slugLocked}
            id="listing-slug"
            onChange={(event) => setSlug(event.target.value)}
            placeholder="my-workflow"
            value={slug}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="listing-price">Price (Arc USDC per call)</Label>
          <Input
            id="listing-price"
            onChange={(event) => setPrice(event.target.value)}
            placeholder="0"
            value={price}
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            onValueChange={(value) =>
              setWorkflowType(value as "read" | "write")
            }
            value={workflowType}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="write">Write</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Chain</Label>
          <Select onValueChange={setChain} value={chain}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NETWORK_SELECT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="listing-category">Category</Label>
          <Input
            id="listing-category"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          />
        </div>
        <div className="space-y-2">
          <Label>Input schema</Label>
          <SchemaBuilder onChange={setSchema} schema={schema} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="listing-output">Output field</Label>
          <Input
            id="listing-output"
            onChange={(event) => setOutputField(event.target.value)}
            placeholder="balance"
            value={outputField}
          />
        </div>
      </div>
    </Overlay>
  );
}
