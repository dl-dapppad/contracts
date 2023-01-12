const { expect } = require('chai');
const { ERC721BurnDeployer } = require('../../../../helpers/deployers');

describe('ERC721Burn', async () => {
  let erc721;
  let owner, ivan;

  beforeEach('setup', async () => {
    [owner, ivan] = await ethers.getSigners();

    erc721 = await new ERC721BurnDeployer().deployProxy(['N', 'S']);
  });

  describe('ERC721Burn_init()', async () => {
    it('should initialize', async () => {
      expect(await erc721.proxy.owner()).to.be.equal(owner.address);
      expect(await erc721.proxy.name()).to.be.equal('N');
      expect(await erc721.proxy.symbol()).to.be.equal('S');
    });
    it('should revert on second initialize', async () => {
      await expect(erc721.proxy.ERC721Burn_init('N', 'S')).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('safeMint()', async () => {
    it('should mint tokens safety', async () => {
      await expect(erc721.proxy.ownerOf(1)).to.be.revertedWith('ERC721: invalid token ID');

      await await erc721.proxy.safeMint(ivan.address, 1);
      expect(await erc721.proxy.ownerOf(1)).to.be.equal(ivan.address);

      await expect(erc721.proxy.safeMint(erc721.proxy.address, 2)).to.be.revertedWith(
        'ERC721: transfer to non ERC721Receiver implementer'
      );
    });
    it('should revert if caller is not the owner', async () => {
      await expect(erc721.proxy.connect(ivan).safeMint(ivan.address, 3)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('mint()', async () => {
    it('should mint tokens', async () => {
      await expect(erc721.proxy.ownerOf(1)).to.be.revertedWith('ERC721: invalid token ID');

      await await erc721.proxy.mint(ivan.address, 1);
      expect(await erc721.proxy.ownerOf(1)).to.be.equal(ivan.address);

      await await erc721.proxy.mint(erc721.proxy.address, 2);
      expect(await erc721.proxy.ownerOf(2)).to.be.equal(erc721.proxy.address);
    });
    it('should revert if caller is not the owner', async () => {
      await expect(erc721.proxy.connect(ivan).mint(ivan.address, 3)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('setBaseURI()', async () => {
    it('should set base URI', async () => {
      await await erc721.proxy.mint(ivan.address, 1);

      await await erc721.proxy.setBaseURI('www.721.com/nft/');
      expect(await erc721.proxy.baseURI()).to.be.equal('www.721.com/nft/');
      expect(await erc721.proxy.tokenURI(1)).to.be.equal('www.721.com/nft/1');

      await await erc721.proxy.setBaseURI('www.721.com/nft/2/');
      expect(await erc721.proxy.baseURI()).to.be.equal('www.721.com/nft/2/');
      expect(await erc721.proxy.tokenURI(1)).to.be.equal('www.721.com/nft/2/1');
    });
    it('should revert if caller is not the owner', async () => {
      await expect(erc721.proxy.connect(ivan).setBaseURI('')).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('burn()', async () => {
    it('should set base URI', async () => {
      await await erc721.proxy.mint(ivan.address, 1);
      expect(await erc721.proxy.ownerOf(1)).to.be.equal(ivan.address);

      await await erc721.proxy.connect(ivan).burn(1);
      await expect(erc721.proxy.ownerOf(1)).to.be.revertedWith('ERC721: invalid token ID');
    });
  });
});
