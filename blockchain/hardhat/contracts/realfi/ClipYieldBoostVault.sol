// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ClipYieldBoostVault is ERC4626, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant YIELD_DONOR_ROLE = keccak256("YIELD_DONOR_ROLE");

    address public immutable creator;
    uint16 public immutable creatorCutBps;

    event YieldDonated(
        address indexed donor,
        uint256 assetsIn,
        uint256 creatorPaid,
        uint256 retainedInVault
    );

    error InvalidCreator();
    error InvalidBps();

    constructor(
        IERC20 asset_,
        address creator_,
        uint16 creatorCutBps_,
        address admin
    )
        ERC20(
            string(abi.encodePacked("CroIgnite Boost Vault - ", _short(creator_))),
            string(abi.encodePacked("ciBOOST-", _short(creator_)))
        )
        ERC4626(asset_)
    {
        if (creator_ == address(0)) revert InvalidCreator();
        if (creatorCutBps_ > 10_000) revert InvalidBps();

        creator = creator_;
        creatorCutBps = creatorCutBps_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(YIELD_DONOR_ROLE, admin);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function deposit(uint256 assets, address receiver)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.redeem(shares, receiver, owner);
    }

    function donateYield(uint256 assets)
        external
        whenNotPaused
        nonReentrant
        onlyRole(YIELD_DONOR_ROLE)
    {
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);

        uint256 creatorPaid = (assets * creatorCutBps) / 10_000;
        if (creatorPaid > 0) {
            IERC20(asset()).safeTransfer(creator, creatorPaid);
        }

        emit YieldDonated(msg.sender, assets, creatorPaid, assets - creatorPaid);
    }

    function _short(address addr) private pure returns (string memory) {
        bytes20 data = bytes20(addr);
        bytes memory out = new bytes(8);
        bytes16 symbols = "0123456789abcdef";
        for (uint256 i = 0; i < 4; i++) {
            out[i * 2] = symbols[uint8(data[i]) >> 4];
            out[i * 2 + 1] = symbols[uint8(data[i]) & 0x0f];
        }
        return string(out);
    }
}
