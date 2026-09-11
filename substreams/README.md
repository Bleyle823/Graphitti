# Kelp rsETH SQL sink

Monolithic Substreams package for Kelp rsETH unbacked-mint detection. Streams mainnet backing metrics and Arbitrum OFT supply into **Postgres via SQL sink** (Supabase), then Graphitti workflows read snapshots through the **Supabase plugin**.

Graph Studio rejected Substreams-powered subgraph deploys for this package. Use the SQL sink path documented below.

## Stack

| Layer | Tool |
|---|---|
| Indexing | Substreams (`substreams.yaml` + `substreams.arbitrum.yaml`) |
| Storage | Supabase Postgres (`backing_snapshots` + SQL trigger) |
| Alerts | Graphitti **Kelp rsETH Backing Monitor (Substreams → Supabase)** (`supabase/get-latest-row`) |

Single Rust crate with multiple YAML manifests. Includes LayerZero adapter accounting and bridge deviation alerts (> 50 bps).

## Contracts

| Read | Address | Chain |
|---|---|---|
| rsETH | `0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7` | mainnet |
| rsETH Arbitrum OFT | `0x4186BFC76E2E237523CBC30FD220FE055156b41F` | arbitrum-one |
| LRTDepositPool | `0x036676389e48133B63a802f8635AD39E752D375D` | mainnet |
| stETH | `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84` | mainnet |
| ETHx | `0xA35b1B31Ce002FBF2058D22F30f95D405200A15b` | mainnet |
| LayerZero OFT adapter | `0x85d456B2DfF1fd8245387C0BfB64Dfb700e98Ef3` | mainnet |

Alert when vault deviation **> 50 bps** or bridge deviation **> 50 bps** (`should_alert` on each snapshot row).

## Manifests

| File | Purpose |
|---|---|
| `substreams.yaml` | Mainnet `map_backing_mainnet` → `public.backing_snapshots` |
| `substreams.arbitrum.yaml` | Arbitrum `map_arb_rseth_supply` → `arbitrum.arb_rseth_supply` |
| `substreams.crosschain.yaml` | Optional cross-chain module + `graph_out` (not used for Supabase path) |

Start block: **25900000** (mainnet), **504100000** (Arbitrum).

## Build

```bash
cd substreams
substreams auth
```

**Docker (recommended on Windows):**

```bash
docker run --rm -v "${PWD}:/usr/src" -w /usr/src rust:1.76.0 bash docker-build.sh
```

**Or local / Makefile:**

```bash
make build
make pack   # produces substreams-challenge-v0.1.0.spkg + kelp-rseth-arbitrum-supply-v0.1.0.spkg
```

**Graphitti build image** (includes buf + substreams CLI):

```bash
docker build -f Dockerfile.build -t graphitti-substreams-build .
docker run --rm -v "${PWD}:/work" -w /work graphitti-substreams-build bash docker-build.sh
```

Output WASM: `target/wasm32-unknown-unknown/release/substreams.wasm`

## SQL sinks to Supabase

Run **two** sinks 24/7 (local Docker today). Supabase REST stays online for reads; sinks must keep writing rows.

**Mainnet** (from this directory):

```bash
substreams sink postgres substreams.yaml \
  "postgres://postgres.<project-ref>:<password>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**Arbitrum** (separate schema):

```bash
substreams sink postgres substreams.arbitrum.yaml \
  "postgres://postgres.<project-ref>:<password>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&schemaName=arbitrum" \
  --apply-constraints manual
```

Use your Supabase **IPv4 session pooler** DSN if direct `db.*.supabase.co` is unreachable from your machine.

Supabase should run `apply_kelp_invariants()` on `backing_snapshots` so the latest Arbitrum supply is merged and `should_alert` is computed before PostgREST serves rows.

## Graphitti integration

1. **Project Integrations → Supabase** — `SUPABASE_URL` + `SUPABASE_ANON_KEY`
2. Create workflow from template **Kelp rsETH Backing Monitor (Substreams → Supabase)**
3. Replace the webhook URL placeholder
4. Deploy workflow; block trigger requires **KeeperHub**
5. Keep both SQL sink containers running on your machine for live data

Workflow shape:

```
Block trigger → supabase/get-latest-row (backing_snapshots) → Condition → webhook
```

See `docs/plugins/supabase.mdx` in the Graphitti repo.

## Optional subgraph path

`deployments.json`, `subgraph.yaml`, and `build/subgraph.yaml` support a Studio subgraph deploy via `graph_out_subgraph`. Studio currently rejects Substreams-powered subgraphs for this package. Treat subgraph files as reference only unless Studio policy changes.

## Quality gate

```bash
substreams run substreams.yaml map_backing_mainnet -s 25900000 -t +10 -o jsonl
substreams run substreams.arbitrum.yaml map_arb_rseth_supply -s 504100000 -t +10 -o jsonl
```

## Layout

```
substreams/
  src/           # Rust map handlers + RPC batch reads
  proto/         # Protobuf + SQL schema annotations
  abi/           # Contract ABI for build.rs
  substreams.yaml
  substreams.arbitrum.yaml
  substreams.crosschain.yaml
  Makefile
  docker-build.sh
  Dockerfile.build
```
