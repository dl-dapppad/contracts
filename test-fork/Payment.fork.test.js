const { expect } = require('chai');
const { toWei } = require('../helpers/bn');
const FarmingDeployer = require('../helpers/deployer/implementations/farming/Farming.deployer');

describe('Payment, fork', async () => {
  const ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
  const FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

  let swap, payment, weth, usdt, usdc, dai, dapp;
  let owner, ivan, treasury, factory;

  before('setup', async () => {
    [owner, ivan, treasury, factory] = await ethers.getSigners();

    const SwapMock = await ethers.getContractFactory('SwapMock');
    const ERC20 = await ethers.getContractFactory('contracts/implementations/tokens/ERC20/ERC20.sol:ERC20');
    const UniswapPriceOracle = await ethers.getContractFactory('UniswapPriceOracle');
    const PaymentDeployer = require('../helpers/deployer/Payment.deployer');

    // START deploy Swap contract and set base stable coins
    swap = await SwapMock.deploy(ROUTER, FACTORY, WETH);
    upo = await UniswapPriceOracle.deploy();
    weth = ERC20.attach(WETH);
    usdt = ERC20.attach(USDT);
    usdc = ERC20.attach(USDC);
    dai = ERC20.attach(DAI);
    // END

    // Deployment
    payment = await new PaymentDeployer().deployProxy();
    const factoryRole = await payment.proxy.FACTORY_ROLE();
    await payment.proxy.grantRole(factoryRole, factory.address);

    const Token = await ethers.getContractFactory('Token');
    dapp = await Token.deploy('N', 'S');

    const minterRole = await dapp.MINTER_ROLE();
    await dapp.grantRole(minterRole, payment.proxy.address);
    await dapp.grantRole(minterRole, owner.address);
    await dapp.mint(owner.address, toWei('10').toString());
    await dapp.revokeRole(minterRole, owner.address);

    await upo.setSwapConfig(FACTORY, 300);
    await swap.swapWETH({ value: toWei('20').toString() });
  });

  describe('pay(), dai converted to usdt', async () => {
    before(async () => {
      farming = await new FarmingDeployer().deployProxy();
      await farming.proxy.setTokens(dapp.address, usdt.address);

      // START Payment base config
      await payment.proxy.setup(dapp.address, farming.proxy.address, treasury.address, upo.address);
      // END

      // START add stable coins to payment list
      const swapInfo = {
        router: ROUTER,
        sqrtPriceLimitX96: '0',
        fee: '500',
        multiplier: '1000',
      };

      await payment.proxy.setPaymentTokens([dai.address], [swapInfo], [true]);
      // END

      // START swap dai to owner address
      const wethAmountForSwap = await upo.getInSwapAmount(WETH, DAI, DAI, toWei('100').toString(), 500, 1000);
      await swap.swapExactOutputSingle(WETH, DAI, toWei('100').toString(), wethAmountForSwap, 500);
      // END

      // START add allowances
      await dai.transfer(ivan.address, toWei('100').toString());
      await dai.connect(ivan).approve(payment.proxy.address, toWei('9999').toString());

      await dapp.approve(farming.proxy.address, toWei('1').toString());
      await farming.proxy.invest(toWei('1').toString());
      // END
    });
    it('should have correct balances', async () => {
      expect(await dai.balanceOf(ivan.address)).to.be.equal(toWei('100').toString());
    });
    it('should correctly pay', async () => {
      await payment.proxy
        .connect(factory)
        .pay(dai.address, ivan.address, toWei('90').toString(), toWei('10').toString());

      expect(await dai.balanceOf(ivan.address)).to.be.closeTo(toWei('10').toString(), toWei('1').toString());

      expect(await usdt.balanceOf(farming.proxy.address)).to.be.equal(toWei('10', 6).toString());
      expect(await dai.balanceOf(treasury.address)).to.be.equal(toWei('80').toString());

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(toWei('10').toString());
    });
  });

  describe('pay(), usdc converted to usdt', async () => {
    before(async () => {
      farming = await new FarmingDeployer().deployProxy();
      await farming.proxy.setTokens(dapp.address, usdt.address);

      // START Payment base config
      await payment.proxy.setup(dapp.address, farming.proxy.address, treasury.address, upo.address);
      // END

      // START add stable coins to payment list
      const swapInfo = {
        router: ROUTER,
        sqrtPriceLimitX96: '0',
        fee: '500',
        multiplier: '1000',
      };

      await payment.proxy.setPaymentTokens([usdc.address], [swapInfo], [true]);
      // END

      // START swap usdc to owner address
      const wethAmountForSwap = await upo.getInSwapAmount(WETH, USDC, USDC, toWei('100', 6).toString(), 500, 1000);
      await swap.swapExactOutputSingle(WETH, USDC, toWei('100', 6).toString(), wethAmountForSwap, 500);
      // END

      // START add allowances
      await usdc.transfer(ivan.address, toWei('100', 6).toString());
      await usdc.connect(ivan).approve(payment.proxy.address, toWei('9999', 6).toString());
      // END

      await dapp.approve(farming.proxy.address, toWei('1').toString());
      await farming.proxy.invest(toWei('1').toString());
    });
    it('should have correct balances', async () => {
      expect(await usdc.balanceOf(ivan.address)).to.be.equal(toWei('100', 6).toString());
    });
    it('should correctly pay', async () => {
      await payment.proxy
        .connect(factory)
        .pay(usdc.address, ivan.address, toWei('90').toString(), toWei('10').toString());

      expect(await usdc.balanceOf(ivan.address)).to.be.closeTo(toWei('10', 6).toString(), toWei('1', 6).toString());

      expect(await usdt.balanceOf(farming.proxy.address)).to.be.equal(toWei('10', 6).toString());
      expect(await usdc.balanceOf(treasury.address)).to.be.equal(toWei('80', 6).toString());

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(toWei('20').toString());
    });
  });

  describe('pay(), usdt converted to dai', async () => {
    before(async () => {
      farming = await new FarmingDeployer().deployProxy();
      await farming.proxy.setTokens(dapp.address, dai.address);

      // START Payment base config
      await payment.proxy.setup(dapp.address, farming.proxy.address, treasury.address, upo.address);
      // END

      // START add stable coins to payment list
      const swapInfo = {
        router: ROUTER,
        sqrtPriceLimitX96: '0',
        fee: '500',
        multiplier: '1000',
      };

      await payment.proxy.setPaymentTokens([usdt.address], [swapInfo], [true]);
      // END

      // START swap usdt to owner address
      const wethAmountForSwap = await upo.getInSwapAmount(WETH, USDT, USDT, toWei('100', 6).toString(), 500, 1000);
      await swap.swapExactOutputSingle(WETH, USDT, toWei('100', 6).toString(), wethAmountForSwap, 500);
      // END

      // START add allowances
      await usdt.transfer(ivan.address, toWei('100', 6).toString());
      await usdt.connect(ivan).approve(payment.proxy.address, toWei('9999', 6).toString());
      // END

      await dapp.approve(farming.proxy.address, toWei('1').toString());
      await farming.proxy.invest(toWei('1').toString());
    });
    it('should have correct balances', async () => {
      expect(await usdt.balanceOf(ivan.address)).to.be.equal(toWei('100', 6).toString());
    });
    it('should correctly pay', async () => {
      await payment.proxy
        .connect(factory)
        .pay(usdt.address, ivan.address, toWei('90').toString(), toWei('10').toString());

      expect(await usdt.balanceOf(ivan.address)).to.be.closeTo(toWei('10', 6).toString(), toWei('1', 6).toString());

      expect(await dai.balanceOf(farming.proxy.address)).to.be.equal(toWei('10').toString());
      expect(await usdt.balanceOf(treasury.address)).to.be.equal(toWei('80', 6).toString());

      expect(await dapp.balanceOf(ivan.address)).to.be.equal(toWei('30').toString());
    });
  });
});
