const { expect } = require('chai');
const { toWei, zeroAddress, maxUint256, toBN } = require('../helpers/bn');
const { FarmingDeployer, ERC20Deployer, PaymentDeployer, UniswapPriceOracleDeployer } = require('../helpers/deployers');

describe('Payment', async () => {
  let payment, usdt, dai, farming, dapp, upo;
  let owner, ivan, treasury, factory, router, router2;

  beforeEach('setup', async () => {
    [owner, ivan, treasury, factory, router, router2] = await ethers.getSigners();

    payment = await new PaymentDeployer().deployProxy();
    usdt = await new ERC20Deployer().deployProxy([
      'Tether USD',
      'USDT',
      toWei('10000', 6).toString(),
      owner.address,
      '6',
    ]);
    dai = await new ERC20Deployer().deployProxy([
      'Dai Stablecoin',
      'DAI',
      toWei('10000').toString(),
      owner.address,
      '18',
    ]);

    const Token = await ethers.getContractFactory('Token');
    dapp = await Token.deploy('N', 'S');

    const minterRole = await dapp.MINTER_ROLE();
    await dapp.grantRole(minterRole, payment.proxy.address);
    await dapp.grantRole(minterRole, owner.address);
    await dapp.mint(owner.address, toWei('1').toString());
    await dapp.revokeRole(minterRole, owner.address);

    farming = await new FarmingDeployer().deployProxy();
    await farming.proxy.setTokens(dapp.address, usdt.proxy.address);

    upo = await new UniswapPriceOracleDeployer().deploy();
  });

  describe('Payment_init()', async () => {
    it('should initialize', async () => {
      const adminRole = await payment.proxy.DEFAULT_ADMIN_ROLE();

      expect(await payment.proxy.hasRole(adminRole, owner.address)).to.be.equal(true);
    });
    it('should revert on second initialize', async () => {
      await expect(payment.proxy.Payment_init()).to.be.revertedWith('Initializable: contract is already initialized');
    });
  });

  describe('setup()', async () => {
    it('should setup contract', async () => {
      await payment.proxy.setup(dapp.address, farming.proxy.address, treasury.address, upo.implementation.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(
        payment.proxy
          .connect(ivan)
          .setup(dapp.address, farming.proxy.address, treasury.address, upo.implementation.address)
      ).to.be.revertedWith('AccessControl');
    });
  });

  describe('setMintToken()', async () => {
    it('should set reward token', async () => {
      await payment.proxy.setMintToken(dapp.address);

      expect(await payment.proxy.mintToken()).to.be.equal(dapp.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setMintToken(dapp.address)).to.be.revertedWith('AccessControl');
    });
  });

  describe('setFarming()', async () => {
    it('should set farming from 0', async () => {
      await payment.proxy.setFarming(farming.proxy.address);

      const paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(usdt.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(farming.proxy.address);
      expect(paymentTokenSwapInfo.sqrtPriceLimitX96).to.be.equal(0);
      expect(paymentTokenSwapInfo.fee).to.be.equal(0);
      expect(paymentTokenSwapInfo.multiplier).to.be.equal(0);

      expect(await payment.proxy.farming()).to.be.equal(farming.proxy.address);
      expect(await usdt.proxy.allowance(payment.proxy.address, farming.proxy.address)).to.be.equal(maxUint256);
    });
    it('should resset farming (1)', async () => {
      await payment.proxy.setFarming(farming.proxy.address);

      const farmingNew = await new FarmingDeployer().deployProxy();
      await farmingNew.proxy.setTokens(dapp.address, usdt.proxy.address);

      await payment.proxy.setFarming(farmingNew.proxy.address);

      const paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(usdt.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(farmingNew.proxy.address);
      expect(paymentTokenSwapInfo.sqrtPriceLimitX96).to.be.equal(0);
      expect(paymentTokenSwapInfo.fee).to.be.equal(0);
      expect(paymentTokenSwapInfo.multiplier).to.be.equal(0);

      expect(await payment.proxy.farming()).to.be.equal(farmingNew.proxy.address);
      expect(await usdt.proxy.allowance(payment.proxy.address, farmingNew.proxy.address)).to.be.equal(maxUint256);
    });
    it('should resset farming (2)', async () => {
      await payment.proxy.setFarming(farming.proxy.address);

      const farmingNew = await new FarmingDeployer().deployProxy();
      await farmingNew.proxy.setTokens(dapp.address, dai.proxy.address);

      await payment.proxy.setFarming(farmingNew.proxy.address);

      let paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(usdt.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(zeroAddress);

      paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(dai.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(farmingNew.proxy.address);

      expect(await payment.proxy.farming()).to.be.equal(farmingNew.proxy.address);
      expect(await usdt.proxy.allowance(payment.proxy.address, farming.proxy.address)).to.be.equal('0');
      expect(await dai.proxy.allowance(payment.proxy.address, farmingNew.proxy.address)).to.be.equal(maxUint256);
    });
    it("should rewert if farminig token isn't set", async () => {
      const farmingNew = await new FarmingDeployer().deployProxy();
      await farmingNew.proxy.setTokens(zeroAddress, zeroAddress);
      await expect(payment.proxy.setFarming(farmingNew.proxy.address)).to.be.revertedWith(
        "Payment: farminig token isn't set"
      );
    });
    it('should rewert if invalid new farming', async () => {
      await expect(payment.proxy.setFarming(dapp.address)).to.be.revertedWith('Payment: invalid new farming');
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setFarming(dapp.address)).to.be.revertedWith('AccessControl');
    });
  });

  describe('setTreasury()', async () => {
    it('should set treasury', async () => {
      await payment.proxy.setTreasury(treasury.address);

      expect(await payment.proxy.treasury()).to.be.equal(treasury.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setTreasury(treasury.address)).to.be.revertedWith('AccessControl');
    });
  });

  describe('setPaymentTokens()', async () => {
    let swapInfo;

    beforeEach(() => {
      swapInfo = {
        router: router.address,
        sqrtPriceLimitX96: '1',
        fee: '3000',
        multiplier: '1000',
      };
    });
    it('should set payment tokens', async () => {
      await payment.proxy.setPaymentTokens([dai.proxy.address], [swapInfo], [true]);

      let tokens = await payment.proxy.getPaymentTokens();
      expect(tokens[0]).to.be.equal(dai.proxy.address);
      expect(tokens.length).to.be.equal(1);

      let paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(dai.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(router.address);
      expect(paymentTokenSwapInfo.sqrtPriceLimitX96).to.be.equal(1);
      expect(paymentTokenSwapInfo.fee).to.be.equal(3000);
      expect(paymentTokenSwapInfo.multiplier).to.be.equal(1000);

      expect(await dai.proxy.allowance(payment.proxy.address, router.address)).to.be.equal(maxUint256);
    });
    it('should reset payment tokens (1)', async () => {
      await payment.proxy.setPaymentTokens([dai.proxy.address], [swapInfo], [true]);

      swapInfo.router = router2.address;
      swapInfo.sqrtPriceLimitX96 = '2';
      swapInfo.fee = '4000';
      swapInfo.multiplier = '2000';
      await payment.proxy.setPaymentTokens([dai.proxy.address], [swapInfo], [true]);

      let tokens = await payment.proxy.getPaymentTokens();
      expect(tokens[0]).to.be.equal(dai.proxy.address);
      expect(tokens.length).to.be.equal(1);

      let paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(dai.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(router2.address);
      expect(paymentTokenSwapInfo.sqrtPriceLimitX96).to.be.equal(2);
      expect(paymentTokenSwapInfo.fee).to.be.equal(4000);
      expect(paymentTokenSwapInfo.multiplier).to.be.equal(2000);

      expect(await dai.proxy.allowance(payment.proxy.address, router.address)).to.be.equal('0');
      expect(await dai.proxy.allowance(payment.proxy.address, router2.address)).to.be.equal(maxUint256);
    });
    it('should reset payment tokens (2)', async () => {
      await payment.proxy.setPaymentTokens([dai.proxy.address], [swapInfo], [true]);

      swapInfo.sqrtPriceLimitX96 = '2';
      swapInfo.fee = '4000';
      swapInfo.multiplier = '2000';
      await payment.proxy.setPaymentTokens([dai.proxy.address], [swapInfo], [true]);

      let tokens = await payment.proxy.getPaymentTokens();
      expect(tokens[0]).to.be.equal(dai.proxy.address);
      expect(tokens.length).to.be.equal(1);

      let paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(dai.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(router.address);
      expect(paymentTokenSwapInfo.sqrtPriceLimitX96).to.be.equal(2);
      expect(paymentTokenSwapInfo.fee).to.be.equal(4000);
      expect(paymentTokenSwapInfo.multiplier).to.be.equal(2000);

      expect(await dai.proxy.allowance(payment.proxy.address, router.address)).to.be.equal(maxUint256);
    });
    it('should remove payment tokens', async () => {
      await payment.proxy.setPaymentTokens([dai.proxy.address], [], [false]);

      let tokens = await payment.proxy.getPaymentTokens();
      expect(tokens.length).to.be.equal(0);

      await payment.proxy.setPaymentTokens([dai.proxy.address], [swapInfo], [true]);
      await payment.proxy.setPaymentTokens([dai.proxy.address], [], [false]);

      tokens = await payment.proxy.getPaymentTokens();
      expect(tokens.length).to.be.equal(0);

      let paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(dai.proxy.address);
      expect(paymentTokenSwapInfo.router).to.be.equal(zeroAddress);
      expect(paymentTokenSwapInfo.sqrtPriceLimitX96).to.be.equal(0);
      expect(paymentTokenSwapInfo.fee).to.be.equal(0);
      expect(paymentTokenSwapInfo.multiplier).to.be.equal(0);

      expect(await dai.proxy.allowance(payment.proxy.address, router.address)).to.be.equal('0');
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setPaymentTokens([], [], [])).to.be.revertedWith('AccessControl');
    });
  });

  describe('setUniPriceOracle()', async () => {
    it('should set uniswap price oracle', async () => {
      await payment.proxy.setUniPriceOracle(upo.implementation.address);
      expect(await payment.proxy.uniPriceOracle()).to.be.equal(upo.implementation.address);

      await payment.proxy.setUniPriceOracle(dapp.address);
      expect(await payment.proxy.uniPriceOracle()).to.be.equal(dapp.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setUniPriceOracle(upo.implementation.address)).to.be.revertedWith(
        'AccessControl'
      );
    });
  });

  describe('pay(), without swap, usdt', async () => {
    const ivanBalance = toWei('500', 6).toString();

    beforeEach(async () => {
      const factoryRole = await payment.proxy.FACTORY_ROLE();
      await payment.proxy.grantRole(factoryRole, factory.address);

      await payment.proxy.setup(dapp.address, farming.proxy.address, treasury.address, upo.implementation.address);

      await usdt.proxy.transfer(ivan.address, ivanBalance);
      await usdt.proxy.connect(ivan).approve(payment.proxy.address, ivanBalance);

      await dapp.approve(farming.proxy.address, toWei('1').toString());
      await farming.proxy.invest(toWei('1').toString());
    });

    it('should correctly pay, full transfer without exchange', async () => {
      const price = toWei('100').toString();
      const cashback = toWei('10').toString();

      const priceInToken = toWei('100', 6).toString();
      const cashbackInToken = toWei('10', 6).toString();

      await payment.proxy.connect(factory).pay(usdt.proxy.address, ivan.address, price, cashback);

      const ivanBaslanceInToken = toBN(ivanBalance).minus(priceInToken).toString();
      const treasuryBalanceInToken = toBN(priceInToken).minus(cashbackInToken).toString();

      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(ivanBaslanceInToken);
      expect(await usdt.proxy.balanceOf(farming.proxy.address)).to.be.equal(cashbackInToken);
      expect(await usdt.proxy.balanceOf(treasury.address)).to.be.equal(treasuryBalanceInToken);

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(cashback);
    });
    it('should correctly pay, price transfer without exchange and cashback', async () => {
      const price = toWei('100').toString();
      const cashback = toWei('0').toString();

      const priceInToken = toWei('100', 6).toString();
      const cashbackInToken = toWei('0', 6).toString();

      await payment.proxy.connect(factory).pay(usdt.proxy.address, ivan.address, price, cashback);

      const ivanBaslanceInToken = toBN(ivanBalance).minus(priceInToken).toString();
      const treasuryBalanceInToken = toBN(priceInToken).minus(cashbackInToken).toString();

      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(ivanBaslanceInToken);
      expect(await usdt.proxy.balanceOf(farming.proxy.address)).to.be.equal(cashbackInToken);
      expect(await usdt.proxy.balanceOf(treasury.address)).to.be.equal(treasuryBalanceInToken);

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(cashback);
    });
    it('should correctly pay, cashback transfer without exchange and treasury', async () => {
      const price = toWei('100').toString();
      const cashback = toWei('100').toString();

      const priceInToken = toWei('100', 6).toString();
      const cashbackInToken = toWei('100', 6).toString();

      await payment.proxy.connect(factory).pay(usdt.proxy.address, ivan.address, price, cashback);

      const ivanBaslanceInToken = toBN(ivanBalance).minus(priceInToken).toString();
      const treasuryBalanceInToken = toBN(priceInToken).minus(cashbackInToken).toString();

      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(ivanBaslanceInToken);
      expect(await usdt.proxy.balanceOf(farming.proxy.address)).to.be.equal(cashbackInToken);
      expect(await usdt.proxy.balanceOf(treasury.address)).to.be.equal(treasuryBalanceInToken);

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(cashback);
    });
    it('should correctly pay, no transfers', async () => {
      const price = toWei('0').toString();
      const cashback = toWei('0').toString();

      const priceInToken = toWei('0', 6).toString();
      const cashbackInToken = toWei('0', 6).toString();

      await payment.proxy.connect(factory).pay(usdt.proxy.address, ivan.address, price, cashback);

      const ivanBaslanceInToken = toBN(ivanBalance).minus(priceInToken).toString();
      const treasuryBalanceInToken = toBN(priceInToken).minus(cashbackInToken).toString();

      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(ivanBaslanceInToken);
      expect(await usdt.proxy.balanceOf(farming.proxy.address)).to.be.equal(cashbackInToken);
      expect(await usdt.proxy.balanceOf(treasury.address)).to.be.equal(treasuryBalanceInToken);

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(cashback);
    });
    it('should rewert if invalid sender', async () => {
      await expect(payment.proxy.connect(ivan).pay(usdt.proxy.address, ivan.address, '0', '0')).to.be.revertedWith(
        'AccessControl'
      );
    });
    it("should rewert if treasury isn't set", async () => {
      await payment.proxy.setTreasury(zeroAddress);

      await expect(
        payment.proxy.connect(factory).pay(usdt.proxy.address, ivan.address, toWei('1').toString(), '0')
      ).to.be.revertedWith("Payment: treasury isn't set");
    });
    it('should rewert if invalid token on treasury transfer', async () => {
      await expect(payment.proxy.connect(factory).pay(dapp.address, ivan.address, '1', '0')).to.be.revertedWith(
        'Payment: invalid token (1)'
      );
    });
    it('should rewert if invalid token on cashback transfer', async () => {
      await expect(payment.proxy.connect(factory).pay(dapp.address, ivan.address, '1', '1')).to.be.revertedWith(
        'Payment: invalid token (2)'
      );
    });
    it('should rewert if invalid amounts', async () => {
      await expect(
        payment.proxy.connect(factory).pay(usdt.proxy.address, ivan.address, toWei(1).toString(), toWei(2).toString())
      ).to.be.revertedWith('Payment: invalid amounts');
    });
  });

  describe('pay(), without swap, dai', async () => {
    let farmingDai;
    const ivanBalance = toWei('500').toString();

    beforeEach(async () => {
      const factoryRole = await payment.proxy.FACTORY_ROLE();
      await payment.proxy.grantRole(factoryRole, factory.address);

      farmingDai = await new FarmingDeployer().deployProxy();
      await farmingDai.proxy.setTokens(dapp.address, dai.proxy.address);

      await payment.proxy.setup(dapp.address, farmingDai.proxy.address, treasury.address, upo.implementation.address);

      await dai.proxy.transfer(ivan.address, ivanBalance);
      await dai.proxy.connect(ivan).approve(payment.proxy.address, ivanBalance);

      await dapp.approve(farmingDai.proxy.address, toWei('1').toString());
      await farmingDai.proxy.invest(toWei('1').toString());
    });
    it('should correctly pay, full transfer without exchange', async () => {
      const price = toWei('100').toString();
      const cashback = toWei('10').toString();

      const priceInToken = toWei('100').toString();
      const cashbackInToken = toWei('10').toString();

      await payment.proxy.connect(factory).pay(dai.proxy.address, ivan.address, price, cashback);

      const ivanBaslanceInToken = toBN(ivanBalance).minus(priceInToken).toString();
      const treasuryBalanceInToken = toBN(priceInToken).minus(cashbackInToken).toString();

      expect(await dai.proxy.balanceOf(ivan.address)).to.be.equal(ivanBaslanceInToken);
      expect(await dai.proxy.balanceOf(farmingDai.proxy.address)).to.be.equal(cashbackInToken);
      expect(await dai.proxy.balanceOf(treasury.address)).to.be.equal(treasuryBalanceInToken);

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(cashback);
    });
  });

  describe('pay(), with swap, dai', async () => {
    let farmingRT;
    let rewardToken;
    let swapRouterMock;
    const ivanBalance = toWei('500').toString();

    beforeEach(async () => {
      const factoryRole = await payment.proxy.FACTORY_ROLE();
      await payment.proxy.grantRole(factoryRole, factory.address);

      rewardToken = await new ERC20Deployer().deployProxy([
        'AAA',
        'AAA',
        toWei('10000').toString(),
        owner.address,
        '18',
      ]);

      farmingRT = await new FarmingDeployer().deployProxy();
      await farmingRT.proxy.setTokens(dapp.address, rewardToken.proxy.address);

      await payment.proxy.setup(dapp.address, farmingRT.proxy.address, treasury.address, upo.implementation.address);

      // Start setup swap info
      const UniswapV3FactoryMock = await ethers.getContractFactory('UniswapV3FactoryMock');
      const uniswapV3FactoryMock = await UniswapV3FactoryMock.deploy();
      const UniswapV3PoolMock = await ethers.getContractFactory('UniswapV3PoolMock');
      const uniswapV3PoolMock = await UniswapV3PoolMock.deploy([20, 10], [20, 10]);

      await uniswapV3FactoryMock.setPool(uniswapV3PoolMock.address);
      await upo.implementation.setSwapConfig(uniswapV3FactoryMock.address, 10);

      const SwapRouterMock = await ethers.getContractFactory('SwapRouterMock');
      swapRouterMock = await SwapRouterMock.deploy();

      swapInfo = {
        router: swapRouterMock.address,
        sqrtPriceLimitX96: '1',
        fee: '0',
        multiplier: '0',
      };
      await payment.proxy.setPaymentTokens([dai.proxy.address], [swapInfo], [true]);
      // End

      await rewardToken.proxy.transfer(swapRouterMock.address, toWei('9000').toString());
      await dai.proxy.transfer(ivan.address, ivanBalance);
      await dai.proxy.connect(ivan).approve(payment.proxy.address, ivanBalance);

      await dapp.approve(farmingRT.proxy.address, toWei('1').toString());
      await farmingRT.proxy.invest(toWei('1').toString());
    });

    it('should correctly pay, full transfer without exchange', async () => {
      const price = toWei('100').toString();
      const cashback = toWei('10').toString();

      const priceInToken = toWei('100').toString();
      const cashbackInToken = toWei('10').toString();

      await swapRouterMock.setRemainder('100');
      await payment.proxy.connect(factory).pay(dai.proxy.address, ivan.address, price, cashback);

      const cashbackAfterExchange = await payment.proxy.getInSwapAmount(dai.proxy.address, cashback);

      const ivanBaslanceInToken = toBN(ivanBalance)
        .minus(toWei('90').toString())
        .minus(cashbackAfterExchange.toString())
        .plus('100')
        .toString();
      const treasuryBalanceInToken = toBN(priceInToken).minus(cashbackInToken).toString();

      expect(await dai.proxy.balanceOf(ivan.address)).to.be.equal(ivanBaslanceInToken);
      expect(await rewardToken.proxy.balanceOf(farmingRT.proxy.address)).to.be.equal(cashbackInToken);
      expect(await dai.proxy.balanceOf(treasury.address)).to.be.equal(treasuryBalanceInToken);

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(cashback);
    });
    it('should correctly pay, full transfer without exchange, without remainder', async () => {
      const price = toWei('100').toString();
      const cashback = toWei('10').toString();

      const priceInToken = toWei('100').toString();
      const cashbackInToken = toWei('10').toString();

      await payment.proxy.connect(factory).pay(dai.proxy.address, ivan.address, price, cashback);

      const cashbackAfterExchange = await payment.proxy.getInSwapAmount(dai.proxy.address, cashback);

      const ivanBaslanceInToken = toBN(ivanBalance)
        .minus(toWei('90').toString())
        .minus(cashbackAfterExchange.toString())
        .toString();
      const treasuryBalanceInToken = toBN(priceInToken).minus(cashbackInToken).toString();

      expect(await dai.proxy.balanceOf(ivan.address)).to.be.equal(ivanBaslanceInToken);
      expect(await rewardToken.proxy.balanceOf(farmingRT.proxy.address)).to.be.equal(cashbackInToken);
      expect(await dai.proxy.balanceOf(treasury.address)).to.be.equal(treasuryBalanceInToken);

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(cashback);
    });
  });

  describe('_authorizeUpgrade()', async () => {
    it('should upgrade contract', async () => {
      const newPayment = await new PaymentDeployer().deployProxy();

      await payment.proxy.upgradeTo(newPayment.implementation.address);
    });
  });
});

// npx hardhat coverage --testfiles "test/Payment.test.js"
