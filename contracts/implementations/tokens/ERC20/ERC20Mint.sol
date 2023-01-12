// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./extensions/ERC20Base.sol";
import "../../../extensions/UUPSBase.sol";

contract ERC20Mint is UUPSBase, ERC20Base, ERC20Upgradeable {
    function ERC20Mint_init(
        string memory name_,
        string memory symbol_,
        uint256 mintAmount_,
        address mintRecivier_,
        uint8 decimals_
    ) public initializer {
        __UUPSBase_init();
        __ERC20_init(name_, symbol_);

        _decimals = decimals_;
        _mint(mintRecivier_, mintAmount_);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address account_, uint256 amount_) public onlyOwner {
        _mint(account_, amount_);
    }
}
