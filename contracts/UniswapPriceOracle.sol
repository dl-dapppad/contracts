// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts-v3/access/Ownable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

import "./interfaces/IUniswapPriceOracle.sol";

contract UniswapPriceOracle is Ownable, IUniswapPriceOracle {
    uint24 public constant DECIMALS = 1000000;

    SwapConfig public swapConfig;

    function setSwapConfig(address factory_, uint24 secondsAgo_) external override onlyOwner {
        require(factory_ != address(0), "UPO: invalid factory");
        require(secondsAgo_ > 0, "UPO: invalid seconds");

        swapConfig.factory = factory_;
        swapConfig.secondsAgo = secondsAgo_;

        emit SwapConfigChanged(factory_, secondsAgo_);
    }

    function getInSwapAmount(
        address tokenA_,
        address tokenB_,
        address tokenOut_,
        uint128 amountOut_,
        uint24 fee_,
        uint24 multiplier_
    ) external view override returns (uint256 price) {
        address pool_ = IUniswapV3Factory(swapConfig.factory).getPool(tokenA_, tokenB_, fee_);
        require(pool_ != address(0), "UPO: pool isn't found");

        address tokenIn_ = tokenOut_ == tokenA_ ? tokenB_ : tokenA_;
        (int24 tick_, ) = OracleLibrary.consult(pool_, swapConfig.secondsAgo);

        price = OracleLibrary.getQuoteAtTick(tick_, amountOut_, tokenOut_, tokenIn_);
        price = (price * (DECIMALS + multiplier_)) / DECIMALS;
    }
}
