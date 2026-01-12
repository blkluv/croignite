"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { AiOutlineCopy } from "react-icons/ai";
import { FiCheck, FiExternalLink } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { copyToClipboard, formatShortHash } from "@/lib/utils";
import type { ContractAddressEntry, ContractAddressGroup } from "./types";

const copyResetDelayMs = 2000;

export default function ContractAddressList({
  groups,
}: {
  groups: ContractAddressGroup[];
}) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copyingAddress, setCopyingAddress] = useState<string | null>(null);

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.contracts.length > 0),
    [groups],
  );

  useEffect(() => {
    if (!copiedAddress) return;
    const timer = window.setTimeout(() => setCopiedAddress(null), copyResetDelayMs);
    return () => window.clearTimeout(timer);
  }, [copiedAddress]);

  const handleCopyAddress = async (entry: ContractAddressEntry) => {
    if (!entry.address || copyingAddress) return;
    setCopyingAddress(entry.address);
    try {
      const didCopy = await copyToClipboard(entry.address);
      if (didCopy) {
        setCopiedAddress(entry.address);
        toast.success(`${entry.name} address copied`);
      } else {
        toast.error("Failed to copy address");
      }
    } finally {
      setCopyingAddress(null);
    }
  };

  return (
    <div className="space-y-10">
      {visibleGroups.map((group) => (
        <section key={group.id} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <Badge variant="outline">{group.contracts.length} contracts</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {group.contracts.map((contract) => {
              const isCopying = copyingAddress === contract.address;
              const isCopied = copiedAddress === contract.address;
              const copyLabel = isCopied
                ? "Copied"
                : isCopying
                  ? "Copying"
                  : "Copy address";

              return (
                <Card
                  key={contract.id}
                  className="border-border/60 bg-card/80 shadow-sm"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">
                          {contract.name}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {formatShortHash(contract.address)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {contract.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      {contract.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs font-mono text-foreground/90">
                      <div className="break-all">{contract.address}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopyAddress(contract)}
                        disabled={isCopying}
                        aria-label={`Copy ${contract.name} address`}
                      >
                        {isCopied ? <FiCheck /> : <AiOutlineCopy />}
                        {copyLabel}
                      </Button>
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        aria-label={`View ${contract.name} on Cronos Explorer`}
                      >
                        <a
                          href={contract.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FiExternalLink />
                          View on Cronos Explorer
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <Card className="border-dashed border-border/60 bg-muted/40">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Creator boost vaults</CardTitle>
          <CardDescription className="text-xs">
            Creator vaults are deployed per creator by the Boost Vault Factory.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the creator boost flow to resolve the live vault address for a
          specific creator and verify it on the Cronos Explorer.
        </CardContent>
      </Card>
    </div>
  );
}
