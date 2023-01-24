// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

interface IFarming {
    event Supplied(address indexed account, uint256 amount);
    event Invested(address indexed account, uint256 amount);
    event Claimed(address indexed account, uint256 amount);
    event Withdrawn(
        address indexed account,
        address indexed receiver,
        uint256 amount,
        uint256 rewards
    );

    /**
     * @dev amount - invested amount
     * @dev cumulativeSum - reward in reward tokens per one invested token
     * @dev rewards - pending rewards
     */
    struct InvestInfo {
        uint256 amount;
        uint256 cumulativeSum;
        uint256 rewards;
    }

    function Farming_init() external;

    /**
     * @notice Set tokens info
     * @param investmentToken_ Addresses invest (stake) this token
     * @param rewardToken_ Addresses claim this token
     */
    function setTokens(address investmentToken_, address rewardToken_) external;

    /**
     * @notice Transfer reward token to this contract
     * @param amount_ Token amount
     */
    function supply(uint256 amount_) external;

    /**
     * @notice Transfer invest token to this contract
     * @param amount_ Token amount
     */
    function invest(uint256 amount_) external;

    /**
     * @notice Claim all rewards at this moment for `account_`
     * @param account_ Account address
     */
    function claim(address account_) external;

    /**
     * @notice Withdraw investment and reward tokens from `msg.sender` for `receiver_`
     * @param amount_ Token
     * @param receiver_ Account address
     */
    function withdraw(uint256 amount_, address receiver_) external;

    /**
     * @notice Return `account_` investment amount
     * @param account_ Account address
     */
    function getInvestmentAmount(address account_) external view returns (uint256);

    /**
     * @notice Return `account_` reward amount
     * @param account_ Account address
     */
    function getRewards(address account_) external view returns (uint256);

    /**
     * @notice Return total invested amount
     */
    function getTotalInvestedAmount() external view returns (uint256);

    /**
     * @notice Return total reward amount
     */
    function getTotalRewardAmount() external view returns (uint256);

    /**
     * @notice Withdraw stuck ERC20 tokens
     * @param token_ Token address
     * @param to_ Recivier address
     * @param amount_ Token amount
     */
    function withdrawStuckERC20(address token_, address to_, uint256 amount_) external;

    /**
     * @notice Return reward token address
     */
    function rewardToken() external view returns (address);
}
