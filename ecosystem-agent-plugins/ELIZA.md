# Graphitti ecosystem plugins in elizaOS

These packages wrap `@graphitti/graph-core` and `@graphitti/privy-core` as elizaOS v2 plugins.

## eliza-main integration

In `eliza-main`, install workspace links:

- `@elizaos/plugin-graphitti-the-graph`
- `@elizaos/plugin-graphitti-privy`

Both depend on the Graphitti repo via `file:` paths under `C:\Users\Public\Graphitti-1\ecosystem-agent-plugins\`.

Build Graphitti cores and plugins first:

```bash
cd C:/Users/Public/Graphitti-1/ecosystem-agent-plugins
pnpm install
pnpm build
```

Then from eliza-main:

```bash
cd C:/Users/Omen/Desktop/eliza-main
bun install
bun run --cwd plugins/plugin-graphitti-the-graph test
bun run --cwd plugins/plugin-graphitti-privy test
```

Add to an agent character `plugins` array:

```json
"@elizaos/plugin-graphitti-the-graph",
"@elizaos/plugin-graphitti-privy",
"@elizaos/plugin-openai"
```

For OpenRouter, set (same values as Graphitti `graphitti/.env.local`):

- `OPENAI_API_KEY` or `OPENAI_API_KEY` mapped from your OpenRouter key
- `OPENAI_BASE_URL=https://openrouter.ai/api/v1`
- `SMALL_MODEL` / `LARGE_MODEL` (for example `nvidia/nemotron-3.5-lightning:free`)

Graph and Privy credentials:

- `THEGRAPH_API_KEY`
- `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, optional `PRIVY_AUTHORIZATION_KEY`

Plugin `init` warns instead of throwing when keys are missing; actions fail at `validate` until configured.

## Test report (summary)

See **[TEST-REPORT.md](./TEST-REPORT.md)** for the full matrix. Quick checks:

```bash
cd ecosystem-agent-plugins && pnpm test          # offline
cd ecosystem-agent-plugins && pnpm test:live     # Gateway + Privy REST (local keys)
```

| Check | What it validates |
|-------|-------------------|
| `plugin-graphitti-the-graph` vitest | elizaOS re-export of `plugin-the-graph` |
| `plugin-graphitti-privy` vitest | elizaOS re-export of `plugin-privy` |

