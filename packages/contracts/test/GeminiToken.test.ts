import { expect } from "chai";
import { ethers } from "hardhat";
import { GeminiToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("GeminiToken - Unit Tests", function () {
  let geminiToken: GeminiToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy GeminiToken
    const GeminiTokenFactory = await ethers.getContractFactory("GeminiToken");
    geminiToken = await GeminiTokenFactory.deploy();
    await geminiToken.waitForDeployment();

    // Mint initial tokens to owner for testing
    await geminiToken.mint(owner.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("should set the correct name", async function () {
      expect(await geminiToken.name()).to.equal("Gemini Token");
    });

    it("should set the correct symbol", async function () {
      expect(await geminiToken.symbol()).to.equal("GEMI");
    });

    it("should set decimals to 18", async function () {
      expect(await geminiToken.decimals()).to.equal(18);
    });

    it("should initialize with zero total supply", async function () {
      const freshToken = await (await ethers.getContractFactory("GeminiToken")).deploy();
      expect(await freshToken.totalSupply()).to.equal(0);
    });
  });

  describe("Transfer - Successful with sufficient balance", function () {
    it("should transfer tokens successfully with sufficient balance", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(geminiToken.transfer(addr1.address, transferAmount))
        .to.emit(geminiToken, "Transfer")
        .withArgs(owner.address, addr1.address, transferAmount);

      expect(await geminiToken.balanceOf(owner.address)).to.equal(ethers.parseEther("900"));
      expect(await geminiToken.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("should transfer entire balance successfully", async function () {
      const entireBalance = ethers.parseEther("1000");
      
      await geminiToken.transfer(addr1.address, entireBalance);

      expect(await geminiToken.balanceOf(owner.address)).to.equal(0);
      expect(await geminiToken.balanceOf(addr1.address)).to.equal(entireBalance);
    });

    it("should allow multiple transfers", async function () {
      await geminiToken.transfer(addr1.address, ethers.parseEther("100"));
      await geminiToken.transfer(addr1.address, ethers.parseEther("200"));

      expect(await geminiToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("300"));
      expect(await geminiToken.balanceOf(owner.address)).to.equal(ethers.parseEther("700"));
    });

    it("should measure gas consumption for transfer", async function () {
      const tx = await geminiToken.transfer(addr1.address, ethers.parseEther("100"));
      const receipt = await tx.wait();
      
      console.log(`      Gas used for transfer: ${receipt?.gasUsed}`);
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("Transfer - Revert with insufficient balance", function () {
    it("should revert when transferring more than balance", async function () {
      const excessAmount = ethers.parseEther("1001");
      const currentBalance = ethers.parseEther("1000");

      await expect(geminiToken.transfer(addr1.address, excessAmount))
        .to.be.revertedWithCustomError(geminiToken, "InsufficientBalance")
        .withArgs(owner.address, excessAmount, currentBalance);
    });

    it("should revert when transferring from empty account", async function () {
      await expect(geminiToken.connect(addr1).transfer(addr2.address, ethers.parseEther("1")))
        .to.be.revertedWithCustomError(geminiToken, "InsufficientBalance")
        .withArgs(addr1.address, ethers.parseEther("1"), 0);
    });

    it("should revert when transferring to zero address", async function () {
      await expect(geminiToken.transfer(ethers.ZeroAddress, ethers.parseEther("100")))
        .to.be.revertedWithCustomError(geminiToken, "TransferToZeroAddress");
    });
  });

  describe("Approve and TransferFrom flow", function () {
    it("should approve spender successfully", async function () {
      const approvalAmount = ethers.parseEther("500");

      await expect(geminiToken.approve(addr1.address, approvalAmount))
        .to.emit(geminiToken, "Approval")
        .withArgs(owner.address, addr1.address, approvalAmount);

      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(approvalAmount);
    });

    it("should allow transferFrom with sufficient allowance", async function () {
      const approvalAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("300");

      await geminiToken.approve(addr1.address, approvalAmount);

      await expect(geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
        .to.emit(geminiToken, "Transfer")
        .withArgs(owner.address, addr2.address, transferAmount);

      expect(await geminiToken.balanceOf(owner.address)).to.equal(ethers.parseEther("700"));
      expect(await geminiToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("200"));
    });

    it("should allow transferFrom with exact allowance", async function () {
      const amount = ethers.parseEther("500");

      await geminiToken.approve(addr1.address, amount);
      await geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);

      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(0);
      expect(await geminiToken.balanceOf(addr2.address)).to.equal(amount);
    });

    it("should update allowance correctly after partial transferFrom", async function () {
      await geminiToken.approve(addr1.address, ethers.parseEther("500"));
      await geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("100"));

      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("400"));
    });

    it("should measure gas consumption for approve", async function () {
      const tx = await geminiToken.approve(addr1.address, ethers.parseEther("500"));
      const receipt = await tx.wait();
      
      console.log(`      Gas used for approve: ${receipt?.gasUsed}`);
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });

    it("should measure gas consumption for transferFrom", async function () {
      await geminiToken.approve(addr1.address, ethers.parseEther("500"));
      
      const tx = await geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("100"));
      const receipt = await tx.wait();
      
      console.log(`      Gas used for transferFrom: ${receipt?.gasUsed}`);
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("TransferFrom - Revert with insufficient allowance", function () {
    it("should revert when transferFrom exceeds allowance", async function () {
      const approvalAmount = ethers.parseEther("100");
      const transferAmount = ethers.parseEther("200");

      await geminiToken.approve(addr1.address, approvalAmount);

      await expect(geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
        .to.be.revertedWithCustomError(geminiToken, "InsufficientAllowance")
        .withArgs(owner.address, addr1.address, transferAmount, approvalAmount);
    });

    it("should revert when transferFrom with zero allowance", async function () {
      await expect(geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("1")))
        .to.be.revertedWithCustomError(geminiToken, "InsufficientAllowance")
        .withArgs(owner.address, addr1.address, ethers.parseEther("1"), 0);
    });

    it("should revert when transferFrom exceeds balance even with sufficient allowance", async function () {
      const approvalAmount = ethers.parseEther("2000");
      const transferAmount = ethers.parseEther("1500");
      const currentBalance = ethers.parseEther("1000");

      await geminiToken.approve(addr1.address, approvalAmount);

      await expect(geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
        .to.be.revertedWithCustomError(geminiToken, "InsufficientBalance")
        .withArgs(owner.address, transferAmount, currentBalance);
    });

    it("should revert when transferFrom to zero address", async function () {
      await geminiToken.approve(addr1.address, ethers.parseEther("500"));

      await expect(geminiToken.connect(addr1).transferFrom(owner.address, ethers.ZeroAddress, ethers.parseEther("100")))
        .to.be.revertedWithCustomError(geminiToken, "TransferToZeroAddress");
    });
  });

  describe("Mint functionality", function () {
    it("should mint tokens successfully", async function () {
      const mintAmount = ethers.parseEther("500");
      const initialSupply = await geminiToken.totalSupply();

      await expect(geminiToken.mint(addr1.address, mintAmount))
        .to.emit(geminiToken, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

      expect(await geminiToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await geminiToken.totalSupply()).to.equal(initialSupply + mintAmount);
    });

    it("should mint to multiple addresses", async function () {
      await geminiToken.mint(addr1.address, ethers.parseEther("100"));
      await geminiToken.mint(addr2.address, ethers.parseEther("200"));

      expect(await geminiToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
      expect(await geminiToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("200"));
    });

    it("should revert when minting to zero address", async function () {
      await expect(geminiToken.mint(ethers.ZeroAddress, ethers.parseEther("100")))
        .to.be.revertedWithCustomError(geminiToken, "MintToZeroAddress");
    });

    it("should update total supply correctly after minting", async function () {
      const initialSupply = await geminiToken.totalSupply();
      const mintAmount = ethers.parseEther("1000");

      await geminiToken.mint(addr1.address, mintAmount);

      expect(await geminiToken.totalSupply()).to.equal(initialSupply + mintAmount);
    });

    it("should measure gas consumption for mint", async function () {
      const tx = await geminiToken.mint(addr1.address, ethers.parseEther("500"));
      const receipt = await tx.wait();
      
      console.log(`      Gas used for mint: ${receipt?.gasUsed}`);
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("Approve edge cases", function () {
    it("should revert when approving zero address", async function () {
      await expect(geminiToken.approve(ethers.ZeroAddress, ethers.parseEther("100")))
        .to.be.revertedWithCustomError(geminiToken, "ApproveToZeroAddress");
    });

    it("should allow updating approval amount", async function () {
      await geminiToken.approve(addr1.address, ethers.parseEther("100"));
      await geminiToken.approve(addr1.address, ethers.parseEther("500"));

      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("500"));
    });

    it("should allow setting approval to zero", async function () {
      await geminiToken.approve(addr1.address, ethers.parseEther("100"));
      await geminiToken.approve(addr1.address, 0);

      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(0);
    });
  });

  describe("Balance queries", function () {
    it("should return correct balance for account with tokens", async function () {
      expect(await geminiToken.balanceOf(owner.address)).to.equal(ethers.parseEther("1000"));
    });

    it("should return zero balance for account without tokens", async function () {
      expect(await geminiToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("should return correct total supply", async function () {
      const initialSupply = ethers.parseEther("1000");
      expect(await geminiToken.totalSupply()).to.equal(initialSupply);

      await geminiToken.mint(addr1.address, ethers.parseEther("500"));
      expect(await geminiToken.totalSupply()).to.equal(ethers.parseEther("1500"));
    });
  });

  describe("Allowance queries", function () {
    it("should return zero allowance by default", async function () {
      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(0);
    });

    it("should return correct allowance after approval", async function () {
      await geminiToken.approve(addr1.address, ethers.parseEther("500"));
      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("500"));
    });

    it("should return updated allowance after transferFrom", async function () {
      await geminiToken.approve(addr1.address, ethers.parseEther("500"));
      await geminiToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("100"));
      
      expect(await geminiToken.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("400"));
    });
  });

  describe("Gas consumption verification", function () {
    it("should verify all operations are gas efficient", async function () {
      // Transfer
      let tx = await geminiToken.transfer(addr1.address, ethers.parseEther("100"));
      let receipt = await tx.wait();
      expect(receipt?.gasUsed).to.be.lessThan(100000);

      // Approve
      tx = await geminiToken.approve(addr2.address, ethers.parseEther("500"));
      receipt = await tx.wait();
      expect(receipt?.gasUsed).to.be.lessThan(100000);

      // TransferFrom
      tx = await geminiToken.connect(addr2).transferFrom(owner.address, addr1.address, ethers.parseEther("50"));
      receipt = await tx.wait();
      expect(receipt?.gasUsed).to.be.lessThan(100000);

      // Mint
      tx = await geminiToken.mint(addr1.address, ethers.parseEther("100"));
      receipt = await tx.wait();
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });
});
