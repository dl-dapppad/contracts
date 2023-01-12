const UUPSDeployer = require('./_helpers/_UUPS.deployer');

class UniswapPriceOracleDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'UniswapPriceOracle';
  }

  getProxyEnvAddress() {
    return 'UNISWAP_PRICE_ORACLE';
  }
}

module.exports = UniswapPriceOracleDeployer;
