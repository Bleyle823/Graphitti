# Kelp rsETH backing alerts (reference Substreams package)

Substreams package that mirrors the **Kelp rsETH Backing Monitor (RPC backup)** workflow in Graphitti:

- Every Ethereum mainnet block: read rsETH `totalSupply`, LRTDepositPool backing (stETH, ETHx × 1.066, native ETH)
- Arbitrum rsETH OFT supply from imported cross-chain store
- `deviationBps = (excess × 10000) / totalBacking` when backing > 0; alert when **> 50 bps**

## Contracts (matches Graphitti RPC workflow)

| Read | Contract | Chain |
|------|----------|-------|
| rsETH mainnet supply | `0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7` | mainnet |
| rsETH Arbitrum OFT | `0x4186BFC76E2E237523CBC30FD220FE055156b41F` | arbitrum-one |
| LRTDepositPool | `0x036676389e48133B63a802f8635AD39E752D375D` | mainnet |
| stETH asset | `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84` | mainnet |
| ETHx asset | `0xA35b1B31Ce002FBF2058D22F30f95D405200A15b` | mainnet |
| Native ETH | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` | mainnet |

## Dual-package deploy (required)

Arbitrum OFT supply is indexed by a companion package and imported via store:

1. **`../kelp-rseth-arbitrum-supply/`** — `map_arb_rseth_supply` + `store_arb_rseth_supply` on Arbitrum
2. **This package** — imports `arbitrum_supply:store_arb_rseth_supply` on mainnet

Both Substreams streams must run 24/7 for accurate cross-chain totals.

## Build

```bash
# Arbitrum store (deploy/run first)
cd ../kelp-rseth-arbitrum-supply
substreams auth
substreams build
substreams run ./substreams.yaml map_arb_rseth_supply -s 150000000 -t +10 -o jsonl

# Mainnet backing + graph_out
cd ../kelp-rseth-backing-alerts
substreams build
substreams run ./substreams.yaml map_backing_snapshots -s 19000000 -t +10 -o jsonl
```

## Subgraph (graph_out)

Schema: `subgraph/schema.graphql`

```bash
graph auth --studio <DEPLOY_KEY>
graph codegen && graph build
graph deploy --studio kelp-rseth-backing-alerts
```

Paste the subgraph id into the **Kelp rsETH Backing Monitor** workflow template.

## Graphitti

- Pull: Block trigger + `query-substreams-entity` (`entityName`: `backingSnapshots`, `where`: `shouldAlert: true`) on **Kelp rsETH Backing Monitor**
- RPC equivalent: **Kelp rsETH Backing Monitor (RPC backup)**

Run `pnpm substreams:deploy-checklist` from `graphitti/` for the full checklist.
