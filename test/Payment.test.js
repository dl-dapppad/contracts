const { expect } = require('chai');
const { toWei, zeroAddress, toBN } = require('../helpers/bn');
const { AccessControlDeployer, ERC20Deployer, PaymentDeployer, CashbackDeployer } = require('../helpers/deployers');

describe('Payment', async () => {
  let payment, cashback, dai, upo;
  let owner, ivan, treasury, factory;

  beforeEach('setup', async () => {
    [owner, ivan, treasury, factory] = await ethers.getSigners();

    pointToken = await new ERC20Deployer().deployProxy(['PT', 'PT', toWei('1000', 6).toString(), owner.address, '6']);
    usdc = await new ERC20Deployer().deployProxy(['USD Coin', 'USDC', toWei('1000').toString(), owner.address, '6']);
    dai = await new ERC20Deployer().deployProxy(['DAI', 'DAI', toWei('1000').toString(), owner.address, '18']);

    accessControl = await new AccessControlDeployer().deploy();
    payment = await new PaymentDeployer().deployProxy([accessControl.implementation.address]);
    cashback = await new CashbackDeployer().deployProxy([accessControl.implementation.address]);

    // Setup roles
    const PAYMENT_CONTRACT_ROLE = await cashback.proxy.PAYMENT_CONTRACT_ROLE();
    const PAYMENT_ROLE = await payment.proxy.PAYMENT_ROLE();
    const FACTORY_CONTRACT_ROLE = await payment.proxy.FACTORY_CONTRACT_ROLE();
    await accessControl.implementation.grantRole(PAYMENT_CONTRACT_ROLE, payment.proxy.address);
    await accessControl.implementation.grantRole(PAYMENT_ROLE, owner.address);
    await accessControl.implementation.grantRole(FACTORY_CONTRACT_ROLE, factory.address);
    // End

    const UniswapPriceOracleMock = await ethers.getContractFactory('UniswapPriceOracleMock');
    upo = await UniswapPriceOracleMock.deploy();
  });

  describe('Payment_init()', async () => {
    it('should initialize', async () => {
      expect(await payment.proxy.accessControl()).to.be.equal(accessControl.implementation.address);
    });
    it('should revert on second initialize', async () => {
      await expect(payment.proxy.Payment_init(owner.address)).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('supportsInterface()', async () => {
    it('should support IPayment interface', async () => {
      expect(await payment.proxy.supportsInterface('0xa2d5d611')).to.be.equal(true);
    });
    it('should support IERC165Upgradeable interface', async () => {
      expect(await payment.proxy.supportsInterface('0x01ffc9a7')).to.be.equal(true);
    });
  });

  describe('setup()', async () => {
    it('should setup contract', async () => {
      await payment.proxy.setup(pointToken.proxy.address, cashback.proxy.address, treasury.address, upo.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(
        payment.proxy
          .connect(ivan)
          .setup(pointToken.proxy.address, cashback.proxy.address, treasury.address, upo.address)
      ).to.be.revertedWith('UUPSAC: forbidden');
    });
  });

  describe('setPointToken()', async () => {
    it('should correctly set point token', async () => {
      await payment.proxy.setPointToken(pointToken.proxy.address);

      expect(await payment.proxy.pointToken()).to.be.equal(pointToken.proxy.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setPointToken(pointToken.proxy.address)).to.be.revertedWith(
        'UUPSAC: forbidden'
      );
    });
  });

  describe('setCashback()', async () => {
    it('should correctly set cashback', async () => {
      await payment.proxy.setCashback(cashback.proxy.address);

      expect(await payment.proxy.cashback()).to.be.equal(cashback.proxy.address);
    });
    it('should rewert if try to update to not a Cashback contract', async () => {
      await expect(payment.proxy.setCashback(payment.proxy.address)).to.be.revertedWith(
        'Payment: not Cashback contract'
      );
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setCashback(cashback.proxy.address)).to.be.revertedWith(
        'UUPSAC: forbidden'
      );
    });
  });

  describe('setTreasury()', async () => {
    it('should correctly set treasury', async () => {
      await payment.proxy.setTreasury(treasury.address);

      expect(await payment.proxy.treasury()).to.be.equal(treasury.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setTreasury(treasury.address)).to.be.revertedWith('UUPSAC: forbidden');
    });
  });

  describe('setPaymentTokens()', async () => {
    let swapInfo;

    beforeEach(() => {
      swapInfo = {
        poolFee: '3000',
        secondsAgo: '600',
      };
    });
    it('should correctly set payment tokens', async () => {
      await payment.proxy.setPaymentTokens([swapInfo, swapInfo], [dai.proxy.address, usdc.proxy.address], [true, true]);

      let token = await payment.proxy.getPaymentToken(0);
      expect(token).to.be.equal(dai.proxy.address);

      token = await payment.proxy.getPaymentToken(1);
      expect(token).to.be.equal(usdc.proxy.address);

      let paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(dai.proxy.address);
      expect(paymentTokenSwapInfo.poolFee).to.be.equal(3000);
      expect(paymentTokenSwapInfo.secondsAgo).to.be.equal(600);

      paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(usdc.proxy.address);
      expect(paymentTokenSwapInfo.poolFee).to.be.equal(3000);
      expect(paymentTokenSwapInfo.secondsAgo).to.be.equal(600);
    });
    it('should reset payment tokens', async () => {
      await payment.proxy.setPaymentTokens([swapInfo, swapInfo], [dai.proxy.address, usdc.proxy.address], [true, true]);

      swapInfo.poolFee = '4000';
      swapInfo.secondsAgo = '2000';
      await payment.proxy.setPaymentTokens([swapInfo], [dai.proxy.address], [true]);

      let paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(dai.proxy.address);
      expect(paymentTokenSwapInfo.poolFee).to.be.equal(4000);
      expect(paymentTokenSwapInfo.secondsAgo).to.be.equal(2000);

      paymentTokenSwapInfo = await payment.proxy.paymentTokenSwapInfo(usdc.proxy.address);
      expect(paymentTokenSwapInfo.poolFee).to.be.equal(3000);
      expect(paymentTokenSwapInfo.secondsAgo).to.be.equal(600);
    });
    it('should remove payment tokens', async () => {
      await payment.proxy.setPaymentTokens([swapInfo, swapInfo], [dai.proxy.address, usdc.proxy.address], [true, true]);
      await payment.proxy.setPaymentTokens([], [dai.proxy.address], [false]);

      const token = await payment.proxy.getPaymentToken(0);
      expect(token).to.be.equal(usdc.proxy.address);

      await expect(payment.proxy.getPaymentToken(1)).to.be.revertedWith('panic');
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setPaymentTokens([], [], [])).to.be.revertedWith('UUPSAC: forbidden');
    });
  });

  describe('setUniPriceOracle()', async () => {
    it('should set uniswap price oracle', async () => {
      await payment.proxy.setUniPriceOracle(upo.address);

      expect(await payment.proxy.uniPriceOracle()).to.be.equal(upo.address);
    });
    it('should revert if invalid caller', async () => {
      await expect(payment.proxy.connect(ivan).setUniPriceOracle(upo.address)).to.be.revertedWith('UUPSAC: forbidden');
    });
  });

  describe('getSwapAmount()', async () => {
    beforeEach(async () => {
      await payment.proxy.setUniPriceOracle(upo.address);
    });
    it('should return mocked swap amount', async () => {
      const amount = await payment.proxy.getSwapAmount(
        dai.proxy.address,
        pointToken.proxy.address,
        toWei('1000', 6).toString()
      );

      expect(amount).to.be.equal(toWei('2000').toString());
    });
    it('should revert if invalid swap amount', async () => {
      await expect(
        payment.proxy.getSwapAmount(
          pointToken.proxy.address,
          dai.proxy.address,
          '340282366920938463463374607431768211456'
        )
      ).to.be.revertedWith('Payment: discount amount too big');
    });
  });

  describe('pay()', async () => {
    const product = '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b';
    const ivanPointBalance = toWei('500', 6).toString();
    const ivanDaiBalance = toWei('500').toString();
    const ivanUsdcBalance = toWei('500', 6).toString();

    beforeEach(async () => {
      swapInfo = {
        poolFee: '3000',
        secondsAgo: '600',
      };

      await payment.proxy.setup(pointToken.proxy.address, cashback.proxy.address, treasury.address, upo.address);
      await payment.proxy.setPaymentTokens(
        [swapInfo, swapInfo, swapInfo],
        [pointToken.proxy.address, dai.proxy.address, usdc.proxy.address],
        [true, true, true]
      );

      await pointToken.proxy.transfer(ivan.address, ivanPointBalance);
      await pointToken.proxy.connect(ivan).approve(payment.proxy.address, ivanPointBalance);
      await dai.proxy.transfer(ivan.address, ivanDaiBalance);
      await dai.proxy.connect(ivan).approve(payment.proxy.address, ivanDaiBalance);
      await usdc.proxy.transfer(ivan.address, ivanUsdcBalance);
      await usdc.proxy.connect(ivan).approve(payment.proxy.address, ivanUsdcBalance);
    });
    it('should correctly pay, `pointToken`, without discount', async () => {
      const priceAmount = toWei('100').toString();
      const cashbackAmount = toWei('10').toString();
      const priceInToken = toWei('100', 6).toString();

      await payment.proxy
        .connect(factory)
        .pay(product, pointToken.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);

      const ivanBalanceInToken = toBN(ivanPointBalance).minus(priceInToken).toString();

      expect(await pointToken.proxy.balanceOf(ivan.address)).to.be.equal(ivanBalanceInToken);
      expect(await pointToken.proxy.balanceOf(treasury.address)).to.be.equal(priceInToken);

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(cashbackAmount);
      expect(await currentCashback).to.be.equal(0);
    });
    it('should correctly pay, `pointToken`, with partial discount', async () => {
      const priceAmount = toWei('100').toString();
      const cashbackAmount = toWei('10').toString();

      await payment.proxy
        .connect(factory)
        .pay(product, pointToken.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);
      await payment.proxy
        .connect(factory)
        .pay(product, pointToken.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);

      let accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      let currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(accountCahsback.points).to.be.equal(toWei('20').toString());
      expect(currentCashback).to.be.equal(toWei('10').toString());

      await payment.proxy
        .connect(factory)
        .pay(
          product,
          pointToken.proxy.address,
          ivan.address,
          priceAmount,
          cashbackAmount,
          [product],
          [toWei('10').toString()]
        );

      accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(accountCahsback.points).to.be.equal(toWei('29').toString());
      expect(currentCashback).to.be.equal(toWei('9').toString());

      await payment.proxy
        .connect(factory)
        .pay(
          product,
          pointToken.proxy.address,
          ivan.address,
          priceAmount,
          cashbackAmount,
          [product],
          [toWei('5').toString()]
        );

      expect(await pointToken.proxy.balanceOf(ivan.address)).to.be.equal(toWei('115', 6).toString());
      expect(await pointToken.proxy.balanceOf(treasury.address)).to.be.equal(toWei('385', 6).toString());

      accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(accountCahsback.points).to.be.equal(toWei('38.5').toString());
      expect(currentCashback).to.be.closeTo(toWei('13.5').toString(), '1');
    });
    it('should correctly pay, `pointToken`, with full discount', async () => {
      const priceAmount = toWei('100').toString();
      const cashbackAmount = toWei('50').toString();

      await payment.proxy
        .connect(factory)
        .pay(product, pointToken.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);
      await payment.proxy
        .connect(factory)
        .pay(product, pointToken.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);
      await payment.proxy
        .connect(factory)
        .pay(product, pointToken.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);
      await payment.proxy
        .connect(factory)
        .pay(
          product,
          pointToken.proxy.address,
          ivan.address,
          priceAmount,
          cashbackAmount,
          [product],
          [toWei('100').toString()]
        );

      expect(await pointToken.proxy.balanceOf(ivan.address)).to.be.equal(toWei('200', 6).toString());
      expect(await pointToken.proxy.balanceOf(treasury.address)).to.be.equal(toWei('300', 6).toString());

      accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(accountCahsback.points).to.be.equal(toWei('150').toString());
      expect(currentCashback).to.be.equal(toWei('0').toString());
    });
    it('should correctly pay, `usdc`, without discount', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, usdc.proxy.address, ivan.address, toWei('100').toString(), toWei('10').toString(), [], []);

      expect(await usdc.proxy.balanceOf(ivan.address)).to.be.equal(toWei('300', 6).toString());
      expect(await usdc.proxy.balanceOf(treasury.address)).to.be.equal(toWei('200', 6).toString());

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(toWei('10').toString());
      expect(await currentCashback).to.be.equal(0);
    });
    it('should correctly pay, `usdc`, with discount', async () => {
      const priceAmount = toWei('50').toString();
      const cashbackAmount = toWei('10').toString();

      await payment.proxy
        .connect(factory)
        .pay(product, usdc.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);
      await payment.proxy
        .connect(factory)
        .pay(product, usdc.proxy.address, ivan.address, priceAmount, cashbackAmount, [], []);
      await payment.proxy
        .connect(factory)
        .pay(
          product,
          usdc.proxy.address,
          ivan.address,
          priceAmount,
          cashbackAmount,
          [product],
          [toWei('10').toString()]
        );

      expect(await usdc.proxy.balanceOf(ivan.address)).to.be.equal(toWei('220', 6).toString());
      expect(await usdc.proxy.balanceOf(treasury.address)).to.be.equal(toWei('280', 6).toString());

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(toWei('28').toString());
      expect(await currentCashback).to.be.equal(toWei('8').toString());
    });
    it('should correctly pay, `usdc`, no price', async () => {
      await payment.proxy.connect(factory).pay(product, usdc.proxy.address, ivan.address, 0, 0, [], []);

      expect(await usdc.proxy.balanceOf(ivan.address)).to.be.equal(toWei('500', 6).toString());
      expect(await usdc.proxy.balanceOf(treasury.address)).to.be.equal(toWei('0', 6).toString());
    });
    it('should correctly pay, `usdc`, without cashback', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, usdc.proxy.address, ivan.address, toWei('100').toString(), 0, [], []);

      expect(await usdc.proxy.balanceOf(ivan.address)).to.be.equal(toWei('300', 6).toString());
      expect(await usdc.proxy.balanceOf(treasury.address)).to.be.equal(toWei('200', 6).toString());

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(0);
      expect(await currentCashback).to.be.equal(0);
    });
    it('should rewert if invalid sender', async () => {
      await expect(
        payment.proxy.connect(ivan).pay(product, usdc.proxy.address, ivan.address, '1', '1', [], [])
      ).to.be.revertedWith('UUPSAC: forbidden');
    });
    it("should rewert if treasury isn't set", async () => {
      await payment.proxy.setTreasury(zeroAddress);

      await expect(
        payment.proxy.connect(factory).pay(product, usdc.proxy.address, ivan.address, '1', '1', [], [])
      ).to.be.revertedWith("Payment: treasury isn't set");
    });
    it('should rewert if invalid token on treasury transfer', async () => {
      await expect(
        payment.proxy.connect(factory).pay(product, owner.address, ivan.address, '1', '1', [], [])
      ).to.be.revertedWith('Payment: invalid token');
    });
    it('should rewert if invalid amounts', async () => {
      await expect(
        payment.proxy
          .connect(factory)
          .pay(product, usdc.proxy.address, ivan.address, toWei('10').toString(), toWei('11').toString(), [], [])
      ).to.be.revertedWith('Payment: invalid amounts');
    });
  });

  describe('payNative()', async () => {
    let weth;
    const product = '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b';

    beforeEach(async () => {
      swapInfo = {
        poolFee: '3000',
        secondsAgo: '600',
      };
      const WETH9Mock = await ethers.getContractFactory('WETH9Mock');
      weth = await WETH9Mock.deploy();

      await payment.proxy.setup(weth.address, cashback.proxy.address, treasury.address, upo.address);
      await payment.proxy.setPaymentTokens([swapInfo], [weth.address], [true]);
    });
    it('should correctly pay, `weth`', async () => {
      await payment.proxy
        .connect(factory)
        .payNative(product, weth.address, ivan.address, toWei('2').toString(), toWei('1').toString(), [], [], {
          value: toWei('2').toString(),
        });

      await payment.proxy
        .connect(factory)
        .payNative(product, weth.address, ivan.address, toWei('2').toString(), toWei('1').toString(), [], [], {
          value: toWei('3').toString(),
        });
    });
    it('should revert on invalid payer', async () => {
      await expect(
        payment.proxy
          .connect(factory)
          .payNative(product, weth.address, upo.address, toWei('2').toString(), toWei('1').toString(), [], [], {
            value: toWei('3').toString(),
          })
      ).to.be.revertedWith('Payment: failed to send');
    });
  });

  describe('receive()', async () => {
    it('should revert when invalid sender', async () => {
      await expect(
        owner.sendTransaction({
          to: payment.proxy.address,
          value: 10000,
        })
      ).to.be.revertedWith('Payment: native transfer forbidden');
    });
  });
});

// npx hardhat coverage --testfiles "test/Payment.test.js"
