const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC20MintCappDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC20MintCapp';
  }
}

module.exports = ERC20MintCappDeployer;
