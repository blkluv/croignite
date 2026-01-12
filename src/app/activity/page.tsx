"use client";

import MainLayout from "@/app/layouts/MainLayout";
import ActivityFeed from "@/app/activity/components/ActivityFeed";

export default function ActivityPage() {
  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Activity</h1>
            <p className="text-sm text-muted-foreground">
              Monitor your on-chain boosts, sponsorships, and vault activity.
            </p>
          </div>

          <ActivityFeed />
        </div>
      </div>
    </MainLayout>
  );
}
