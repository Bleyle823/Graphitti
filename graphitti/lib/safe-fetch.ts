export class SsrfBlockedError extends Error {
  readonly code = "SSRF_BLOCKED";

  constructor(message: string) {
    super(message);
    this.name = "SsrfBlockedError";
  }
}

export async function assertUrlIsPublic(url: string): Promise<void> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new SsrfBlockedError(`Blocked URL scheme: ${parsed.protocol}`);
  }
}

export type SafeFetchInit = RequestInit & {
  plugin?: string;
};

export async function safeFetch(
  url: string,
  init?: SafeFetchInit
): Promise<Response> {
  await assertUrlIsPublic(url);
  return fetch(url, init);
}
