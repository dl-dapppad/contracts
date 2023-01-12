const { expect } = require('chai');
const { ERC20Deployer, ERC20MintDeployer } = require('../../../../helpers/deployers');

describe('ERC20', async () => {
  let erc20;
  let owner, ivan;

  beforeEach('setup', async () => {
    [owner, ivan] = await ethers.getSigners();

    erc20 = await new ERC20Deployer().deployProxy(['N', 'S', '100', ivan.address, '8']);
  });

  describe('ERC20_init()', async () => {
    it('should initialize', async () => {
      expect(await erc20.proxy.owner()).to.be.equal(owner.address);
      expect(await erc20.proxy.name()).to.be.equal('N');
      expect(await erc20.proxy.symbol()).to.be.equal('S');
      expect((await erc20.proxy.decimals()).toString()).to.be.equal('8');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('100');
    });
    it('should initialize with zero amount', async () => {
      const erc20 = await new ERC20Deployer().deployProxy(['N', 'S', '0', ivan.address, '8']);

      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('0');
    });
    it('should revert on second initialize', async () => {
      await expect(erc20.proxy.ERC20_init('N', 'S', '0', ivan.address, '8')).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('upgradeTo()', async () => {
    it('should upgrade', async () => {
      const newErc20 = await new ERC20MintDeployer().deploy();
      await erc20.proxy.upgradeTo(newErc20.implementation.address);

      const factory = await ethers.getContractFactory('ERC20Mint');
      erc20.proxy = await factory.attach(erc20.proxy.address);

      await erc20.proxy.mint(ivan.address, '100');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('200');
    });
    it('should revert if contract is not upgreadable', async () => {
      const newErc20 = await new ERC20MintDeployer().deploy();
      await erc20.proxy.removeUpgradeability();

      await expect(erc20.proxy.upgradeTo(newErc20.implementation.address)).to.be.revertedWith(
        "UUPSOwnable: upgrade isn't available"
      );
    });
  });

  describe('removeUpgradeability()', async () => {
    it('should remove upgreadability', async () => {
      expect(await erc20.proxy.isNotUpgradeable()).to.be.equal(false);

      await erc20.proxy.removeUpgradeability();
      expect(await erc20.proxy.isNotUpgradeable()).to.be.equal(true);
    });
  });
});

// npx hardhat coverage --testfiles "test/implementations/tokens/ERC20/ERC20.test.js"
