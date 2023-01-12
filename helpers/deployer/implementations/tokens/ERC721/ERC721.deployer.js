const UUPSDeployer = require('../../../_helpers/_UUPS.deployer');

class ERC721Deployer extends UUPSDeployer {
  getFactoryName() {
    return 'contracts/implementations/tokens/ERC721/ERC721.sol:ERC721';
  }
}

module.exports = ERC721Deployer;
