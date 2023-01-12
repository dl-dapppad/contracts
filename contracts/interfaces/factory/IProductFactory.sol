// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface IProductFactory {
    event Deployed(
        bytes32 indexed productAlias,
        address indexed payer,
        address proxy,
        address paymentToken,
        uint256 price,
        uint256 cashback
    );

    function ProductFactory_init() external;

    /**
     * @param alias_ Product alias
     * @param paymentToken_ Address buy product for this token
     * @param initializeData_ Constructor bytes
     */
    function deploy(
        bytes32 alias_,
        address paymentToken_,
        bytes memory initializeData_
    ) external returns (address);

    /**
     * @notice Return potential contract address
     * @param alias_ Product alias
     * @param initializeData_ Constructor bytes
     */
    function getPotentialContractAddress(bytes32 alias_, bytes memory initializeData_)
        external
        view
        returns (address);
}
