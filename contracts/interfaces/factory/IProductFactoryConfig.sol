// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

interface IProductFactoryConfig {
    event ProductAdded(bytes32 productAlias);
    event PaymentChanged(address payment);
    event ImplementationChanged(bytes32 productAlias, address implementation);
    event PricesChanged(bytes32 productAlias, uint256 currentPrice, uint256 minPrice);
    event PercentsChanged(bytes32 productAlias, uint256 decreasePercent, uint256 cashbackPercent);
    event StatusChanged(bytes32 productAlias, bool status);

    /**
     * @dev currentPrice - current product price
     * @dev minPrice - ninimal product price
     * @dev decreasePercent - product price will be decrease at this percent
     * @dev cashbackPercent - cashback percent for distributor contract
     * @dev salesCount - product sales count
     * @dev isActive - availability to buy product
     * @dev implementation - implementation contract address for Proxy
     */
    struct Product {
        uint256 currentPrice;
        uint256 minPrice;
        uint128 decreasePercent;
        uint128 cashbackPercent;
        uint64 salesCount;
        bool isActive;
        address implementation;
    }

    /**
     * @notice Add product config
     * @param alias_ Product alias
     * @param implementation_ Implementation contract address
     * @param currentPrice_ Current product price, base decimals
     * @param minPrice_ Minimal product price, base decimals
     * @param decreasePercent_ Product price will be decrease at this percent after sale
     * @param cashbackPercent_ Cashback percent for distributor contract
     * @param isActive_ Availability to buy product
     */
    function setupProduct(
        bytes32 alias_,
        address implementation_,
        uint256 currentPrice_,
        uint256 minPrice_,
        uint128 decreasePercent_,
        uint128 cashbackPercent_,
        bool isActive_
    ) external;

    /**
     * @notice Set Payment contract address
     * @param payment_ Payment contract address
     */
    function setPayment(address payment_) external;

    /**
     * @notice Add new product
     * @param alias_ Product alias
     */
    function addProduct(bytes32 alias_) external;

    /**
     * @notice Set `implementation_` for `alias_`
     * @param alias_ Product alias
     * @param implementation_ Implementation contract address
     */
    function setImplementation(bytes32 alias_, address implementation_) external;

    /**
     * @notice Set `currentPrice_` and `minPrice_` for `alias_`
     * @param alias_ Product alias
     * @param currentPrice_ Current product price
     * @param minPrice_ Minimal product price
     */
    function setPrices(bytes32 alias_, uint256 currentPrice_, uint256 minPrice_) external;

    /**
     * @notice Set `decreasePercent_` and `cashbackPercent_` for `alias_`
     * @param alias_ Product alias
     * @param decreasePercent_ Product price will be decrease at this percent after sale
     * @param cashbackPercent_ Cashback percent for distributor contract
     */
    function setPercents(
        bytes32 alias_,
        uint128 decreasePercent_,
        uint128 cashbackPercent_
    ) external;

    /**
     * @notice Set `isActive_` for `alias_`
     * @param alias_ Product alias
     * @param isActive_ Availability to buy product
     */
    function setStatus(bytes32 alias_, bool isActive_) external;

    /**
     * @notice Return available products
     */
    function getProducts() external view returns (bytes32[] memory);

    /**
     * @notice Return product price after one sale
     * @param alias_ Product alias
     */
    function getNewPrice(bytes32 alias_) external view returns (uint256);

    /**
     * @notice Return cashback amount for current sale
     * @param alias_ Product alias
     */
    function getCashback(bytes32 alias_) external view returns (uint256);
}
