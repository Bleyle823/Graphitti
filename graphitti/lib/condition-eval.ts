import {
  preValidateConditionExpression,
  unwrapQuotedConditionTemplates,
  validateConditionExpression,
} from "@/lib/condition-validator";
import {
  type NodeOutputs,
  resolveNewFormatTemplateValue,
} from "@/lib/utils/template";

type ConditionEvalResult = {
  result: boolean;
  resolvedValues: Record<string, unknown>;
};

function replaceTemplateVariable(
  nodeId: string,
  rest: string,
  outputs: NodeOutputs,
  evalContext: Record<string, unknown>,
  varCounter: { value: number }
): string {
  const value = resolveNewFormatTemplateValue(nodeId, rest, outputs);
  const varName = `__v${varCounter.value}`;
  varCounter.value += 1;
  evalContext[varName] = value;
  return varName;
}

/**
 * Evaluate a canvas condition after substituting {{@node:Label.field}} refs.
 */
export function evaluateConditionExpression(
  conditionExpression: unknown,
  outputs: NodeOutputs
): ConditionEvalResult {
  if (typeof conditionExpression === "boolean") {
    return { result: conditionExpression, resolvedValues: {} };
  }

  if (typeof conditionExpression !== "string") {
    return { result: Boolean(conditionExpression), resolvedValues: {} };
  }

  const expression = unwrapQuotedConditionTemplates(conditionExpression);
  const preValidation = preValidateConditionExpression(expression);
  if (!preValidation.valid) {
    return { result: false, resolvedValues: {} };
  }

  try {
    const evalContext: Record<string, unknown> = {};
    const resolvedValues: Record<string, unknown> = {};
    const varCounter = { value: 0 };
    const transformedExpression = expression.replace(
      /\{\{@([^:]+):([^}]+)\}\}/g,
      (_match, nodeId, rest) => {
        const varName = replaceTemplateVariable(
          nodeId,
          rest,
          outputs,
          evalContext,
          varCounter
        );
        resolvedValues[rest] = evalContext[varName];
        return varName;
      }
    );

    const validation = validateConditionExpression(transformedExpression);
    if (!validation.valid) {
      return { result: false, resolvedValues };
    }

    const varNames = Object.keys(evalContext);
    const varValues = Object.values(evalContext);
    const evalFunc = new Function(
      ...varNames,
      `return (${transformedExpression});`
    );
    const result = evalFunc(...varValues);
    return { result: Boolean(result), resolvedValues };
  } catch {
    return { result: false, resolvedValues: {} };
  }
}
