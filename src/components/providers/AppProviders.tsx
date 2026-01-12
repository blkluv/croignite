"use client";

if (typeof window === "undefined") {
  void import("fake-indexeddb/auto");
}

import { Children, type ReactNode } from "react";
import { Provider } from "react-redux";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { store } from "@/app/store";
import UserProvider from "@/app/context/user";
import NextTopLoader from "nextjs-toploader";

export function AppProviders({ children }: { children: ReactNode }) {
  const keyedChildren = Children.toArray(children);

  return (
    <Provider store={store}>
      <ConvexClientProvider>
        <Web3Provider>
          <UserProvider>
            <NextTopLoader
              color="var(--brand-accent)"
              height={3}
              showSpinner={false}
              initialPosition={0.15}
              zIndex={9999}
              shadow="0 0 10px rgba(246, 157, 4, 0.65),0 0 5px rgba(246, 157, 4, 0.4)"
            />
            <TooltipProvider delayDuration={200}>
              {keyedChildren}
            </TooltipProvider>
          </UserProvider>
        </Web3Provider>
      </ConvexClientProvider>
    </Provider>
  );
}
