// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.8.0;

interface IUniswapPriceOracle {
    event SwapConfigChanged(address factory, uint24 secondsAgo);

    struct SwapConfig {
        address factory;
        uint24 secondsAgo;
    }

    /**
     * @notice Set swap config
     * @param factory_ Uniswap factory
     * @param secondsAgo_ Number of seconds in the past from which to calculate the price
     */
    function setSwapConfig(address factory_, uint24 secondsAgo_) external;

    /**
     * @notice Return amount of token needed to get `amountOut_` for `tokenOut_`
     * @param tokenA_ Token A in pair
     * @param tokenB_ Token B in pair
     * @param tokenOut_ Expected token
     * @param amountOut_ Expected token amount
     * @param fee_ Pool fee
     * @param multiplier Final amount multiplier
     *
     */
    function getInSwapAmount(
        address tokenA_,
        address tokenB_,
        address tokenOut_,
        uint128 amountOut_,
        uint24 fee_,
        uint24 multiplier
    ) external view returns (uint256);
}
