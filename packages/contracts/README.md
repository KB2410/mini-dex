# Mini-DEX Soroban Smart Contract

A production-ready Automated Market Maker (AMM) DEX built on Stellar Soroban using Rust.

## Features

- ✅ Constant Product Formula (x × y = k)
- ✅ 0.3% swap fee
- ✅ Liquidity provision with LP tokens
- ✅ Native Soroban authentication (`require_auth()`)
- ✅ Proper storage management (instance + persistent)
- ✅ Comprehensive unit tests

## Architecture

### Storage Design

- **Instance Storage**: Contract-level data (token addresses, reserves, total shares)
- **Persistent Storage**: User-specific data (individual LP balances)

### Core Functions

1. **initialize**: Set up the DEX with two token addresses (one-time only)
2. **add_liquidity**: Deposit tokens and receive LP shares
3. **remove_liquidity**: Burn LP shares and withdraw tokens
4. **swap**: Exchange tokens using constant product formula with 0.3% fee
5. **get_reserves**: View current pool reserves
6. **get_user_shares**: View user's LP token balance
7. **get_total_shares**: View total LP tokens in circulation

## Build & Test

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install --locked soroban-cli

# Add wasm32 target
rustup target add wasm32-unknown-unknown
```

### Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

### Test

```bash
cargo test
```

### Optimize (for deployment)

```bash
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/mini_dex.wasm
```

## Deploy to Stellar Testnet

```bash
# Configure network
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate identity
soroban keys generate alice --network testnet

# Fund account
soroban keys fund alice --network testnet

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mini_dex.wasm \
  --source alice \
  --network testnet
```

## Usage Example

```bash
# Initialize DEX
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- initialize \
  --token_a <TOKEN_A_ADDRESS> \
  --token_b <TOKEN_B_ADDRESS>

# Add liquidity
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- add_liquidity \
  --user <USER_ADDRESS> \
  --amount_a 1000 \
  --amount_b 1000

# Swap tokens
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- swap \
  --user <USER_ADDRESS> \
  --amount_in 10 \
  --path_is_a_to_b true
```

## Math Formula

### Constant Product AMM

```
x * y = k

where:
- x = reserve of token A
- y = reserve of token B
- k = constant product
```

### Swap Calculation (with 0.3% fee)

```
amount_out = (amount_in * 997 * reserve_out) / (reserve_in * 1000 + amount_in * 997)
```

### LP Shares Calculation

**First liquidity provider:**
```
shares = sqrt(amount_a * amount_b)
```

**Subsequent providers:**
```
shares = min(
  amount_a * total_shares / reserve_a,
  amount_b * total_shares / reserve_b
)
```

## Security Features

- ✅ Authentication required for all state-changing operations
- ✅ Input validation on all parameters
- ✅ Overflow protection via i128
- ✅ Reentrancy protection (Soroban native)
- ✅ Initialization guard (can only initialize once)

## Testing

The contract includes comprehensive unit tests covering:

- Initialization
- First liquidity provision
- Subsequent liquidity provision
- Liquidity removal
- Token swaps (both directions)
- Constant product formula verification
- Edge cases and error conditions

Run tests:
```bash
cargo test -- --nocapture
```

## License

MIT
