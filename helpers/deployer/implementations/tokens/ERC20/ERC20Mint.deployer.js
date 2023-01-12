const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC20MintDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC20Mint';
  }
}

module.exports = ERC20MintDeployer;
