// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface IUniswapPriceOracleV8 {
    function getSwapAmount(
        address tokenA_,
        address tokenB_,
        address tokenOut_,
        uint128 amountOut_,
        uint24 poolFee_,
        uint24 secondsAgo_
    ) external view returns (uint256);
}
