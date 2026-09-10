import "server-only";

import { fail, ok } from "@/lib/http-json";
import { listOrgPayees } from "@/lib/org/auth-helpers";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { resolveOrganizationContext } from "@/lib/web3/resolve-org-context";

type TreasuryStepInput = StepInput & {
  _context?: {
    executionId?: string;
    organizationId?: string;
  };
};

async function listPayees(input: TreasuryStepInput) {
  const orgContext = await resolveOrganizationContext(
    input._context ?? {},
    "[Treasury]",
    "list-payees"
  );
  if (!orgContext.success) {
    return fail(orgContext.error);
  }

  const payees = await listOrgPayees(orgContext.organizationId);
  return ok({
    payees,
    count: payees.length,
  });
}

export async function listPayeesStep(input: TreasuryStepInput) {
  "use step";
  return withStepLogging(input, () => listPayees(input));
}

export const _integrationType = "treasury";
