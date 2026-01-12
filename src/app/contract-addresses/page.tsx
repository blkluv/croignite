import MainLayout from "@/app/layouts/MainLayout";
import { Badge } from "@/components/ui/badge";
import { cronosTestnetContractCatalog } from "@/lib/contracts/addresses";
import { explorerAddressUrl, cronosConfig } from "@/lib/web3/cronosConfig";
import ContractAddressList from "./ContractAddressList";
import type { ContractAddressGroup } from "./types";

const contractGroupConfig = [
  {
    id: "core",
    title: "Core protocol",
    description: "Vaults and registries that secure access and yield flows.",
  },
  {
    id: "sponsorship",
    title: "Sponsorship and receipts",
    description: "Payment routing, invoice receipts, and campaign metadata.",
  },
  {
    id: "perks",
    title: "Perks and yield streaming",
    description: "Rewards passes and testnet yield simulation tooling.",
  },
  {
    id: "assets",
    title: "Assets",
    description: "Tokens that power deposits, boosts, and sponsorships.",
  },
] as const;

export default function ContractAddressesPage() {
  const explorerLabel = cronosConfig.explorerBase.replace(/^https?:\/\//, "");
  const totalContracts = cronosTestnetContractCatalog.length;

  const contractGroups: ContractAddressGroup[] = contractGroupConfig.map((group) => ({
    ...group,
    contracts: cronosTestnetContractCatalog
      .filter((entry) => entry.group === group.id)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        address: entry.address,
        description: entry.description,
        tags: [...entry.tags],
        explorerUrl: explorerAddressUrl(entry.address),
      })),
  }));

  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-[color:var(--brand-accent-soft)] via-white to-white shadow-sm dark:from-[rgba(246,157,4,0.16)] dark:via-black dark:to-black">
            <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-[color:var(--brand-accent-soft)] blur-3xl" />
            <div className="relative space-y-6 p-6 sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <Badge variant="warning">Cronos Testnet</Badge>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    Contract addresses
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Explore every deployed smart contract powering CroIgnite. Copy
                    addresses instantly, review their roles, and jump straight to
                    the Cronos explorer for on-chain verification.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{totalContracts} tracked contracts</span>
                    <span>Chain ID {cronosConfig.chainId}</span>
                  </div>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
                  <div className="rounded-2xl border border-border/60 bg-white/80 p-4 text-sm shadow-sm backdrop-blur dark:bg-black/40">
                    <div className="text-xs uppercase text-muted-foreground">
                      Explorer
                    </div>
                    <a
                      href={cronosConfig.explorerBase}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm font-semibold text-[color:var(--brand-accent-text)] hover:underline"
                    >
                      {explorerLabel}
                    </a>
                    <div className="mt-1 text-xs text-muted-foreground">
                      View deployed bytecode and on-chain activity.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-white/80 p-4 text-sm shadow-sm backdrop-blur dark:bg-black/40">
                    <div className="text-xs uppercase text-muted-foreground">
                      Network
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      Cronos Testnet
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      devUSDC.e testnet deployments synced from the contracts workspace.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <ContractAddressList groups={contractGroups} />
        </div>
      </div>
    </MainLayout>
  );
}
