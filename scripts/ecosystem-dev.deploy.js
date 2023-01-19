const { ethers } = require('hardhat');
const { getEnv } = require('../helpers/utils');
const { toWei, percentToDecimal } = require('../helpers/bn');
const { logAll, logTx } = require('../helpers/logger');
const {
  AccessControlDeployer,
  ProductFactoryDeployer,
  PaymentDeployer,
  CashbackDeployer,
  ERC20Deployer,
  ERC721Deployer,
  UniswapPriceOracleDeployer,
} = require('../helpers/deployers');

// START configure script
// keccak256("ERC20") = "0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b"
// keccak256("ERC721") = "0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a"
const configFactory = {
  products: [
    {
      alias: '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b',
      implementation: 'ERC20',
      currentPrice: toWei('1200').toString(),
      minimalPrice: toWei('10').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(2).toString(),
      isActive: true,
    },
    {
      alias: '0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a',
      implementation: 'ERC721',
      currentPrice: toWei('1150').toString(),
      minimalPrice: toWei('15').toString(),
      decreasePercent: percentToDecimal(3).toString(),
      cashbackPercent: percentToDecimal(4).toString(),
      isActive: true,
    },
  ],
};
// END

let tx;

async function main() {
  await logAll('DEPLOY ECOSYSTEM', { configFactory });

  const upo = await new UniswapPriceOracleDeployer().deploy();
  const accessControl = await new AccessControlDeployer(true).deploy();
  const payment = await new PaymentDeployer(true).deployProxy([accessControl.implementation.address]);
  const cashback = await new CashbackDeployer(true).deployProxy([accessControl.implementation.address]);
  const factory = await new ProductFactoryDeployer(true).deployProxy([accessControl.implementation.address]);

  const erc20 = await new ERC20Deployer(true).deploy();
  const erc721 = await new ERC721Deployer(true).deploy();

  const txSender = await ethers.provider.getSigner().getAddress();
  usdt = await new ERC20Deployer(true).deployProxy(['USD Coin', 'USDC', toWei('1000000000').toString(), txSender, '6']);
  dai = await new ERC20Deployer(true).deployProxy(['DAI', 'DAI', toWei('1000000000').toString(), txSender, '18']);

  // Setup roles
  const PAYMENT_CONTRACT_ROLE = await cashback.proxy.PAYMENT_CONTRACT_ROLE();
  const PAYMENT_ROLE = await payment.proxy.PAYMENT_ROLE();
  const FACTORY_CONTRACT_ROLE = await payment.proxy.FACTORY_CONTRACT_ROLE();
  const PRODUCT_FACTORY_ROLE = await factory.proxy.PRODUCT_FACTORY_ROLE();

  tx = await accessControl.implementation.grantRole(PAYMENT_CONTRACT_ROLE, payment.proxy.address);
  await tx.wait();
  await logTx('AccessControl', 'grantRole', tx);

  tx = await accessControl.implementation.grantRole(PAYMENT_ROLE, txSender);
  await tx.wait();
  await logTx('AccessControl', 'grantRole', tx);

  tx = await accessControl.implementation.grantRole(FACTORY_CONTRACT_ROLE, factory.proxy.address);
  await tx.wait();
  await logTx('AccessControl', 'grantRole', tx);

  tx = await accessControl.implementation.grantRole(PRODUCT_FACTORY_ROLE, txSender);
  await tx.wait();
  await logTx('AccessControl', 'grantRole', tx);
  // End

  // START setup payment contract
  tx = await payment.proxy.setup(usdt.proxy.address, cashback.proxy.address, txSender, upo.implementation.address);
  await tx.wait();
  await logTx('Payment', 'setup', tx);
  // // END

  // START setup factory contract
  configFactory.products[0].implementation = erc20.implementation.address;
  configFactory.products[1].implementation = erc721.implementation.address;

  for (let i = 0; i < configFactory.products.length; i++) {
    const product = configFactory.products[i];

    tx = await factory.proxy.setupProduct(
      product.alias,
      product.implementation,
      product.currentPrice,
      product.minimalPrice,
      product.decreasePercent,
      product.cashbackPercent,
      product.isActive
    );
    await tx.wait();
    await logTx('Factory', 'addProduct', tx);
  }

  tx = await factory.proxy.setPayment(payment.proxy.address);
  await tx.wait();
  await logTx('Facotry', 'setPayment', tx);
  // END
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// npx hardhat run scripts/ecosystem-dev.deploy.js
