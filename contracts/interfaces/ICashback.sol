// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface ICashback {
    function mintPoints(
        bytes32 product_,
        uint256 amount_,
        address recipient_
    ) external;

    function useCashback(
        bytes32[] calldata products_,
        uint256[] calldata amounts_,
        address sender_
    ) external returns (uint256);
}
