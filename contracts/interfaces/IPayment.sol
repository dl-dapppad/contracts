// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface IPayment {
    event PaymentTokenAdded(address token);
    event PaymentTokenRemoved(address token);
    event MintTokenChanged(address token);
    event FarmingChanged(address farming);
    event TreasuryChanged(address treasury);
    event UniswapPriceOracleChanged(address uniswapPriceOracle);
    event Payed();

    /**
     * @dev router - uniV3 router | farming address
     * @dev sqrtPriceLimitX96
     * @dev fee - uniV3 fee
     * @dev multiplier - swap price multiplied on this value
     */
    struct SwapInfo {
        address router;
        uint160 sqrtPriceLimitX96;
        uint24 fee;
        uint24 multiplier;
    }

    function Payment_init() external;

    /**
     * @notice Setup contract config
     * @param mintToken_ This contract will be mint `mintToken_` for each product purchase
     * @param farming_ Contract address
     * @param treasury_ Aaddress
     * @param uniPriceOracle_ Uniswap price oracle contract address
     */
    function setup(
        address mintToken_,
        address farming_,
        address treasury_,
        address uniPriceOracle_
    ) external;

    /**
     * @notice Add payment tokens, for this tokens addresses can buy products
     * @param tokens_ Tokens addresses
     * @param swapInfos_ See SwapInfo
     * @param statuses_ Add or remove token
     */
    function setPaymentTokens(
        address[] calldata tokens_,
        SwapInfo[] calldata swapInfos_,
        bool[] calldata statuses_
    ) external;

    /**
     * @notice Set `mintToken`
     * @param mintToken_ This contract will be mint `mintToken_` for each product purchase
     */
    function setMintToken(address mintToken_) external;

    /**
     * @notice Set `farming`. Cashback amount will be transfered for `farming`
     * @param farming_ Contract address
     */
    function setFarming(address farming_) external;

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
     * @param paymentToken_ Payment token, for this token address purchase product
     * @param payer_ Product payer
     * @param paymentAmount_ Full product price, include `cashbackAmount_`
     * @param cashbackAmount_ Amount that should be transfered to `distributor`
     */
    function pay(
        address paymentToken_,
        address payer_,
        uint256 paymentAmount_,
        uint256 cashbackAmount_
    ) external;

    /**
     * @notice Amount that contract need for swap `paymentToken` to `baseToken`
     * @param paymentToken_ Payment token address
     * @param amountOut_ Output token amount
     */
    function getInSwapAmount(address paymentToken_, uint256 amountOut_)
        external
        view
        returns (uint256);

    /**
     * @notice Return payment tokens
     */
    function getPaymentTokens() external view returns (address[] memory);
}
