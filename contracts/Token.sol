// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./interfaces/IToken.sol";

contract Token is ERC20Burnable, AccessControl, IToken {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bool public whitelistEnable;
    mapping(address => WhitelistAccount) public whitelistAccounts;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function mint(address account_, uint256 amount_) external onlyRole(MINTER_ROLE) {
        _mint(account_, amount_);
    }

    function changeWhitelistStatus() external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelistEnable = !whitelistEnable;
    }

    function changeWhitelistAccounts(
        address[] calldata accounts_,
        bool[] calldata fromEnable_,
        bool[] calldata toEnable_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts_.length; i++) {
            whitelistAccounts[accounts_[i]].toEnable = toEnable_[i];
            whitelistAccounts[accounts_[i]].fromEnable = fromEnable_[i];
        }
    }

    function _beforeTokenTransfer(
        address from_,
        address to_,
        uint256 amount_
    ) internal view override {
        if (
            !whitelistEnable ||
            from_ == address(0) ||
            to_ == address(0) ||
            whitelistAccounts[from_].fromEnable ||
            whitelistAccounts[to_].toEnable
        ) return;

        revert("Token: address isn't on the whitelist");
    }
}
