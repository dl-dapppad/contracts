// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "../interfaces/utils/IWETH9.sol";

contract SwapMock {
    using SafeERC20 for IERC20;

    address public swapRouter;
    address public factory;
    address public weth;

    constructor(address swapRouter_, address factory_, address weth_) {
        swapRouter = swapRouter_;
        factory = factory_;
        weth = weth_;
    }

    function swapWETH() external payable {
        IWETH9(weth).deposit{value: msg.value}();
    }

    function transferWETH(address recipient_, uint256 amount) external payable {
        IERC20(weth).transfer(recipient_, amount);
    }

    function swapExactInputSingle(
        address in_,
        address out_,
        uint256 amountIn_,
        uint24 fee_
    ) external {
        IERC20(in_).safeIncreaseAllowance(swapRouter, amountIn_);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: in_,
            tokenOut: out_,
            fee: fee_,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn_,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        ISwapRouter(swapRouter).exactInputSingle(params);
    }

    function swapExactOutputSingle(
        address in_,
        address out_,
        uint256 amountOut_,
        uint256 amountInMaximum_,
        uint24 fee_
    ) external {
        IERC20(in_).safeIncreaseAllowance(swapRouter, amountInMaximum_);

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
            tokenIn: in_,
            tokenOut: out_,
            fee: fee_,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountOut: amountOut_,
            amountInMaximum: amountInMaximum_,
            sqrtPriceLimitX96: 0
        });

        ISwapRouter(swapRouter).exactOutputSingle(params);
    }
}
