// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@dlsl/dev-modules/utils/Globals.sol";

import "../interfaces/factory/IProductFactoryConfig.sol";

import "../extensions/UUPSAccessControl.sol";

abstract contract ProductFactoryConfig is UUPSAccessControl, IProductFactoryConfig {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using Math for uint256;

    bytes32 public constant PRODUCT_FACTORY_ROLE = keccak256("PRODUCT_FACTORY_ROLE");

    address public payment;

    mapping(bytes32 => Product) public products;
    EnumerableSet.Bytes32Set aliases;

    function __ProductFactoryConfig_init(address accessControl_) public onlyInitializing {
        __UUPSAccessControl_init(accessControl_);
    }

    function setupProduct(
        bytes32 alias_,
        address implementation_,
        uint256 currentPrice_,
        uint256 minPrice_,
        uint128 decreasePercent_,
        uint128 cashbackPercent_,
        bool isActive_
    ) external {
        addProduct(alias_);
        setImplementation(alias_, implementation_);
        setPrices(alias_, currentPrice_, minPrice_);
        setPercents(alias_, decreasePercent_, cashbackPercent_);
        setStatus(alias_, isActive_);
    }

    function setPayment(address payment_) external hasRole(PRODUCT_FACTORY_ROLE) {
        payment = payment_;

        emit PaymentChanged(payment_);
    }

    function addProduct(bytes32 alias_) public hasRole(PRODUCT_FACTORY_ROLE) {
        aliases.add(alias_);

        emit ProductAdded(alias_);
    }

    function setImplementation(bytes32 alias_, address implementation_)
        public
        hasRole(PRODUCT_FACTORY_ROLE)
    {
        require(aliases.contains(alias_), "PFC: not found");

        products[alias_].implementation = implementation_;

        emit ImplementationChanged(alias_, implementation_);
    }

    function setPrices(
        bytes32 alias_,
        uint256 currentPrice_,
        uint256 minPrice_
    ) public hasRole(PRODUCT_FACTORY_ROLE) {
        require(currentPrice_ >= minPrice_, "PFC: invalid prices");

        Product storage product = _getProduct(alias_);

        product.currentPrice = currentPrice_;
        product.minPrice = minPrice_;

        emit PricesChanged(alias_, currentPrice_, minPrice_);
    }

    function setPercents(
        bytes32 alias_,
        uint128 decreasePercent_,
        uint128 cashbackPercent_
    ) public hasRole(PRODUCT_FACTORY_ROLE) {
        Product storage product = _getProduct(alias_);

        require(decreasePercent_ <= PERCENTAGE_100, "PFC: invalid decrease percent");
        require(cashbackPercent_ <= PERCENTAGE_100, "PFC: invalid cashback percent");

        product.decreasePercent = decreasePercent_;
        product.cashbackPercent = cashbackPercent_;

        emit PercentsChanged(alias_, decreasePercent_, cashbackPercent_);
    }

    function setStatus(bytes32 alias_, bool isActive_) public hasRole(PRODUCT_FACTORY_ROLE) {
        products[alias_].isActive = isActive_;

        emit StatusChanged(alias_, isActive_);
    }

    function getProducts() external view returns (bytes32[] memory) {
        return aliases.values();
    }

    function getNewPrice(bytes32 alias_) external view returns (uint256) {
        Product storage product = _getProduct(alias_);

        return _getNewPrice(product.currentPrice, product.minPrice, product.decreasePercent);
    }

    function getCashback(bytes32 alias_) external view returns (uint256) {
        Product storage product = _getProduct(alias_);

        return _getCashback(product.currentPrice, product.cashbackPercent);
    }

    function _getProduct(bytes32 alias_) internal view returns (Product storage) {
        require(products[alias_].implementation != address(0), "PFC: implementation not found");

        return products[alias_];
    }

    function _getNewPrice(
        uint256 currentPrice_,
        uint256 minPrice_,
        uint128 decreasePercent_
    ) internal pure returns (uint256) {
        return minPrice_.max(currentPrice_ - (currentPrice_ * decreasePercent_) / PERCENTAGE_100);
    }

    function _getCashback(uint256 currentPrice_, uint128 cashbackPercent_)
        internal
        pure
        returns (uint256)
    {
        return (currentPrice_ * cashbackPercent_) / PERCENTAGE_100;
    }

    function _getPotentialContractAddress(bytes memory bytecode_, uint256 salt_)
        internal
        view
        returns (address)
    {
        bytes32 hash_ = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt_, keccak256(bytecode_))
        );

        return address(uint160(uint256(hash_)));
    }

    function _create2(bytes memory bytecode_, uint256 salt_)
        internal
        returns (address contractAddress)
    {
        assembly {
            contractAddress := create2(callvalue(), add(bytecode_, 0x20), mload(bytecode_), salt_)
        }
    }
}
