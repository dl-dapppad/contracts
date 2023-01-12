// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface IToken {
    struct WhitelistAccount {
        bool toEnable;
        bool fromEnable;
    }

    /**
     * @notice Mint `amount_` for `account_`
     * @param account_ Recivier address
     * @param amount_ Token amount
     */
    function mint(address account_, uint256 amount_) external;
}
