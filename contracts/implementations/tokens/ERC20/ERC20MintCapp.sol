// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "./extensions/ERC20Base.sol";
import "../../../extensions/UUPSOwnable.sol";

contract ERC20MintCapp is UUPSOwnable, ERC20Base, ERC20CappedUpgradeable {
    function ERC20MintCapp_init(
        string memory name_,
        string memory symbol_,
        uint256 mintAmount_,
        address mintRecivier_,
        uint8 decimals_,
        uint256 cap_
    ) external initializer {
        __UUPSOwnable_init();
        __ERC20_init(name_, symbol_);
        __ERC20Capped_init(cap_);

        _decimals = decimals_;
        _mint(mintRecivier_, mintAmount_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address account_, uint256 amount_) public onlyOwner {
        _mint(account_, amount_);
    }
}
