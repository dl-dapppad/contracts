const UUPSDeployer = require('../_helpers/_UUPS.deployer');

class ERC20MockDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC20Mock';
  }

  getImplementationEnvAddress() {
    return 'ERC20_MOCK_IMPLEMENTATION';
  }
}

module.exports = ERC20MockDeployer;
