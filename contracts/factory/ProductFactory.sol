// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/factory/IProductFactory.sol";
import "../interfaces/utils/IOwnable.sol";
import "../interfaces/IPayment.sol";

import "../BaseProxy.sol";
import "./ProductFactoryConfig.sol";

contract ProductFactory is ProductFactoryConfig, IProductFactory {
    function ProductFactory_init(address accessControl_) public initializer {
        __ProductFactoryConfig_init(accessControl_);
    }

    function deploy(
        bytes32 alias_,
        address paymentToken_,
        bytes calldata initializeData_,
        bytes32[] calldata discountAliases_,
        uint256[] calldata discounts_
    ) external payable returns (address) {
        Product storage product = _getProduct(alias_);

        require(product.isActive, "PF: inactive product");

        uint256 currentPrice_ = product.currentPrice;
        uint256 cashbackAmount_ = _getCashback(currentPrice_, product.cashbackPercent);

        if (msg.value > 0) {
            IPayment(payment).payNative{value: msg.value}(
                alias_,
                paymentToken_,
                msg.sender,
                currentPrice_,
                cashbackAmount_,
                discountAliases_,
                discounts_
            );
        } else {
            IPayment(payment).pay(
                alias_,
                paymentToken_,
                msg.sender,
                currentPrice_,
                cashbackAmount_,
                discountAliases_,
                discounts_
            );
        }

        address proxy_ = _create2(
            _getBytecode(initializeData_, product.implementation),
            _getSalt(alias_)
        );
        IOwnable(proxy_).transferOwnership(msg.sender);

        product.currentPrice = _getNewPrice(
            currentPrice_,
            product.minPrice,
            product.decreasePercent
        );
        product.salesCount++;

        emit Deployed(alias_, msg.sender, proxy_, paymentToken_, currentPrice_, cashbackAmount_);

        return proxy_;
    }

    function getPotentialContractAddress(
        bytes32 alias_,
        bytes memory initializeData_
    ) external view returns (address) {
        Product storage product = _getProduct(alias_);

        return
            _getPotentialContractAddress(
                _getBytecode(initializeData_, product.implementation),
                _getSalt(alias_)
            );
    }

    function _getSalt(bytes32 alias_) private view returns (uint256) {
        Product storage product = _getProduct(alias_);

        unchecked {
            return uint256(alias_) + uint160(msg.sender) + product.salesCount;
        }
    }

    function _getBytecode(
        bytes memory initializeData_,
        address implementation_
    ) private pure returns (bytes memory) {
        bytes memory bytecode_ = type(BaseProxy).creationCode;

        return abi.encodePacked(bytecode_, abi.encode(initializeData_, implementation_));
    }
}
