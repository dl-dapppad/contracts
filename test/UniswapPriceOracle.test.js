const { expect } = require('chai');
const { UniswapPriceOracleDeployer } = require('../helpers/deployers');
const { percentToDecimal, toWei, zeroAddress } = require('../helpers/bn');

describe('UniswapPriceOracle', async () => {
  let upo, uniswapV3FactoryMock;
  let owner, ivan, factory;

  beforeEach('setup', async () => {
    [owner, ivan, factory] = await ethers.getSigners();

    const UniswapV3FactoryMock = await ethers.getContractFactory('UniswapV3FactoryMock');
    uniswapV3FactoryMock = await UniswapV3FactoryMock.deploy();

    upo = await new UniswapPriceOracleDeployer().deploy();
  });

  describe('setFactory()', async () => {
    it('should set swap config', async () => {
      await upo.implementation.setFactory(uniswapV3FactoryMock.address);

      expect(await upo.implementation.factory()).to.be.equal(uniswapV3FactoryMock.address);
    });
    it('should revert if invalid factory', async () => {
      await expect(upo.implementation.setFactory(zeroAddress)).to.be.revertedWith('UPO: invalid factory');
    });
  });

  describe('getSwapAmount()', async () => {
    let uniswapV3PoolMock;
    beforeEach(async () => {
      const UniswapV3PoolMock = await ethers.getContractFactory('UniswapV3PoolMock');
      uniswapV3PoolMock = await UniswapV3PoolMock.deploy([20, 10], [20, 10]);
      uniswapV3FactoryMock.setPool(uniswapV3PoolMock.address);

      await upo.implementation.setFactory(uniswapV3FactoryMock.address);
    });
    it('should set swap config', async () => {
      const price = await upo.implementation.getSwapAmount(zeroAddress, zeroAddress, zeroAddress, '10000', '0', '300');

      expect(price).to.be.equal('10000');
    });
    it("should revert if pool isn't found", async () => {
      uniswapV3FactoryMock.setPool(zeroAddress);

      await expect(
        upo.implementation.getSwapAmount(zeroAddress, zeroAddress, zeroAddress, '10000', '0', '300')
      ).to.be.revertedWith("UPO: pool isn't found");
    });
  });
});

// npx hardhat coverage --testfiles "test/UniswapPriceOracle.test.js"
