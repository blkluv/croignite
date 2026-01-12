"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  useAccount,
  useChainId,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  createX402PaymentHeader,
  type X402PaymentRequirements,
} from "@/lib/x402/paymentHeader";
import { cronosConfig } from "@/lib/web3/cronosConfig";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant" | "system";

type ContextItem = {
  role: Role;
  content: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const systemContext: ContextItem = {
  role: "system",
  content:
    "You are the CroIgnite Copilot. CroIgnite is a Cronos testnet creator sponsorship app that settles devUSDC.e payments via x402 and the Cronos facilitator. Provide concise, actionable answers.",
};

const suggestionPrompts = [
  "What is the latest block on Cronos testnet?",
  "How many devUSDC.e sponsorships can I do with 25 devUSDC.e if each is 0.5?",
  "Summarize wallet activity for 0x... on Cronos testnet.",
  "Give me a 3-step plan to sponsor DeFi creators this week.",
];

function buildContextFromMessages(messages: ChatMessage[]) {
  const recent = messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return [systemContext, ...recent];
}

function normalizeContext(context: ContextItem[]) {
  const withoutSystem = context.filter((item) => item.role !== "system");
  return [systemContext, ...withoutSystem.slice(-24)];
}

export default function IgniteChat() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: switchingChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [proMode, setProMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [agentContext, setAgentContext] = useState<ContextItem[]>([]);
  const [abortLabel, setAbortLabel] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !pending && !switchingChain;

  const requestContext = useMemo(() => {
    if (agentContext.length > 0) {
      return normalizeContext(agentContext);
    }
    return normalizeContext(buildContextFromMessages(messages));
  }, [agentContext, messages]);

  async function sendPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (pending) return;

    if (proMode) {
      if (!isConnected || !address) {
        setError("Connect your wallet to run Pro queries.");
        setErrorHint("RainbowKit is in the header. Connect and try again.");
        return;
      }

      if (chainId !== cronosConfig.chainId) {
        try {
          await switchChainAsync({ chainId: cronosConfig.chainId });
        } catch {
          setError("Switch to Cronos Testnet to run Pro queries.");
          setErrorHint(
            `Your wallet is on chainId ${chainId ?? "unknown"}. Switch to ${cronosConfig.chainId} and retry.`,
          );
          return;
        }
      }
    }

    setPending(true);
    setError(null);
    setErrorHint(null);
    setAbortLabel(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => {
        controller.abort();
        setAbortLabel("Request timed out. Please try again.");
      }, 20000);

      let res = await fetch("/api/agent/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: trimmed,
          context: requestContext,
          pro: proMode,
        }),
      });

      let data = await res.json().catch(() => ({}));

      if (res.status === 402 && proMode) {
        const requirements = data?.paymentRequirements as
          | X402PaymentRequirements
          | undefined;
        if (!requirements) {
          throw new Error("Missing payment requirements.");
        }

        const xPayment = await createX402PaymentHeader({
          from: address!,
          requirements,
          signTypedData: (typedData) => signTypedDataAsync(typedData as any),
        });

        res = await fetch("/api/agent/query", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "X-PAYMENT": xPayment,
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: trimmed,
            context: requestContext,
            pro: proMode,
          }),
        });

        data = await res.json().catch(() => ({}));
      }
      window.clearTimeout(timer);

      if (!res.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : "AI agent request failed.";
        const hint =
          typeof data?.hint === "string" ? data.hint : null;
        setError(message);
        setErrorHint(hint);
        return;
      }

      const answer = typeof data?.answer === "string" ? data.answer : "No response.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);

      if (Array.isArray(data?.context)) {
        setAgentContext(data.context);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The AI agent request timed out.");
        setErrorHint("Try again or use one of the quick prompts.");
      } else {
        const message =
          err instanceof Error ? err.message : "AI agent request failed.";
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <Card className="border-dashed bg-card/70 p-4 shadow-sm">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Try a quick prompt
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestionPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                className="h-auto justify-start whitespace-normal text-left"
                onClick={() => sendPrompt(prompt)}
                disabled={pending}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="font-semibold">Copilot is unavailable</div>
          <div className="mt-1 text-destructive/90">{error}</div>
          {errorHint ? (
            <div className="mt-2 text-xs text-destructive/80">
              {errorHint}
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "space-y-2 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm",
              message.role === "user" &&
                "border-primary/40 bg-primary/10 shadow-none",
            )}
          >
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {message.role === "user" ? "You" : "Copilot"}
            </div>
            <div className="text-sm leading-relaxed text-foreground">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSend) return;
          void sendPrompt(input);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant={proMode ? "default" : "outline"}
            onClick={() => setProMode((prev) => !prev)}
            disabled={pending}
          >
            {proMode ? "Pro mode (x402)" : "Enable Pro (x402)"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Pro queries settle a devUSDC.e micro-payment via x402.
          </span>
        </div>
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the CroIgnite Copilot..."
          rows={3}
          disabled={false}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {pending ? "Thinking…" : "Ask about Cronos, x402, or sponsorships."}
          </div>
          <Button type="submit" disabled={!canSend}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </div>
        {abortLabel ? (
          <p className="text-xs text-muted-foreground">{abortLabel}</p>
        ) : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </form>
    </div>
  );
}
