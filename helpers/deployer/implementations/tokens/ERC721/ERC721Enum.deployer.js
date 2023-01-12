const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC721EnumDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'ERC721Enum';
  }
}

module.exports = ERC721EnumDeployer;
