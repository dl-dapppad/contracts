const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC20Deployer extends UUPSDeployer {
  getFactoryName() {
    return 'contracts/implementations/tokens/ERC20/ERC20.sol:ERC20';
  }

  getImplementationEnvAddress() {
    return 'ERC20_IMPLEMENTATION';
  }
}

module.exports = ERC20Deployer;
