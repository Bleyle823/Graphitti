# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`

## Terminology

- **workflow**: A graph of a trigger plus actions you run in the editor, by API, or through MCP
- **listing**: A published workflow in the marketplace, identified by an immutable **slug**
- **slug**: Public URL key for a listing. Reserved values: marketplace, api, mcp, openapi, admin, hub
- **Privy wallet**: Embedded EVM wallet linked to a Better Auth user and stored in `user_wallets`
- **Arc USDC**: Marketplace settlement asset on Arc Testnet (`0x3600…0000`, 6-decimal ERC-20). Native Arc gas USDC is 18 decimals
- **plugin**: An integration that registers actions in the workflow builder
- **action**: A single step a plugin can run

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references

## Content boundaries

Document Browser, Agent (MCP), and API paths only. Do not document Turnkey, orgs/teams, Tempo/MPP, Base x402, CLI, keepers/scheduler, or protocol plugins that are not shipped.
