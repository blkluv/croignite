"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

function safeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}

export function OpenAIKeyCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const didFocusRef = useRef(false);

  const focus = searchParams.get("focus");
  const next = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (focus !== "openai" || didFocusRef.current) return;
    didFocusRef.current = true;
    const el = document.getElementById("openai-byok-card");
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("focus");
    const nextUrl = params.toString();
    router.replace(nextUrl ? `${pathname}?${nextUrl}` : pathname);
  }, [focus, pathname, router, searchParams]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings/openai-key", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { hasKey?: boolean } | null;
      setHasKey(Boolean(data?.hasKey));
    })();
  }, []);

  const statusLabel = useMemo(() => {
    if (hasKey === null) return "Checking...";
    return hasKey ? "Key saved on this device." : "No key saved yet.";
  }, [hasKey]);

  const statusBadge = useMemo(() => {
    if (hasKey === null) return { variant: "outline" as const, label: "Checking" };
    if (hasKey) return { variant: "success" as const, label: "Saved" };
    return { variant: "warning" as const, label: "Missing" };
  }, [hasKey]);

  const saveKey = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Enter your OpenAI API key.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/settings/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save key.");
        return;
      }

      setApiKey("");
      setHasKey(true);
      toast.success("OpenAI key saved.");

      if (next) {
        router.push(next);
      }
    });
  };

  const clearKey = () => {
    startTransition(async () => {
      const res = await fetch("/api/settings/openai-key", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to clear key.");
        return;
      }
      setHasKey(false);
      toast.success("OpenAI key cleared.");
    });
  };

  return (
    <Card id="openai-byok-card">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            AI (Bring your own OpenAI key)
          </CardTitle>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
        <CardDescription>
          Enter your OpenAI API key to enable Sora generation. It is stored on this
          device as an encrypted, HTTP-only cookie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={hasKey ? "success" : hasKey === false ? "warning" : "info"}>
          <AlertTitle>{hasKey ? "Ready for Sora generation" : "Add an OpenAI key"}</AlertTitle>
          <AlertDescription>{statusLabel}</AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="openaiApiKey">OpenAI API key</Label>
          <div className="flex gap-2">
            <Input
              id="openaiApiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShow((current) => !current)}
              disabled={isPending}
              aria-label={show ? "Hide API key" : "Show API key"}
              className="shrink-0"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>Use a Project API key from your OpenAI dashboard and keep it private.</p>
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                OpenAI API keys
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          onClick={saveKey}
          disabled={isPending || apiKey.trim().length === 0}
          className="min-w-[140px]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save key"
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={clearKey}
          disabled={isPending || !hasKey}
          className="min-w-[140px]"
        >
          Clear key
        </Button>
      </CardFooter>
    </Card>
  );
}
