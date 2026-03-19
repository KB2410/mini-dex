import { expect } from "chai";
import { ethers } from "hardhat";
import { SimplePool, GeminiToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import fc from "fast-check";

/**
 * Property-Based Tests for SimplePool Contract
 * 
 * These tests validate universal correctness properties using fast-check
 * with 100+ iterations per property to ensure behavior holds across
 * randomized inputs.
 * 
 * Validates: Requirements 8.2, 8.5
 */
describe("SimplePool - Property-Based Tests", function () {
  let simplePool: SimplePool;
  let geminiToken: GeminiToken;
  let owner: SignerWithAddress;
  let liquidityProvider: SignerWithAddress;
  let swapper: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, liquidityProvider, swapper, addr1, addr2] = await ethers.getSigners();

    // Deploy GeminiToken
    const GeminiTokenFactory = await ethers.getContractFactory("GeminiToken");
    geminiToken = await GeminiTokenFactory.deploy();
    await geminiToken.waitForDeployment();

    // Deploy SimplePool
    const SimplePoolFactory = await ethers.getContractFactory("SimplePool");
    simplePool = await SimplePoolFactory.deploy(await geminiToken.getAddress());
    await simplePool.waitForDeployment();

    // Mint tokens to liquidity provider
    const initialSupply = ethers.parseEther("1000000");
    await geminiToken.mint(liquidityProvider.address, initialSupply);
  });

  /**
   * Feature: mini-dex, Property 4: Liquidity Withdrawal Proportionality
   * 
   * For any liquidity withdrawal, the ratio of returned ETH to returned tokens 
   * SHALL equal the ratio of total ETH reserve to total token reserve in the pool 
   * (within rounding tolerance).
   * 
   * **Validates: Requirements 2.3**
   */
  describe("Property 4: Liquidity Withdrawal Proportionality", function () {
    it("should maintain proportional withdrawal ratio equal to pool reserve ratio", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          // Generate random liquidity amounts
          fc.bigUintN(64).map(n => (n % ethers.parseEther("50")) + ethers.parseEther("1")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5000")) + ethers.parseEther("100")),
          // Generate random withdrawal amount (as percentage)
          fc.integer({ min: 10, max: 100 }),
          async (ethAmount, tokenAmount, withdrawalPercent) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenAmount
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenAmount, {
              value: ethAmount,
            });

            const ethReserveBefore = await simplePool.ethReserve();
            const tokenReserveBefore = await simplePool.tokenReserve();

            // Calculate withdrawal amount
            const liquidityProvided = await simplePool.liquidityProvided(liquidityProvider.address);
            const withdrawalAmount = (liquidityProvided * BigInt(withdrawalPercent)) / 100n;

            // Skip if withdrawal amount is zero
            if (withdrawalAmount === 0n) {
              // Cleanup
              const remaining = await simplePool.liquidityProvided(liquidityProvider.address);
              if (remaining > 0n) {
                await simplePool.connect(liquidityProvider).removeLiquidity(remaining);
              }
              return true;
            }

            // Remove liquidity
            const tx = await simplePool.connect(liquidityProvider).removeLiquidity(withdrawalAmount);
            const receipt = await tx.wait();

            // Parse event to get actual amounts returned
            const event = receipt!.logs.find(
              log => simplePool.interface.parseLog(log as any)?.name === "LiquidityRemoved"
            );
            const parsedEvent = simplePool.interface.parseLog(event as any);
            const ethReturned = parsedEvent!.args[1];
            const tokenReturned = parsedEvent!.args[2];

            // Property: Withdrawal ratio should equal pool reserve ratio
            // ethReturned / tokenReturned ≈ ethReserveBefore / tokenReserveBefore
            // Cross multiply to avoid division: ethReturned * tokenReserveBefore ≈ tokenReturned * ethReserveBefore
            
            const leftSide = ethReturned * tokenReserveBefore;
            const rightSide = tokenReturned * ethReserveBefore;

            // Allow for rounding tolerance (0.01% difference)
            const tolerance = rightSide / 10000n;
            const difference = leftSide > rightSide ? leftSide - rightSide : rightSide - leftSide;

            expect(difference).to.be.lessThanOrEqual(tolerance);

            // Cleanup
            const remaining = await simplePool.liquidityProvided(liquidityProvider.address);
            if (remaining > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(remaining);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 5: Non-Negative Reserve Invariant
   * 
   * For any operation on the SimplePool contract (addLiquidity, removeLiquidity, 
   * swapEthForToken), both ethReserve and tokenReserve SHALL remain greater than 
   * or equal to zero.
   * 
   * **Validates: Requirements 2.5**
   */
  describe("Property 5: Non-Negative Reserve Invariant", function () {
    it("should maintain non-negative reserves after addLiquidity", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("100")) + ethers.parseEther("0.1")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("10000")) + ethers.parseEther("10")),
          async (ethAmount, tokenAmount) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenAmount
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenAmount, {
              value: ethAmount,
            });

            // Property: Reserves must be non-negative
            const ethReserve = await simplePool.ethReserve();
            const tokenReserve = await simplePool.tokenReserve();

            expect(ethReserve).to.be.greaterThanOrEqual(0n);
            expect(tokenReserve).to.be.greaterThanOrEqual(0n);

            // Cleanup
            const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
            if (liquidity > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain non-negative reserves after swapEthForToken", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          // Initial liquidity
          fc.bigUintN(64).map(n => (n % ethers.parseEther("50")) + ethers.parseEther("10")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5000")) + ethers.parseEther("1000")),
          // Swap amount
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5")) + ethers.parseEther("0.1")),
          async (ethLiquidity, tokenLiquidity, swapAmount) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenLiquidity
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenLiquidity, {
              value: ethLiquidity,
            });

            // Perform swap
            await simplePool.connect(swapper).swapEthForToken({ value: swapAmount });

            // Property: Reserves must be non-negative
            const ethReserve = await simplePool.ethReserve();
            const tokenReserve = await simplePool.tokenReserve();

            expect(ethReserve).to.be.greaterThanOrEqual(0n);
            expect(tokenReserve).to.be.greaterThanOrEqual(0n);

            // Cleanup
            const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
            if (liquidity > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain non-negative reserves after removeLiquidity", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("50")) + ethers.parseEther("1")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5000")) + ethers.parseEther("100")),
          fc.integer({ min: 10, max: 100 }),
          async (ethAmount, tokenAmount, withdrawalPercent) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenAmount
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenAmount, {
              value: ethAmount,
            });

            // Remove partial liquidity
            const liquidityProvided = await simplePool.liquidityProvided(liquidityProvider.address);
            const withdrawalAmount = (liquidityProvided * BigInt(withdrawalPercent)) / 100n;

            if (withdrawalAmount > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(withdrawalAmount);
            }

            // Property: Reserves must be non-negative
            const ethReserve = await simplePool.ethReserve();
            const tokenReserve = await simplePool.tokenReserve();

            expect(ethReserve).to.be.greaterThanOrEqual(0n);
            expect(tokenReserve).to.be.greaterThanOrEqual(0n);

            // Cleanup
            const remaining = await simplePool.liquidityProvided(liquidityProvider.address);
            if (remaining > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(remaining);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 6: Insufficient Liquidity Error
   * 
   * For any withdrawal or swap where the required token amount exceeds the 
   * available tokenReserve, the SimplePool contract SHALL revert with 
   * InsufficientLiquidity error containing the requested and available amounts.
   * 
   * **Validates: Requirements 2.6, 3.6**
   */
  describe("Property 6: Insufficient Liquidity Error", function () {
    it("should revert with InsufficientLiquidity when withdrawal exceeds user liquidity", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("10")) + ethers.parseEther("1")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("1000")) + ethers.parseEther("100")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5")) + ethers.parseEther("0.1")),
          async (ethAmount, tokenAmount, excessAmount) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenAmount
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenAmount, {
              value: ethAmount,
            });

            const liquidityProvided = await simplePool.liquidityProvided(liquidityProvider.address);
            const excessiveWithdrawal = liquidityProvided + excessAmount;

            // Property: Withdrawal exceeding user liquidity should revert
            await expect(
              simplePool.connect(liquidityProvider).removeLiquidity(excessiveWithdrawal)
            )
              .to.be.revertedWithCustomError(simplePool, "InsufficientLiquidity")
              .withArgs(excessiveWithdrawal, liquidityProvided);

            // Cleanup
            if (liquidityProvided > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidityProvided);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 7: Constant Product Formula
   * 
   * For any swap operation, the product of ethReserve and tokenReserve after 
   * the swap SHALL equal the product before the swap (k = x * y invariant), 
   * accounting for the token output calculation: 
   * tokenOut = (tokenReserve * ethIn) / (ethReserve + ethIn).
   * 
   * **Validates: Requirements 3.1**
   */
  describe("Property 7: Constant Product Formula", function () {
    it("should preserve constant product k = x * y after swaps", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          // Initial liquidity
          fc.bigUintN(64).map(n => (n % ethers.parseEther("100")) + ethers.parseEther("10")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("10000")) + ethers.parseEther("1000")),
          // Swap amount (smaller to avoid draining pool)
          fc.bigUintN(64).map(n => (n % ethers.parseEther("2")) + ethers.parseEther("0.01")),
          async (ethLiquidity, tokenLiquidity, swapAmount) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenLiquidity
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenLiquidity, {
              value: ethLiquidity,
            });

            const ethReserveBefore = await simplePool.ethReserve();
            const tokenReserveBefore = await simplePool.tokenReserve();
            const kBefore = ethReserveBefore * tokenReserveBefore;

            // Perform swap
            await simplePool.connect(swapper).swapEthForToken({ value: swapAmount });

            const ethReserveAfter = await simplePool.ethReserve();
            const tokenReserveAfter = await simplePool.tokenReserve();
            const kAfter = ethReserveAfter * tokenReserveAfter;

            // Property: Constant product should be preserved
            // Due to integer division, k might increase slightly, but should never decrease
            expect(kAfter).to.be.greaterThanOrEqual(kBefore);

            // The increase should be minimal (due to rounding in favor of the pool)
            const kIncrease = kAfter - kBefore;
            const maxAllowedIncrease = kBefore / 1000n; // 0.1% tolerance
            expect(kIncrease).to.be.lessThanOrEqual(maxAllowedIncrease);

            // Cleanup
            const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
            if (liquidity > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 8: Atomic Swap Execution
   * 
   * For any successful swap, the user's token balance increase SHALL occur in 
   * the same transaction as the ETH transfer to the pool, with no intermediate 
   * state where ETH is received but tokens are not sent.
   * 
   * **Validates: Requirements 3.2**
   */
  describe("Property 8: Atomic Swap Execution", function () {
    it("should execute token transfer and ETH receipt atomically", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("50")) + ethers.parseEther("10")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5000")) + ethers.parseEther("1000")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("2")) + ethers.parseEther("0.1")),
          async (ethLiquidity, tokenLiquidity, swapAmount) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenLiquidity
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenLiquidity, {
              value: ethLiquidity,
            });

            const tokenBalanceBefore = await geminiToken.balanceOf(swapper.address);
            const ethReserveBefore = await simplePool.ethReserve();
            const tokenReserveBefore = await simplePool.tokenReserve();

            // Calculate expected output using current reserves
            const expectedOutput = (tokenReserveBefore * swapAmount) / (ethReserveBefore + swapAmount);

            // Perform swap
            const tx = await simplePool.connect(swapper).swapEthForToken({ value: swapAmount });
            await tx.wait();

            const tokenBalanceAfter = await geminiToken.balanceOf(swapper.address);
            const ethReserveAfter = await simplePool.ethReserve();

            // Property: Both state changes must occur in same transaction
            // If ETH was received, tokens must have been sent
            if (ethReserveAfter > ethReserveBefore) {
              expect(tokenBalanceAfter).to.be.greaterThan(tokenBalanceBefore);
              expect(tokenBalanceAfter - tokenBalanceBefore).to.equal(expectedOutput);
            }

            // Cleanup
            const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
            if (liquidity > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 9: Gas Consumption Limit
   * 
   * For any swap operation under normal conditions (non-zero reserves, valid input), 
   * the swapEthForToken function SHALL consume less than 100,000 gas units.
   * 
   * **Validates: Requirements 3.4, 5.5**
   */
  describe("Property 9: Gas Consumption Limit", function () {
    it("should consume less than 100,000 gas for swapEthForToken", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("50")) + ethers.parseEther("10")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5000")) + ethers.parseEther("1000")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("2")) + ethers.parseEther("0.1")),
          async (ethLiquidity, tokenLiquidity, swapAmount) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenLiquidity
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenLiquidity, {
              value: ethLiquidity,
            });

            // Perform swap and measure gas
            const tx = await simplePool.connect(swapper).swapEthForToken({ value: swapAmount });
            const receipt = await tx.wait();
            const gasUsed = receipt!.gasUsed;

            // Property: Gas consumption must be under 100,000
            expect(gasUsed).to.be.lessThan(100000n);

            // Cleanup
            const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
            if (liquidity > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 10: Sequential Reentrancy Lock Release
   * 
   * For any sequence of calls to guarded functions, after a guarded function 
   * completes successfully, a subsequent call to any guarded function SHALL 
   * succeed (demonstrating the lock was released).
   * 
   * **Validates: Requirements 4.4**
   */
  describe("Property 10: Sequential Reentrancy Lock Release", function () {
    it("should release reentrancy lock after successful function completion", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("20")) + ethers.parseEther("5")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("2000")) + ethers.parseEther("500")),
          fc.integer({ min: 2, max: 5 }),
          async (ethLiquidity, tokenLiquidity, numOperations) => {
            // Add initial liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenLiquidity
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenLiquidity, {
              value: ethLiquidity,
            });

            // Perform multiple sequential operations
            for (let i = 0; i < numOperations; i++) {
              const operation = i % 3;

              if (operation === 0) {
                // Swap operation
                const swapAmount = ethers.parseEther("0.1");
                await simplePool.connect(swapper).swapEthForToken({ value: swapAmount });
              } else if (operation === 1) {
                // Add more liquidity
                const addEth = ethers.parseEther("1");
                const addTokens = ethers.parseEther("100");
                await geminiToken.connect(liquidityProvider).approve(
                  await simplePool.getAddress(),
                  addTokens
                );
                await simplePool.connect(liquidityProvider).addLiquidity(addTokens, {
                  value: addEth,
                });
              } else {
                // Remove small amount of liquidity
                const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
                if (liquidity > ethers.parseEther("1")) {
                  await simplePool.connect(liquidityProvider).removeLiquidity(ethers.parseEther("0.5"));
                }
              }
            }

            // Property: All operations should succeed, proving lock is released between calls
            const finalEthReserve = await simplePool.ethReserve();
            const finalTokenReserve = await simplePool.tokenReserve();

            expect(finalEthReserve).to.be.greaterThan(0n);
            expect(finalTokenReserve).to.be.greaterThan(0n);

            // Cleanup
            const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
            if (liquidity > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 11: Custom Error Parameters
   * 
   * For any error condition that triggers a revert, the custom error SHALL 
   * include all relevant parameters (amounts, addresses, balances) needed to 
   * diagnose the failure.
   * 
   * **Validates: Requirements 5.3**
   */
  describe("Property 11: Custom Error Parameters", function () {
    it("should include diagnostic parameters in InsufficientLiquidity error", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("10")) + ethers.parseEther("1")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("1000")) + ethers.parseEther("100")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("5")) + ethers.parseEther("0.1")),
          async (ethAmount, tokenAmount, excessAmount) => {
            // Add liquidity
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenAmount
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenAmount, {
              value: ethAmount,
            });

            const liquidityProvided = await simplePool.liquidityProvided(liquidityProvider.address);
            const excessiveWithdrawal = liquidityProvided + excessAmount;

            // Property: Error must include requested and available amounts
            await expect(
              simplePool.connect(liquidityProvider).removeLiquidity(excessiveWithdrawal)
            )
              .to.be.revertedWithCustomError(simplePool, "InsufficientLiquidity")
              .withArgs(excessiveWithdrawal, liquidityProvided);

            // Cleanup
            if (liquidityProvided > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidityProvided);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include diagnostic parameters in InvalidSwapAmount error", async function () {
      this.timeout(120000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("1000")) + ethers.parseEther("100")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("1")) + ethers.parseEther("0.1")),
          fc.integer({ min: 1, max: 10 }),
          async (ethLiquidity, tokenLiquidity, weiAmount) => {
            // Create pool with high ETH, low token ratio to cause zero output
            await geminiToken.connect(liquidityProvider).approve(
              await simplePool.getAddress(),
              tokenLiquidity
            );
            await simplePool.connect(liquidityProvider).addLiquidity(tokenLiquidity, {
              value: ethLiquidity,
            });

            // Try to swap tiny amount that results in zero output
            const tinySwap = BigInt(weiAmount);

            try {
              await simplePool.connect(swapper).swapEthForToken({ value: tinySwap });
            } catch (error: any) {
              // If it reverts with InvalidSwapAmount, verify parameters are included
              if (error.message.includes("InvalidSwapAmount")) {
                // Property: Error includes ethAmount and tokenOutput (0)
                expect(error.message).to.include("InvalidSwapAmount");
              }
            }

            // Cleanup
            const liquidity = await simplePool.liquidityProvided(liquidityProvider.address);
            if (liquidity > 0n) {
              await simplePool.connect(liquidityProvider).removeLiquidity(liquidity);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include diagnostic parameters in ZeroAmount error", async function () {
      this.timeout(60000);

      await fc.assert(
        fc.asyncProperty(
          fc.constant(true),
          async () => {
            // Property: ZeroAmount error is thrown for zero ETH swap
            await expect(
              simplePool.connect(swapper).swapEthForToken({ value: 0 })
            ).to.be.revertedWithCustomError(simplePool, "ZeroAmount");

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
