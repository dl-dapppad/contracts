const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC20MintBurnDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC20MintBurn';
  }
}

module.exports = ERC20MintBurnDeployer;
