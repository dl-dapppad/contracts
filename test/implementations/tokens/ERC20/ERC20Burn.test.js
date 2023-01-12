const { expect } = require('chai');
const { ERC20BurnDeployer } = require('../../../../helpers/deployers');

describe('ERC20Burn', async () => {
  let erc20;
  let owner, ivan;

  beforeEach('setup', async () => {
    [owner, ivan] = await ethers.getSigners();

    erc20 = await new ERC20BurnDeployer().deployProxy(['N', 'S', '100', ivan.address, '8']);
  });

  describe('ERC20Burn_init()', async () => {
    it('should initialize', async () => {
      expect(await erc20.proxy.owner()).to.be.equal(owner.address);
      expect(await erc20.proxy.name()).to.be.equal('N');
      expect(await erc20.proxy.symbol()).to.be.equal('S');
      expect((await erc20.proxy.decimals()).toString()).to.be.equal('8');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('100');
    });
    it('should initialize with zero amount', async () => {
      const erc20 = await new ERC20BurnDeployer().deployProxy(['N', 'S', '0', ivan.address, '8']);

      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('0');
    });
    it('should revert on second initialize', async () => {
      await expect(erc20.proxy.ERC20Burn_init('N', 'S', '0', ivan.address, '8')).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('burn()', async () => {
    it('should burn tokens', async () => {
      await erc20.proxy.connect(ivan).burn('10');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('90');

      await erc20.proxy.connect(ivan).burn('90');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('0');
    });
  });
});
