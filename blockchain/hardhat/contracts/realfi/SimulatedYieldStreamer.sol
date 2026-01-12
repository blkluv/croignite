// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SimulatedYieldStreamer {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    address public immutable vault;

    address public owner;
    uint256 public ratePerSecond;
    uint256 public lastDrip;

    event YieldDripped(uint256 amount, uint256 at, address indexed caller);
    event RateUpdated(uint256 previousRate, uint256 newRate);
    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);

    error InvalidAddress();
    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address asset_, address vault_, uint256 ratePerSecond_, address owner_) {
        if (asset_ == address(0) || vault_ == address(0) || owner_ == address(0)) {
            revert InvalidAddress();
        }
        asset = IERC20(asset_);
        vault = vault_;
        ratePerSecond = ratePerSecond_;
        lastDrip = block.timestamp;
        owner = owner_;
    }

    function setRatePerSecond(uint256 newRate) external onlyOwner {
        uint256 previous = ratePerSecond;
        ratePerSecond = newRate;
        emit RateUpdated(previous, newRate);
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address previous = owner;
        owner = newOwner;
        emit OwnerUpdated(previous, newOwner);
    }

    function pendingYield() public view returns (uint256) {
        if (ratePerSecond == 0) return 0;
        uint256 elapsed = block.timestamp - lastDrip;
        if (elapsed == 0) return 0;

        uint256 owed = ratePerSecond * elapsed;
        uint256 balance = asset.balanceOf(address(this));
        return owed > balance ? balance : owed;
    }

    function drip() external returns (uint256 transferred) {
        transferred = pendingYield();
        lastDrip = block.timestamp;
        if (transferred > 0) {
            asset.safeTransfer(vault, transferred);
        }
        emit YieldDripped(transferred, lastDrip, msg.sender);
    }
}
