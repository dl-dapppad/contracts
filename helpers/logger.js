const { ethers } = require('hardhat');
const { requestConfirmation, getEnv } = require('./utils');

const logAll = async (title, params) => {
  logTitle(title);
  await logNetwork();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object') {
        console.log(value);
      } else {
        logParams(key, value);
      }
    }
  }

  console.log('');

  await requestConfirmation();

  console.log('Deploying...');
};

const logTitle = (message) => {
  console.log(`----------------- ${message} -----------------`);
};

const logNetwork = async () => {
  console.log(`\nNetwork info:`);

  const indent = 10;
  const network = (await ethers.provider.getNetwork()).name;

  log('sender', await ethers.provider.getSigner().getAddress(), indent);
  log('network', network === 'unknown' ? 'hardhat' : network, indent);
  log('gas price', `${getEnv('GAS_PRICE') / 10 ** 9} Gwei`, indent);
  log('gas limit', `${getEnv('GAS_LIMIT')} Gas`, indent);
};

const logTx = async (contractName, functionName, tx) => {
  console.log(`\n${contractName}.${functionName}():`);

  const indent = 9;
  if (tx.hash === undefined) {
    log('address', tx.address, indent);
    tx = tx.deployTransaction;
  }

  const gasUsed = (await ethers.provider.getTransactionReceipt(tx.hash)).gasUsed;
  const gasLimit = getEnv('GAS_LIMIT');
  const usagePercent = ((gasUsed * 100) / gasLimit).toFixed(2);
  const gasPrice = tx.gasPrice.toString();

  log('hash', tx.hash, indent);
  log('gas used', `${gasLimit} | ${gasUsed} (${usagePercent}%) Gas`, indent);
  log('gas price', `${gasPrice / 10 ** 9} Gwei`, indent);
  log('tx fee', `${(gasUsed * gasPrice) / 10 ** 18} Ether`, indent);
};

const logParams = (title, params) => {
  let maxKeyLen = 0;
  for (const [key] of Object.entries(params)) {
    if (key.length > maxKeyLen) maxKeyLen = key.length;
  }

  console.log(`\n${title.charAt(0).toUpperCase() + title.slice(1)}:`);
  for (const [key, value] of Object.entries(params)) {
    let str = `- ${key}: ` + ' '.repeat(maxKeyLen - key.length);
    if (Array.isArray(value)) {
      str += `[${value.join(', ')}]`;
    } else {
      str += value;
    }
    console.log(str);
  }
};

const log = (key, value, indent) => {
  console.log(`- ${key}: ` + ' '.repeat(indent - key.length) + value);
};

module.exports = {
  logAll,
  logTx,
};
