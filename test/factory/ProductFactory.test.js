const { expect } = require('chai');
const { percentToDecimal, toWei, zeroAddress } = require('../../helpers/bn');
const {
  ERC20Deployer,
  ProductFactoryDeployer,
  PaymentDeployer,
  AccessControlDeployer,
  CashbackDeployer,
} = require('../../helpers/deployers');

describe('ProductFactory', async () => {
  const keccak256_erc20 = '0x9b9b0454cadcb5884dd3faa6ba975da4d2459aa3f11d31291a25a8358f84946d';

  let productFactory, payment, usdt;
  let owner, ivan, treasury;

  beforeEach('setup', async () => {
    [owner, ivan, treasury] = await ethers.getSigners();

    pointToken = await new ERC20Deployer().deployProxy(['PT', 'PT', toWei('1000').toString(), owner.address, '18']);
    usdt = await new ERC20Deployer().deployProxy(['USD Coin', 'USDC', toWei('1000').toString(), owner.address, '6']);
    dai = await new ERC20Deployer().deployProxy(['DAI', 'DAI', toWei('1000').toString(), owner.address, '18']);

    accessControl = await new AccessControlDeployer().deploy();
    payment = await new PaymentDeployer().deployProxy([accessControl.implementation.address]);
    cashback = await new CashbackDeployer().deployProxy([accessControl.implementation.address]);
    productFactory = await new ProductFactoryDeployer().deployProxy([accessControl.implementation.address]);

    // Setup roles
    const PAYMENT_CONTRACT_ROLE = await cashback.proxy.PAYMENT_CONTRACT_ROLE();
    const PAYMENT_ROLE = await payment.proxy.PAYMENT_ROLE();
    const FACTORY_CONTRACT_ROLE = await payment.proxy.FACTORY_CONTRACT_ROLE();
    const PRODUCT_FACTORY_ROLE = await productFactory.proxy.PRODUCT_FACTORY_ROLE();
    await accessControl.implementation.grantRole(PAYMENT_CONTRACT_ROLE, payment.proxy.address);
    await accessControl.implementation.grantRole(PAYMENT_ROLE, owner.address);
    await accessControl.implementation.grantRole(FACTORY_CONTRACT_ROLE, productFactory.proxy.address);
    await accessControl.implementation.grantRole(PRODUCT_FACTORY_ROLE, owner.address);
    // End
  });

  describe('ProductFactory_init()', async () => {
    it('should initialize', async () => {
      expect(await productFactory.proxy.accessControl()).to.be.equal(accessControl.implementation.address);
    });
    it('should revert on second initialize', async () => {
      await expect(productFactory.proxy.ProductFactory_init(owner.address)).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('setupProduct()', async () => {
    it('should setup product configs', async () => {
      await productFactory.proxy.setupProduct(
        keccak256_erc20,
        dai.implementation.address,
        '100',
        '50',
        percentToDecimal('100').toString(),
        percentToDecimal('20').toString(),
        true
      );

      expect((await productFactory.proxy.getProducts())[0]).to.be.equal(keccak256_erc20);
      expect((await productFactory.proxy.getProducts()).length).to.be.equal(1);

      const product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.implementation).to.be.equal(dai.implementation.address);
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
        'UUPSAC: forbidden'
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
        'UUPSAC: forbidden'
      );
    });
  });

  describe('setImplementation()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
    });
    it('should set implementation contract', async () => {
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);

      const product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.implementation).to.be.equal(dai.implementation.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(
        productFactory.proxy.connect(ivan).setImplementation(keccak256_erc20, dai.implementation.address)
      ).to.be.revertedWith('UUPSAC: forbidden');
    });
    it('should revert if alias not found', async () => {
      await expect(
        productFactory.proxy.setImplementation(
          '0x9b9b0454cadcb5884dd3faa6ba975da4d2459aa3f11d31291a25a8358f849463',
          dai.implementation.address
        )
      ).to.be.revertedWith('PFC: not found');
    });
  });

  describe('setPrices()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
    });
    it('should set prices', async () => {
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
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
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
      await expect(productFactory.proxy.setPrices(keccak256_erc20, '49', '50')).to.be.revertedWith(
        'PFC: invalid prices'
      );
    });
    it('should revert if invalid caller', async () => {
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
      await expect(productFactory.proxy.connect(ivan).setPrices(keccak256_erc20, '100', '50')).to.be.revertedWith(
        'UUPSAC: forbidden'
      );
    });
  });

  describe('setPercents()', async () => {
    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
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
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
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
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
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
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
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
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
      await productFactory.proxy.setStatus(keccak256_erc20, true);

      await productFactory.proxy.setPayment(payment.proxy.address);

      const swapInfo = {
        poolFee: '3000',
        secondsAgo: '600',
      };
      await payment.proxy.setup(pointToken.proxy.address, cashback.proxy.address, treasury.address, zeroAddress);
      await payment.proxy.setPaymentTokens([swapInfo], [pointToken.proxy.address], [true]);
    });
    it('should correctly get potential address', async () => {
      let potentialAddress = await productFactory.proxy.getPotentialContractAddress(
        keccak256_erc20,
        dai.initializeData
      );

      let tx = await productFactory.proxy.deploy(keccak256_erc20, pointToken.proxy.address, dai.initializeData, [], []);
      let receipt = await tx.wait();
      let actualAddress = receipt.events[receipt.events.length - 1].args.proxy;

      expect(potentialAddress).to.be.equal(actualAddress);

      // -----

      potentialAddress = await productFactory.proxy.getPotentialContractAddress(keccak256_erc20, usdt.initializeData);

      tx = await productFactory.proxy.deploy(keccak256_erc20, pointToken.proxy.address, usdt.initializeData, [], []);
      receipt = await tx.wait();
      actualAddress = receipt.events[receipt.events.length - 1].args.proxy;

      expect(potentialAddress).to.be.equal(actualAddress);
    });
    it('should correctly get potential address, max uint256', async () => {
      keccak256_max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      await productFactory.proxy.addProduct(keccak256_max);
      await productFactory.proxy.setImplementation(keccak256_max, dai.implementation.address);
      await productFactory.proxy.setStatus(keccak256_max, true);

      const potentialAddress = await productFactory.proxy.getPotentialContractAddress(
        keccak256_max,
        dai.initializeData
      );

      const tx = await productFactory.proxy.deploy(keccak256_max, pointToken.proxy.address, dai.initializeData, [], []);
      const receipt = await tx.wait();
      const actualAddress = receipt.events[receipt.events.length - 1].args.proxy;

      expect(potentialAddress).to.be.equal(actualAddress);
    });
  });

  describe('deploy()', async () => {
    let weth;

    beforeEach(async () => {
      await productFactory.proxy.addProduct(keccak256_erc20);
      await productFactory.proxy.setImplementation(keccak256_erc20, dai.implementation.address);
      await productFactory.proxy.setPrices(keccak256_erc20, toWei('100').toString(), toWei('60').toString());
      await productFactory.proxy.setPercents(
        keccak256_erc20,
        percentToDecimal('20').toString(),
        percentToDecimal('10').toString()
      );
      await productFactory.proxy.setStatus(keccak256_erc20, true);
      await productFactory.proxy.setPayment(payment.proxy.address);

      // For native payment
      const WETH9Mock = await ethers.getContractFactory('WETH9Mock');
      weth = await WETH9Mock.deploy();
      // End

      const swapInfo = {
        poolFee: '3000',
        secondsAgo: '600',
      };
      await payment.proxy.setup(pointToken.proxy.address, cashback.proxy.address, treasury.address, zeroAddress);
      await payment.proxy.setPaymentTokens(
        [swapInfo, swapInfo],
        [pointToken.proxy.address, weth.address],
        [true, true]
      );

      await pointToken.proxy.transfer(ivan.address, toWei('500').toString());
      await pointToken.proxy.connect(ivan).approve(payment.proxy.address, toWei('500').toString());
    });
    it('should correctly deploy new proxy', async () => {
      const newTokenAddress = await productFactory.proxy
        .connect(ivan)
        .getPotentialContractAddress(keccak256_erc20, dai.initializeData);
      const factory = await dai.getImplementationFactory();
      const newToken = await factory.attach(newTokenAddress);

      const tx = await productFactory.proxy
        .connect(ivan)
        .deploy(keccak256_erc20, pointToken.proxy.address, dai.initializeData, [], []);
      await tx.wait();

      expect(await newToken.owner()).to.be.equal(ivan.address);
      expect(await newToken.name()).to.be.equal('DAI');
      expect(await newToken.symbol()).to.be.equal('DAI');
      expect((await newToken.decimals()).toString()).to.be.equal('18');
      expect((await newToken.balanceOf(owner.address)).toString()).to.be.equal(toWei('1000').toString());
    });
    it('should correctly deploy new proxy, native payment', async () => {
      await productFactory.proxy.setPrices(keccak256_erc20, toWei('2').toString(), toWei('1').toString());
      await payment.proxy.setPointToken(weth.address);

      const newTokenAddress = await productFactory.proxy
        .connect(ivan)
        .getPotentialContractAddress(keccak256_erc20, dai.initializeData);
      const factory = await dai.getImplementationFactory();
      const newToken = await factory.attach(newTokenAddress);

      const tx = await productFactory.proxy
        .connect(ivan)
        .deploy(keccak256_erc20, weth.address, dai.initializeData, [], [], {
          value: toWei('2').toString(),
        });
      await tx.wait();

      expect(await newToken.owner()).to.be.equal(ivan.address);
      expect(await newToken.name()).to.be.equal('DAI');
      expect(await newToken.symbol()).to.be.equal('DAI');
      expect((await newToken.decimals()).toString()).to.be.equal('18');
      expect((await newToken.balanceOf(owner.address)).toString()).to.be.equal(toWei('1000').toString());
    });
    it('should correctly change storage', async () => {
      await productFactory.proxy
        .connect(ivan)
        .deploy(keccak256_erc20, pointToken.proxy.address, dai.initializeData, [], []);

      let product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal(toWei('80').toString());
      expect(product.salesCount).to.be.equal(1);

      await productFactory.proxy
        .connect(ivan)
        .deploy(keccak256_erc20, pointToken.proxy.address, dai.initializeData, [], []);

      product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal(toWei('64').toString());
      expect(product.salesCount).to.be.equal(2);

      await productFactory.proxy
        .connect(ivan)
        .deploy(keccak256_erc20, pointToken.proxy.address, dai.initializeData, [], []);

      product = await productFactory.proxy.products(keccak256_erc20);
      expect(product.currentPrice).to.be.equal(toWei('60').toString());
      expect(product.salesCount).to.be.equal(3);
    });
    it('should revert if product inactive', async () => {
      await productFactory.proxy.setStatus(keccak256_erc20, false);

      await expect(
        productFactory.proxy.deploy(keccak256_erc20, pointToken.proxy.address, dai.initializeData, [], [])
      ).to.be.revertedWith('PF: inactive product');
    });
  });
});

// npx hardhat coverage --testfiles "test/factory/ProductFactory.test.js"
