"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletConnectButton } from "@/components/ui/WalletConnectButton";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-2 text-sm font-semibold text-foreground" href="/feed">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
              <Image
                src="/images/croignite-logo.png"
                alt="CroIgnite"
                width={36}
                height={36}
                sizes="36px"
                className="h-full w-full object-contain"
              />
            </span>
            <span className="hidden sm:inline">CroIgnite</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link className="hover:text-foreground" href="/feed">
              Feed
            </Link>
            <Link className="hover:text-foreground" href="/studio">
              Studio
            </Link>
          </nav>
        </div>
        <WalletConnectButton />
      </div>
    </header>
  );
}
