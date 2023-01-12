const { expect } = require('chai');
const { TokenDeployer } = require('../helpers/deployers');

describe('Token', async () => {
  let token;
  let owner, ivan, oleg;

  beforeEach('setup', async () => {
    [owner, ivan, oleg] = await ethers.getSigners();

    token = await new TokenDeployer().deploy(['N', 'S']);
  });

  describe('constructor()', async () => {
    it('should set correct initial values', async () => {
      const adminRole = await token.implementation.DEFAULT_ADMIN_ROLE();

      expect(await token.implementation.hasRole(adminRole, owner.address)).to.be.equal(true);
    });
  });

  describe('changeWhitelistStatus()', async () => {
    it('should change whitelist status', async () => {
      expect(await token.implementation.whitelistEnable()).to.be.equal(false);

      await token.implementation.changeWhitelistStatus();
      expect(await token.implementation.whitelistEnable()).to.be.equal(true);

      await token.implementation.changeWhitelistStatus();
      expect(await token.implementation.whitelistEnable()).to.be.equal(false);

      await token.implementation.changeWhitelistStatus();
      expect(await token.implementation.whitelistEnable()).to.be.equal(true);
    });
    it('should revert on invalid caller', async () => {
      await expect(token.implementation.connect(ivan).changeWhitelistStatus()).to.be.revertedWith('AccessControl');
    });
  });

  describe('changeWhitelistAccounts()', async () => {
    beforeEach(async () => {
      await token.implementation.changeWhitelistStatus();
      const minterRole = await token.implementation.MINTER_ROLE();

      await token.implementation.grantRole(minterRole, owner.address);
      await token.implementation.mint(ivan.address, '100');
    });
    it('should accept `from` transfers', async () => {
      await token.implementation.changeWhitelistAccounts([ivan.address], [true], [false]);

      await token.implementation.connect(ivan).transfer(oleg.address, '100');

      expect(await token.implementation.balanceOf(oleg.address)).to.be.equal('100');
    });
    it('should accept `to` transfers', async () => {
      await token.implementation.changeWhitelistAccounts([oleg.address], [false], [true]);

      await token.implementation.connect(ivan).transfer(oleg.address, '100');

      expect(await token.implementation.balanceOf(oleg.address)).to.be.equal('100');
    });
    it('should revert if account is not in whitelist', async () => {
      await expect(token.implementation.connect(ivan).transfer(oleg.address, '100')).to.be.revertedWith(
        "Token: address isn't on the whitelist"
      );
    });
  });

  describe('mint()', async () => {
    it('should mint tokens', async () => {
      const minterRole = await token.implementation.MINTER_ROLE();

      await token.implementation.grantRole(minterRole, ivan.address);
      await token.implementation.connect(ivan).mint(owner.address, '1');

      expect(await token.implementation.balanceOf(owner.address)).to.be.equal('1');
    });
    it('should mint tokens with whitelist enabled', async () => {
      await token.implementation.changeWhitelistStatus();

      const minterRole = await token.implementation.MINTER_ROLE();

      await token.implementation.grantRole(minterRole, ivan.address);
      await token.implementation.connect(ivan).mint(owner.address, '1');

      expect(await token.implementation.balanceOf(owner.address)).to.be.equal('1');
    });
    it('should revert on invalid minter', async () => {
      await expect(token.implementation.mint(owner.address, '1')).to.be.revertedWith('AccessControl');
    });
  });

  describe('burn()', async () => {
    it('should burn tokens', async () => {
      const minterRole = await token.implementation.MINTER_ROLE();

      await token.implementation.grantRole(minterRole, ivan.address);
      await token.implementation.connect(ivan).mint(owner.address, '1');
      await token.implementation.burn('1');

      expect(await token.implementation.balanceOf(owner.address)).to.be.equal('0');
    });
    it('should burn tokens with whitelist enabled', async () => {
      await token.implementation.changeWhitelistStatus();

      const minterRole = await token.implementation.MINTER_ROLE();

      await token.implementation.grantRole(minterRole, ivan.address);
      await token.implementation.connect(ivan).mint(ivan.address, '1');
      await token.implementation.connect(ivan).burn('1');

      expect(await token.implementation.balanceOf(ivan.address)).to.be.equal('0');
    });
  });
});

// npx hardhat coverage --testfiles "test/Token.test.js"
