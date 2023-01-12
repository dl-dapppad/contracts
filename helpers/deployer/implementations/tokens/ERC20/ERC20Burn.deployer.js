const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC20BurnDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC20Burn';
  }
}

module.exports = ERC20BurnDeployer;
