const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC20MintBurnCappDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC20MintBurnCapp';
  }
}

module.exports = ERC20MintBurnCappDeployer;
