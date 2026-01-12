"use client";

import MainLayout from "@/app/layouts/MainLayout";
import BoostPassPerksPanel from "@/features/boost-pass/components/BoostPassPerksPanel";

export default function BoostPassPerksPage() {
  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Boost Pass perks</h1>
            <p className="text-sm text-muted-foreground">
              Unlock exclusive remix assets with your on-chain Boost Pass.
            </p>
          </div>
          <BoostPassPerksPanel />
        </div>
      </div>
    </MainLayout>
  );
}
