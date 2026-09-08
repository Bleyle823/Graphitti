import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import {
  resolveTheGraphCredentials,
  type TheGraphCredentials,
} from "./credentials";

export async function loadTheGraphCredentials(
  integrationId?: string
): Promise<TheGraphCredentials> {
  const fetched = integrationId
    ? ((await fetchCredentials(integrationId)) as TheGraphCredentials)
    : {};
  return resolveTheGraphCredentials(fetched);
}
