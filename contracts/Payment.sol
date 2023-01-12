// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "@dlsl/dev-modules/libs/decimals/DecimalsConverter.sol";

import "./interfaces/IToken.sol";
import "./interfaces/implementations/farming/IFarming.sol";
import "./interfaces/IUniswapPriceOracleV8.sol";
import "./interfaces/IPayment.sol";

contract Payment is AccessControlUpgradeable, UUPSUpgradeable, IPayment {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    using DecimalsConverter for uint256;

    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");

    EnumerableSet.AddressSet paymentTokens;
    mapping(address => SwapInfo) public paymentTokenSwapInfo;

    address public mintToken;
    address public farming;
    address public treasury;
    address public uniPriceOracle;

    function Payment_init() public initializer {
        __ERC1967Upgrade_init();
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setup(
        address mintToken_,
        address farming_,
        address treasury_,
        address uniPriceOracle_
    ) external {
        setMintToken(mintToken_);
        setFarming(farming_);
        setTreasury(treasury_);
        setUniPriceOracle(uniPriceOracle_);
    }

    function setPaymentTokens(
        address[] calldata tokens_,
        SwapInfo[] calldata swapInfos_,
        bool[] calldata statuses_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < tokens_.length; i++) {
            if (statuses_[i]) {
                _addPaymentToken(tokens_[i], swapInfos_[i]);
            } else {
                _removePaymentToken(tokens_[i]);
            }
        }
    }

    function setMintToken(address mintToken_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        mintToken = mintToken_;

        emit MintTokenChanged(mintToken_);
    }

    function setFarming(address farming_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            IERC165Upgradeable(farming_).supportsInterface(type(IFarming).interfaceId),
            "Payment: invalid new farming"
        );

        address newRewardToken_ = IFarming(farming_).rewardToken();
        require(newRewardToken_ != address(0), "Payment: farminig token isn't set");

        if (farming != address(0)) {
            address currentRewardToken_ = IFarming(farming).rewardToken();
            if (newRewardToken_ != currentRewardToken_) {
                _removePaymentToken(currentRewardToken_);
            }
        }

        _addPaymentToken(newRewardToken_, SwapInfo(farming_, 0, 0, 0));

        farming = farming_;

        emit FarmingChanged(farming_);
    }

    function setTreasury(address treasury_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = treasury_;

        emit TreasuryChanged(treasury_);
    }

    function setUniPriceOracle(address uniPriceOracle_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uniPriceOracle = uniPriceOracle_;

        emit UniswapPriceOracleChanged(uniPriceOracle);
    }

    function pay(
        address paymentToken_,
        address payer_,
        uint256 paymentAmount_,
        uint256 cashbackAmount_
    ) external onlyRole(FACTORY_ROLE) {
        uint8 paymentDecimals_ = IERC20Metadata(paymentToken_).decimals();

        paymentAmount_ = paymentAmount_.from18(paymentDecimals_);
        cashbackAmount_ = cashbackAmount_.from18(paymentDecimals_);

        if (paymentAmount_ == 0) return;
        require(paymentAmount_ >= cashbackAmount_, "Payment: invalid amounts");
        uint256 treasuryAmount_ = paymentAmount_ - cashbackAmount_;

        // Trnasfer `treasuryAmount_` from `payer_` to `treasury`
        // Accept tokens that in `paymentTokens` list
        if (treasuryAmount_ > 0) {
            require(treasury != address(0), "Payment: treasury isn't set");
            require(paymentTokens.contains(paymentToken_), "Payment: invalid token (1)");

            IERC20(paymentToken_).safeTransferFrom(payer_, treasury, treasuryAmount_);
        }

        // Return from `pay` if `cashbackAmount_` is a zero
        if (cashbackAmount_ == 0) return;

        require(paymentTokens.contains(paymentToken_), "Payment: invalid token (2)");
        SwapInfo storage swapInfo = paymentTokenSwapInfo[paymentToken_];
        IFarming farming_ = IFarming(farming);

        if (swapInfo.router == address(farming_)) {
            // Transfer `cashbackAmount_` to `this` contract
            IERC20(paymentToken_).safeTransferFrom(payer_, address(this), cashbackAmount_);

            // Transfer `cashbackAmount_` from this contract to `farming_`
            farming_.supply(cashbackAmount_);
        } else {
            address tokenOut_ = farming_.rewardToken();

            // Recalculate swap values `amountInMaximum_` and `amountOut_`
            uint256 amountOut_ = cashbackAmount_.convert(
                paymentDecimals_,
                IERC20Metadata(tokenOut_).decimals()
            );
            uint256 amountInMaximum_ = _getInSwapAmount(
                swapInfo,
                paymentToken_,
                tokenOut_,
                amountOut_
            );

            // Transfer `cashbackAmount_` to `this` contract and swap
            IERC20(paymentToken_).safeTransferFrom(payer_, address(this), amountInMaximum_);
            _swap(paymentToken_, tokenOut_, amountOut_, amountInMaximum_, payer_, swapInfo);

            // Transfer `cashbackAmount_` from this contract to `farming_`
            farming_.supply(amountOut_);
        }

        // Mint `cashbackAmount_` for `payer_`
        uint8 mintDecimals_ = IERC20Metadata(mintToken).decimals();
        IToken(mintToken).mint(payer_, cashbackAmount_.convert(paymentDecimals_, mintDecimals_));
    }

    function getPaymentTokens() external view returns (address[] memory) {
        return paymentTokens.values();
    }

    function getInSwapAmount(address paymentToken_, uint256 amountOut_)
        external
        view
        returns (uint256)
    {
        address tokenOut_ = IFarming(farming).rewardToken();
        return
            _getInSwapAmount(
                paymentTokenSwapInfo[paymentToken_],
                paymentToken_,
                tokenOut_,
                amountOut_
            );
    }

    function _addPaymentToken(address token_, SwapInfo memory swapInfo_) private {
        // When `token_` already added, remove allowances from previous router
        if (paymentTokens.contains(token_)) {
            address currentRouter_ = paymentTokenSwapInfo[token_].router;
            if (currentRouter_ != swapInfo_.router) {
                uint256 currentAllowance_ = IERC20(token_).allowance(
                    address(this),
                    currentRouter_
                );

                IERC20(token_).safeDecreaseAllowance(currentRouter_, currentAllowance_);
            }
        }

        uint256 allowance_ = IERC20(token_).allowance(address(this), swapInfo_.router);
        IERC20(token_).safeIncreaseAllowance(swapInfo_.router, type(uint256).max - allowance_);

        paymentTokenSwapInfo[token_] = swapInfo_;
        paymentTokens.add(token_);

        emit PaymentTokenAdded(token_);
    }

    function _removePaymentToken(address token_) private {
        if (!paymentTokens.contains(token_)) return;

        address currentRouter_ = paymentTokenSwapInfo[token_].router;
        uint256 allowance_ = IERC20(token_).allowance(address(this), currentRouter_);

        IERC20(token_).safeDecreaseAllowance(currentRouter_, allowance_);

        delete paymentTokenSwapInfo[token_];
        paymentTokens.remove(token_);

        emit PaymentTokenRemoved(token_);
    }

    function _swap(
        address in_,
        address out_,
        uint256 amountOut_,
        uint256 amountInMaximum_,
        address payer_,
        SwapInfo storage swapInfo
    ) private {
        ISwapRouter.ExactOutputSingleParams memory swapParams = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: in_,
                tokenOut: out_,
                fee: swapInfo.fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountOut: amountOut_,
                amountInMaximum: amountInMaximum_,
                sqrtPriceLimitX96: swapInfo.sqrtPriceLimitX96
            });

        uint256 amountIn_ = ISwapRouter(swapInfo.router).exactOutputSingle(swapParams);
        uint256 remainder_ = amountInMaximum_ - amountIn_;

        if (remainder_ > 0) {
            IERC20(in_).safeTransfer(payer_, remainder_);
        }
    }

    function _getInSwapAmount(
        SwapInfo storage swapInfo,
        address inToken_,
        address outToken_,
        uint256 outAmount_
    ) private view returns (uint256) {
        return
            IUniswapPriceOracleV8(uniPriceOracle).getInSwapAmount(
                inToken_,
                outToken_,
                outToken_,
                uint128(outAmount_),
                swapInfo.fee,
                swapInfo.multiplier
            );
    }

    function _authorizeUpgrade(address) internal view override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
