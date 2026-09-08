# Kelp rsETH Arbitrum supply store

Companion Substreams package for the Kelp backing monitor. Indexes rsETH OFT `totalSupply()` on Arbitrum and exposes it via `store_arb_rseth_supply` for import by `kelp-rseth-backing-alerts`.

| Contract | Address |
|----------|---------|
| rsETH OFT (Arbitrum) | `0x4186BFC76E2E237523CBC30FD220FE055156b41F` |

## Build

```bash
substreams auth
substreams build
substreams run ./substreams.yaml map_arb_rseth_supply -s 150000000 -t +10 -o jsonl
```

Deploy and run this stream 24/7 before or alongside the mainnet backing package.
