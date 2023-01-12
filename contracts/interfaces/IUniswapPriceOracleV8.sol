// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface IUniswapPriceOracleV8 {
    function getInSwapAmount(
        address tokenA_,
        address tokenB_,
        address tokenOut_,
        uint128 amountOut_,
        uint24 fee_,
        uint24 multiplier
    ) external view returns (uint256);
}
