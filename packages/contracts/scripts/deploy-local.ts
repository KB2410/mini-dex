import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting local deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Deploy GeminiToken
  console.log("📦 Deploying GeminiToken...");
  const GeminiToken = await ethers.getContractFactory("GeminiToken");
  const geminiToken = await GeminiToken.deploy();
  await geminiToken.waitForDeployment();
  const geminiTokenAddress = await geminiToken.getAddress();
  console.log("✅ GeminiToken deployed to:", geminiTokenAddress);

  // Deploy SimplePool
  console.log("\n📦 Deploying SimplePool...");
  const SimplePool = await ethers.getContractFactory("SimplePool");
  const simplePool = await SimplePool.deploy(geminiTokenAddress);
  await simplePool.waitForDeployment();
  const simplePoolAddress = await simplePool.getAddress();
  console.log("✅ SimplePool deployed to:", simplePoolAddress);

  // Mint initial tokens for testing
  console.log("\n💎 Minting initial tokens...");
  const initialSupply = ethers.parseEther("1000000"); // 1M tokens
  await geminiToken.mint(deployer.address, initialSupply);
  console.log(
    "✅ Minted",
    ethers.formatEther(initialSupply),
    "GEMI tokens to deployer"
  );

  // Add initial liquidity to the pool
  console.log("\n💧 Adding initial liquidity to pool...");
  const ethAmount = ethers.parseEther("10"); // 10 ETH
  const tokenAmount = ethers.parseEther("10000"); // 10,000 GEMI tokens

  // Approve tokens for the pool
  await geminiToken.approve(simplePoolAddress, tokenAmount);
  console.log("✅ Approved", ethers.formatEther(tokenAmount), "GEMI tokens");

  // Add liquidity
  await simplePool.addLiquidity(tokenAmount, { value: ethAmount });
  console.log(
    "✅ Added liquidity:",
    ethers.formatEther(ethAmount),
    "ETH +",
    ethers.formatEther(tokenAmount),
    "GEMI"
  );

  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   GeminiToken:", geminiTokenAddress);
  console.log("   SimplePool:", simplePoolAddress);
  console.log("\n📊 Pool Status:");
  const poolStats = await simplePool.getPoolStats();
  console.log("   ETH Reserve:", ethers.formatEther(poolStats[0]), "ETH");
  console.log("   Token Reserve:", ethers.formatEther(poolStats[1]), "GEMI");
  console.log(
    "   Total Liquidity:",
    ethers.formatEther(poolStats[2]),
    "units"
  );
  console.log("\n💡 Next Steps:");
  console.log("   1. Copy the contract addresses above");
  console.log("   2. Update packages/frontend/.env.local with:");
  console.log(`      NEXT_PUBLIC_GEMINI_TOKEN_ADDRESS=${geminiTokenAddress}`);
  console.log(`      NEXT_PUBLIC_SIMPLE_POOL_ADDRESS=${simplePoolAddress}`);
  console.log("   3. Start the frontend: cd packages/frontend && npm run dev");
  console.log("   4. Connect MetaMask to localhost:8545");
  console.log("   5. Import the deployer account using the private key");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
