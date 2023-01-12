const UUPSDeployer = require('../../_helpers/_UUPS.deployer');

class ProductFactoryDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ProductFactory';
  }

  getImplementationEnvAddress() {
    return 'PRODUCT_FACTORY_IMPLEMENTATION';
  }

  getProxyEnvAddress() {
    return 'PRODUCT_FACTORY_PROXY';
  }
}

module.exports = ProductFactoryDeployer;
