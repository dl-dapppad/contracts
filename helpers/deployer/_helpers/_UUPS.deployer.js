const subProcess = require('child_process');
const { getEnv, getTxParams } = require('../../utils');
const { logTx } = require('../../logger');

class UUPSDeployer {
  constructor(logging = false) {
    this.implementation = undefined;
    this.initializeData = undefined;
    this.proxy = undefined;
    this.logging = logging;
  }

  async deploy(params = []) {
    let contract;

    if (this.logging) {
      contract = await (await this.getImplementationFactory()).deploy(...params, getTxParams());
      await contract.deployed();
      await logTx(this.getContractName(), 'deploy', contract);
    } else {
      contract = await (await this.getImplementationFactory()).deploy(...params);
    }

    this.implementation = contract;

    return this;
  }

  async deployProxy(initializeParams = []) {
    await this.deploy();

    const factoryImplementation = await this.getImplementationFactory();
    const factoryProxy = await this.getProxyFactory();

    this.initializeData = factoryImplementation.interface.encodeFunctionData(
      this.getInitializeFunctionName(),
      initializeParams
    );

    let proxyContract;
    if (this.logging) {
      proxyContract = await factoryProxy.deploy(this.initializeData, this.implementation.address, getTxParams());
      await proxyContract.deployed();
      await logTx(this.getContractName() + 'Proxy', 'deploy', proxyContract);
    } else {
      proxyContract = await (await this.getProxyFactory()).deploy(this.initializeData, this.implementation.address);
    }

    this.proxy = await factoryImplementation.attach(proxyContract.address);

    return this;
  }

  // Return proxy factory
  async getProxyFactory() {
    return ethers.getContractFactory('BaseProxy');
  }

  // Return contract factory
  async getImplementationFactory() {
    return ethers.getContractFactory(this.getFactoryName());
  }

  async setDeployedAddresses() {
    if (this.getImplementationEnvAddress()) {
      this.implementation = (await this.getImplementationFactory()).attach(getEnv(this.getImplementationEnvAddress()));
    }
    if (this.getProxyEnvAddress()) {
      this.proxy = (await this.getImplementationFactory()).attach(getEnv(this.getProxyEnvAddress()));
    }

    return this;
  }

  // Transform `contracts/implementations/tokens/ERC20/ERC20.sol:ERC20` to `ERC20`
  getContractName() {
    let name = this.getFactoryName();
    if (name.includes(':')) {
      const expression = new RegExp(':[a-zA-Z0-9]*');
      const res = expression.exec(name);
      if (res.length > 0) {
        name = res[0].substring(1);
      }
    }

    return name;
  }

  // Override this functions for base deploy
  getFactoryName() {
    return '';
  }

  // Override this functions for proxy deploy
  getInitializeFunctionName() {
    return this.getContractName() + '_init';
  }

  getImplementationEnvAddress() {
    return;
  }

  getProxyEnvAddress() {
    return;
  }
}

module.exports = UUPSDeployer;
