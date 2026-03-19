import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting deployment to Sepolia testnet...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("\n❌ ERROR: Deployer account has no ETH!");
    console.error("   Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }
  console.log("");

  // Deploy GeminiToken
  console.log("📦 Deploying GeminiToken...");
  const GeminiToken = await ethers.getContractFactory("GeminiToken");
  const geminiToken = await GeminiToken.deploy();
  await geminiToken.waitForDeployment();
  const geminiTokenAddress = await geminiToken.getAddress();
  
  const geminiTokenTx = geminiToken.deploymentTransaction();
  const geminiTokenReceipt = await geminiTokenTx?.wait();
  
  console.log("✅ GeminiToken deployed to:", geminiTokenAddress);
  console.log("   Transaction hash:", geminiTokenTx?.hash);
  console.log("   Block number:", geminiTokenReceipt?.blockNumber);

  // Deploy SimplePool
  console.log("\n📦 Deploying SimplePool...");
  const SimplePool = await ethers.getContractFactory("SimplePool");
  const simplePool = await SimplePool.deploy(geminiTokenAddress);
  await simplePool.waitForDeployment();
  const simplePoolAddress = await simplePool.getAddress();
  
  const simplePoolTx = simplePool.deploymentTransaction();
  const simplePoolReceipt = await simplePoolTx?.wait();
  
  console.log("✅ SimplePool deployed to:", simplePoolAddress);
  console.log("   Transaction hash:", simplePoolTx?.hash);
  console.log("   Block number:", simplePoolReceipt?.blockNumber);

  // Mint initial token supply
  console.log("\n💎 Minting initial token supply...");
  const initialSupply = ethers.parseEther("1000000"); // 1M GEMI tokens
  const mintTx = await geminiToken.mint(deployer.address, initialSupply);
  const mintReceipt = await mintTx.wait();
  
  console.log("✅ Minted", ethers.formatEther(initialSupply), "GEMI tokens");
  console.log("   Transaction hash:", mintTx.hash);
  console.log("   Block number:", mintReceipt?.blockNumber);

  // Save deployment addresses
  console.log("\n💾 Saving deployment addresses...");
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    contracts: {
      geminiToken: {
        address: geminiTokenAddress,
        transactionHash: geminiTokenTx?.hash,
        blockNumber: geminiTokenReceipt?.blockNumber,
      },
      simplePool: {
        address: simplePoolAddress,
        transactionHash: simplePoolTx?.hash,
        blockNumber: simplePoolReceipt?.blockNumber,
        constructorArgs: [geminiTokenAddress],
      },
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    initialSupply: ethers.formatEther(initialSupply),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, "sepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("✅ Deployment info saved to:", deploymentPath);

  // Display summary
  console.log("\n" + "=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📋 Contract Addresses:");
  console.log("   GeminiToken:", geminiTokenAddress);
  console.log("   SimplePool:", simplePoolAddress);
  console.log("\n📊 Deployment Details:");
  console.log("   Network: Sepolia Testnet");
  console.log("   Chain ID:", 11155111);
  console.log("   Deployer:", deployer.address);
  console.log("   Initial Supply:", ethers.formatEther(initialSupply), "GEMI");
  console.log("\n🔗 Etherscan Links:");
  console.log("   GeminiToken:", `https://sepolia.etherscan.io/address/${geminiTokenAddress}`);
  console.log("   SimplePool:", `https://sepolia.etherscan.io/address/${simplePoolAddress}`);
  console.log("\n💡 Next Steps:");
  console.log("   1. Verify contracts: npx hardhat run scripts/verify.ts --network sepolia");
  console.log("   2. Update frontend .env with contract addresses");
  console.log("   3. Test contract interactions on Etherscan");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
