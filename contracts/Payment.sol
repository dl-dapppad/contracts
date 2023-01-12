// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "@dlsl/dev-modules/libs/decimals/DecimalsConverter.sol";

import "./extensions/UUPSAccessControl.sol";

import "./interfaces/IUniswapPriceOracleV8.sol";
import "./interfaces/IPayment.sol";
import "./interfaces/ICashback.sol";

contract Payment is ERC165Upgradeable, UUPSAccessControl, IPayment {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    using DecimalsConverter for uint256;

    // Access control
    bytes32 public constant PAYMENT_ROLE = keccak256("PAYMENT_ROLE");
    bytes32 public constant FACTORY_CONTRACT_ROLE = keccak256("FACTORY_CONTRACT_ROLE");
    // End

    // Swap and points
    address public pointToken;
    EnumerableSet.AddressSet paymentTokens;
    mapping(address => SwapInfo) public paymentTokenSwapInfo;
    // End

    // Contracts
    address public cashback;
    address public treasury;
    address public uniPriceOracle;

    // End

    function Payment_init(address accessControl_) public initializer {
        __UUPSAccessControl_init(accessControl_);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IPayment).interfaceId || super.supportsInterface(interfaceId);
    }

    function setup(
        address pointToken_,
        address cashback_,
        address treasury_,
        address uniPriceOracle_
    ) external {
        setPointToken(pointToken_);
        setCashback(cashback_);
        setTreasury(treasury_);
        setUniPriceOracle(uniPriceOracle_);
    }

    function setPaymentTokens(
        SwapInfo[] calldata swapInfos_,
        address[] calldata tokens_,
        bool[] calldata statuses_
    ) external hasRole(PAYMENT_ROLE) {
        for (uint256 i = 0; i < tokens_.length; i++) {
            address token_ = tokens_[i];
            if (statuses_[i]) {
                paymentTokenSwapInfo[token_] = swapInfos_[i];
                paymentTokens.add(token_);

                emit PaymentTokenAdded(token_);
            } else {
                delete paymentTokenSwapInfo[token_];
                paymentTokens.remove(token_);

                emit PaymentTokenRemoved(token_);
            }
        }
    }

    function setPointToken(address pointToken_) public hasRole(PAYMENT_ROLE) {
        pointToken = pointToken_;

        emit PointTokenChanged(pointToken_);
    }

    function setCashback(address cashback_) public hasRole(PAYMENT_ROLE) {
        require(
            IERC165Upgradeable(cashback_).supportsInterface(type(ICashback).interfaceId),
            "Payment: not Cashback contract"
        );

        cashback = cashback_;

        emit CashbackChanged(cashback_);
    }

    function setTreasury(address treasury_) public hasRole(PAYMENT_ROLE) {
        treasury = treasury_;

        emit TreasuryChanged(treasury_);
    }

    function setUniPriceOracle(address uniPriceOracle_) public hasRole(PAYMENT_ROLE) {
        uniPriceOracle = uniPriceOracle_;

        emit UniswapPriceOracleChanged(uniPriceOracle);
    }

    function pay(
        bytes32 product_,
        address paymentToken_,
        address payer_,
        uint256 price_,
        uint256 cashback_,
        bytes32[] calldata discountProducts_,
        uint256[] calldata discounts_
    ) external hasRole(FACTORY_CONTRACT_ROLE) {
        require(treasury != address(0), "Payment: treasury isn't set");
        require(paymentTokens.contains(paymentToken_), "Payment: invalid token");

        uint8 paymentDecimals_ = IERC20Metadata(paymentToken_).decimals();

        // Recalculate `price_` and `cashback_` including `paymentToken_` token decimals
        price_ = price_.from18(paymentDecimals_);
        cashback_ = cashback_.from18(paymentDecimals_);
        // End

        if (price_ == 0) return;
        require(price_ >= cashback_, "Payment: invalid amounts");

        //// Recalculate `price_` and `cashback_` including `_discountAmount`
        // Calculate real available discount, based on the `products_` and `amounts_`
        // Discount returns in `pointToken`
        uint256 discountInPointToken_;
        if (discountProducts_.length > 0) {
            discountInPointToken_ = ICashback(cashback).useCashback(
                discountProducts_,
                discounts_,
                payer_
            );
        }
        // End

        if (discountInPointToken_ > 0) {
            uint256 discountInPaymentToken_ = discountInPointToken_;
            // If needed, recalculate discount `pointToken_` to `paymentToken_`
            if (pointToken != paymentToken_) {
                discountInPaymentToken_ = getSwapAmount(
                    pointToken,
                    paymentToken_,
                    discountInPointToken_
                );
            }
            // End

            // In case of full discount, `payer_` can lose some cashback
            if (discountInPaymentToken_ >= price_) {
                price_ = 0;
                cashback_ = 0;
            } else {
                uint256 paymentAmountWithDiscount_ = price_ - discountInPaymentToken_;

                cashback_ = (cashback_ * paymentAmountWithDiscount_) / price_; // Proportional reduction of the cashback, by the amount of the discount
                price_ = paymentAmountWithDiscount_;
            }
        }
        //// End

        if (price_ == 0) return;

        IERC20(paymentToken_).safeTransferFrom(payer_, treasury, price_);

        if (cashback_ != 0) {
            uint256 cashbackInPointToken_ = getSwapAmount(paymentToken_, pointToken, cashback_);
            ICashback(cashback).mintPoints(product_, cashbackInPointToken_, payer_);
        }
    }

    function getPaymentToken(uint256 index_) external view returns (address) {
        return paymentTokens.at(index_);
    }

    function getSwapAmount(
        address receiveToken_,
        address swapToken_,
        uint256 swapAmount_
    ) public view returns (uint256) {
        require(swapAmount_ <= type(uint128).max, "Payment: discount amount too big");

        SwapInfo memory swapInfo_;
        if (paymentTokens.contains(receiveToken_)) {
            swapInfo_ = paymentTokenSwapInfo[receiveToken_];
        } else {
            swapInfo_ = paymentTokenSwapInfo[swapToken_];
        }

        return
            IUniswapPriceOracleV8(uniPriceOracle).getSwapAmount(
                receiveToken_,
                swapToken_,
                swapToken_,
                uint128(swapAmount_),
                swapInfo_.poolFee,
                swapInfo_.secondsAgo
            );
    }
}
