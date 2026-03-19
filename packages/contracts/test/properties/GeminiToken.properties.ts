import { expect } from "chai";
import { ethers } from "hardhat";
import { GeminiToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import fc from "fast-check";

describe("GeminiToken - Property-Based Tests", function () {
  let geminiToken: GeminiToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy GeminiToken
    const GeminiTokenFactory = await ethers.getContractFactory("GeminiToken");
    geminiToken = await GeminiTokenFactory.deploy();
    await geminiToken.waitForDeployment();
  });

  /**
   * Feature: mini-dex, Property 1: Token Balance Conservation
   * 
   * For any transfer operation (transfer or transferFrom), the sum of all token 
   * balances before the transfer SHALL equal the sum of all token balances after 
   * the transfer.
   * 
   * **Validates: Requirements 1.2**
   */
  describe("Property 1: Token Balance Conservation", function () {
    it("should conserve total balance across transfer operations", async function () {
      this.timeout(60000); // Increase timeout for property tests

      await fc.assert(
        fc.asyncProperty(
          // Generate random transfer amount (0 to 1000 ETH)
          fc.bigUintN(64).map(n => n % ethers.parseEther("1000")),
          async (transferAmount) => {
            // Setup: Mint tokens to owner
            const initialMint = ethers.parseEther("10000");
            await geminiToken.mint(owner.address, initialMint);

            // Skip if transfer amount exceeds balance
            if (transferAmount > initialMint) {
              return true;
            }

            // Get balances before transfer
            const ownerBalanceBefore = await geminiToken.balanceOf(owner.address);
            const addr1BalanceBefore = await geminiToken.balanceOf(addr1.address);
            const totalBefore = ownerBalanceBefore + addr1BalanceBefore;

            // Execute transfer
            await geminiToken.transfer(addr1.address, transferAmount);

            // Get balances after transfer
            const ownerBalanceAfter = await geminiToken.balanceOf(owner.address);
            const addr1BalanceAfter = await geminiToken.balanceOf(addr1.address);
            const totalAfter = ownerBalanceAfter + addr1BalanceAfter;

            // Property: Total balance should be conserved
            expect(totalAfter).to.equal(totalBefore);

            // Cleanup for next iteration
            if (addr1BalanceAfter > 0n) {
              await geminiToken.connect(addr1).transfer(owner.address, addr1BalanceAfter);
            }
            const remainingBalance = await geminiToken.balanceOf(owner.address);
            if (remainingBalance > 0n) {
              await geminiToken.transfer(addr2.address, remainingBalance);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should conserve total balance across transferFrom operations", async function () {
      this.timeout(60000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => n % ethers.parseEther("1000")),
          async (transferAmount) => {
            // Setup: Mint tokens to owner and approve addr1
            const initialMint = ethers.parseEther("10000");
            await geminiToken.mint(owner.address, initialMint);
            await geminiToken.approve(addr1.address, initialMint);

            // Skip if transfer amount exceeds balance
            if (transferAmount > initialMint) {
              return true;
            }

            // Get balances before transferFrom
            const ownerBalanceBefore = await geminiToken.balanceOf(owner.address);
            const addr2BalanceBefore = await geminiToken.balanceOf(addr2.address);
            const totalBefore = ownerBalanceBefore + addr2BalanceBefore;

            // Execute transferFrom
            await geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);

            // Get balances after transferFrom
            const ownerBalanceAfter = await geminiToken.balanceOf(owner.address);
            const addr2BalanceAfter = await geminiToken.balanceOf(addr2.address);
            const totalAfter = ownerBalanceAfter + addr2BalanceAfter;

            // Property: Total balance should be conserved
            expect(totalAfter).to.equal(totalBefore);

            // Cleanup
            if (addr2BalanceAfter > 0n) {
              await geminiToken.connect(addr2).transfer(addr3.address, addr2BalanceAfter);
            }
            const remainingBalance = await geminiToken.balanceOf(owner.address);
            if (remainingBalance > 0n) {
              await geminiToken.transfer(addr3.address, remainingBalance);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 2: Transfer Insufficient Balance Error
   * 
   * For any transfer attempt where the amount exceeds the sender's balance, 
   * the GeminiToken contract SHALL revert with InsufficientBalance error 
   * containing the account, requested amount, and available balance.
   * 
   * **Validates: Requirements 1.5**
   */
  describe("Property 2: Transfer Insufficient Balance Error", function () {
    it("should revert with InsufficientBalance when transfer exceeds balance", async function () {
      this.timeout(60000);

      await fc.assert(
        fc.asyncProperty(
          // Generate balance and excess amount
          fc.bigUintN(64).map(n => n % ethers.parseEther("1000")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("500")) + 1n),
          async (balance, excessAmount) => {
            // Setup: Mint specific balance to addr1
            if (balance > 0n) {
              await geminiToken.mint(addr1.address, balance);
            }

            // Calculate amount that exceeds balance
            const transferAmount = balance + excessAmount;

            // Property: Transfer exceeding balance should revert with InsufficientBalance
            await expect(
              geminiToken.connect(addr1).transfer(addr2.address, transferAmount)
            )
              .to.be.revertedWithCustomError(geminiToken, "InsufficientBalance")
              .withArgs(addr1.address, transferAmount, balance);

            // Cleanup
            if (balance > 0n) {
              await geminiToken.connect(addr1).transfer(owner.address, balance);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should revert with InsufficientBalance for any amount when balance is zero", async function () {
      this.timeout(60000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("1000")) + 1n),
          async (transferAmount) => {
            // Ensure addr1 has zero balance
            const balance = await geminiToken.balanceOf(addr1.address);
            expect(balance).to.equal(0n);

            // Property: Any transfer from zero balance should revert
            await expect(
              geminiToken.connect(addr1).transfer(addr2.address, transferAmount)
            )
              .to.be.revertedWithCustomError(geminiToken, "InsufficientBalance")
              .withArgs(addr1.address, transferAmount, 0n);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 3: TransferFrom Insufficient Allowance Error
   * 
   * For any transferFrom attempt where the amount exceeds the approved allowance, 
   * the GeminiToken contract SHALL revert with InsufficientAllowance error 
   * containing the owner, spender, requested amount, and available allowance.
   * 
   * **Validates: Requirements 1.6**
   */
  describe("Property 3: TransferFrom Insufficient Allowance Error", function () {
    it("should revert with InsufficientAllowance when transferFrom exceeds allowance", async function () {
      this.timeout(60000);

      await fc.assert(
        fc.asyncProperty(
          // Generate balance, allowance, and excess amount
          fc.bigUintN(64).map(n => n % ethers.parseEther("1000")),
          fc.bigUintN(64).map(n => n % ethers.parseEther("500")),
          fc.bigUintN(64).map(n => (n % ethers.parseEther("100")) + 1n),
          async (balance, allowance, excessAmount) => {
            // Setup: Mint tokens to owner and set allowance
            if (balance > 0n) {
              await geminiToken.mint(owner.address, balance);
            }
            await geminiToken.approve(addr1.address, allowance);

            // Calculate amount that exceeds allowance
            const transferAmount = allowance + excessAmount;

            // Skip if transfer amount exceeds balance (different error)
            if (transferAmount > balance) {
              // Cleanup
              if (balance > 0n) {
                await geminiToken.transfer(addr3.address, balance);
              }
              return true;
            }

            // Property: TransferFrom exceeding allowance should revert with InsufficientAllowance
            await expect(
              geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            )
              .to.be.revertedWithCustomError(geminiToken, "InsufficientAllowance")
              .withArgs(owner.address, addr1.address, transferAmount, allowance);

            // Cleanup
            if (balance > 0n) {
              await geminiToken.transfer(addr3.address, balance);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should revert with InsufficientAllowance for any amount when allowance is zero", async function () {
      this.timeout(60000);

      await fc.assert(
        fc.asyncProperty(
          fc.bigUintN(64).map(n => (n % ethers.parseEther("1000")) + 1n),
          async (transferAmount) => {
            // Setup: Mint sufficient balance but no allowance
            const balance = ethers.parseEther("10000");
            await geminiToken.mint(owner.address, balance);

            // Ensure allowance is zero
            const allowance = await geminiToken.allowance(owner.address, addr1.address);
            expect(allowance).to.equal(0n);

            // Skip if transfer amount exceeds balance
            if (transferAmount > balance) {
              await geminiToken.transfer(addr3.address, balance);
              return true;
            }

            // Property: Any transferFrom with zero allowance should revert
            await expect(
              geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            )
              .to.be.revertedWithCustomError(geminiToken, "InsufficientAllowance")
              .withArgs(owner.address, addr1.address, transferAmount, 0n);

            // Cleanup
            await geminiToken.transfer(addr3.address, balance);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
