import Link from "next/link";
import AdminBoostPassPanel from "@/features/boost-pass/components/AdminBoostPassPanel";
import MainLayout from "@/app/layouts/MainLayout";

export default function AdminBoostPassPage() {
  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-4xl sm:px-2">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Boost Pass Console</h1>
              <p className="text-sm text-muted-foreground">
                Publish epochs for top boosters and unlock remix perks.
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Back to Leaderboard
            </Link>
          </div>
          <AdminBoostPassPanel />
        </div>
      </div>
    </MainLayout>
  );
}
