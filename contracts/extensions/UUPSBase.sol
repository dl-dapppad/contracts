// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

abstract contract UUPSBase is OwnableUpgradeable, UUPSUpgradeable {
    bool public isNotUpgradeable;

    function __UUPSBase_init() internal onlyInitializing {
        __ERC1967Upgrade_init();
        __UUPSUpgradeable_init();
        __Ownable_init();
    }

    function removeUpgradeability() external onlyOwner {
        isNotUpgradeable = true;
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {
        require(!isNotUpgradeable, "UUPSBase: upgrade isn't available");
    }
}
