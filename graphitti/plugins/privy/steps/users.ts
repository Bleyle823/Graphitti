import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getPrivyUser } from "@/lib/web3/privy-client";
import { applyPrivyCredentials } from "../credentials";

export type GetUserInput = StepInput & {
  integrationId?: string;
  privyUserId: string;
};

async function getUser(input: GetUserInput) {
  const fetched = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};
  const authError = applyPrivyCredentials(fetched);
  if (authError) {
    return authError;
  }
  if (!input.privyUserId) {
    return fail("privyUserId is required");
  }
  try {
    const user = await getPrivyUser(input.privyUserId);
    return ok({
      id: user.id,
      linked_accounts: user.linked_accounts ?? [],
      wallets: user.wallets ?? [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function getUserStep(input: GetUserInput) {
  "use step";
  return withStepLogging(input, () => getUser(input));
}

export const _integrationType = "privy";
