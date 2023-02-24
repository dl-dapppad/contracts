const UUPSDeployer = require('./_helpers/_UUPS.deployer');

class CashbackDeployer extends UUPSDeployer {
  getFactoryName() {
    return 'Cashback';
  }

  getImplementationEnvAddress() {
    return 'CASHBACK_IMPLEMENTATION';
  }

  getProxyEnvAddress() {
    return 'CASHBACK_PROXY';
  }
}

module.exports = CashbackDeployer;
