#!/bin/bash

# Mini-DEX Local Testing Startup Script
# This script helps you start all necessary services for local testing

set -e

echo "🚀 Mini-DEX Local Testing Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Check if contracts are compiled
if [ ! -d "packages/contracts/artifacts" ]; then
    echo -e "${YELLOW}⚠️  Contracts not compiled. Compiling...${NC}"
    cd packages/contracts
    npx hardhat compile
    cd ../..
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Check if Hardhat node is already running
if check_port 8545; then
    echo -e "${YELLOW}⚠️  Hardhat node is already running on port 8545${NC}"
    echo "   If you want to restart it, kill the process and run this script again."
else
    echo -e "${GREEN}Starting Hardhat node...${NC}"
    echo "   This will run in the background."
    cd packages/contracts
    npx hardhat node > ../../hardhat-node.log 2>&1 &
    HARDHAT_PID=$!
    echo $HARDHAT_PID > ../../hardhat-node.pid
    cd ../..
    
    # Wait for node to start
    echo "   Waiting for Hardhat node to start..."
    sleep 5
    
    if check_port 8545; then
        echo -e "${GREEN}✅ Hardhat node started (PID: $HARDHAT_PID)${NC}"
        echo "   Logs: hardhat-node.log"
    else
        echo -e "${RED}❌ Failed to start Hardhat node${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Deploying contracts to local network...${NC}"
cd packages/contracts
npx hardhat run scripts/deploy-local.ts --network localhost
cd ../..

echo ""
echo -e "${GREEN}✅ Contracts deployed!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Copy the contract addresses from above"
echo "   2. Create packages/frontend/.env.local with:"
echo "      NEXT_PUBLIC_GEMINI_TOKEN_ADDRESS=<address>"
echo "      NEXT_PUBLIC_SIMPLE_POOL_ADDRESS=<address>"
echo "   3. Start the frontend:"
echo "      cd packages/frontend && npm run dev"
echo ""
echo "📚 For detailed testing instructions, see:"
echo "   - LOCAL_TESTING_GUIDE.md"
echo "   - CHECKPOINT_CHECKLIST.md"
echo ""
echo "🛑 To stop the Hardhat node:"
echo "   kill \$(cat hardhat-node.pid)"
echo ""
