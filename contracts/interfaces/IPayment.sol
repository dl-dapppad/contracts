// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

interface IPayment {
    event PaymentTokenAdded(address token);
    event PaymentTokenRemoved(address token);
    event PointTokenChanged(address pointToken);
    event CashbackChanged(address cashback);
    event TreasuryChanged(address treasury);
    event UniswapPriceOracleChanged(address uniswapPriceOracle);
    event Payed(
        address indexed payer,
        address paymentToken,
        bytes32 productAlias,
        uint256 priceInPaymentToken,
        uint256 cashbackInPaymentToken
    );

    /**
     * @dev poolFee - uniV3 pool fee
     * @dev secondsAgo - Number of seconds in the past from which to calculate the price
     */
    struct SwapInfo {
        uint24 poolFee;
        uint24 secondsAgo;
    }

    function Payment_init(address accessControl_) external;

    /**
     * @notice Setup contract config
     * @param pointToken_ Cashback point token address
     * @param cashback_ Cashback contract address
     * @param treasury_ Treasury address
     * @param uniPriceOracle_ Uniswap price oracle contract address
     */
    function setup(
        address pointToken_,
        address cashback_,
        address treasury_,
        address uniPriceOracle_
    ) external;

    /**
     * @notice Add payment tokens, for this tokens account can buy products
     * @param tokens_ Tokens addresses
     * @param swapInfos_ See SwapInfo
     * @param statuses_ Add or remove token
     */
    function setPaymentTokens(
        SwapInfo[] calldata swapInfos_,
        address[] calldata tokens_,
        bool[] calldata statuses_
    ) external;

    /**
     * @notice Set `pointToken_`
     * @param pointToken_ Cashback point token address
     */
    function setPointToken(address pointToken_) external;

    /**
     * @notice Set `cashback_` smart contract
     * @param cashback_ Contract address
     */
    function setCashback(address cashback_) external;

    /**
     * @notice Set `treasury`. Token amount will be transfered for `treasury`
     * @param treasury_ Aaddress
     */
    function setTreasury(address treasury_) external;

    /**
     * @notice Set `uniPriceOracle`
     * @param uniPriceOracle_ Uniswap price oracle contract address
     */
    function setUniPriceOracle(address uniPriceOracle_) external;

    /**
     * @notice Factory call this function. Transfer funds between addresses and contracts
     * @param product_ Product alias
     * @param paymentToken_ Payment token, for this token address purchase product
     * @param payer_ Product payer
     * @param price_ Full product price, include `cashback_`, base decimals
     * @param cashback_ Amount that should be accrued to cashback pool , base decimals
     * @param discountProducts_ Discount product pool
     * @param discounts_ Discount amout, base decimals
     */
    function pay(
        bytes32 product_,
        address paymentToken_,
        address payer_,
        uint256 price_,
        uint256 cashback_,
        bytes32[] calldata discountProducts_,
        uint256[] calldata discounts_
    ) external;

    /**
     * @notice Factory call this function. Transfer funds between addresses and contracts. For native tokens
     * @param product_ Product alias
     * @param paymentToken_ Payment token, for this token address purchase product
     * @param payer_ Product payer
     * @param price_ Full product price, include `cashback_`, base decimals
     * @param cashback_ Amount that should be accrued to cashback pool , base decimals
     * @param discountProducts_ Discount product pool
     * @param discounts_ Discount amout, base decimals
     */
    function payNative(
        bytes32 product_,
        address paymentToken_,
        address payer_,
        uint256 price_,
        uint256 cashback_,
        bytes32[] calldata discountProducts_,
        uint256[] calldata discounts_
    ) external payable;

    /**
     * @notice Return payment tokens
     * @param index_ Payment token index
     */
    function getPaymentToken(uint256 index_) external view returns (address);

    /**
     * @notice Return UNI price
     * @param receiveToken_ Token to receive
     * @param swapToken_ Swap token address
     * @param swapAmount_ Swap token amount
     */
    function getSwapAmount(
        address receiveToken_,
        address swapToken_,
        uint256 swapAmount_
    ) external view returns (uint256);

    /**
     * @notice Return price info, with icluded discount
     * @param paymentToken_ Payment token, for this token address purchase product
     * @param price_ Full product price, include `cashback_`, base decimals
     * @param cashback_ Amount that should be accrued to cashback pool , base decimals
     * @param discount_ Discount amout, base decimals
     */
    function getPriceWithDiscount(
        address paymentToken_,
        uint256 price_,
        uint256 cashback_,
        uint256 discount_
    ) external view returns (uint256, uint256);
}
