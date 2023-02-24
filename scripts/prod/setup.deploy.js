const { ethers } = require('hardhat');
const { toWei, percentToDecimal } = require('../../helpers/bn');
const { logAll, logTx } = require('../../helpers/logger');
const {
  AccessControlDeployer,
  ProductFactoryDeployer,
  PaymentDeployer,
  CashbackDeployer,
  UniswapPriceOracleDeployer,
} = require('../../helpers/deployers');

// START configure script
const config = {
  uniswapFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  pointTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDС
  treasuryAddress: '0xe3E8B64331636c04a0272eB831A856029Af7816c',
  paymentToken: {
    tokens: [
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
      '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI
    ],
    statuses: [true, true, true],
    swapInfos: [
      {
        poolFee: '500',
        secondsAgo: '600',
      },
      {
        poolFee: '500',
        secondsAgo: '600',
      },
      {
        poolFee: '500',
        secondsAgo: '600',
      },
    ],
  },
  products: [
    {
      alias: '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b', // ERC20
      implementation: '0x00E284F7017579B5eB48103eFc63680E402D1d05',
      currentPrice: toWei('0').toString(),
      minimalPrice: toWei('0').toString(),
      decreasePercent: percentToDecimal(0).toString(),
      cashbackPercent: percentToDecimal(0).toString(),
      isActive: true,
    },
    {
      alias: '0x3472c9b670dfbe75af12c1d152ea52c92acc9a30fc73a369ddf0ec39f650b979', // ERC20 Mint
      implementation: '0xd83012f7b1FCB1E8F73c1f74DB7fe858CE5Ff8C4',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
    {
      alias: '0xe623c8787026f49917d5bc40ed268b2076d83e93458b4fb1f861c2dfe8f5e3b6', // ERC20 Burn
      implementation: '0xD17E224b3D194Af3e144E042A0A135963D7bC29F',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
    {
      alias: '0x44ca57ad758e3ea37db6145c551bc966484fee2f6e9d6a8d2475ca92db1f66e0', // ERC20 Mint Burn
      implementation: '0x8bF9Dd6b1dCAED1dab08162E5E1Bf150Dde717AC',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
    {
      alias: '0x68647f1876774a7cd2eceba3991861cdce75afb9c06f82bd40e182f3104ff06f', // ERC20 Mint Cap
      implementation: '0xcc25969d2934008F875AB3A639b5CADa7ca4D36c',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
    {
      alias: '0xe6c3a2737c3418afa96e487f845823ade3241668e2f1c9a93c3b49b124bedd53', // ERC20 Mint Burn Cap
      implementation: '0x8B8EEc721e2439a858DE2abDAFe7218dC53C79cd',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
    {
      alias: '0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a', // ERC721
      implementation: '0x56B51307381697208F22cdb6215A6299d0E90e2D',
      currentPrice: toWei('0').toString(),
      minimalPrice: toWei('0').toString(),
      decreasePercent: percentToDecimal(0).toString(),
      cashbackPercent: percentToDecimal(0).toString(),
      isActive: true,
    },
    {
      alias: '0xf4a80989c2b50ed5b1afdd3dad74f849c306ee363335b3093721be025df88869', // ERC721 Burn
      implementation: '0xF3f3Dd2B7b99710d284234d2C18aAcbcfFbb3678',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
    {
      alias: '0x97459d1cc648356bbcbefbb49822efd16d2278e43a2ff51f4dcca35352bab870', // ERC721 Enum
      implementation: '0xCfDc02e02dC51fF5959bF3fbE5Ff8ebC9cA28686',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
    {
      alias: '0xccb6bc1088424066d9937fcef2dc13281dba0c779f19e69c3a3fc2d2d634ab56', // ERC721 Burn Enum
      implementation: '0xC8D7e2E1C8013e9337119855Ee6AE461ed88388F',
      currentPrice: toWei('1').toString(),
      minimalPrice: toWei('0.1').toString(),
      decreasePercent: percentToDecimal(1).toString(),
      cashbackPercent: percentToDecimal(25).toString(),
      isActive: true,
    },
  ],
};
// END

let tx;

async function main() {
  await logAll('DEPLOY ECOSYSTEM', { config });

  const upo = await new UniswapPriceOracleDeployer().setDeployedAddresses();
  const accessControl = await new AccessControlDeployer().setDeployedAddresses();
  const payment = await new PaymentDeployer().setDeployedAddresses();
  const cashback = await new CashbackDeployer().setDeployedAddresses();
  const factory = await new ProductFactoryDeployer().setDeployedAddresses();

  const txSender = await ethers.provider.getSigner().getAddress();

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
  tx = await payment.proxy.setup(
    config.pointTokenAddress,
    cashback.proxy.address,
    config.treasuryAddress,
    upo.implementation.address
  );
  await tx.wait();
  await logTx('Payment', 'setup', tx);

  tx = await payment.proxy.setPaymentTokens(
    config.paymentToken.swapInfos,
    config.paymentToken.tokens,
    config.paymentToken.statuses
  );
  await tx.wait();
  await logTx('Payment', 'setPaymentTokens', tx);
  // END

  // START setup factory contract
  for (let i = 0; i < config.products.length; i++) {
    const product = config.products[i];

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

  // START setup UPO contract
  await upo.implementation.setFactory(config.uniswapFactory);
  await tx.wait();
  await logTx('UPO', 'setFactory', tx);
  // END
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// npx hardhat run scripts/prod/setup.deploy.js
// npx hardhat run scripts/prod/setup.deploy.js --network polygon
