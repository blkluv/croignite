"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/app/store";
import {
  addProject,
  deleteProject,
  rehydrateProjects,
  setCurrentProject,
} from "@/app/store/slices/projectsSlice";
import {
  listProjects,
  storeProject,
  deleteProject as deleteProjectFromDB,
  exportProjectBundle,
  importProjectBundle,
} from "@/app/store";
import type { ProjectState } from "@/app/types";
import { toast } from "react-hot-toast";
import { createConvexProject } from "@/lib/api/convex";
import { useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  FileDown,
  Film,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createProjectState } from "@/app/store/slices/projectSlice";
import MainLayout from "@/app/layouts/MainLayout";

type SortKey = "updated" | "created" | "name";

function formatLocalDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function ProjectsPageContent() {
  const { address, isConnected } = useAccount();
  const walletAddress = address ?? null;
  const ownerWallet = walletAddress ? walletAddress.toLowerCase() : undefined;
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { projects, currentProjectId } = useAppSelector(
    (state) => state.projects,
  );

  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const didAutoOpenCreateRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoading = isLoading;

  const handleCreateProject = useCallback(async () => {
    const title = newProjectName.trim();
    if (!title) return;
    if (!walletAddress) {
      toast.error("Connect a wallet to create a project.");
      return;
    }
    if (isCreatingProject) return;

    setIsCreatingProject(true);
    try {
      const newProject: ProjectState = createProjectState({
        projectName: title,
        ownerWallet,
      });

      await storeProject(newProject, ownerWallet);
      dispatch(addProject(newProject));

      try {
        await createConvexProject({
          wallet: walletAddress,
          title,
          localId: newProject.id,
        });
      } catch {
        toast.error("Cloud sync failed. Your project is still saved locally.");
      }

      setNewProjectName("");
      setIsCreating(false);
      toast.success("Project created");
    } finally {
      setIsCreatingProject(false);
    }
  }, [dispatch, isCreatingProject, newProjectName, ownerWallet, walletAddress]);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        if (!ownerWallet) {
          dispatch(rehydrateProjects([]));
        } else {
          const storedProjects = await listProjects(ownerWallet);
          dispatch(rehydrateProjects(storedProjects));
        }
      } catch {
        toast.error("Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [dispatch, ownerWallet]);

  useEffect(() => {
    const parentIp = searchParams.get("parentIp");
    if (parentIp && !isCreating && !newProjectName) {
      setNewProjectName(`Remix of ${parentIp}`);
      setIsCreating(true);
    }
  }, [searchParams, isCreating, newProjectName]);

  useEffect(() => {
    const parentIp = searchParams.get("parentIp");
    const shouldCreate = searchParams.get("create");
    if (parentIp) return;
    if (shouldCreate !== "1") return;
    if (didAutoOpenCreateRef.current) return;
    didAutoOpenCreateRef.current = true;
    setIsCreating(true);
  }, [searchParams]);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/") return;

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      const isTypingTarget =
        activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
      if (isTypingTarget) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleExportProject = async (projectId: string, name: string) => {
    try {
      const bundle = await exportProjectBundle(projectId, ownerWallet);
      if (!bundle) {
        toast.error("Could not export project");
        return;
      }
      const blob = new Blob([JSON.stringify(bundle)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name || "cliplore-project"}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Project exported");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export project");
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ownerWallet) {
      toast.error("Connect a wallet to import a project.");
      event.target.value = "";
      return;
    }
    setIsImporting(true);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const imported = await importProjectBundle(bundle, ownerWallet);
      if (!imported) throw new Error("Invalid project bundle");
      const refreshed = await listProjects(ownerWallet);
      dispatch(rehydrateProjects(refreshed));
      toast.success(`Imported project "${imported.projectName}"`);
    } catch (error) {
      console.error("Import failed", error);
      toast.error("Could not import project");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProjectFromDB(projectId);
      dispatch(deleteProject(projectId));
      const storedProjects = await listProjects(ownerWallet);
      dispatch(rehydrateProjects(storedProjects));
      toast.success("Project deleted");
    } catch (error) {
      console.error("Delete failed", error);
      toast.error("Failed to delete project");
    }
  };

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? projects.filter((p) => p.projectName.toLowerCase().includes(normalizedQuery))
      : projects;

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "name") {
        return a.projectName.localeCompare(b.projectName);
      }

      const aDate = new Date(
        sortKey === "created" ? a.createdAt : a.lastModified,
      ).getTime();
      const bDate = new Date(
        sortKey === "created" ? b.createdAt : b.lastModified,
      ).getTime();
      return bDate - aDate;
    });

    return sorted;
  }, [projects, query, sortKey]);

  const projectCountLabel = useMemo(() => {
    if (isLoading) return "…";
    return String(projects.length);
  }, [isLoading, projects.length]);

  return (
    <MainLayout>
      <TooltipProvider>
        <main
          id="main"
          className="mx-auto mt-[80px] w-full max-w-6xl space-y-8 px-3 pb-16 pt-8 sm:px-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-white/60">
                Creator workspace
              </p>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Projects
                </h1>
                <Badge
                  variant="outline"
                  className="border-gray-200 text-gray-600 tabular-nums dark:border-white/10 dark:text-white/70"
                >
                  {projectCountLabel}
                </Badge>
              </div>
              <p className="max-w-2xl text-gray-500 dark:text-white/60">
                Start a new timeline, remix an IP asset, or continue a draft. Projects save locally
                in your browser and sync to the cloud when possible.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <Button type="button" onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4" />
                  New project
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create new project</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-2">
                    <Label htmlFor="newProjectName">Project name</Label>
                    <Input
                      id="newProjectName"
                      ref={inputRef}
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreateProject();
                        if (e.key === "Escape") setIsCreating(false);
                      }}
                      placeholder="Project title"
                      disabled={isCreatingProject}
                    />
                    <p className="text-xs text-gray-500 dark:text-white/60">
                      Tip: include a short subject + version (e.g., “Trailer v2”).
                    </p>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                      disabled={isCreatingProject}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleCreateProject()}
                      disabled={!newProjectName.trim() || isCreatingProject}
                    >
                      {isCreatingProject ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
                disabled={isImporting}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isImporting}
                onClick={() => importInputRef.current?.click()}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isImporting ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 lg:grid-cols-12 dark:border-white/10 dark:bg-black/80">
            <div className="lg:col-span-7">
              <Label htmlFor="projectSearch" className="sr-only">
                Search projects
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                <Input
                  id="projectSearch"
                  type="search"
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <Label htmlFor="projectSort" className="sr-only">
                Sort projects
              </Label>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger id="projectSort">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="created">Recently created</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="lg:col-span-2 flex items-center justify-end">
            {query.trim() ? (
              <Button type="button" variant="ghost" onClick={() => setQuery("")}>
                Clear
              </Button>
            ) : (
              <div className="text-xs text-gray-400 dark:text-white/40">
                Press <span className="font-mono">/</span> to search
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-white/10 dark:bg-black/80 dark:text-white/60">
          <div className="font-semibold text-gray-700 dark:text-white">Local-first drafts</div>
          <p className="mt-1">
            Projects are stored in your browser. Cloud sync is best-effort and never blocks
            creation or editing.
          </p>
        </div>

          {isInitialLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[164px] rounded-2xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-gray-200 dark:border-white/10">
              <CardHeader className="space-y-2">
                <CardTitle>
                  {isConnected || walletAddress
                    ? "No projects yet"
                    : "Connect a wallet"}
                </CardTitle>
                <CardDescription>
                  {isConnected || walletAddress
                    ? "Create your first timeline to start editing."
                    : "Connect a wallet to create projects and sync them to the cloud."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected || walletAddress ? (
                  <Button type="button" onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4" />
                    New project
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : visibleProjects.length === 0 ? (
          <Card className="border-gray-200 dark:border-white/10">
            <CardHeader className="space-y-2">
              <CardTitle>No results</CardTitle>
              <CardDescription>
                No projects match <span className="font-mono">“{query.trim()}”</span>.
              </CardDescription>
            </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
                <Button type="button" onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4" />
                  New project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProjects.map(({ id, projectName, createdAt, lastModified }) => (
                <Card
                  key={id}
                  className={cn(
                    "group relative overflow-hidden border-gray-200 transition-colors hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20",
                    id === currentProjectId && "border-[color:var(--brand-accent)]",
                  )}
                >
                  <Link
                    href={`/projects/${id}`}
                    onClick={() => dispatch(setCurrentProject(id))}
                    className="block h-full"
                  >
                    <CardHeader className="space-y-2 pr-14">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                          <Film className="h-4 w-4 shrink-0 text-gray-400 dark:text-white/40" />
                          <span className="truncate">{projectName}</span>
                        </CardTitle>
                        {id === currentProjectId ? (
                          <Badge variant="outline">Current</Badge>
                        ) : null}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        Updated {formatLocalDate(lastModified)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-gray-500 dark:text-white/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Created {formatLocalDate(createdAt)}
                      </div>
                    </CardContent>
                  </Link>

                  <div className="absolute right-3 top-3">
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Project actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Actions</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/projects/${id}`}
                            onClick={() => dispatch(setCurrentProject(id))}
                          >
                            <Film className="h-4 w-4" />
                            Open
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            void handleExportProject(id, projectName);
                          }}
                        >
                          <FileDown className="h-4 w-4" />
                          Export JSON
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setDeleteTarget({ id, name: projectName });
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes <span className="font-medium">{deleteTarget?.name}</span> from your
                browser storage. This action can’t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={() => {
                  if (!deleteTarget) return;
                  void handleDeleteProject(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </MainLayout>
  );
}

export default function Projects() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <main
            id="main"
            className="mx-auto mt-[80px] w-full max-w-6xl space-y-8 px-3 pb-16 pt-8 sm:px-6"
          >
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[164px] rounded-2xl" />
              ))}
            </div>
          </main>
        </MainLayout>
      }
    >
      <ProjectsPageContent />
    </Suspense>
  );
}
