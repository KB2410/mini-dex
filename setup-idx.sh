#!/bin/bash

echo "🚀 Setting up Mini-DEX in Google IDX..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create contracts .env
echo "🔧 Creating packages/contracts/.env..."
cat > packages/contracts/.env << 'EOF'
# Stellar Soroban Configuration
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
EOF

# Create frontend .env.local
echo "🔧 Creating packages/frontend/.env.local..."
cat > packages/frontend/.env.local << 'EOF'
NEXT_PUBLIC_CONTRACT_ADDRESS=CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_SENTRY_DSN=https://06976b6e232832994d0e1b66f85471eb@o4511007339053056.ingest.de.sentry.io/4511007349014608
EOF

# Build project
echo "🏗️  Building project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run contract tests: cd packages/contracts && cargo test"
echo "2. Start frontend: cd packages/frontend && npm run dev"
echo "3. Deploy to Vercel: vercel --prod"

