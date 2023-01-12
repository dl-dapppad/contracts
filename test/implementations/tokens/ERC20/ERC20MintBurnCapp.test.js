const { expect } = require('chai');
const { ERC20MintBurnCappDeployer } = require('../../../../helpers/deployers');

describe('ERC20MintBurnCapp', async () => {
  let erc20;
  let owner, ivan;

  beforeEach('setup', async () => {
    [owner, ivan] = await ethers.getSigners();

    erc20 = await new ERC20MintBurnCappDeployer().deployProxy(['N', 'S', '100', ivan.address, '8', '500']);
  });

  describe('ERC20MintBurnCapp_init()', async () => {
    it('should initialize', async () => {
      expect(await erc20.proxy.owner()).to.be.equal(owner.address);
      expect(await erc20.proxy.name()).to.be.equal('N');
      expect(await erc20.proxy.symbol()).to.be.equal('S');
      expect((await erc20.proxy.decimals()).toString()).to.be.equal('8');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('100');
      expect((await erc20.proxy.cap()).toString()).to.be.equal('500');
    });
    it('should initialize with zero amount', async () => {
      const erc20 = await new ERC20MintBurnCappDeployer().deployProxy(['N', 'S', '0', ivan.address, '8', '500']);

      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('0');
    });
    it('should revert on second initialize', async () => {
      await expect(erc20.proxy.ERC20MintBurnCapp_init('N', 'S', '0', ivan.address, '8', '500')).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('mint()', async () => {
    it('should mint tokens', async () => {
      expect((await erc20.proxy.balanceOf(owner.address)).toString()).to.be.equal('0');

      await erc20.proxy.mint(owner.address, '10');
      expect((await erc20.proxy.balanceOf(owner.address)).toString()).to.be.equal('10');

      await erc20.proxy.mint(owner.address, '20');
      expect((await erc20.proxy.balanceOf(owner.address)).toString()).to.be.equal('30');

      await erc20.proxy.mint(ivan.address, '50');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('150');

      await erc20.proxy.mint(ivan.address, '320');
      expect((await erc20.proxy.balanceOf(ivan.address)).toString()).to.be.equal('470');

      await expect(erc20.proxy.mint(ivan.address, '1')).to.be.revertedWith('ERC20Capped: cap exceeded');
    });
  });
});
