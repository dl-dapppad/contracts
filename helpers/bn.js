const { ethers } = require('ethers');

const BigNumber = require('bignumber.js');

BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_DOWN });
BigNumber.config({ EXPONENTIAL_AT: [-1e9, 1e9] });
BigNumber.config({ RANGE: 500 });

const BASE_DECIMALS = 27;
const BASE_WEI = 18;

const toBN = (value) => new BigNumber(value);

const toDecimal = (value, decimals = BASE_DECIMALS) => toBN(value).multipliedBy(toBN(10).pow(decimals));

const fromDecimal = (value, decimals = BASE_DECIMALS) => toBN(value).dividedBy(toBN(10).pow(decimals));

const arrToDecimal = (arr, decimals = BASE_DECIMALS) => arr.map((item) => toDecimal(item, decimals));

const toWei = (value, decimals = BASE_WEI) => toBN(value).multipliedBy(toBN(10).pow(decimals));

const fromWei = (value, decimals = BASE_WEI) => toBN(value).dividedBy(toBN(10).pow(decimals));

const arrToWei = (arr, decimals = BASE_WEI) => arr.map((item) => toWei(item, decimals));

const arrToString = (arr, convertToBn = true) =>
  arr.map((item) => (convertToBn ? toBN(item).toString() : item.toString()));

const percentToDecimal = (value, decimals = BASE_DECIMALS) => toDecimal(value, decimals).dividedBy(100);

module.exports = {
  toBN,
  toDecimal,
  fromDecimal,
  arrToDecimal,
  toWei,
  fromWei,
  arrToWei,
  arrToString,
  percentToDecimal,
  zeroAddress: ethers.constants.AddressZero,
  maxUint256: ethers.constants.MaxUint256,
};
