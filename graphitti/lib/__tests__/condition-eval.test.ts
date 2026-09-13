import { describe, expect, it } from "vitest";
import { evaluateConditionExpression } from "@/lib/condition-eval";
import { unwrapQuotedConditionTemplates } from "@/lib/condition-validator";

const FPL_FUNDED_QUOTED =
  '{{@fpl-rank:Rank Top Two.ready}} === true && Number("{{@circle-balance:Get Prize Pool USDC.nativeBalance}}") >= Number("{{@fpl-rank:Rank Top Two.totalPrizeUsdc}}")';

const fundedOutputs = {
  "fpl-rank": {
    label: "Rank Top Two",
    data: {
      success: true,
      data: { ready: true, totalPrizeUsdc: "8" },
    },
  },
  "circle-balance": {
    label: "Get Prize Pool USDC",
    data: {
      success: true,
      data: { nativeBalance: "21.468614" },
    },
  },
};

describe("unwrapQuotedConditionTemplates", () => {
  it("stops Number() from stringifying the generated variable name", () => {
    expect(unwrapQuotedConditionTemplates(FPL_FUNDED_QUOTED)).toBe(
      "{{@fpl-rank:Rank Top Two.ready}} === true && Number({{@circle-balance:Get Prize Pool USDC.nativeBalance}}) >= Number({{@fpl-rank:Rank Top Two.totalPrizeUsdc}})"
    );
  });
});

describe("evaluateConditionExpression", () => {
  it("treats a funded Arc pool as true even when Number() quoted the templates", () => {
    const { result } = evaluateConditionExpression(
      FPL_FUNDED_QUOTED,
      fundedOutputs
    );
    expect(result).toBe(true);
  });

  it("is false when the pool is actually short", () => {
    const { result } = evaluateConditionExpression(FPL_FUNDED_QUOTED, {
      ...fundedOutputs,
      "circle-balance": {
        label: "Get Prize Pool USDC",
        data: {
          success: true,
          data: { nativeBalance: "2.5" },
        },
      },
    });
    expect(result).toBe(false);
  });
});
