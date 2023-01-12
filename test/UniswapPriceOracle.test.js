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

  describe('setSwapConfig()', async () => {
    it('should set swap config', async () => {
      await upo.implementation.setSwapConfig(uniswapV3FactoryMock.address, 10);

      expect((await upo.implementation.swapConfig()).factory).to.be.equal(uniswapV3FactoryMock.address);
      expect((await upo.implementation.swapConfig()).secondsAgo).to.be.equal(10);
    });
    it('should revert if invalid factory', async () => {
      await expect(upo.implementation.setSwapConfig(zeroAddress, 10)).to.be.revertedWith('UPO: invalid factory');
    });
    it('should revert if invalid seconds', async () => {
      await expect(upo.implementation.setSwapConfig(uniswapV3FactoryMock.address, 0)).to.be.revertedWith(
        'UPO: invalid seconds'
      );
    });
    it('should revert if invalid caller', async () => {
      await expect(upo.implementation.connect(ivan).setSwapConfig(uniswapV3FactoryMock.address, 10)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('getInSwapAmount()', async () => {
    let uniswapV3PoolMock;
    beforeEach(async () => {
      const UniswapV3PoolMock = await ethers.getContractFactory('UniswapV3PoolMock');
      uniswapV3PoolMock = await UniswapV3PoolMock.deploy([20, 10], [20, 10]);

      uniswapV3FactoryMock.setPool(uniswapV3PoolMock.address);

      await upo.implementation.setSwapConfig(uniswapV3FactoryMock.address, 10);
    });
    it('should set swap config', async () => {
      const price = await upo.implementation.getInSwapAmount(zeroAddress, zeroAddress, zeroAddress, '10000', '0', '0');

      expect(price).to.be.equal('10000');
    });
    it("should revert if pool isn't found", async () => {
      uniswapV3FactoryMock.setPool(zeroAddress);

      await expect(
        upo.implementation.getInSwapAmount(zeroAddress, zeroAddress, zeroAddress, '10000', '0', '0')
      ).to.be.revertedWith("UPO: pool isn't found");
    });
  });
});

// npx hardhat coverage --testfiles "test/UniswapPriceOracle.test.js"
