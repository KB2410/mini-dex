import { expect } from "chai";
import { ethers } from "hardhat";
import { SimplePool, GeminiToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimplePool - addLiquidity", function () {
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

    // Mint tokens to owner and addr1
    await geminiToken.mint(owner.address, ethers.parseEther("1000"));
    await geminiToken.mint(addr1.address, ethers.parseEther("1000"));
  });

  describe("addLiquidity", function () {
    it("should add liquidity successfully with valid amounts", async function () {
      const ethAmount = ethers.parseEther("1");
      const tokenAmount = ethers.parseEther("100");

      // Approve SimplePool to spend tokens
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount);

      // Add liquidity
      const tx = await simplePool.addLiquidity(tokenAmount, { value: ethAmount });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      // Verify event emission
      await expect(tx)
        .to.emit(simplePool, "LiquidityAdded")
        .withArgs(owner.address, ethAmount, tokenAmount, block!.timestamp);

      // Verify reserves updated
      expect(await simplePool.ethReserve()).to.equal(ethAmount);
      expect(await simplePool.tokenReserve()).to.equal(tokenAmount);

      // Verify liquidityProvided tracking
      expect(await simplePool.liquidityProvided(owner.address)).to.equal(ethAmount);

      // Verify token transfer occurred
      expect(await geminiToken.balanceOf(await simplePool.getAddress())).to.equal(tokenAmount);
    });

    it("should revert with ZeroAmount when ETH amount is zero", async function () {
      const tokenAmount = ethers.parseEther("100");

      await geminiToken.approve(await simplePool.getAddress(), tokenAmount);

      await expect(
        simplePool.addLiquidity(tokenAmount, { value: 0 })
      ).to.be.revertedWithCustomError(simplePool, "ZeroAmount");
    });

    it("should revert with ZeroAmount when token amount is zero", async function () {
      const ethAmount = ethers.parseEther("1");

      await expect(
        simplePool.addLiquidity(0, { value: ethAmount })
      ).to.be.revertedWithCustomError(simplePool, "ZeroAmount");
    });

    it("should revert with TokenTransferFailed when approval is insufficient", async function () {
      const ethAmount = ethers.parseEther("1");
      const tokenAmount = ethers.parseEther("100");

      // Don't approve or approve insufficient amount
      await geminiToken.approve(await simplePool.getAddress(), ethers.parseEther("50"));

      await expect(
        simplePool.addLiquidity(tokenAmount, { value: ethAmount })
      ).to.be.revertedWithCustomError(simplePool, "TokenTransferFailed");
    });

    it("should allow multiple liquidity additions", async function () {
      const ethAmount1 = ethers.parseEther("1");
      const tokenAmount1 = ethers.parseEther("100");
      const ethAmount2 = ethers.parseEther("2");
      const tokenAmount2 = ethers.parseEther("200");

      // First addition
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount1);
      await simplePool.addLiquidity(tokenAmount1, { value: ethAmount1 });

      // Second addition
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount2);
      await simplePool.addLiquidity(tokenAmount2, { value: ethAmount2 });

      // Verify cumulative reserves
      expect(await simplePool.ethReserve()).to.equal(ethAmount1 + ethAmount2);
      expect(await simplePool.tokenReserve()).to.equal(tokenAmount1 + tokenAmount2);

      // Verify cumulative liquidityProvided
      expect(await simplePool.liquidityProvided(owner.address)).to.equal(ethAmount1 + ethAmount2);
    });

    it("should track liquidity per provider separately", async function () {
      const ethAmount = ethers.parseEther("1");
      const tokenAmount = ethers.parseEther("100");

      // Owner adds liquidity
      await geminiToken.approve(await simplePool.getAddress(), tokenAmount);
      await simplePool.addLiquidity(tokenAmount, { value: ethAmount });

      // addr1 adds liquidity
      await geminiToken.connect(addr1).approve(await simplePool.getAddress(), tokenAmount);
      await simplePool.connect(addr1).addLiquidity(tokenAmount, { value: ethAmount });

      // Verify separate tracking
      expect(await simplePool.liquidityProvided(owner.address)).to.equal(ethAmount);
      expect(await simplePool.liquidityProvided(addr1.address)).to.equal(ethAmount);

      // Verify total reserves
      expect(await simplePool.ethReserve()).to.equal(ethAmount * 2n);
      expect(await simplePool.tokenReserve()).to.equal(tokenAmount * 2n);
    });
  });
});
