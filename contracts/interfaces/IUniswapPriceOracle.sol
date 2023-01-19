// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.8.0;

interface IUniswapPriceOracle {
    event FactoryChanged(address factory);

    /**
     * @notice Set swap config
     * @param factory_ Uniswap factory
     */
    function setFactory(address factory_) external;

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
