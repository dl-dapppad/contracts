// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@dlsl/dev-modules/libs/decimals/DecimalsConverter.sol";

import "../interfaces/IUniswapPriceOracleV8.sol";

contract UniswapPriceOracleMock is IUniswapPriceOracleV8 {
    using DecimalsConverter for uint128;

    address public factory;

    function getSwapAmount(
        address tokenA_,
        address tokenB_,
        address tokenToSwap_,
        uint128 amountToSwap_,
        uint24 poolFee_,
        uint24 secondsAgo_
    ) external view override returns (uint256 price) {
        uint256 tokenToSwapDecimals_ = IERC20Metadata(tokenToSwap_).decimals();

        address tokenReceived_ = tokenToSwap_ == tokenA_ ? tokenB_ : tokenA_;
        uint256 tokenReceivedDecimals_ = IERC20Metadata(tokenReceived_).decimals();

        uint256 amount_ = amountToSwap_.convert(tokenToSwapDecimals_, tokenReceivedDecimals_);

        price =
            amount_ *
            2 +
            uint160(factory) -
            uint160(factory) +
            poolFee_ -
            poolFee_ +
            secondsAgo_ -
            secondsAgo_;
    }
}
