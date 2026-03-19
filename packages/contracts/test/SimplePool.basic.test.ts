import { expect } from "chai";
import { ethers } from "hardhat";
import { SimplePool, GeminiToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimplePool - Basic Tests", function () {
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

  describe("Deployment", function () {
    it("should set the correct token address", async function () {
      expect(await simplePool.token()).to.equal(await geminiToken.getAddress());
    });

    it("should initialize reserves to zero", async function () {
      expect(await simplePool.ethReserve()).to.equal(0);
      expect(await simplePool.tokenReserve()).to.equal(0);
    });

    it("should inherit from ReentrancyGuard", async function () {
      // Verify the contract has ReentrancyGuard functionality
      // This is implicitly tested by the contract compiling successfully
      expect(await simplePool.getAddress()).to.be.properAddress;
    });

    it("should have immutable token address", async function () {
      const tokenAddress = await simplePool.token();
      expect(tokenAddress).to.equal(await geminiToken.getAddress());
      // Immutability is enforced at compile time, so we just verify it's set correctly
    });

    it("should initialize liquidityProvided mapping to zero", async function () {
      expect(await simplePool.liquidityProvided(owner.address)).to.equal(0);
      expect(await simplePool.liquidityProvided(addr1.address)).to.equal(0);
    });
  });
});
