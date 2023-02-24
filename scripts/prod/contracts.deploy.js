const { ethers } = require('hardhat');
const { logAll } = require('../../helpers/logger');
const {
  AccessControlDeployer,
  ProductFactoryDeployer,
  PaymentDeployer,
  CashbackDeployer,
  UniswapPriceOracleDeployer,
  ERC20Deployer,
  ERC20MintDeployer,
  ERC20BurnDeployer,
  ERC20MintBurnDeployer,
  ERC20MintCappDeployer,
  ERC20MintBurnCappDeployer,
  ERC721Deployer,
  ERC721BurnDeployer,
  ERC721EnumDeployer,
  ERC721BurnEnumDeployer,
} = require('../../helpers/deployers');

let tx;

async function main() {
  await logAll('DEPLOY SC');

  // Deploy main contracts
  const accessControl = await new AccessControlDeployer(true).deploy();
  await new UniswapPriceOracleDeployer(true).deploy();
  await new PaymentDeployer(true).deployProxy([accessControl.implementation.address]);
  await new CashbackDeployer(true).deployProxy([accessControl.implementation.address]);
  await new ProductFactoryDeployer(true).deployProxy([accessControl.implementation.address]);

  // Deploy implementations
  await new ERC20Deployer(true).deploy();
  await new ERC20MintDeployer(true).deploy();
  await new ERC20BurnDeployer(true).deploy();
  await new ERC20MintBurnDeployer(true).deploy();
  await new ERC20MintCappDeployer(true).deploy();
  await new ERC20MintBurnCappDeployer(true).deploy();
  await new ERC721Deployer(true).deploy();
  await new ERC721BurnDeployer(true).deploy();
  await new ERC721EnumDeployer(true).deploy();
  await new ERC721BurnEnumDeployer(true).deploy();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// npx hardhat run scripts/prod/contracts.deploy.js
// npx hardhat run scripts/prod/contracts.deploy.js --network polygon

// BaseAccessControl:     npx hardhat verify --network polygon 0x6A05F09bA54261f4c37Cc7F5Cd6eCB93EDe8D425
// UniswapPriceOracle:    npx hardhat verify --network polygon 0xD34652d5C626bdA6333a5b30543F034Ab4DC3895
// Payment:               npx hardhat verify --network polygon 0x7c563c4AFB338dc996FC6D71F659B2724C2112BF
// PaymentProxy:          0xaBc7B59b87b999E7dDdF1E7C864409D51c05723C
// Cashback:              npx hardhat verify --network polygon 0x19b57e4E2806edd3b4CD8da1fCA6C2337a424C91
// CashbackProxy:         0x6D39DaC571AffcEC9a27fE8B21BB1321f5693C5C
// ProductFactory:        npx hardhat verify --network polygon 0xba2D85D215DFc40148e1262A4F3762c02E52D46d
// ProductFactoryProxy:   0x45A3CcbD69ED47aE26C62739a7d473f20D9F32C6

// ERC20:                 npx hardhat verify --network polygon 0x00E284F7017579B5eB48103eFc63680E402D1d05
// ERC20Mint:             npx hardhat verify --network polygon 0xd83012f7b1FCB1E8F73c1f74DB7fe858CE5Ff8C4
// ERC20Burn:             npx hardhat verify --network polygon 0xD17E224b3D194Af3e144E042A0A135963D7bC29F
// ERC20MintBurn:         npx hardhat verify --network polygon 0x8bF9Dd6b1dCAED1dab08162E5E1Bf150Dde717AC
// ERC20MintCapp:         npx hardhat verify --network polygon 0xcc25969d2934008F875AB3A639b5CADa7ca4D36c
// ERC20MintBurnCapp:     npx hardhat verify --network polygon 0x8B8EEc721e2439a858DE2abDAFe7218dC53C79cd
// ERC721:                npx hardhat verify --network polygon 0x56B51307381697208F22cdb6215A6299d0E90e2D
// ERC721Burn:            npx hardhat verify --network polygon 0xF3f3Dd2B7b99710d284234d2C18aAcbcfFbb3678
// ERC721Enum:            npx hardhat verify --network polygon 0xCfDc02e02dC51fF5959bF3fbE5Ff8ebC9cA28686
// ERC721BurnEnum:        npx hardhat verify --network polygon 0xC8D7e2E1C8013e9337119855Ee6AE461ed88388F
