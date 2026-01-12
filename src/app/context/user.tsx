"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { User, UserContextTypes } from "@/app/types";
import { convexClient } from "@/lib/convex/client";
import { ensureProfile, getProfile } from "@/lib/convex/functions";

const UserContext = createContext<UserContextTypes | null>(null);

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const walletAddress = address;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!walletAddress) {
      setUser(null);
      return;
    }

    await convexClient.mutation(ensureProfile, { wallet: walletAddress });
    const profile = await convexClient.query(getProfile, { wallet: walletAddress });

    if (!profile) {
      setUser(null);
      return;
    }

    setUser({
      id: profile.wallet,
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      image: profile.image,
    });
  }, [walletAddress]);

  useEffect(() => {
    let isMounted = true;
    const syncProfile = async () => {
      setIsLoading(true);

      if (!walletAddress || !isConnected) {
        if (!isMounted) return;
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        await refreshProfile();
      } catch {
        if (!isMounted) return;
        setUser(null);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    void syncProfile();

    return () => {
      isMounted = false;
    };
  }, [isConnected, refreshProfile, walletAddress]);

  const openConnect = async () => {
    openConnectModal?.();
  };

  const logout = async () => {
    if (isConnected) {
      disconnect();
    }
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        openConnect,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;

export const useUser = () => useContext(UserContext);
