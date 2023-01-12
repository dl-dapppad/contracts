// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "@dlsl/dev-modules/utils/Globals.sol";

import "./extensions/UUPSAccessControl.sol";

import "./interfaces/ICashback.sol";

contract Cashback is ERC165Upgradeable, UUPSAccessControl, ICashback {
    bytes32 public constant PAYMENT_CONTRACT_ROLE = keccak256("PAYMENT_CONTRACT_ROLE");

    struct ProductCahsback {
        uint256 cumulativeSum;
        uint256 totalPoints;
    }

    struct AccountCashback {
        uint256 cumulativeSum;
        uint256 pendingCashback;
        uint256 points;
    }

    mapping(bytes32 => ProductCahsback) public productsCahsback;
    mapping(bytes32 => mapping(address => AccountCashback)) public accountsCahsback;

    function Cashback_init(address accessControl_) public initializer {
        __UUPSAccessControl_init(accessControl_);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(ICashback).interfaceId || super.supportsInterface(interfaceId);
    }

    function mintPoints(
        bytes32 product_,
        uint256 amount_,
        address recipient_
    ) external hasRole(PAYMENT_CONTRACT_ROLE) {
        ProductCahsback storage productCahsback = productsCahsback[product_];
        AccountCashback storage accountCahsback = accountsCahsback[product_][recipient_];

        ProductCahsback memory productCahsback_ = productCahsback;
        AccountCashback memory accountCahsback_ = accountCahsback;

        accountCahsback.pendingCashback = _getAccountCashback(
            accountCahsback_,
            productCahsback_.cumulativeSum
        );

        if (productCahsback_.totalPoints != 0) {
            productCahsback.cumulativeSum =
                productCahsback_.cumulativeSum +
                (amount_ * PRECISION) /
                productCahsback_.totalPoints;
            accountCahsback.cumulativeSum = productCahsback.cumulativeSum;
        }

        productCahsback.totalPoints = productCahsback_.totalPoints + amount_;
        accountCahsback.points = accountCahsback_.points + amount_;
    }

    function useCashback(
        bytes32[] calldata products_,
        uint256[] calldata amounts_,
        address sender_
    ) external hasRole(PAYMENT_CONTRACT_ROLE) returns (uint256) {
        uint256 cashbackAmount_;
        for (uint256 i = 0; i < products_.length; i++) {
            AccountCashback storage accountCahsback = accountsCahsback[products_[i]][sender_];
            uint256 productCumulativeSum = productsCahsback[products_[i]].cumulativeSum;

            uint256 cashbackFromProduct_ = _getAccountCashback(
                accountCahsback,
                productCumulativeSum
            );

            if (cashbackFromProduct_ == 0) {
                continue;
            }

            if (cashbackFromProduct_ < amounts_[i]) {
                accountCahsback.pendingCashback = 0;
                cashbackAmount_ += cashbackFromProduct_;
            } else {
                accountCahsback.pendingCashback = cashbackFromProduct_ - amounts_[i];
                cashbackAmount_ += amounts_[i];
            }
            accountCahsback.cumulativeSum = productCumulativeSum;
        }

        return cashbackAmount_;
    }

    function getAccountCashbacks(bytes32[] calldata products_, address account_)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory amounts_;
        for (uint256 i = 0; i < products_.length; i++) {
            amounts_[i] = _getAccountCashback(
                accountsCahsback[products_[i]][account_],
                productsCahsback[products_[i]].cumulativeSum
            );
        }

        return amounts_;
    }

    function getAccountCashback(bytes32 product_, address account_)
        external
        view
        returns (uint256)
    {
        return
            _getAccountCashback(
                accountsCahsback[product_][account_],
                productsCahsback[product_].cumulativeSum
            );
    }

    function _getAccountCashback(
        AccountCashback memory accountCahsback_,
        uint256 productCumulativeSum_
    ) private pure returns (uint256) {
        uint256 cashback_ = ((productCumulativeSum_ - accountCahsback_.cumulativeSum) *
            accountCahsback_.points) / PRECISION;

        return accountCahsback_.pendingCashback + cashback_;
    }
}
