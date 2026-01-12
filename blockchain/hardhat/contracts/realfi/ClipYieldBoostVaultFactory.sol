// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ClipYieldBoostVault } from "./ClipYieldBoostVault.sol";

contract ClipYieldBoostVaultFactory is AccessControl {
    bytes32 public constant VAULT_ADMIN_ROLE = keccak256("VAULT_ADMIN_ROLE");

    IERC20 public immutable asset;
    uint16 public immutable creatorCutBps;

    mapping(address => address) public vaultOf;

    event VaultCreated(address indexed creator, address vault);

    error InvalidBps();
    error VaultAlreadyExists(address creator);

    constructor(IERC20 asset_, uint16 creatorCutBps_, address admin) {
        if (creatorCutBps_ > 10_000) revert InvalidBps();
        asset = asset_;
        creatorCutBps = creatorCutBps_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VAULT_ADMIN_ROLE, admin);
    }

    function createVault(address creator) external onlyRole(VAULT_ADMIN_ROLE) returns (address vaultAddr) {
        if (vaultOf[creator] != address(0)) revert VaultAlreadyExists(creator);

        ClipYieldBoostVault vault = new ClipYieldBoostVault(
            asset,
            creator,
            creatorCutBps,
            msg.sender
        );

        vaultAddr = address(vault);
        vaultOf[creator] = vaultAddr;

        emit VaultCreated(creator, vaultAddr);
    }
}
