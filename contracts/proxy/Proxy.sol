// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Proxy {
    /**
     * @dev Storage slot with the address of the current implementation.
     * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1
     */
    bytes32 internal constant _IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor(bytes memory initializeData_, address implementation_) {
        assembly {
            sstore(_IMPLEMENTATION_SLOT, implementation_)
        }

        (bool success, ) = implementation_.delegatecall(initializeData_);
        require(success, "Proxy: initializing failed");
    }

    fallback() external payable {
        assembly {
            let contractLogic := sload(_IMPLEMENTATION_SLOT)
            calldatacopy(0, 0, calldatasize())
            let success := delegatecall(gas(), contractLogic, 0, calldatasize(), 0, 0)
            let retSz := returndatasize()
            returndatacopy(0, 0, retSz)

            switch success
            case 0 {
                revert(0, retSz)
            }
            default {
                return(0, retSz)
            }
        }
    }
}
