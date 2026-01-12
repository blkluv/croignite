"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ActivityFilter =
  | "all"
  | "boost_deposit"
  | "sponsor_deposit"
  | "yield_deposit"
  | "yield_withdraw"
  | "boost_pass_claim";

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "boost_deposit", label: "Boosts" },
  { key: "sponsor_deposit", label: "Sponsorships" },
  { key: "yield_deposit", label: "Yield" },
  { key: "yield_withdraw", label: "Withdrawals" },
  { key: "boost_pass_claim", label: "Boost Pass" },
];

export default function ActivityFilters({
  value,
  onValueChange,
}: {
  value: ActivityFilter;
  onValueChange: (value: ActivityFilter) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as ActivityFilter)}>
      <TabsList className="w-full flex-wrap justify-start gap-2">
        {FILTERS.map((filter) => (
          <TabsTrigger key={filter.key} value={filter.key}>
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
