const UUPSDeployer = require('./_helpers/_UUPS.deployer');

class AccessControlDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'BaseAccessControl';
  }

  getImplementationEnvAddress() {
    return 'ACCESS_CONTROL';
  }
}

module.exports = AccessControlDeployer;
