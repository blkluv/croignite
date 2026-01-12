"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

type WalletConnectButtonProps = {
  showBalance?: boolean;
};

export function WalletConnectButton({ showBalance }: WalletConnectButtonProps) {
  return (
    <ConnectButton
      accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
      chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
      showBalance={showBalance ?? true}
    />
  );
}
