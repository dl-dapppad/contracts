const ProductFactoryDeployer = require('./deployer/factory/product-factory/ProductFactory.deployer');
const PaymentDeployer = require('./deployer/Payment.deployer');
const UniswapPriceOracleDeployer = require('./deployer/UniswapPriceOracle.deployer');
const TokenDeployer = require('./deployer/Token.deployer');

// Implementations
const FarmingDeployer = require('./deployer/implementations/farming/Farming.deployer');
const ERC20Deployer = require('./deployer/implementations/tokens/ERC20/ERC20.deployer');
const ERC20BurnDeployer = require('./deployer/implementations/tokens/ERC20/ERC20Burn.deployer');
const ERC20MintDeployer = require('./deployer/implementations/tokens/ERC20/ERC20Mint.deployer');
const ERC20MintBurnDeployer = require('./deployer/implementations/tokens/ERC20/ERC20MintBurn.deployer');
const ERC20MintBurnCappDeployer = require('./deployer/implementations/tokens/ERC20/ERC20MintBurnCapp.deployer');
const ERC20MintCappDeployer = require('./deployer/implementations/tokens/ERC20/ERC20MintCapp.deployer');
const ERC721Deployer = require('./deployer/implementations/tokens/ERC721/ERC721.deployer');
const ERC721BurnDeployer = require('./deployer/implementations/tokens/ERC721/ERC721Burn.deployer');
const ERC721BurnEnumDeployer = require('./deployer/implementations/tokens/ERC721/ERC721BurnEnum.deployer');
const ERC721EnumDeployer = require('./deployer/implementations/tokens/ERC721/ERC721Enum.deployer');

// Mocks
const ERC20MockDeployer = require('./deployer/mock/ERC20Mock.deployer');

module.exports = {
  ProductFactoryDeployer,
  PaymentDeployer,
  UniswapPriceOracleDeployer,
  TokenDeployer,
  FarmingDeployer,
  ERC20Deployer,
  ERC20BurnDeployer,
  ERC20MintDeployer,
  ERC20MintBurnDeployer,
  ERC20MintBurnCappDeployer,
  ERC20MintCappDeployer,
  ERC721Deployer,
  ERC721BurnDeployer,
  ERC721BurnEnumDeployer,
  ERC721EnumDeployer,
  ERC20MockDeployer,
};
