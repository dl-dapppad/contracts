const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC721BurnEnumDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC721BurnEnum';
  }
}

module.exports = ERC721BurnEnumDeployer;
