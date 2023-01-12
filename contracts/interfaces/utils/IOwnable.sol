// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface IOwnable {
    function owner() external view returns (address);

    function renounceOwnership() external;

    function transferOwnership(address) external;
}
