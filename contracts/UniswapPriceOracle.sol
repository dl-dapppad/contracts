// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts-v3/access/Ownable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

import "./interfaces/IUniswapPriceOracle.sol";

contract UniswapPriceOracle is Ownable, IUniswapPriceOracle {
    address public factory;

    function setFactory(address factory_) external override onlyOwner {
        require(factory_ != address(0), "UPO: invalid factory");

        factory = factory_;

        emit FactoryChanged(factory_);
    }

    function getSwapAmount(
        address tokenA_,
        address tokenB_,
        address tokenToSwap_,
        uint128 amountToSwap_,
        uint24 poolFee_,
        uint24 secondsAgo_
    ) external view override returns (uint256 price) {
        address pool_ = IUniswapV3Factory(factory).getPool(tokenA_, tokenB_, poolFee_);
        require(pool_ != address(0), "UPO: pool isn't found");

        address tokenReceived_ = tokenToSwap_ == tokenA_ ? tokenB_ : tokenA_;
        (int24 tick_, ) = OracleLibrary.consult(pool_, secondsAgo_);

        price = OracleLibrary.getQuoteAtTick(tick_, amountToSwap_, tokenToSwap_, tokenReceived_);
    }
}
