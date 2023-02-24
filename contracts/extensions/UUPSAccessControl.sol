// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

abstract contract UUPSAccessControl is UUPSUpgradeable {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    bool public isNotUpgradeable;
    address public accessControl;

    modifier hasRole(bytes32 role_) {
        require(
            IAccessControlUpgradeable(accessControl).hasRole(role_, msg.sender),
            "UUPSAC: forbidden"
        );
        _;
    }

    function __UUPSAccessControl_init(address accessControl_) internal onlyInitializing {
        __ERC1967Upgrade_init();
        __UUPSUpgradeable_init();

        _setAccessControl(accessControl_);
    }

    function removeUpgradeability() external hasRole(DEFAULT_ADMIN_ROLE) {
        isNotUpgradeable = true;
    }

    function setAccessControl(address accessControl_) external hasRole(DEFAULT_ADMIN_ROLE) {
        _setAccessControl(accessControl_);
    }

    function _setAccessControl(address accessControl_) internal {
        require(
            IERC165Upgradeable(accessControl_).supportsInterface(
                type(IAccessControlUpgradeable).interfaceId
            ),
            "UUPSAC: invalid address"
        );

        accessControl = accessControl_;
    }

    function _authorizeUpgrade(address) internal view override hasRole(DEFAULT_ADMIN_ROLE) {
        require(!isNotUpgradeable, "UUPSAC: upgrade isn't available");
    }
}
