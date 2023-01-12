const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC721BurnDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC721Burn';
  }
}

module.exports = ERC721BurnDeployer;
