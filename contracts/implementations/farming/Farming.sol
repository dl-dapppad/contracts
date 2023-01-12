// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@dlsl/dev-modules/libs/decimals/DecimalsConverter.sol";
import "@dlsl/dev-modules/utils/Globals.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "../../interfaces/implementations/farming/IFarming.sol";

contract Farming is ERC165Upgradeable, OwnableUpgradeable, UUPSUpgradeable, IFarming {
    using DecimalsConverter for uint256;
    using SafeERC20 for IERC20;

    address public investmentToken;
    address public rewardToken;

    uint256 private _totalInvestedAmount;
    uint256 private _totalRewardAmount;

    uint256 public cumulativeSum;

    mapping(address => InvestInfo) public accountInvestInfo;

    function Farming_init() public initializer {
        __ERC165_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ERC1967Upgrade_init();
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IFarming).interfaceId || super.supportsInterface(interfaceId);
    }

    function setTokens(address investmentToken_, address rewardToken_) external onlyOwner {
        investmentToken = investmentToken_;
        rewardToken = rewardToken_;
    }

    function supply(uint256 amount_) external {
        uint256 _totalInvestedAmount_ = _totalInvestedAmount;
        require(_totalInvestedAmount_ > 0, "Farming: no investment");

        address rewardToken_ = rewardToken;
        uint8 rewardDecimals_ = IERC20Metadata(rewardToken_).decimals();

        amount_ = amount_.to18(rewardDecimals_);
        require(amount_ > 0, "Farming: invalid amount");

        IERC20(rewardToken_).safeTransferFrom(
            msg.sender,
            address(this),
            amount_.from18(rewardDecimals_)
        );

        cumulativeSum += (amount_ * PRECISION) / _totalInvestedAmount_;
        _totalRewardAmount += amount_;

        emit Supplied(msg.sender, amount_);
    }

    function invest(uint256 amount_) external {
        address investmentToken_ = investmentToken;
        uint8 investmentDecimals_ = IERC20Metadata(investmentToken_).decimals();

        amount_ = amount_.to18(investmentDecimals_);
        require(amount_ > 0, "Farming: invalid amount");
        IERC20(investmentToken_).safeTransferFrom(
            msg.sender,
            address(this),
            amount_.from18(investmentDecimals_)
        );

        InvestInfo storage investInfo = accountInvestInfo[msg.sender];

        investInfo.rewards = _calculateRewards(investInfo);
        investInfo.amount += amount_;
        investInfo.cumulativeSum = cumulativeSum;

        _totalInvestedAmount += amount_;

        emit Invested(msg.sender, amount_);
    }

    function claim(address account_) external {
        InvestInfo storage investInfo = accountInvestInfo[account_];

        uint256 rewards_ = _calculateRewards(investInfo);
        require(rewards_ > 0, "Farming: nothing to claim");

        investInfo.cumulativeSum = cumulativeSum;
        investInfo.rewards = 0;
        _totalRewardAmount -= rewards_;

        address rewardToken_ = rewardToken;
        IERC20(rewardToken_).safeTransfer(
            account_,
            rewards_.from18(IERC20Metadata(rewardToken_).decimals())
        );

        emit Claimed(account_, rewards_);
    }

    function withdraw(uint256 amount_, address receiver_) external {
        address investmentToken_ = investmentToken;
        uint8 investmentDecimals_ = IERC20Metadata(investmentToken_).decimals();
        amount_ = amount_.to18(investmentDecimals_);
        require(amount_ > 0, "Farming: invalid amount");

        InvestInfo storage investInfo = accountInvestInfo[msg.sender];

        uint256 investAmount_ = investInfo.amount;
        require(investAmount_ > 0, "Farming: nothing to withdraw");

        if (amount_ > investAmount_) amount_ = investAmount_;

        uint256 rewards_ = _calculateRewards(investInfo);

        investInfo.amount = investAmount_ - amount_;
        investInfo.rewards = 0;
        investInfo.cumulativeSum = cumulativeSum;
        _totalInvestedAmount -= amount_;
        _totalRewardAmount -= rewards_;

        IERC20(investmentToken_).safeTransfer(
            receiver_,
            amount_.from18(IERC20Metadata(investmentToken_).decimals())
        );

        if (rewards_ > 0) {
            address rewardToken_ = rewardToken;
            IERC20(rewardToken_).safeTransfer(
                receiver_,
                rewards_.from18(IERC20Metadata(rewardToken_).decimals())
            );
        }

        emit Withdrawn(msg.sender, receiver_, amount_, rewards_);
    }

    function getInvestmentAmount(address account_) external view returns (uint256) {
        return
            accountInvestInfo[account_].amount.from18(IERC20Metadata(investmentToken).decimals());
    }

    function getRewards(address account_) external view returns (uint256) {
        return
            _calculateRewards(accountInvestInfo[account_]).from18(
                IERC20Metadata(rewardToken).decimals()
            );
    }

    function getTotalInvestedAmount() external view returns (uint256) {
        return _totalInvestedAmount.from18(IERC20Metadata(investmentToken).decimals());
    }

    function getTotalRewardAmount() external view returns (uint256) {
        return _totalRewardAmount.from18(IERC20Metadata(rewardToken).decimals());
    }

    function withdrawStuckERC20(
        address token_,
        address to_,
        uint256 amount_
    ) external onlyOwner {
        uint256 available_;
        if (token_ == investmentToken) {
            available_ = IERC20(investmentToken).balanceOf(address(this)) - _totalInvestedAmount;
        } else if (token_ == rewardToken) {
            available_ = IERC20(rewardToken).balanceOf(address(this)) - _totalRewardAmount;
        } else {
            available_ = IERC20(token_).balanceOf(address(this));
        }

        amount_ = amount_ > available_ ? available_ : amount_;
        require(amount_ > 0, "Farming: nothing to withdraw");

        IERC20(token_).safeTransfer(to_, amount_);
    }

    function _calculateRewards(InvestInfo storage investInfo) private view returns (uint256) {
        uint256 potentialRewards_ = ((cumulativeSum - investInfo.cumulativeSum) *
            investInfo.amount) / PRECISION;

        return investInfo.rewards + potentialRewards_;
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}
}
