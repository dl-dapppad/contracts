// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

interface ICashback {
    event PointsIssued(address indexed account, bytes32 productAlias, uint256 amount);
    event CashbackUsed(address indexed account, bytes32 productAlias, uint256 amount);

    /**
     * @notice Issue cashback points
     * @param product_ Product alias
     * @param amount_ Mint amount, base decimals
     * @param recipient_ Recipient
     */
    function issuePoints(bytes32 product_, uint256 amount_, address recipient_) external;

    /**
     * @notice Use cashback points
     * @param products_ Product aliases
     * @param amounts_ Withdraw amounts
     * @param sender_ Withdraw from address
     */
    function useCashback(
        bytes32[] calldata products_,
        uint256[] calldata amounts_,
        address sender_
    ) external returns (uint256);

    /**
     * @notice Return `account_` cashback for `products_`
     * @param products_ Product aliases
     * @param account_ Withdraw from address
     */
    function getAccountCashbacks(
        bytes32[] calldata products_,
        address account_
    ) external view returns (uint256[] memory);

    /**
     * @notice Return `account_` cashback for selected `product_`
     * @param product_ Product alias
     * @param account_ Withdraw from address
     */
    function getAccountCashback(
        bytes32 product_,
        address account_
    ) external view returns (uint256);
}
