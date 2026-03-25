# Mini-DEX - Stellar Soroban Decentralized Exchange

A production-ready decentralized exchange (DEX) built on **Stellar Soroban** using **Rust**, featuring automated market maker (AMM) mechanics with constant product formula (x × y = k), comprehensive testing, and a modern Next.js frontend.

🚀 **Live Demo**: Coming soon

![CI/CD](https://github.com/KB2410/mini-dex/actions/workflows/ci.yml/badge.svg)

---

## 📱 Mobile Responsive

Fully responsive design built with Tailwind CSS - works seamlessly on desktop, tablet, and mobile devices.

---

## 🎯 Advanced Features

### Smart Contract Features (Soroban/Rust)
- ✅ **Constant Product AMM**: x × y = k formula
- ✅ **0.3% Swap Fee**: Industry-standard fee structure
- ✅ **Liquidity Provision**: Mint/burn LP tokens
- ✅ **Native Authentication**: Soroban `require_auth()` pattern
- ✅ **Optimized Storage**: Instance + Persistent storage design
- ✅ **i128 Precision**: Native Stellar precision handling

### Frontend Features
- ✅ **Real-time Updates**: Live pool statistics and event monitoring
- ✅ **Mobile Responsive**: Tailwind CSS with responsive breakpoints
- ✅ **Wallet Integration**: Freighter wallet support
- ✅ **Error Tracking**: Sentry integration for production monitoring
- ✅ **Network Switching**: Automatic Stellar testnet detection

### Development Features
- ✅ **Comprehensive Testing**: Unit tests with Soroban testutils
- ✅ **CI/CD Pipeline**: GitHub Actions with parallel execution
- ✅ **Monorepo Structure**: Turborepo for efficient builds
- ✅ **TypeScript**: Full type safety across frontend

---

## 🔒 Security Features

- ✅ **Authentication Required**: All state-changing operations require `user.require_auth()`
- ✅ **Input Validation**: Comprehensive checks on all contract functions
- ✅ **Overflow Protection**: i128 type with built-in safety
- ✅ **Initialization Guard**: Contract can only be initialized once
- ✅ **Reentrancy Protection**: Soroban native protection
- ✅ **Secure API Keys**: All sensitive keys in environment variables

---

## 🧪 Testing

### Test Coverage
- **Unit Tests**: 12+ tests covering all contract functions
- **Integration Tests**: End-to-end swap workflows
- **Frontend Tests**: Component and hook testing

### Correctness Properties Tested
1. Initialization (single-time only)
2. First liquidity provider (geometric mean)
3. Subsequent liquidity providers (ratio maintenance)
4. Liquidity removal (proportional withdrawal)
5. Token swaps (A→B and B→A)
6. Constant product formula (k maintenance)
7. Fee application (0.3% on swaps)
8. Authentication requirements
9. Edge cases (zero liquidity, insufficient shares)

### Run Tests

```bash
# Navigate to contracts
cd packages/contracts

# Run all tests
cargo test

# Run with output
cargo test -- --nocapture
```

---

## 🚀 Quick Start

### Prerequisites
- Rust >= 1.70.0
- Soroban CLI
- Node.js >= 20.0.0
- Freighter wallet (for frontend)

### Installation

```bash
# Clone repository
git clone https://github.com/KB2410/mini-dex.git
cd mini-dex

# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install --locked soroban-cli

# Add wasm32 target
rustup target add wasm32-unknown-unknown

# Install frontend dependencies
cd packages/frontend
npm install
```

### Build Smart Contract

```bash
cd packages/contracts

# Build
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test

# Optimize for deployment
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/mini_dex.wasm
```

### Deploy to Stellar Testnet

```bash
# Configure network
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate identity
soroban keys generate deployer --network testnet

# Fund account
soroban keys fund deployer --network testnet

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mini_dex.wasm \
  --source deployer \
  --network testnet
```

### Start Frontend

```bash
cd packages/frontend
npm run dev
```

Visit http://localhost:3000

---

## 📊 Project Structure

```
mini-dex/
├── packages/
│   ├── contracts/          # Soroban smart contract (Rust)
│   │   ├── src/
│   │   │   ├── lib.rs     # Main contract logic
│   │   │   └── test.rs    # Unit tests
│   │   ├── Cargo.toml     # Rust dependencies
│   │   └── README.md      # Contract documentation
│   └── frontend/          # Next.js application
│       ├── app/           # App router pages
│       ├── components/    # React components
│       ├── hooks/         # Custom hooks
│       └── lib/           # Utilities
├── .github/
│   └── workflows/         # CI/CD pipelines
└── turbo.json            # Turborepo config
```

---

## 🛠️ Technology Stack

### Smart Contract
- Rust (no_std)
- Soroban SDK 20.0.0
- Stellar Network
- WASM compilation target

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Stellar SDK
- Freighter Wallet Integration

### Infrastructure
- Turborepo (monorepo)
- GitHub Actions (CI/CD)
- Vercel (frontend hosting)
- Sentry (error tracking)

---

## 📝 Smart Contract API

### Core Functions

```rust
// Initialize the DEX (one-time only)
pub fn initialize(env: Env, token_a: Address, token_b: Address)

// Add liquidity and receive LP shares
pub fn add_liquidity(env: Env, user: Address, amount_a: i128, amount_b: i128) -> i128

// Remove liquidity by burning LP shares
pub fn remove_liquidity(env: Env, user: Address, shares: i128) -> (i128, i128)

// Swap tokens using constant product formula
pub fn swap(env: Env, user: Address, amount_in: i128, path_is_a_to_b: bool) -> i128

// View functions
pub fn get_reserves(env: Env) -> (i128, i128)
pub fn get_user_shares(env: Env, user: Address) -> i128
pub fn get_total_shares(env: Env) -> i128
```

---

## 📈 AMM Math

### Constant Product Formula

```
x * y = k

where:
- x = reserve of token A
- y = reserve of token B
- k = constant product (maintained after swaps)
```

### Swap Calculation (0.3% fee)

```
amount_out = (amount_in * 997 * reserve_out) / (reserve_in * 1000 + amount_in * 997)
```

### LP Shares

**First provider:**
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

---

## 🔄 CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

- ✅ **Linting**: Rust clippy + cargo fmt
- ✅ **Testing**: Cargo test with full coverage
- ✅ **Building**: WASM compilation
- ✅ **Frontend**: Next.js build and lint

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- Stellar Development Foundation for Soroban
- Rust community for excellent tooling
- Soroban SDK team for comprehensive documentation

---

## 🚀 Quick Deployment Steps

### 1. Build Contract
```bash
cd packages/contracts
cargo build --target wasm32-unknown-unknown --release
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/mini_dex.wasm
```

### 2. Deploy to Stellar Testnet
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mini_dex.wasm \
  --source deployer \
  --network testnet
```

### 3. Deploy Frontend to Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Import your repository
3. Set root directory: `packages/frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS=<YOUR_CONTRACT_ID>`
   - `NEXT_PUBLIC_NETWORK=testnet`
   - `NEXT_PUBLIC_SENTRY_DSN=<YOUR_SENTRY_DSN>`
5. Click Deploy

---

**Built with ❤️ for the Stellar Mastery Advanced Contract Patterns Challenge**
