// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SwapRouterMock {
    using SafeERC20 for IERC20;

    uint256 remainder;

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function setRemainder(uint256 remainder_) external {
        remainder = remainder_;
    }

    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        returns (uint256 amountIn)
    {
        IERC20(params.tokenOut).transfer(msg.sender, params.amountOut);

        amountIn = params.amountInMaximum - remainder;
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), amountIn);
    }
}
