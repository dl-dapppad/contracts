const UUPSDeployer = require('../../_helpers/_UUPS.deployer');

class FarmingDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'Farming';
  }

  getImplementationEnvAddress() {
    return 'FARMING_IMPLEMENTATION';
  }

  getProxyEnvAddress() {
    return 'FARMING_PROXY';
  }
}

module.exports = FarmingDeployer;
