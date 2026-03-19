import { expect } from "chai";
import { ethers } from "hardhat";
import { SimplePool, GeminiToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimplePool - View Functions", function () {
  let simplePool: SimplePool;
  let geminiToken: GeminiToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy GeminiToken
    const GeminiTokenFactory = await ethers.getContractFactory("GeminiToken");
    geminiToken = await GeminiTokenFactory.deploy();
    await geminiToken.waitForDeployment();

    // Deploy SimplePool
    const SimplePoolFactory = await ethers.getContractFactory("SimplePool");
    simplePool = await SimplePoolFactory.deploy(await geminiToken.getAddress());
    await simplePool.waitForDeployment();
  });

  describe("getSwapEstimate", function () {
    it("should return 0 for zero ETH input", async function () {
      const estimate = await simplePool.getSwapEstimate(0);
      expect(estimate).to.equal(0);
    });

    it("should return 0 when pool has no liquidity", async function () {
      const ethAmount = ethers.parseEther("1");
      const estimate = await simplePool.getSwapEstimate(ethAmount);
      expect(estimate).to.equal(0);
    });

    it("should calculate correct token output with liquidity", async function () {
      // Add liquidity: 10 ETH and 1000 tokens
      const ethAmount = ethers.parseEther("10");
      const tokenAmount = ethers.parseEther("1000");

      // Mint tokens to owner
      await geminiToken.mint(owner.address, tokenAmount);
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount);

      // Add liquidity
      await simplePool.addLiquidity(tokenAmount, { value: ethAmount });

      // Test swap estimate for 1 ETH
      // Formula: tokenOut = (tokenReserve * ethIn) / (ethReserve + ethIn)
      // tokenOut = (1000 * 1) / (10 + 1) = 90.909... tokens
      const swapAmount = ethers.parseEther("1");
      const estimate = await simplePool.getSwapEstimate(swapAmount);

      const expectedOutput = (tokenAmount * swapAmount) / (ethAmount + swapAmount);
      expect(estimate).to.equal(expectedOutput);
    });

    it("should calculate correct estimate for multiple swap amounts", async function () {
      // Add liquidity: 10 ETH and 1000 tokens
      const ethAmount = ethers.parseEther("10");
      const tokenAmount = ethers.parseEther("1000");

      await geminiToken.mint(owner.address, tokenAmount);
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount);
      await simplePool.addLiquidity(tokenAmount, { value: ethAmount });

      // Test different swap amounts
      const testAmounts = [
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
        ethers.parseEther("5"),
      ];

      for (const swapAmount of testAmounts) {
        const estimate = await simplePool.getSwapEstimate(swapAmount);
        const expectedOutput = (tokenAmount * swapAmount) / (ethAmount + swapAmount);
        expect(estimate).to.equal(expectedOutput);
      }
    });

    it("should match actual swap output", async function () {
      // Add liquidity
      const ethAmount = ethers.parseEther("10");
      const tokenAmount = ethers.parseEther("1000");

      await geminiToken.mint(owner.address, tokenAmount);
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount);
      await simplePool.addLiquidity(tokenAmount, { value: ethAmount });

      // Get estimate
      const swapAmount = ethers.parseEther("1");
      const estimate = await simplePool.getSwapEstimate(swapAmount);

      // Mint more tokens for the pool to have enough for the swap
      await geminiToken.mint(await simplePool.getAddress(), tokenAmount);

      // Perform actual swap
      const balanceBefore = await geminiToken.balanceOf(addr1.address);
      await simplePool.connect(addr1).swapEthForToken({ value: swapAmount });
      const balanceAfter = await geminiToken.balanceOf(addr1.address);

      const actualOutput = balanceAfter - balanceBefore;
      expect(actualOutput).to.equal(estimate);
    });
  });

  describe("getPoolStats", function () {
    it("should return zeros when pool is empty", async function () {
      const [ethReserve, tokenReserve, totalLiquidity] = await simplePool.getPoolStats();
      
      expect(ethReserve).to.equal(0);
      expect(tokenReserve).to.equal(0);
      expect(totalLiquidity).to.equal(0);
    });

    it("should return correct stats after adding liquidity", async function () {
      const ethAmount = ethers.parseEther("10");
      const tokenAmount = ethers.parseEther("1000");

      // Mint and add liquidity
      await geminiToken.mint(owner.address, tokenAmount);
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount);
      await simplePool.addLiquidity(tokenAmount, { value: ethAmount });

      const [ethReserve, tokenReserve, totalLiquidity] = await simplePool.getPoolStats();

      expect(ethReserve).to.equal(ethAmount);
      expect(tokenReserve).to.equal(tokenAmount);
      expect(totalLiquidity).to.equal(ethAmount);
    });

    it("should update stats after swap", async function () {
      // Add initial liquidity
      const initialEth = ethers.parseEther("10");
      const initialTokens = ethers.parseEther("1000");

      await geminiToken.mint(owner.address, initialTokens);
      await geminiToken.approve(await simplePool.getAddress(), initialTokens);
      await simplePool.addLiquidity(initialTokens, { value: initialEth });

      // Perform swap
      const swapAmount = ethers.parseEther("1");
      await simplePool.connect(addr1).swapEthForToken({ value: swapAmount });

      // Check updated stats
      const [ethReserve, tokenReserve, totalLiquidity] = await simplePool.getPoolStats();

      // ETH reserve should increase by swap amount
      expect(ethReserve).to.equal(initialEth + swapAmount);
      
      // Token reserve should decrease by the swap output
      const expectedTokenOutput = (initialTokens * swapAmount) / (initialEth + swapAmount);
      expect(tokenReserve).to.equal(initialTokens - expectedTokenOutput);
      
      // Total liquidity should equal ETH reserve
      expect(totalLiquidity).to.equal(ethReserve);
    });

    it("should update stats after multiple liquidity additions", async function () {
      const ethAmount1 = ethers.parseEther("5");
      const tokenAmount1 = ethers.parseEther("500");
      const ethAmount2 = ethers.parseEther("3");
      const tokenAmount2 = ethers.parseEther("300");

      // First liquidity addition
      await geminiToken.mint(owner.address, tokenAmount1);
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount1);
      await simplePool.addLiquidity(tokenAmount1, { value: ethAmount1 });

      // Second liquidity addition
      await geminiToken.mint(addr1.address, tokenAmount2);
      await geminiToken.connect(addr1).approve(await simplePool.getAddress(), tokenAmount2);
      await simplePool.connect(addr1).addLiquidity(tokenAmount2, { value: ethAmount2 });

      const [ethReserve, tokenReserve, totalLiquidity] = await simplePool.getPoolStats();

      expect(ethReserve).to.equal(ethAmount1 + ethAmount2);
      expect(tokenReserve).to.equal(tokenAmount1 + tokenAmount2);
      expect(totalLiquidity).to.equal(ethAmount1 + ethAmount2);
    });
  });
});
