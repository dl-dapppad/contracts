const UUPSDeployer = require('./_helpers/_UUPS.deployer');

class PaymentDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'Payment';
  }

  getImplementationEnvAddress() {
    return 'PAYMENT_IMPLEMENTATION';
  }

  getProxyEnvAddress() {
    return 'PAYMENT_PROXY';
  }
}

module.exports = PaymentDeployer;
