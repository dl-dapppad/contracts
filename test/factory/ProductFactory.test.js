const { expect } = require('chai');
const { percentToDecimal, toWei, zeroAddress } = require('../../helpers/bn');
const {
  ERC20Deployer,
  ProductFactoryDeployer,
  PaymentDeployer,
  FarmingDeployer,
  TokenDeployer,
} = require('../../helpers/deployers');

describe('ProductFactory', async () => {
  const keccak256_erc20 = '0x9b9b0454cadcb5884dd3faa6ba975da4d2459aa3f11d31291a25a8358f84946d';

  let productFactory, payment, farming, erc20, usdt, dapp;
  let owner, ivan, treasury;

  beforeEach('setup', async () => {
    [owner, ivan, treasury] = await ethers.getSigners();

    productFactory = await new ProductFactoryDeployer().deployProxy();
    payment = await new PaymentDeployer().deployProxy();
    usdt = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000').toString(), owner.address, '18']);
    erc20 = await new ERC20Deployer().deployProxy(['N', 'S', '100', owner.address, '8']);

    const Token = await ethers.getContractFactory('Token');
    dapp = await new TokenDeployer().deploy(['N', 'S']);

    const minterRole = await dapp.implementation.MINTER_ROLE();
    await dapp.implementation.grantRole(minterRole, payment.proxy.address);
    await dapp.implementation.grantRole(minterRole, owner.address);
    await dapp.implementation.mint(owner.address, toWei('1').toString());
    await dapp.implementation.revokeRole(minterRole, owner.address);

    farming = await new FarmingDeployer().deployProxy();
    await farming.proxy.setTokens(dapp.implementation.address, usdt.proxy.address);
  });

  describe('TokenFactory_init()', async () => {
    it('should initialize', async () => {
      expect(await productFactory.proxy.owner()).to.be.equal(owner.address);
    });
    it('should revert on second initialize', async () => {
      await expect(productFactory.proxy.ProductFactory_init()).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('setupProduct()', async () => {
    it('should setup product configs', async () => {
      await productFactory.proxy.setupProduct(
        keccak256_erc20,
        erc20.implementation.address,
        '100',
        '50',
        percentToDecimal('100').toString(),
        percentToDecimal('20').toString(),
        true
      );

      expect((await productFactory.proxy.getProducts())[0]).to.be.equal(keccak256_erc20);
      expect((await productFactory.proxy.getProducts()).length).to.be.equal(1);

      const product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.implementation).to.be.equal(erc20.implementation.address);
      expect(product.currentPrice).to.be.equal('100');
      expect(product.minPrice).to.be.equal('50');
      expect(product.decreasePercent).to.be.equal(percentToDecimal('100').toString());
      expect(product.cashbackPercent).to.be.equal(percentToDecimal('20').toString());
      expect(product.isActive).to.be.equal(true);
    });
  });

  describe('addProduct()', async () => {
    it('should add new product', async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);

      expect((await productFactory.proxy.getProducts())[0]).to.be.equal(keccak256_erc20);
      expect((await productFactory.proxy.getProducts()).length).to.be.equal(1);
    });
    it("shouldn't add the same product", async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.addProduct(keccak256_erc20);

      expect((await productFactory.proxy.getProducts())[0]).to.be.equal(keccak256_erc20);
      expect((await productFactory.proxy.getProducts()).length).to.be.equal(1);
    });
    it('should revert if invalid caller', async () => {
      await expect(productFactory.proxy.connect(ivan).addProduct(keccak256_erc20)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('setPayment()', async () => {
    it('should set Payment contract', async () => {
      await productFactory.proxy.setPayment(payment.proxy.address);

      expect(await productFactory.proxy.payment()).to.be.equal(payment.proxy.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(productFactory.proxy.connect(ivan).setPayment(payment.proxy.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('setImplementation()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
    });
    it('should set implementation contract', async () => {
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);

      const product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.implementation).to.be.equal(erc20.implementation.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(
        productFactory.proxy.connect(ivan).setImplementation(keccak256_erc20, erc20.implementation.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('should revert if alias not found', async () => {
      await expect(
        productFactory.proxy.setImplementation(
          '0x9b9b0454cadcb5884dd3faa6ba975da4d2459aa3f11d31291a25a8358f849463',
          erc20.implementation.address
        )
      ).to.be.revertedWith('PFC: not found');
    });
  });

  describe('setPrices()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
    });
    it('should set prices', async () => {
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
      await productFactory.proxy.setPrices(keccak256_erc20, '100', '50');

      let product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal('100');
      expect(product.minPrice).to.be.equal('50');

      await productFactory.proxy.setPrices(keccak256_erc20, '40', '40');

      product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal('40');
      expect(product.minPrice).to.be.equal('40');
    });
    it('should revert if invalid prices', async () => {
      await expect(productFactory.proxy.setPrices(keccak256_erc20, '50', '50')).to.be.revertedWith(
        'PFC: implementation not found'
      );
    });
    it('should revert if invalid prices', async () => {
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
      await expect(productFactory.proxy.setPrices(keccak256_erc20, '49', '50')).to.be.revertedWith(
        'PFC: invalid prices'
      );
    });
    it('should revert if invalid caller', async () => {
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
      await expect(productFactory.proxy.connect(ivan).setPrices(keccak256_erc20, '100', '50')).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('setPercents()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
    });
    it('should set percents', async () => {
      await productFactory.proxy.setPercents(keccak256_erc20, percentToDecimal('100').toString(), '0');

      let product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.decreasePercent).to.be.equal(percentToDecimal('100').toString());
      expect(product.cashbackPercent).to.be.equal('0');
    });
    it('should revert if invalid decrease percent', async () => {
      await expect(
        productFactory.proxy.setPercents(
          keccak256_erc20,
          percentToDecimal('100.1').toString(),
          percentToDecimal('50').toString()
        )
      ).to.be.revertedWith('PFC: invalid decrease percent');
    });
    it('should revert if invalid cashback percent', async () => {
      await expect(
        productFactory.proxy.setPercents(
          keccak256_erc20,
          percentToDecimal('100').toString(),
          percentToDecimal('100.1').toString()
        )
      ).to.be.revertedWith('PFC: invalid cashback percent');
    });
  });

  describe('setStatus()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
    });
    it('should change product status', async () => {
      expect((await productFactory.proxy.products(keccak256_erc20)).isActive).to.be.equal(false);

      await productFactory.proxy.setStatus(keccak256_erc20, true);

      expect((await productFactory.proxy.products(keccak256_erc20)).isActive).to.be.equal(true);

      await productFactory.proxy.setStatus(keccak256_erc20, false);

      expect((await productFactory.proxy.products(keccak256_erc20)).isActive).to.be.equal(false);
    });
  });

  describe('getNewPrice()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
    });
    it('should correctly calculate new price', async () => {
      // Base
      await productFactory.proxy.setPrices(keccak256_erc20, toWei('100').toString(), toWei('50').toString());
      await productFactory.proxy.setPercents(keccak256_erc20, percentToDecimal('10').toString(), '0');
      expect(await productFactory.proxy.getNewPrice(keccak256_erc20)).to.be.equal(toWei('90').toString());

      // Check min price
      await productFactory.proxy.setPrices(keccak256_erc20, toWei('100').toString(), toWei('95').toString());
      expect(await productFactory.proxy.getNewPrice(keccak256_erc20)).to.be.equal(toWei('95').toString());

      // Decrease percent to zero
      await productFactory.proxy.setPercents(keccak256_erc20, '0', '0');
      expect(await productFactory.proxy.getNewPrice(keccak256_erc20)).to.be.equal(toWei('100').toString());

      // Product price zero
      await productFactory.proxy.setPrices(keccak256_erc20, '0', '0');
      await productFactory.proxy.setPercents(keccak256_erc20, percentToDecimal('10').toString(), '0');
      expect(await productFactory.proxy.getNewPrice(keccak256_erc20)).to.be.equal('0');
    });
  });

  describe('getCashback()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
    });
    it('should correctly calculate cashback', async () => {
      // Base
      await productFactory.proxy.setPrices(keccak256_erc20, toWei('100').toString(), '0');
      await productFactory.proxy.setPercents(keccak256_erc20, '0', percentToDecimal('10').toString());
      expect(await productFactory.proxy.getCashback(keccak256_erc20)).to.be.equal(toWei('10').toString());

      // Cashback percent to zero
      await productFactory.proxy.setPercents(keccak256_erc20, '0', '0');
      expect(await productFactory.proxy.getCashback(keccak256_erc20)).to.be.equal('0');

      // Product price zero
      await productFactory.proxy.setPrices(keccak256_erc20, '0', '0');
      await productFactory.proxy.setPercents(keccak256_erc20, '0', percentToDecimal('10').toString());
      expect(await productFactory.proxy.getCashback(keccak256_erc20)).to.be.equal('0');
    });
  });

  describe('getPotentialContractAddress()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
      await productFactory.proxy.setStatus(keccak256_erc20, true);

      await productFactory.proxy.setPayment(payment.proxy.address);

      const factoryRole = await payment.proxy.FACTORY_ROLE();
      await payment.proxy.grantRole(factoryRole, productFactory.proxy.address);
    });
    it('should correctly get potential address', async () => {
      let potentialAddress = await productFactory.proxy.getPotentialContractAddress(
        keccak256_erc20,
        erc20.initializeData
      );

      let tx = await productFactory.proxy.deploy(keccak256_erc20, usdt.proxy.address, erc20.initializeData);
      let receipt = await tx.wait();
      let actualAddress = receipt.events[receipt.events.length - 1].args.proxy;

      expect(potentialAddress).to.be.equal(actualAddress);

      // -----

      potentialAddress = await productFactory.proxy.getPotentialContractAddress(keccak256_erc20, erc20.initializeData);

      tx = await productFactory.proxy.deploy(keccak256_erc20, dapp.implementation.address, erc20.initializeData);
      receipt = await tx.wait();
      actualAddress = receipt.events[receipt.events.length - 1].args.proxy;

      expect(potentialAddress).to.be.equal(actualAddress);
    });
    it('should correctly get potential address, max uint256', async () => {
      keccak256_max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      await productFactory.proxy.addProduct(keccak256_max);
      await productFactory.proxy.setImplementation(keccak256_max, erc20.implementation.address);
      await productFactory.proxy.setStatus(keccak256_max, true);

      const potentialAddress = await productFactory.proxy.getPotentialContractAddress(
        keccak256_max,
        erc20.initializeData
      );

      const tx = await productFactory.proxy.deploy(keccak256_max, usdt.proxy.address, erc20.initializeData);
      const receipt = await tx.wait();
      const actualAddress = receipt.events[receipt.events.length - 1].args.proxy;

      expect(potentialAddress).to.be.equal(actualAddress);
    });
  });

  describe('deploy()', async () => {
    beforeEach(async () => {
      const factoryRole = await payment.proxy.FACTORY_ROLE();
      await payment.proxy.grantRole(factoryRole, productFactory.proxy.address);

      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, erc20.implementation.address);
      await productFactory.proxy.setPrices(keccak256_erc20, toWei('100').toString(), toWei('60').toString());
      await productFactory.proxy.setPercents(
        keccak256_erc20,
        percentToDecimal('20').toString(),
        percentToDecimal('10').toString()
      );
      await productFactory.proxy.setStatus(keccak256_erc20, true);
      await productFactory.proxy.setPayment(payment.proxy.address);

      await payment.proxy.setup(dapp.implementation.address, farming.proxy.address, treasury.address, zeroAddress);

      await usdt.proxy.transfer(ivan.address, toWei('500').toString());
      await usdt.proxy.approve(payment.proxy.address, toWei('500').toString());
      await usdt.proxy.connect(ivan).approve(payment.proxy.address, toWei('500').toString());

      await dapp.implementation.approve(farming.proxy.address, toWei('1').toString());
      await farming.proxy.invest(toWei('1').toString());
    });
    it('should correctly deploy new proxy', async () => {
      const newTokenAddress = await productFactory.proxy
        .connect(ivan)
        .getPotentialContractAddress(keccak256_erc20, erc20.initializeData);
      const factory = await erc20.getImplementationFactory();
      const newToken = await factory.attach(newTokenAddress);

      const tx = await productFactory.proxy
        .connect(ivan)
        .deploy(keccak256_erc20, usdt.proxy.address, erc20.initializeData);
      const receipt = await tx.wait();

      expect(await newToken.owner()).to.be.equal(ivan.address);
      expect(await newToken.name()).to.be.equal('N');
      expect(await newToken.symbol()).to.be.equal('S');
      expect((await newToken.decimals()).toString()).to.be.equal('8');
      expect((await newToken.balanceOf(owner.address)).toString()).to.be.equal('100');
    });
    it('should correctly change storage', async () => {
      await productFactory.proxy.connect(ivan).deploy(keccak256_erc20, usdt.proxy.address, erc20.initializeData);

      let product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal(toWei('80').toString());
      expect(product.salesCount).to.be.equal(1);

      await productFactory.proxy.connect(ivan).deploy(keccak256_erc20, usdt.proxy.address, erc20.initializeData);

      product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal(toWei('64').toString());
      expect(product.salesCount).to.be.equal(2);

      await productFactory.proxy.connect(ivan).deploy(keccak256_erc20, usdt.proxy.address, erc20.initializeData);

      product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal(toWei('60').toString());
      expect(product.salesCount).to.be.equal(3);
    });
    it('should correctly make full payments', async () => {
      await productFactory.proxy.connect(ivan).deploy(keccak256_erc20, usdt.proxy.address, erc20.initializeData);

      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('400').toString());
      expect(await usdt.proxy.balanceOf(farming.proxy.address)).to.be.equal(toWei('10').toString()); // 10% - cashback
      expect(await usdt.proxy.balanceOf(treasury.address)).to.be.equal(toWei('90').toString()); // 90% - to treasury

      expect(await dapp.implementation.balanceOf(ivan.address)).to.be.equal(toWei('10').toString());
    });
    it('should revert if product inactive', async () => {
      await productFactory.proxy.setStatus(keccak256_erc20, false);

      await expect(
        productFactory.proxy.deploy(keccak256_erc20, usdt.proxy.address, erc20.initializeData)
      ).to.be.revertedWith('TF: inactive product');
    });
  });
});

// npx hardhat coverage --testfiles "test/factory/ProductFactory.test.js"
