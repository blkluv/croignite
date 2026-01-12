export async function ensureOpenAIKeyOrRedirect(
  routerPush: (href: string) => void,
  nextPath: string,
): Promise<boolean> {
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";

  const res = await fetch("/api/settings/openai-key", { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as { hasKey?: boolean } | null;
  const hasKey = Boolean(data?.hasKey);

  if (!hasKey) {
    routerPush(
      `/settings?focus=openai&next=${encodeURIComponent(safeNextPath)}`,
    );
    return false;
  }

  return true;
}

