// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

interface IWETH9 {
    function deposit() external payable;

    function withdraw(uint256 wad_) external;

    function balanceOf(address account_) external returns (uint256);
}
