const { ethers } = require('hardhat');
const { getEnv } = require('../helpers/utils');
const { logAll, logTx } = require('../helpers/logger');
const {
  TokenDeployer,
  ProductFactoryDeployer,
  PaymentDeployer,
  FarmingDeployer,
  ERC20MockDeployer,
  ERC20Deployer,
  ERC721Deployer,
  UniswapPriceOracleDeployer,
} = require('../helpers/deployers');

// START configure script
const configDapp = {
  name: 'Decentralized applications platform',
  symbol: 'DAPP',
};

const configERC20Mock = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 18,
};

// keccak256("ERC20") = "0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b"
// keccak256("ERC721") = "0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a"
const configFactory = {
  products: [
    {
      alias: '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b',
      implementation: 'ERC20',
      currentPrice: ethers.utils.parseUnits('1000').toString(),
      minimalPrice: ethers.utils.parseUnits('50').toString(),
      decreasePercent: '50000000000000000000000000', // 5%,
      cashbackPercent: '100000000000000000000000000', // 10%
      isActive: true,
    },
    {
      alias: '0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a',
      implementation: 'ERC721',
      currentPrice: ethers.utils.parseUnits('600').toString(),
      minimalPrice: ethers.utils.parseUnits('40').toString(),
      decreasePercent: '60000000000000000000000000', // 6%,
      cashbackPercent: '180000000000000000000000000', // 18%
      isActive: true,
    },
  ],
};
// END

let tx;

async function main() {
  await logAll('DEPLOY ECOSYSTEM', {
    'Config of Dapp token': configDapp,
    'Config of MockERC20 token': configERC20Mock,
  });

  const dapp = await new TokenDeployer(true).deploy([configDapp.name, configDapp.symbol]);
  const factory = await new ProductFactoryDeployer(true).deployProxy();
  const payment = await new PaymentDeployer(true).deployProxy();
  const farming = await new FarmingDeployer(true).deployProxy();
  const usdt = await new ERC20MockDeployer(true).deploy([
    configERC20Mock.name,
    configERC20Mock.symbol,
    configERC20Mock.decimals,
  ]);
  const erc20 = await new ERC20Deployer(true).deploy();
  const erc721 = await new ERC721Deployer(true).deploy();
  const upo = await new UniswapPriceOracleDeployer(true).deploy();

  const txSender = await ethers.provider.getSigner().getAddress();

  // START setup `farming` contract
  tx = await farming.proxy.setTokens(dapp.implementation.address, usdt.implementation.address);
  await tx.wait();
  await logTx('Farming', 'setTokens', tx);
  // END

  // START mint 1 WEI for `txSender` and transfer it to `farming`
  // and grant `MINTER_ROLE` for `payment`
  const minterRole = await dapp.implementation.MINTER_ROLE();

  tx = await dapp.implementation.grantRole(minterRole, txSender);
  await tx.wait();
  await logTx('DAPP', 'grantRole', tx);

  tx = await dapp.implementation.grantRole(minterRole, payment.proxy.address);
  await tx.wait();
  await logTx('DAPP', 'grantRole', tx);

  tx = await dapp.implementation.mint(txSender, '1000000000000000000001');
  await tx.wait();
  await logTx('DAPP', 'mint', tx);

  tx = await dapp.implementation.revokeRole(minterRole, txSender);
  await tx.wait();
  await logTx('DAPP', 'revokeRole', tx);

  tx = await dapp.implementation.approve(farming.proxy.address, '1');
  await tx.wait();
  await logTx('DAPP', 'approve', tx);

  tx = await farming.proxy.invest('1');
  await tx.wait();
  await logTx('Farming', 'invest', tx);
  // END

  // START setup payment contract
  tx = await payment.proxy.setup(
    dapp.implementation.address,
    farming.proxy.address,
    txSender,
    upo.implementation.address
  );
  await tx.wait();
  await logTx('Payment', 'setup', tx);
  // END

  // START setup factory contract
  const factoryRole = await payment.proxy.FACTORY_ROLE();

  tx = await payment.proxy.grantRole(factoryRole, factory.proxy.address);
  await tx.wait();
  await logTx('Payment', 'grantRole', tx);

  // keccak256("ERC20") = "0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b"
  // keccak256("ERC721") = "0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a"
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

  await buyProductERC20(txSender, usdt, factory, payment, erc20);
  await buyProductERC721(txSender, usdt, factory, payment, erc721);
  await buyProductERC721(txSender, usdt, factory, payment, erc721);

  tx = await usdt.implementation.mint(txSender, ethers.utils.parseUnits('10000').toString());
}

async function buyProductERC20(txSender, usdt, factory, payment, erc20) {
  tx = await usdt.implementation.mint(txSender, ethers.utils.parseUnits('1000').toString());
  await tx.wait();
  await logTx('USDT', 'mint', tx);

  tx = await usdt.implementation.approve(payment.proxy.address, ethers.utils.parseUnits('1000').toString());
  await tx.wait();
  await logTx('USDT', 'approve', tx);

  tx = await factory.proxy.deploy(
    '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b',
    usdt.implementation.address,
    erc20.implementation.interface.encodeFunctionData('ERC20_init', ['AAA', 'AAA', '100', txSender, 18])
  );
  await tx.wait();
  await logTx('Facotry', 'deploy', tx);
}

async function buyProductERC721(txSender, usdt, factory, payment, erc721) {
  tx = await usdt.implementation.mint(txSender, ethers.utils.parseUnits('600').toString());
  await tx.wait();
  await logTx('USDT', 'mint', tx);

  tx = await usdt.implementation.approve(payment.proxy.address, ethers.utils.parseUnits('600').toString());
  await tx.wait();
  await logTx('USDT', 'approve', tx);

  tx = await factory.proxy.deploy(
    '0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a',
    usdt.implementation.address,
    erc721.implementation.interface.encodeFunctionData('ERC721_init', ['NFTGOD', 'NGOD'])
  );
  await tx.wait();
  await logTx('Facotry', 'deploy', tx);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// npx hardhat node --fork https://goerli.infura.io/v3/
// npx hardhat run scripts/ecosystem-front.deploy.js --network localhost
