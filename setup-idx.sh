#!/bin/bash

echo "🚀 Setting up Mini-DEX in Google IDX..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create contracts .env
echo "🔧 Creating packages/contracts/.env..."
cat > packages/contracts/.env << 'EOF'
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/8af7c892e7fa413ebb20ed9d92d45685
PRIVATE_KEY=809f83e00316484aa89c101384f6561ad0aadd9c34cd5baf6d70f055cf865e83
ETHERSCAN_API_KEY=ZIBYJBYJF1MP693V7ZUAJB8HD2DHDS3WQG
EOF

# Create frontend .env.local
echo "🔧 Creating packages/frontend/.env.local..."
cat > packages/frontend/.env.local << 'EOF'
NEXT_PUBLIC_GEMINI_TOKEN_ADDRESS=0xEB9B3c675aD7419bcE73fD8eb2d5C9BCDd8a8FD7
NEXT_PUBLIC_SIMPLE_POOL_ADDRESS=0x7D7ff9c51eb5c3dcbeD2751c6F3bd70586eB22Db
NEXT_PUBLIC_SENTRY_DSN=https://06976b6e232832994d0e1b66f85471eb@o4511007339053056.ingest.de.sentry.io/4511007349014608
EOF

# Build project
echo "🏗️  Building project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run tests: npm test"
echo "2. Start frontend: cd packages/frontend && npm run dev"
echo "3. Deploy to Vercel: vercel --prod"
