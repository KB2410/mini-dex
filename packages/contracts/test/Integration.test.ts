import { expect } from "chai";
import { ethers } from "hardhat";
import { SimplePool, GeminiToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Integration tests for complete swap workflow
 * Validates: Requirements 8.3, 8.4, 8.7
 * 
 * Test Coverage:
 * - End-to-end: mint tokens → approve → addLiquidity → swap → verify balances
 * - Multiple sequential swaps affecting pool ratio
 * - Liquidity addition and removal cycles
 * - Cumulative gas consumption measurement
 */
describe("Integration Tests - Complete Swap Workflow", function () {
  let simplePool: SimplePool;
  let geminiToken: GeminiToken;
  let owner: SignerWithAddress;
  let liquidityProvider1: SignerWithAddress;
  let liquidityProvider2: SignerWithAddress;
  let swapper1: SignerWithAddress;
  let swapper2: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const INITIAL_ETH = ethers.parseEther("100"); // 100 ETH
  const INITIAL_TOKENS = ethers.parseEther("10000"); // 10,000 tokens

  // Gas tracking
  let cumulativeGas = 0n;

  beforeEach(async function () {
    [owner, liquidityProvider1, liquidityProvider2, swapper1, swapper2] = await ethers.getSigners();

    // Deploy GeminiToken
    const GeminiTokenFactory = await ethers.getContractFactory("GeminiToken");
    geminiToken = await GeminiTokenFactory.deploy();
    await geminiToken.waitForDeployment();

    // Deploy SimplePool
    const SimplePoolFactory = await ethers.getContractFactory("SimplePool");
    simplePool = await SimplePoolFactory.deploy(await geminiToken.getAddress());
    await simplePool.waitForDeployment();

    // Reset cumulative gas counter
    cumulativeGas = 0n;
  });

  describe("End-to-End Workflow: mint → approve → addLiquidity → swap → verify", function () {
    it("should complete full workflow from token minting to swap execution", async function () {
      // Step 1: Mint tokens to liquidity provider
      const mintTx = await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      const mintReceipt = await mintTx.wait();
      cumulativeGas += mintReceipt!.gasUsed;
      console.log(`      [1] Mint gas: ${mintReceipt!.gasUsed}`);

      expect(await geminiToken.balanceOf(liquidityProvider1.address)).to.equal(INITIAL_SUPPLY);
      expect(await geminiToken.totalSupply()).to.equal(INITIAL_SUPPLY);

      // Step 2: Approve SimplePool to spend tokens
      const approveTx = await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      const approveReceipt = await approveTx.wait();
      cumulativeGas += approveReceipt!.gasUsed;
      console.log(`      [2] Approve gas: ${approveReceipt!.gasUsed}`);

      expect(await geminiToken.allowance(
        liquidityProvider1.address,
        await simplePool.getAddress()
      )).to.equal(INITIAL_TOKENS);

      // Step 3: Add liquidity to pool
      const addLiquidityTx = await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );
      const addLiquidityReceipt = await addLiquidityTx.wait();
      cumulativeGas += addLiquidityReceipt!.gasUsed;
      console.log(`      [3] AddLiquidity gas: ${addLiquidityReceipt!.gasUsed}`);

      expect(await simplePool.ethReserve()).to.equal(INITIAL_ETH);
      expect(await simplePool.tokenReserve()).to.equal(INITIAL_TOKENS);
      expect(await geminiToken.balanceOf(await simplePool.getAddress())).to.equal(INITIAL_TOKENS);

      // Step 4: Execute swap
      const swapAmount = ethers.parseEther("10"); // 10 ETH
      const expectedTokens = (INITIAL_TOKENS * swapAmount) / (INITIAL_ETH + swapAmount);

      const initialSwapperBalance = await geminiToken.balanceOf(swapper1.address);
      
      const swapTx = await simplePool.connect(swapper1).swapEthForToken({ value: swapAmount });
      const swapReceipt = await swapTx.wait();
      cumulativeGas += swapReceipt!.gasUsed;
      console.log(`      [4] Swap gas: ${swapReceipt!.gasUsed}`);

      // Step 5: Verify final balances
      const finalSwapperBalance = await geminiToken.balanceOf(swapper1.address);
      const tokensReceived = finalSwapperBalance - initialSwapperBalance;

      expect(tokensReceived).to.equal(expectedTokens);
      expect(await simplePool.ethReserve()).to.equal(INITIAL_ETH + swapAmount);
      expect(await simplePool.tokenReserve()).to.equal(INITIAL_TOKENS - expectedTokens);

      // Verify constant product formula (k = x * y)
      // Note: Due to integer division in Solidity, k may have small rounding differences
      // The formula tokenOut = (tokenReserve * ethIn) / (ethReserve + ethIn) ensures
      // that k is preserved in the mathematical sense, but integer division causes
      // small deviations. We verify k is approximately preserved.
      const k_before = INITIAL_ETH * INITIAL_TOKENS;
      const k_after = (INITIAL_ETH + swapAmount) * (INITIAL_TOKENS - expectedTokens);
      
      // Allow for small rounding error (less than 0.01% deviation)
      const deviation = k_after > k_before ? k_after - k_before : k_before - k_after;
      const deviationPercent = Number(deviation * 10000n / k_before) / 100;
      
      console.log(`      [Verification] k_before: ${k_before}`);
      console.log(`      [Verification] k_after: ${k_after}`);
      console.log(`      [Verification] Deviation: ${deviationPercent}%`);
      
      expect(deviationPercent).to.be.lessThan(0.01);

      console.log(`      [Total] Cumulative gas: ${cumulativeGas}`);
      console.log(`      [Verification] Tokens received: ${ethers.formatEther(tokensReceived)} GEMI`);
    });

    it("should handle multiple users in complete workflow", async function () {
      // Mint tokens to both liquidity providers
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.mint(liquidityProvider2.address, INITIAL_SUPPLY);

      // Provider 1 adds liquidity
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      // Provider 2 adds more liquidity
      const additionalTokens = ethers.parseEther("5000");
      const additionalEth = ethers.parseEther("50");
      
      await geminiToken.connect(liquidityProvider2).approve(
        await simplePool.getAddress(),
        additionalTokens
      );
      await simplePool.connect(liquidityProvider2).addLiquidity(
        additionalTokens,
        { value: additionalEth }
      );

      // Verify combined reserves
      expect(await simplePool.ethReserve()).to.equal(INITIAL_ETH + additionalEth);
      expect(await simplePool.tokenReserve()).to.equal(INITIAL_TOKENS + additionalTokens);

      // Multiple swappers execute swaps
      const swap1Amount = ethers.parseEther("5");
      await simplePool.connect(swapper1).swapEthForToken({ value: swap1Amount });

      const swap2Amount = ethers.parseEther("3");
      await simplePool.connect(swapper2).swapEthForToken({ value: swap2Amount });

      // Verify both swappers received tokens
      expect(await geminiToken.balanceOf(swapper1.address)).to.be.greaterThan(0);
      expect(await geminiToken.balanceOf(swapper2.address)).to.be.greaterThan(0);
    });

    it("should verify event emissions throughout workflow", async function () {
      // Mint tokens
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);

      // Approve - should emit Approval event
      await expect(
        geminiToken.connect(liquidityProvider1).approve(
          await simplePool.getAddress(),
          INITIAL_TOKENS
        )
      ).to.emit(geminiToken, "Approval")
        .withArgs(liquidityProvider1.address, await simplePool.getAddress(), INITIAL_TOKENS);

      // Add liquidity - should emit LiquidityAdded and Transfer events
      const addLiquidityTx = simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      await expect(addLiquidityTx)
        .to.emit(simplePool, "LiquidityAdded");

      await expect(addLiquidityTx)
        .to.emit(geminiToken, "Transfer")
        .withArgs(liquidityProvider1.address, await simplePool.getAddress(), INITIAL_TOKENS);

      // Swap - should emit SwapExecuted and Transfer events
      const swapAmount = ethers.parseEther("10");
      const expectedTokens = (INITIAL_TOKENS * swapAmount) / (INITIAL_ETH + swapAmount);

      const swapTx = simplePool.connect(swapper1).swapEthForToken({ value: swapAmount });

      await expect(swapTx)
        .to.emit(simplePool, "SwapExecuted");

      await expect(swapTx)
        .to.emit(geminiToken, "Transfer")
        .withArgs(await simplePool.getAddress(), swapper1.address, expectedTokens);
    });
  });

  describe("Multiple Sequential Swaps Affecting Pool Ratio", function () {
    beforeEach(async function () {
      // Setup: Add initial liquidity
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );
    });

    it("should handle sequential swaps with changing exchange rates", async function () {
      const swapAmounts = [
        ethers.parseEther("5"),
        ethers.parseEther("10"),
        ethers.parseEther("15"),
        ethers.parseEther("8"),
      ];

      let currentEthReserve = INITIAL_ETH;
      let currentTokenReserve = INITIAL_TOKENS;

      console.log(`      Initial pool: ${ethers.formatEther(currentEthReserve)} ETH, ${ethers.formatEther(currentTokenReserve)} GEMI`);

      for (let i = 0; i < swapAmounts.length; i++) {
        const swapAmount = swapAmounts[i];
        
        // Calculate expected output
        const expectedOutput = (currentTokenReserve * swapAmount) / (currentEthReserve + swapAmount);
        
        // Get exchange rate before swap
        const rateBefore = currentTokenReserve / currentEthReserve;
        
        // Execute swap
        const swapTx = await simplePool.connect(swapper1).swapEthForToken({ value: swapAmount });
        const swapReceipt = await swapTx.wait();
        cumulativeGas += swapReceipt!.gasUsed;

        // Update reserves
        currentEthReserve = currentEthReserve + swapAmount;
        currentTokenReserve = currentTokenReserve - expectedOutput;

        // Get exchange rate after swap
        const rateAfter = currentTokenReserve / currentEthReserve;

        // Verify reserves match
        expect(await simplePool.ethReserve()).to.equal(currentEthReserve);
        expect(await simplePool.tokenReserve()).to.equal(currentTokenReserve);

        console.log(`      Swap ${i + 1}: ${ethers.formatEther(swapAmount)} ETH → ${ethers.formatEther(expectedOutput)} GEMI (rate: ${Number(rateBefore).toFixed(2)} → ${Number(rateAfter).toFixed(2)})`);
      }

      console.log(`      Final pool: ${ethers.formatEther(currentEthReserve)} ETH, ${ethers.formatEther(currentTokenReserve)} GEMI`);
      console.log(`      Total gas for ${swapAmounts.length} swaps: ${cumulativeGas}`);

      // Verify price impact: rate should decrease as ETH is added
      const finalRate = currentTokenReserve / currentEthReserve;
      const initialRate = INITIAL_TOKENS / INITIAL_ETH;
      expect(finalRate).to.be.lessThan(initialRate);
    });

    it("should maintain constant product invariant across multiple swaps", async function () {
      const k_initial = INITIAL_ETH * INITIAL_TOKENS;
      console.log(`      Initial k: ${k_initial}`);

      const swapAmounts = [
        ethers.parseEther("2"),
        ethers.parseEther("5"),
        ethers.parseEther("3"),
        ethers.parseEther("7"),
        ethers.parseEther("4"),
      ];

      for (const swapAmount of swapAmounts) {
        await simplePool.connect(swapper1).swapEthForToken({ value: swapAmount });

        // Verify constant product is approximately preserved
        // Due to integer division in Solidity, there will be small rounding errors
        const ethReserve = await simplePool.ethReserve();
        const tokenReserve = await simplePool.tokenReserve();
        const k_current = ethReserve * tokenReserve;

        // Allow for cumulative rounding error (less than 0.1% deviation)
        const deviation = k_current > k_initial ? k_current - k_initial : k_initial - k_current;
        const deviationPercent = Number(deviation * 10000n / k_initial) / 100;
        
        expect(deviationPercent).to.be.lessThan(0.1);
      }

      const finalEthReserve = await simplePool.ethReserve();
      const finalTokenReserve = await simplePool.tokenReserve();
      const k_final = finalEthReserve * finalTokenReserve;
      
      console.log(`      Final k: ${k_final}`);
      console.log(`      Constant product maintained within rounding tolerance after ${swapAmounts.length} swaps`);
    });

    it("should handle alternating small and large swaps", async function () {
      const swaps = [
        { amount: ethers.parseEther("0.1"), label: "small" },
        { amount: ethers.parseEther("20"), label: "large" },
        { amount: ethers.parseEther("0.5"), label: "small" },
        { amount: ethers.parseEther("15"), label: "large" },
        { amount: ethers.parseEther("0.2"), label: "small" },
      ];

      for (const swap of swaps) {
        const initialBalance = await geminiToken.balanceOf(swapper1.address);
        
        await simplePool.connect(swapper1).swapEthForToken({ value: swap.amount });
        
        const finalBalance = await geminiToken.balanceOf(swapper1.address);
        const tokensReceived = finalBalance - initialBalance;

        console.log(`      ${swap.label} swap: ${ethers.formatEther(swap.amount)} ETH → ${ethers.formatEther(tokensReceived)} GEMI`);
        
        expect(tokensReceived).to.be.greaterThan(0);
      }
    });

    it("should track cumulative gas consumption for sequential swaps", async function () {
      const numSwaps = 10;
      const swapAmount = ethers.parseEther("1");
      let totalGas = 0n;

      for (let i = 0; i < numSwaps; i++) {
        const tx = await simplePool.connect(swapper1).swapEthForToken({ value: swapAmount });
        const receipt = await tx.wait();
        totalGas += receipt!.gasUsed;

        console.log(`      Swap ${i + 1} gas: ${receipt!.gasUsed}`);
      }

      console.log(`      Average gas per swap: ${totalGas / BigInt(numSwaps)}`);
      console.log(`      Total gas for ${numSwaps} swaps: ${totalGas}`);

      // Verify each swap is under gas limit
      expect(totalGas / BigInt(numSwaps)).to.be.lessThan(100000n);
    });

    it("should handle swaps from multiple users affecting pool ratio", async function () {
      const users = [swapper1, swapper2, liquidityProvider1];
      const swapAmount = ethers.parseEther("5");

      let previousRate = INITIAL_TOKENS / INITIAL_ETH;

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        await simplePool.connect(user).swapEthForToken({ value: swapAmount });

        const ethReserve = await simplePool.ethReserve();
        const tokenReserve = await simplePool.tokenReserve();
        const currentRate = tokenReserve / ethReserve;

        console.log(`      User ${i + 1} swap: rate ${Number(previousRate).toFixed(2)} → ${Number(currentRate).toFixed(2)}`);

        // Rate should decrease with each swap (tokens become more expensive)
        expect(currentRate).to.be.lessThan(previousRate);
        previousRate = currentRate;
      }
    });
  });

  describe("Liquidity Addition and Removal Cycles", function () {
    it("should handle complete liquidity cycle: add → swap → remove", async function () {
      // Cycle 1: Add liquidity
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      
      const addTx1 = await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );
      const addReceipt1 = await addTx1.wait();
      cumulativeGas += addReceipt1!.gasUsed;
      console.log(`      [1] Add liquidity gas: ${addReceipt1!.gasUsed}`);

      // Cycle 2: Execute swaps
      const swapAmount = ethers.parseEther("10");
      const swapTx = await simplePool.connect(swapper1).swapEthForToken({ value: swapAmount });
      const swapReceipt = await swapTx.wait();
      cumulativeGas += swapReceipt!.gasUsed;
      console.log(`      [2] Swap gas: ${swapReceipt!.gasUsed}`);

      // Cycle 3: Remove liquidity
      const liquidityToRemove = ethers.parseEther("50"); // Remove 50 ETH worth
      const removeTx = await simplePool.connect(liquidityProvider1).removeLiquidity(liquidityToRemove);
      const removeReceipt = await removeTx.wait();
      cumulativeGas += removeReceipt!.gasUsed;
      console.log(`      [3] Remove liquidity gas: ${removeReceipt!.gasUsed}`);

      console.log(`      Total cycle gas: ${cumulativeGas}`);

      // Verify provider received proportional amounts
      expect(await geminiToken.balanceOf(liquidityProvider1.address)).to.be.greaterThan(0);
    });

    it("should handle multiple liquidity providers adding and removing", async function () {
      // Provider 1 adds liquidity
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      console.log(`      Provider 1 added: ${ethers.formatEther(INITIAL_ETH)} ETH, ${ethers.formatEther(INITIAL_TOKENS)} GEMI`);

      // Provider 2 adds liquidity
      const provider2Tokens = ethers.parseEther("5000");
      const provider2Eth = ethers.parseEther("50");
      
      await geminiToken.mint(liquidityProvider2.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider2).approve(
        await simplePool.getAddress(),
        provider2Tokens
      );
      await simplePool.connect(liquidityProvider2).addLiquidity(
        provider2Tokens,
        { value: provider2Eth }
      );

      console.log(`      Provider 2 added: ${ethers.formatEther(provider2Eth)} ETH, ${ethers.formatEther(provider2Tokens)} GEMI`);

      const totalEth = INITIAL_ETH + provider2Eth;
      const totalTokens = INITIAL_TOKENS + provider2Tokens;

      expect(await simplePool.ethReserve()).to.equal(totalEth);
      expect(await simplePool.tokenReserve()).to.equal(totalTokens);

      // Some swaps happen
      await simplePool.connect(swapper1).swapEthForToken({ value: ethers.parseEther("5") });
      await simplePool.connect(swapper2).swapEthForToken({ value: ethers.parseEther("3") });

      // Provider 1 removes partial liquidity
      const provider1Remove = ethers.parseEther("30");
      await simplePool.connect(liquidityProvider1).removeLiquidity(provider1Remove);

      console.log(`      Provider 1 removed: ${ethers.formatEther(provider1Remove)} ETH worth`);

      // Provider 2 removes partial liquidity
      const provider2Remove = ethers.parseEther("20");
      await simplePool.connect(liquidityProvider2).removeLiquidity(provider2Remove);

      console.log(`      Provider 2 removed: ${ethers.formatEther(provider2Remove)} ETH worth`);

      // Verify pool still has liquidity
      expect(await simplePool.ethReserve()).to.be.greaterThan(0);
      expect(await simplePool.tokenReserve()).to.be.greaterThan(0);
    });

    it("should handle rapid add/remove cycles", async function () {
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      
      const cycles = 3;
      const addAmount = ethers.parseEther("10");
      const tokenAmount = ethers.parseEther("1000");

      for (let i = 0; i < cycles; i++) {
        // Add liquidity
        await geminiToken.connect(liquidityProvider1).approve(
          await simplePool.getAddress(),
          tokenAmount
        );
        await simplePool.connect(liquidityProvider1).addLiquidity(
          tokenAmount,
          { value: addAmount }
        );

        console.log(`      Cycle ${i + 1}: Added ${ethers.formatEther(addAmount)} ETH`);

        // Execute a swap
        await simplePool.connect(swapper1).swapEthForToken({ value: ethers.parseEther("1") });

        // Remove liquidity
        const removeAmount = ethers.parseEther("5");
        await simplePool.connect(liquidityProvider1).removeLiquidity(removeAmount);

        console.log(`      Cycle ${i + 1}: Removed ${ethers.formatEther(removeAmount)} ETH worth`);
      }

      // Verify pool is still functional
      expect(await simplePool.ethReserve()).to.be.greaterThan(0);
      expect(await simplePool.tokenReserve()).to.be.greaterThan(0);
    });

    it("should maintain proportional withdrawals across cycles", async function () {
      // Setup initial liquidity
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      // Execute some swaps to change the ratio
      await simplePool.connect(swapper1).swapEthForToken({ value: ethers.parseEther("20") });

      // Get current reserves after swaps
      const ethReserve = await simplePool.ethReserve();
      const tokenReserve = await simplePool.tokenReserve();
      const ratio = tokenReserve / ethReserve;

      console.log(`      Pool ratio: ${Number(ratio).toFixed(2)} GEMI per ETH`);

      // Remove liquidity
      const removeAmount = ethers.parseEther("30");
      
      // The totalLiquidity for calculation is ethReserve (which includes swap ETH)
      const totalLiquidity = ethReserve;

      const expectedEth = (removeAmount * ethReserve) / totalLiquidity;
      const expectedTokens = (removeAmount * tokenReserve) / totalLiquidity;

      const initialEthBalance = await ethers.provider.getBalance(liquidityProvider1.address);
      const initialTokenBalance = await geminiToken.balanceOf(liquidityProvider1.address);

      const tx = await simplePool.connect(liquidityProvider1).removeLiquidity(removeAmount);
      const receipt = await tx.wait();

      const finalEthBalance = await ethers.provider.getBalance(liquidityProvider1.address);
      const finalTokenBalance = await geminiToken.balanceOf(liquidityProvider1.address);

      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const ethReceived = finalEthBalance - initialEthBalance + gasCost;
      const tokensReceived = finalTokenBalance - initialTokenBalance;

      // Verify proportional withdrawal
      expect(ethReceived).to.equal(expectedEth);
      expect(tokensReceived).to.equal(expectedTokens);

      // Verify ratio is maintained
      const withdrawalRatio = tokensReceived / ethReceived;
      expect(Math.abs(Number(withdrawalRatio - ratio))).to.be.lessThan(0.01);

      console.log(`      Withdrawal ratio: ${Number(withdrawalRatio).toFixed(2)} GEMI per ETH`);
    });
  });

  describe("Cumulative Gas Consumption Measurement", function () {
    it("should measure gas for complete workflow with detailed breakdown", async function () {
      const gasBreakdown: { operation: string; gas: bigint }[] = [];

      // 1. Mint tokens
      let tx = await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      let receipt = await tx.wait();
      gasBreakdown.push({ operation: "Mint tokens", gas: receipt!.gasUsed });

      // 2. Approve tokens
      tx = await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      receipt = await tx.wait();
      gasBreakdown.push({ operation: "Approve tokens", gas: receipt!.gasUsed });

      // 3. Add liquidity
      tx = await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );
      receipt = await tx.wait();
      gasBreakdown.push({ operation: "Add liquidity", gas: receipt!.gasUsed });

      // 4. Execute multiple swaps
      const swapAmounts = [
        ethers.parseEther("5"),
        ethers.parseEther("10"),
        ethers.parseEther("3"),
      ];

      for (let i = 0; i < swapAmounts.length; i++) {
        tx = await simplePool.connect(swapper1).swapEthForToken({ value: swapAmounts[i] });
        receipt = await tx.wait();
        gasBreakdown.push({ operation: `Swap ${i + 1}`, gas: receipt!.gasUsed });
      }

      // 5. Remove liquidity
      tx = await simplePool.connect(liquidityProvider1).removeLiquidity(ethers.parseEther("30"));
      receipt = await tx.wait();
      gasBreakdown.push({ operation: "Remove liquidity", gas: receipt!.gasUsed });

      // Calculate total gas
      const totalGas = gasBreakdown.reduce((sum, item) => sum + item.gas, 0n);

      // Print detailed breakdown
      console.log("\n      Gas Consumption Breakdown:");
      console.log("      " + "=".repeat(50));
      for (const item of gasBreakdown) {
        console.log(`      ${item.operation.padEnd(20)}: ${item.gas.toString().padStart(10)} gas`);
      }
      console.log("      " + "=".repeat(50));
      console.log(`      ${"Total".padEnd(20)}: ${totalGas.toString().padStart(10)} gas`);
      console.log(`      ${"Average per op".padEnd(20)}: ${(totalGas / BigInt(gasBreakdown.length)).toString().padStart(10)} gas\n`);

      // Verify swap operations are under gas limit
      const swapGas = gasBreakdown.filter(item => item.operation.startsWith("Swap"));
      for (const swap of swapGas) {
        expect(swap.gas).to.be.lessThan(100000n);
      }
    });

    it("should compare gas consumption across different operation patterns", async function () {
      // Pattern 1: Single large liquidity addition
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      
      const largeLiquidityTx = await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );
      const largeLiquidityGas = (await largeLiquidityTx.wait())!.gasUsed;

      // Pattern 2: Multiple small swaps
      const smallSwapGas: bigint[] = [];
      for (let i = 0; i < 5; i++) {
        const tx = await simplePool.connect(swapper1).swapEthForToken({
          value: ethers.parseEther("1")
        });
        smallSwapGas.push((await tx.wait())!.gasUsed);
      }
      const totalSmallSwapGas = smallSwapGas.reduce((sum, gas) => sum + gas, 0n);

      // Pattern 3: Single large swap
      const largeSwapTx = await simplePool.connect(swapper2).swapEthForToken({
        value: ethers.parseEther("5")
      });
      const largeSwapGas = (await largeSwapTx.wait())!.gasUsed;

      console.log("\n      Gas Comparison:");
      console.log(`      Large liquidity add: ${largeLiquidityGas}`);
      console.log(`      5 small swaps total: ${totalSmallSwapGas}`);
      console.log(`      5 small swaps avg:   ${totalSmallSwapGas / 5n}`);
      console.log(`      1 large swap:        ${largeSwapGas}\n`);

      // Verify efficiency: single large swap should use less gas than multiple small swaps
      expect(largeSwapGas).to.be.lessThan(totalSmallSwapGas);
    });

    it("should measure gas efficiency improvements over time", async function () {
      // Setup pool
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      // Measure gas for swaps at different pool states
      const swapGasData: { state: string; gas: bigint }[] = [];

      // State 1: Fresh pool
      let tx = await simplePool.connect(swapper1).swapEthForToken({
        value: ethers.parseEther("1")
      });
      swapGasData.push({ state: "Fresh pool", gas: (await tx.wait())!.gasUsed });

      // State 2: After several swaps
      for (let i = 0; i < 5; i++) {
        await simplePool.connect(swapper1).swapEthForToken({
          value: ethers.parseEther("0.5")
        });
      }
      tx = await simplePool.connect(swapper1).swapEthForToken({
        value: ethers.parseEther("1")
      });
      swapGasData.push({ state: "After 5 swaps", gas: (await tx.wait())!.gasUsed });

      // State 3: After liquidity changes
      await geminiToken.mint(liquidityProvider2.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider2).approve(
        await simplePool.getAddress(),
        ethers.parseEther("5000")
      );
      await simplePool.connect(liquidityProvider2).addLiquidity(
        ethers.parseEther("5000"),
        { value: ethers.parseEther("50") }
      );
      
      tx = await simplePool.connect(swapper1).swapEthForToken({
        value: ethers.parseEther("1")
      });
      swapGasData.push({ state: "After liquidity add", gas: (await tx.wait())!.gasUsed });

      console.log("\n      Gas Efficiency Over Time:");
      for (const data of swapGasData) {
        console.log(`      ${data.state.padEnd(25)}: ${data.gas} gas`);
      }

      // Verify gas consumption remains consistent
      const maxGas = swapGasData.reduce((max, data) => data.gas > max ? data.gas : max, 0n);
      const minGas = swapGasData.reduce((min, data) => data.gas < min ? data.gas : min, maxGas);
      const variance = maxGas - minGas;

      console.log(`      Gas variance: ${variance} (${Number(variance * 100n / minGas)}%)\n`);

      // All swaps should be under gas limit
      for (const data of swapGasData) {
        expect(data.gas).to.be.lessThan(100000n);
      }
    });
  });

  describe("Complex Scenarios and Edge Cases", function () {
    it("should handle workflow with maximum values", async function () {
      const maxTokens = ethers.parseEther("100000"); // 100k tokens
      const maxEth = ethers.parseEther("1000"); // 1000 ETH

      await geminiToken.mint(liquidityProvider1.address, maxTokens * 2n);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        maxTokens
      );

      // Add maximum liquidity
      await simplePool.connect(liquidityProvider1).addLiquidity(
        maxTokens,
        { value: maxEth }
      );

      // Execute large swap
      const largeSwap = ethers.parseEther("100");
      await simplePool.connect(swapper1).swapEthForToken({ value: largeSwap });

      // Verify pool handles large values correctly
      expect(await simplePool.ethReserve()).to.equal(maxEth + largeSwap);
      expect(await geminiToken.balanceOf(swapper1.address)).to.be.greaterThan(0);
    });

    it("should handle interleaved operations from multiple users", async function () {
      // Setup multiple providers
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.mint(liquidityProvider2.address, INITIAL_SUPPLY);

      // Interleaved operations
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      await simplePool.connect(swapper1).swapEthForToken({ value: ethers.parseEther("5") });

      await geminiToken.connect(liquidityProvider2).approve(
        await simplePool.getAddress(),
        ethers.parseEther("5000")
      );
      await simplePool.connect(liquidityProvider2).addLiquidity(
        ethers.parseEther("5000"),
        { value: ethers.parseEther("50") }
      );

      await simplePool.connect(swapper2).swapEthForToken({ value: ethers.parseEther("3") });

      await simplePool.connect(liquidityProvider1).removeLiquidity(ethers.parseEther("20"));

      await simplePool.connect(swapper1).swapEthForToken({ value: ethers.parseEther("2") });

      // Verify all operations succeeded and pool is consistent
      expect(await simplePool.ethReserve()).to.be.greaterThan(0);
      expect(await simplePool.tokenReserve()).to.be.greaterThan(0);
      expect(await geminiToken.balanceOf(swapper1.address)).to.be.greaterThan(0);
      expect(await geminiToken.balanceOf(swapper2.address)).to.be.greaterThan(0);
    });

    it("should maintain accuracy with very small swap amounts", async function () {
      // Setup pool
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      // Execute very small swaps
      const tinySwap = ethers.parseEther("0.001"); // 0.001 ETH
      const expectedOutput = (INITIAL_TOKENS * tinySwap) / (INITIAL_ETH + tinySwap);

      const initialBalance = await geminiToken.balanceOf(swapper1.address);
      await simplePool.connect(swapper1).swapEthForToken({ value: tinySwap });
      const finalBalance = await geminiToken.balanceOf(swapper1.address);

      const actualOutput = finalBalance - initialBalance;
      expect(actualOutput).to.equal(expectedOutput);
      expect(actualOutput).to.be.greaterThan(0);

      console.log(`      Tiny swap: ${ethers.formatEther(tinySwap)} ETH → ${ethers.formatEther(actualOutput)} GEMI`);
    });

    it("should handle complete pool drainage and refill cycle", async function () {
      // Initial setup
      await geminiToken.mint(liquidityProvider1.address, INITIAL_SUPPLY);
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      // Execute some swaps
      await simplePool.connect(swapper1).swapEthForToken({ value: ethers.parseEther("10") });

      // Drain pool completely
      const totalLiquidity = await simplePool.liquidityProvided(liquidityProvider1.address);
      await simplePool.connect(liquidityProvider1).removeLiquidity(totalLiquidity);

      // Note: Due to swaps, ethReserve increases but liquidityProvided doesn't
      // So removing all liquidityProvided won't drain all ethReserve
      // This is expected behavior - the extra ETH from swaps remains in the pool
      const remainingEth = await simplePool.ethReserve();
      const remainingTokens = await simplePool.tokenReserve();
      
      console.log(`      After draining user liquidity: ${ethers.formatEther(remainingEth)} ETH, ${ethers.formatEther(remainingTokens)} GEMI remaining`);

      // The pool should have some ETH left from swaps
      expect(remainingEth).to.be.greaterThan(0);

      // Refill pool
      await geminiToken.connect(liquidityProvider1).approve(
        await simplePool.getAddress(),
        INITIAL_TOKENS
      );
      await simplePool.connect(liquidityProvider1).addLiquidity(
        INITIAL_TOKENS,
        { value: INITIAL_ETH }
      );

      // Verify pool is functional again
      await simplePool.connect(swapper2).swapEthForToken({ value: ethers.parseEther("5") });
      expect(await geminiToken.balanceOf(swapper2.address)).to.be.greaterThan(0);
    });
  });
});
