const { toWei, fromWei } = require('../helpers/bn');
const { UniswapPriceOracleDeployer } = require('../helpers/deployers');

const Reverter = require('../helpers/reverter');

describe('Payment, fork', async () => {
  const reverter = new Reverter();

  // Polygon addresses
  const UNI_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

  const WETH = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';
  const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
  const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const DAI = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063';
  // End

  let upo, weth, usdt, usdc, dai;
  let owner;

  before('setup', async () => {
    reverter.snapshot();
  });

  beforeEach('setup', async () => {
    [owner] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory('contracts/implementations/tokens/ERC20/ERC20.sol:ERC20');

    upo = await new UniswapPriceOracleDeployer().deploy();
    await upo.implementation.setFactory(UNI_FACTORY);

    // Attach tokens
    weth = ERC20.attach(WETH);
    usdt = ERC20.attach(USDT);
    usdc = ERC20.attach(USDC);
    dai = ERC20.attach(DAI);
    // END
  });

  afterEach('setup', async () => {
    reverter.revert();
  });

  describe('getSwapAmount()', async () => {
    it('USDC to USDT', async () => {
      const amount = await upo.implementation.getSwapAmount(USDC, USDT, USDC, toWei('1', 6).toString(), '500', 600);

      console.log(`      1 USDC = ${fromWei(amount.toString(), 6).toString()} USDT`);
    });
    it('USDC to DAI', async () => {
      const amount = await upo.implementation.getSwapAmount(USDC, DAI, USDC, toWei('1', 6).toString(), '500', 600);

      console.log(`      1 USDC = ${fromWei(amount.toString()).toString()} DAI`);
    });
    it('USDC to WETH', async () => {
      const amount = await upo.implementation.getSwapAmount(USDC, WETH, USDC, toWei('1', 6).toString(), '3000', 600);

      console.log(`      1 USDC = ${fromWei(amount.toString()).toString()} WETH`);
    });
  });
});

// npx hardhat test test-fork/UniswapPriceOracle.polygon.test.js
