const yesno = require('yesno');

const requestConfirmation = async (message = 'Ready to continue?') => {
  const ok = await yesno({
    yesValues: ['', 'yes', 'y', 'yes'],
    question: message,
  });
  if (!ok) {
    throw new Error('Script cancelled.');
  }
  console.log('');
};

const getTxParams = () => {
  return {
    gasPrice: getEnv('GAS_PRICE'),
    gasLimit: getEnv('GAS_LIMIT'),
  };
};

const getEnv = (name, isAddress = false) => {
  const env = process.env[name];
  if (!env) {
    throw new Error(`Undefined env variable: ${name}`);
  }

  if (isAddress) {
    try {
      return ethers.utils.getAddress(value);
    } catch {
      throw new Error(`Invalid env address: ${name}`);
    }
  }

  return env;
};

module.exports = {
  requestConfirmation,
  getTxParams,
  getEnv,
};
