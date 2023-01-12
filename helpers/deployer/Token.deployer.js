const UUPSDeployer = require('./_helpers/_UUPS.deployer');

class PaymentDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'Token';
  }

  getImplementationEnvAddress() {
    return 'TOKEN_IMPLEMENTATION';
  }
}

module.exports = PaymentDeployer;
