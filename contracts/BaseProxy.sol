// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract BaseProxy is ERC1967Proxy {
    constructor(
        bytes memory initializeData_,
        address implementation_
    ) ERC1967Proxy(implementation_, initializeData_) {}
}
