const { expect } = require('chai');
const { toWei, toBN, fromWei } = require('../helpers/bn');
const {
  AccessControlDeployer,
  PaymentDeployer,
  UniswapPriceOracleDeployer,
  CashbackDeployer,
} = require('../helpers/deployers');

const Reverter = require('../helpers/reverter');

describe('Payment, fork', async () => {
  const reverter = new Reverter();

  // ETH Mainnet addresses
  const UNI_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
  const UNI_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const UNI = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
  // End

  let swap, accessControl, payment, cashback, upo, weth, usdt, uni;
  let owner, ivan, treasury, factory;

  before('setup', async () => {
    reverter.snapshot();
  });

  beforeEach('setup', async () => {
    [owner, ivan, treasury, factory] = await ethers.getSigners();

    const SwapMock = await ethers.getContractFactory('SwapMock');
    const ERC20 = await ethers.getContractFactory('contracts/implementations/tokens/ERC20/ERC20.sol:ERC20');

    accessControl = await new AccessControlDeployer().deploy();
    payment = await new PaymentDeployer().deployProxy([accessControl.implementation.address]);
    cashback = await new CashbackDeployer().deployProxy([accessControl.implementation.address]);
    upo = await new UniswapPriceOracleDeployer().deploy();

    // Setup roles
    const PAYMENT_CONTRACT_ROLE = await cashback.proxy.PAYMENT_CONTRACT_ROLE();
    const PAYMENT_ROLE = await payment.proxy.PAYMENT_ROLE();
    const FACTORY_CONTRACT_ROLE = await payment.proxy.FACTORY_CONTRACT_ROLE();
    await accessControl.implementation.grantRole(PAYMENT_CONTRACT_ROLE, payment.proxy.address);
    await accessControl.implementation.grantRole(PAYMENT_ROLE, owner.address);
    await accessControl.implementation.grantRole(FACTORY_CONTRACT_ROLE, factory.address);
    // End

    // Deploy Swap contract and attach stable coins
    swap = await SwapMock.deploy(UNI_ROUTER, UNI_FACTORY, WETH);
    weth = ERC20.attach(WETH);
    usdt = ERC20.attach(USDT);
    uni = ERC20.attach(UNI);
    // END

    await upo.implementation.setFactory(UNI_FACTORY);
    await swap.swapWETH({ value: toWei('20').toString() });
  });

  afterEach('setup', async () => {
    reverter.revert();
  });

  describe('pay(), WETH and UNI as payment token, USDT as cashback token', async () => {
    const product = '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b';

    beforeEach(async () => {
      swapInfo = {
        poolFee: '3000',
        secondsAgo: '600',
      };

      await payment.proxy.setup(usdt.address, cashback.proxy.address, treasury.address, upo.implementation.address);
      await payment.proxy.setPaymentTokens([swapInfo, swapInfo], [weth.address, uni.address], [true, true]);

      // START swap
      await swap.swapExactOutputSingle(WETH, UNI, toWei('2000').toString(), toWei('15').toString(), 3000);
      // END

      // START add allowances
      await swap.transferWETH(ivan.address, toWei('10').toString());
      await weth.connect(ivan).approve(payment.proxy.address, toWei('10').toString());
      await uni.transfer(ivan.address, toWei('2000').toString());
      await uni.connect(ivan).approve(payment.proxy.address, toWei('2000').toString());
      // END
    });
    it('should have correct balances', async () => {
      expect(await weth.balanceOf(ivan.address)).to.be.equal(toWei('10').toString());
      expect(await uni.balanceOf(ivan.address)).to.be.equal(toWei('2000').toString());
    });
    it('should correctly pay with WETH, without discount', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, weth.address, ivan.address, toWei('500').toString(), toWei('500').toString(), [], []);

      const priceInfo = await payment.proxy.getPriceWithDiscount(
        weth.address,
        toWei('500').toString(),
        toWei('500').toString(),
        0
      );

      console.log(`           Product price:         500 USDT`);
      console.log(`           Cashback:              500 USDT`);
      console.log(`           -----`);
      console.log(`           Product price in WETH: ${fromWei(priceInfo[0].toString()).toString()} WETH`);
      console.log(`           Points earned:         ${fromWei(priceInfo[1].toString()).toString()} point`);

      expect(await weth.balanceOf(ivan.address)).to.be.equal(toWei('10').minus(priceInfo[0].toString()).toString());
      expect(await weth.balanceOf(treasury.address)).to.be.equal(priceInfo[0].toString());

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(toWei('500').toString());
      expect(await currentCashback).to.be.equal(0);
    });
    it('should correctly pay with UNI, without discount', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, uni.address, ivan.address, toWei('500').toString(), toWei('300').toString(), [], []);

      const priceInfo = await payment.proxy.getPriceWithDiscount(
        uni.address,
        toWei('500').toString(),
        toWei('300').toString(),
        0
      );

      console.log(`           Product price:        500 USDT`);
      console.log(`           Cashback:             300 USDT`);
      console.log(`           -----`);
      console.log(`           Product price in UNI: ${fromWei(priceInfo[0].toString()).toString()} UNI`);
      console.log(`           Points earned:        ${fromWei(priceInfo[1].toString()).toString()} point`);

      expect(await uni.balanceOf(ivan.address)).to.be.equal(toWei('2000').minus(priceInfo[0].toString()).toString());
      expect(await uni.balanceOf(treasury.address)).to.be.equal(priceInfo[0].toString());

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(toWei('300').toString());
      expect(await currentCashback).to.be.equal(0);
    });
    it('should correctly pay with WETH and UNI, with discount', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, weth.address, ivan.address, toWei('200').toString(), toWei('100').toString(), [], []);

      const priceInfo1 = await payment.proxy.getPriceWithDiscount(
        weth.address,
        toWei('200').toString(),
        toWei('100').toString(),
        0
      );

      console.log(`           Product price:         200 USDT`);
      console.log(`           Cashback:              100 USDT`);
      console.log(`           -----`);
      console.log(`           Product price in WETH: ${fromWei(priceInfo1[0].toString()).toString()} WETH`);
      console.log(`           Points earned:         ${fromWei(priceInfo1[1].toString()).toString()} point`);
      console.log('');
      console.log('');

      await payment.proxy
        .connect(factory)
        .pay(product, uni.address, ivan.address, toWei('300').toString(), toWei('200').toString(), [], []);

      const priceInfo2 = await payment.proxy.getPriceWithDiscount(
        uni.address,
        toWei('300').toString(),
        toWei('200').toString(),
        0
      );

      console.log(`           Product price:         300 USDT`);
      console.log(`           Cashback:              200 USDT`);
      console.log(`           -----`);
      console.log(`           Product price in UNI:  ${fromWei(priceInfo2[0].toString()).toString()} UNI`);
      console.log(`           Points earned:         ${fromWei(priceInfo2[1].toString()).toString()} point`);
      console.log('');
      console.log('');

      await payment.proxy
        .connect(factory)
        .pay(
          product,
          weth.address,
          ivan.address,
          toWei('400').toString(),
          toWei('300').toString(),
          [product],
          [toWei('50').toString()]
        );

      const priceInfo3 = await payment.proxy.getPriceWithDiscount(
        weth.address,
        toWei('400').toString(),
        toWei('300').toString(),
        toWei('50').toString()
      );

      console.log(`           Product price:         200 USDT`);
      console.log(`           Cashback:              100 USDT`);
      console.log(`           Discount:              50 USDT`);
      console.log(`           -----`);
      console.log(`           Product price in WETH: ${fromWei(priceInfo3[0].toString()).toString()} WETH`);
      console.log(`           Points earned:         ${fromWei(priceInfo3[1].toString()).toString()} point`);

      const totalWETHPrice = toBN(priceInfo1[0].toString()).plus(priceInfo3[0].toString()).toString();
      expect(await weth.balanceOf(ivan.address)).to.be.equal(toWei('10').minus(totalWETHPrice).toString());
      expect(await weth.balanceOf(treasury.address)).to.be.equal(totalWETHPrice);

      expect(await uni.balanceOf(ivan.address)).to.be.equal(toWei('2000').minus(priceInfo2[0].toString()).toString());
      expect(await uni.balanceOf(treasury.address)).to.be.equal(priceInfo2[0].toString());

      const totalpoints = toBN(priceInfo1[1].toString())
        .plus(priceInfo2[1].toString())
        .plus(priceInfo3[1].toString())
        .toString();
      const totalCashback = toBN(priceInfo2[1].toString())
        .plus(priceInfo3[1].toString())
        .minus(toWei('50').toString())
        .toString();

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(accountCahsback.points).to.be.equal(totalpoints);
      expect(currentCashback).to.be.closeTo(totalCashback, '1');
    });
  });

  describe('pay(), USDT and UNI as payment token, WETH as cashback token', async () => {
    const product = '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b';

    beforeEach(async () => {
      swapInfo = {
        poolFee: '3000',
        secondsAgo: '600',
      };

      await payment.proxy.setup(weth.address, cashback.proxy.address, treasury.address, upo.implementation.address);
      await payment.proxy.setPaymentTokens([swapInfo, swapInfo], [usdt.address, uni.address], [true, true]);

      // START swap
      await swap.swapExactOutputSingle(WETH, USDT, toWei('2000', 6).toString(), toWei('2').toString(), 500);
      await swap.swapExactOutputSingle(WETH, UNI, toWei('2000').toString(), toWei('15').toString(), 3000);
      // END

      // START add allowances
      await usdt.transfer(ivan.address, toWei('2000', 6).toString());
      await usdt.connect(ivan).approve(payment.proxy.address, toWei('2000', 6).toString());
      await uni.transfer(ivan.address, toWei('2000').toString());
      await uni.connect(ivan).approve(payment.proxy.address, toWei('2000').toString());
      // END
    });
    it('should have correct balances', async () => {
      expect(await usdt.balanceOf(ivan.address)).to.be.equal(toWei('2000', 6).toString());
      expect(await uni.balanceOf(ivan.address)).to.be.equal(toWei('2000').toString());
    });
    it('should correctly pay with USDT, without discount', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, usdt.address, ivan.address, toWei('0.2').toString(), toWei('0.1').toString(), [], []);

      const priceInfo = await payment.proxy.getPriceWithDiscount(
        usdt.address,
        toWei('0.2').toString(),
        toWei('0.1').toString(),
        0
      );

      console.log(`           Product price:         0.2 WETH`);
      console.log(`           Cashback:              0.1 WETH`);
      console.log(`           -----`);
      console.log(`           Product price in USDT: ${fromWei(priceInfo[0].toString(), 6).toString()} USDT`);
      console.log(`           Points earned:         ${fromWei(priceInfo[1].toString()).toString()} point`);

      expect(await usdt.balanceOf(ivan.address)).to.be.equal(
        toWei('2000', 6).minus(priceInfo[0].toString()).toString()
      );
      expect(await usdt.balanceOf(treasury.address)).to.be.equal(priceInfo[0].toString());

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(toWei('0.1').toString());
      expect(await currentCashback).to.be.equal(0);
    });
    it('should correctly pay with UNI, without discount', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, uni.address, ivan.address, toWei('0.2').toString(), toWei('0.1').toString(), [], []);

      const priceInfo = await payment.proxy.getPriceWithDiscount(
        uni.address,
        toWei('0.2').toString(),
        toWei('0.1').toString(),
        0
      );

      console.log(`           Product price:        0.2 WETH`);
      console.log(`           Cashback:             0.1 WETH`);
      console.log(`           -----`);
      console.log(`           Product price in UNI: ${fromWei(priceInfo[0].toString()).toString()} UNI`);
      console.log(`           Points earned:        ${fromWei(priceInfo[1].toString()).toString()} point`);

      expect(await uni.balanceOf(ivan.address)).to.be.equal(toWei('2000').minus(priceInfo[0].toString()).toString());
      expect(await uni.balanceOf(treasury.address)).to.be.equal(priceInfo[0].toString());

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(await accountCahsback.points).to.be.equal(toWei('0.1').toString());
      expect(await currentCashback).to.be.equal(0);
    });
    it('should correctly pay with USDT, with discount', async () => {
      await payment.proxy
        .connect(factory)
        .pay(product, usdt.address, ivan.address, toWei('0.2').toString(), toWei('0.1').toString(), [], []);

      const priceInfo1 = await payment.proxy.getPriceWithDiscount(
        usdt.address,
        toWei('0.2').toString(),
        toWei('0.1').toString(),
        0
      );

      console.log(`           Product price:         0.2 WETH`);
      console.log(`           Cashback:              0.1 WETH`);
      console.log(`           -----`);
      console.log(`           Product price in USDT: ${fromWei(priceInfo1[0].toString(), 6).toString()} USDT`);
      console.log(`           Points earned:         ${fromWei(priceInfo1[1].toString()).toString()} point`);
      console.log('');
      console.log('');

      await payment.proxy
        .connect(factory)
        .pay(product, usdt.address, ivan.address, toWei('0.3').toString(), toWei('0.2').toString(), [], []);

      const priceInfo2 = await payment.proxy.getPriceWithDiscount(
        usdt.address,
        toWei('0.3').toString(),
        toWei('0.2').toString(),
        0
      );

      console.log(`           Product price:         0.3 WETH`);
      console.log(`           Cashback:              0.2 WETH`);
      console.log(`           -----`);
      console.log(`           Product price in USDT: ${fromWei(priceInfo2[0].toString(), 6).toString()} USDT`);
      console.log(`           Points earned:         ${fromWei(priceInfo2[1].toString()).toString()} point`);
      console.log('');
      console.log('');

      await payment.proxy
        .connect(factory)
        .pay(
          product,
          usdt.address,
          ivan.address,
          toWei('0.5').toString(),
          toWei('0.4').toString(),
          [product],
          [toWei('0.1').toString()]
        );

      const priceInfo3 = await payment.proxy.getPriceWithDiscount(
        usdt.address,
        toWei('0.5').toString(),
        toWei('0.4').toString(),
        toWei('0.1').toString()
      );

      console.log(`           Product price:         0.5 WETH`);
      console.log(`           Cashback:              0.4 WETH`);
      console.log(`           Discount:              0.1 WETH`);
      console.log(`           -----`);
      console.log(`           Product price in USDT: ${fromWei(priceInfo3[0].toString(), 6).toString()} USDT`);
      console.log(`           Points earned:         ${fromWei(priceInfo3[1].toString()).toString()} point`);

      const totalPrice = toBN(priceInfo1[0].toString())
        .plus(priceInfo2[0].toString())
        .plus(priceInfo3[0].toString())
        .toString();
      expect(await usdt.balanceOf(ivan.address)).to.be.equal(toWei('2000', 6).minus(totalPrice).toString());
      expect(await usdt.balanceOf(treasury.address)).to.be.equal(totalPrice);

      const totalpoints = toBN(priceInfo1[1].toString())
        .plus(priceInfo2[1].toString())
        .plus(priceInfo3[1].toString())
        .toString();
      const totalCashback = toBN(priceInfo2[1].toString())
        .plus(priceInfo3[1].toString())
        .minus(toWei('0.1').toString())
        .toString();

      const accountCahsback = await cashback.proxy.accountsCahsback(product, ivan.address);
      const currentCashback = await cashback.proxy.getAccountCashback(product, ivan.address);
      expect(accountCahsback.points).to.be.equal(totalpoints);
      expect(currentCashback).to.be.closeTo(totalCashback, '1');
    });
  });
});
