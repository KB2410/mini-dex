import { run } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentContract {
  address: string;
  transactionHash?: string;
  blockNumber?: number;
  constructorArgs?: any[];
}

interface Deployment {
  network: string;
  chainId: number;
  contracts: {
    geminiToken: DeploymentContract;
    simplePool: DeploymentContract;
  };
  deployer: string;
  timestamp: string;
  initialSupply: string;
}

async function main() {
  console.log("🔍 Starting contract verification on Etherscan...\n");

  // Read deployment addresses
  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ ERROR: Deployment file not found!");
    console.error("   Expected path:", deploymentPath);
    console.error("   Please run deployment first: npx hardhat run scripts/deploy.ts --network sepolia");
    process.exit(1);
  }

  const deploymentData = fs.readFileSync(deploymentPath, "utf-8");
  const deployment: Deployment = JSON.parse(deploymentData);

  console.log("📋 Loaded deployment info:");
  console.log("   Network:", deployment.network);
  console.log("   Deployer:", deployment.deployer);
  console.log("   Timestamp:", deployment.timestamp);
  console.log("");

  // Verify GeminiToken
  console.log("🔍 Verifying GeminiToken...");
  console.log("   Address:", deployment.contracts.geminiToken.address);
  
  try {
    await run("verify:verify", {
      address: deployment.contracts.geminiToken.address,
      constructorArguments: [],
    });
    console.log("✅ GeminiToken verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ GeminiToken already verified");
    } else if (error.message.includes("does not have bytecode")) {
      console.error("❌ Contract not found at address. Please check deployment.");
      throw error;
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }

  // Verify SimplePool
  console.log("\n🔍 Verifying SimplePool...");
  console.log("   Address:", deployment.contracts.simplePool.address);
  console.log("   Constructor args:", deployment.contracts.simplePool.constructorArgs);
  
  try {
    await run("verify:verify", {
      address: deployment.contracts.simplePool.address,
      constructorArguments: deployment.contracts.simplePool.constructorArgs || [
        deployment.contracts.geminiToken.address,
      ],
    });
    console.log("✅ SimplePool verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ SimplePool already verified");
    } else if (error.message.includes("does not have bytecode")) {
      console.error("❌ Contract not found at address. Please check deployment.");
      throw error;
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }

  // Display summary
  console.log("\n" + "=".repeat(70));
  console.log("🎉 VERIFICATION COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n🔗 Verified Contract Links:");
  console.log("   GeminiToken:");
  console.log("   ", `https://sepolia.etherscan.io/address/${deployment.contracts.geminiToken.address}#code`);
  console.log("\n   SimplePool:");
  console.log("   ", `https://sepolia.etherscan.io/address/${deployment.contracts.simplePool.address}#code`);
  console.log("\n💡 Next Steps:");
  console.log("   1. Visit the Etherscan links above to view verified source code");
  console.log("   2. Test contract interactions using Etherscan's 'Write Contract' tab");
  console.log("   3. Update frontend environment variables with contract addresses");
  console.log("   4. Deploy frontend to Vercel");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });
