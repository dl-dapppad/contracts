// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

interface IUniswapPriceOracleV8 {
    /**
     * @notice Return amount of token needed to get `amountOut_` for `tokenOut_`
     * @param tokenA_ Token A in pair
     * @param tokenB_ Token B in pair
     * @param tokenOut_ Expected token
     * @param amountOut_ Expected token amount
     * @param poolFee_ Pool fee
     * @param secondsAgo_ Number of seconds in the past from which to calculate the price
     */
    function getSwapAmount(
        address tokenA_,
        address tokenB_,
        address tokenOut_,
        uint128 amountOut_,
        uint24 poolFee_,
        uint24 secondsAgo_
    ) external view returns (uint256);
}
