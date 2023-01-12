// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "./extensions/ERC20Base.sol";
import "../../../extensions/UUPSBase.sol";

contract ERC20Burn is UUPSBase, ERC20Base, ERC20BurnableUpgradeable {
    function ERC20Burn_init(
        string memory name_,
        string memory symbol_,
        uint256 mintAmount_,
        address mintRecivier_,
        uint8 decimals_
    ) public initializer {
        __UUPSBase_init();
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();

        _decimals = decimals_;
        _mint(mintRecivier_, mintAmount_);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
