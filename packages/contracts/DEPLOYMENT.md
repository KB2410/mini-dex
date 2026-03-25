# Soroban Contract Deployment

## Stellar Testnet Deployment

**Contract Address:** `CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF`

**Explorer:** https://stellar.expert/explorer/testnet/contract/CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF

**Deployment Transaction:** https://stellar.expert/explorer/testnet/tx/8cc11ba447b5e5d8af971840ebdf8874073902ca79632e5193b7a347f8e90e9f

**WASM Hash:** `3cc2ef28033a4508d4c3bb5d5c827a7ff4d960dacd660287ce0b9bca6f8c2b5b`

**Network:** Stellar Testnet
**Deployed By:** deployer identity
**Date:** March 25, 2026

## Frontend Configuration

Add to `packages/frontend/.env.local`:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF
NEXT_PUBLIC_NETWORK=testnet
```

## Contract Functions

- `initialize(token_a: Address, token_b: Address)` - Initialize DEX with two tokens
- `add_liquidity(user: Address, amount_a: i128, amount_b: i128) -> i128` - Add liquidity
- `remove_liquidity(user: Address, shares: i128) -> (i128, i128)` - Remove liquidity
- `swap(user: Address, amount_in: i128, path_is_a_to_b: bool) -> i128` - Swap tokens
- `get_reserves() -> (i128, i128)` - View reserves
- `get_user_shares(user: Address) -> i128` - View user LP shares
- `get_total_shares() -> i128` - View total LP shares

## Testing

```bash
# Invoke contract on testnet
soroban contract invoke \
  --id CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF \
  --source deployer \
  --network testnet \
  -- get_reserves
```
