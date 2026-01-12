// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IInvoiceReceipts {
    struct Receipt {
        bytes32 campaignId;
        bytes32 termsHash;
        bytes32 postIdHash;
        address sponsor;
        address creator;
        address boostVault;
        uint256 sponsorAmount;
        uint256 protocolFee;
        uint64 createdAt;
    }

    function mintReceipt(address to, Receipt calldata receipt) external returns (uint256 tokenId);
}

contract ClipYieldSponsorHub {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidAmount();
    error InvalidTermsHash();
    error InvalidPostHash();
    error InvalidFeeBps();
    error WrongAsset(address vault, address expected, address actual);

    event ClipSponsored(
        bytes32 indexed campaignId,
        uint256 indexed receiptTokenId,
        address indexed sponsor,
        address creator,
        address boostVault,
        uint256 amount,
        uint256 protocolFee,
        bytes32 termsHash
    );

    IERC20 public immutable wmnt;
    address public immutable yieldVault;
    IInvoiceReceipts public immutable receipts;
    uint16 public immutable protocolFeeBps;

    constructor(
        address wmnt_,
        address yieldVault_,
        address receipts_,
        uint16 protocolFeeBps_
    ) {
        if (wmnt_ == address(0) || yieldVault_ == address(0) || receipts_ == address(0)) {
            revert InvalidAddress();
        }
        if (protocolFeeBps_ > 10_000) revert InvalidFeeBps();

        wmnt = IERC20(wmnt_);
        yieldVault = yieldVault_;
        receipts = IInvoiceReceipts(receipts_);
        protocolFeeBps = protocolFeeBps_;
    }

    function sponsorClip(
        address creator,
        address boostVault,
        bytes32 postIdHash,
        bytes32 termsHash,
        uint256 amount
    ) external returns (bytes32 campaignId, uint256 receiptTokenId) {
        if (creator == address(0) || boostVault == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (termsHash == bytes32(0)) revert InvalidTermsHash();
        if (postIdHash == bytes32(0)) revert InvalidPostHash();

        address vaultAsset = IERC4626(boostVault).asset();
        if (vaultAsset != address(wmnt)) {
            revert WrongAsset(boostVault, address(wmnt), vaultAsset);
        }

        uint256 fee = (amount * protocolFeeBps) / 10_000;
        uint256 payout = amount - fee;

        wmnt.safeTransferFrom(msg.sender, address(this), amount);

        if (fee > 0) {
            wmnt.safeTransfer(yieldVault, fee);
        }

        if (payout > 0) {
            wmnt.forceApprove(boostVault, payout);
            IERC4626(boostVault).deposit(payout, creator);
        }

        campaignId = keccak256(
            abi.encodePacked(
                block.chainid,
                msg.sender,
                creator,
                boostVault,
                postIdHash,
                termsHash,
                amount,
                block.timestamp
            )
        );

        IInvoiceReceipts.Receipt memory receipt = IInvoiceReceipts.Receipt({
            campaignId: campaignId,
            termsHash: termsHash,
            postIdHash: postIdHash,
            sponsor: msg.sender,
            creator: creator,
            boostVault: boostVault,
            sponsorAmount: amount,
            protocolFee: fee,
            createdAt: uint64(block.timestamp)
        });

        receiptTokenId = receipts.mintReceipt(msg.sender, receipt);

        emit ClipSponsored(
            campaignId,
            receiptTokenId,
            msg.sender,
            creator,
            boostVault,
            amount,
            fee,
            termsHash
        );
    }
}
