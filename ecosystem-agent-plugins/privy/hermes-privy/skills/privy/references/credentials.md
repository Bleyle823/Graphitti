# Privy credentials

| Variable | Required | Purpose |
|---|---|---|
| `PRIVY_APP_ID` | Yes | Privy application ID from [dashboard.privy.io](https://dashboard.privy.io) |
| `PRIVY_APP_SECRET` | Yes | Privy application secret |
| `PRIVY_AUTHORIZATION_KEY` | No | Policy-gated wallet RPC signing |
| `GRAPHITTI_BASE_URL` | No | Graphitti host override |
| `GRAPHITTI_API_KEY` | No | Graphitti B2B, treasury, and marketplace APIs |

`privy_get_wallet` and `privy_wallet_transfer` require `PRIVY_APP_ID` and `PRIVY_APP_SECRET`.

`privy_get_treasury` and treasury write tools require `GRAPHITTI_API_KEY` with treasury scope.
