"use client";

import { useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useAccount } from "wagmi";
import {
  getFile,
  getProject,
  storeProject,
  useAppDispatch,
  useAppSelector,
} from "@/app/store";
import {
  setCurrentProject,
  updateProject,
} from "@/app/store/slices/projectsSlice";
import {
  rehydrate,
  hydrateMediaFiles,
  setActiveSection,
} from "@/app/store/slices/projectSlice";
import AddText from "@/app/components/editor/AssetsPanel/tools-section/AddText";
import LibraryPanel from "@/app/components/editor/AssetsPanel/tools-section/LibraryPanel";
import TextButton from "@/app/components/editor/AssetsPanel/SidebarButtons/TextButton";
import LibraryButton from "@/app/components/editor/AssetsPanel/SidebarButtons/LibraryButton";
import ExportButton from "@/app/components/editor/AssetsPanel/SidebarButtons/ExportButton";
import MediaProperties from "@/app/components/editor/PropertiesSection/MediaProperties";
import TextProperties from "@/app/components/editor/PropertiesSection/TextProperties";
import { Timeline } from "@/app/components/editor/timeline/Timline";
import { PreviewPlayer } from "@/app/components/editor/player/remotion/Player";
import type { MediaFile } from "@/app/types";
import ExportList from "@/app/components/editor/AssetsPanel/tools-section/ExportList";
import EditorTopBar from "@/app/components/editor/EditorTopBar";
import { EditorPlayerProvider } from "@/app/components/editor/player/remotion/EditorPlayerContext";
import ClientOnly from "@/app/components/ClientOnly";
import { SoraJobManager } from "@/app/components/editor/AssetsPanel/tools-section/SoraJobManager";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { toast } from "react-hot-toast";

type Props = {
  projectId: string;
};

export default function ProjectClient({ projectId }: Props) {
  const dispatch = useAppDispatch();
  const projectState = useAppSelector((state) => state.projectState);
  const { currentProjectId } = useAppSelector((state) => state.projects);
  const router = useRouter();
  const { address } = useAccount();
  const walletAddress = address ?? null;
  const ownerWallet = walletAddress ? walletAddress.toLowerCase() : undefined;
  const { activeSection, activeElement } = projectState;

  useEffect(() => {
    let cancelled = false;

    const loadProject = async () => {
      if (!projectId) return;
      const project = await getProject(projectId, ownerWallet);
      if (cancelled) return;
      if (project) {
        dispatch(setCurrentProject(projectId));
        return;
      }
      toast.error("Project not found or not accessible.");
      router.push("/projects");
    };
    loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId, dispatch, ownerWallet, router]);

  const showLoadingOverlay = projectState.id !== projectId;

  useEffect(() => {
    const loadProjectState = async () => {
      if (currentProjectId) {
        const project = await getProject(currentProjectId, ownerWallet);
        if (project) {
          dispatch(rehydrate(project));
        }
      }
    };
    loadProjectState();
  }, [dispatch, currentProjectId, ownerWallet]);

  useEffect(() => {
    let cancelled = false;

    const hydrateMissingMediaSources = async () => {
      if (!currentProjectId || projectState.id !== currentProjectId) return;

      const hasMissingSrc = projectState.mediaFiles.some(
        (media) => typeof media.src !== "string" || media.src.length === 0,
      );
      if (!hasMissingSrc) return;

      const hydrated = await Promise.all(
        projectState.mediaFiles.map(async (media: MediaFile) => {
          if (typeof media.src === "string" && media.src.length > 0) return media;
          const file = await getFile(media.fileId);
          return file ? { ...media, src: URL.createObjectURL(file) } : media;
        }),
      );

      if (cancelled) return;
      dispatch(hydrateMediaFiles(hydrated));
    };

    hydrateMissingMediaSources();
    return () => {
      cancelled = true;
    };
  }, [dispatch, currentProjectId, projectState.id, projectState.mediaFiles]);

  useEffect(() => {
    const saveProject = async () => {
      if (!projectState || projectState.id !== currentProjectId) return;
      const projectToSave =
        ownerWallet && projectState.ownerWallet !== ownerWallet
          ? { ...projectState, ownerWallet }
          : projectState;
      await storeProject(projectToSave, ownerWallet);
      dispatch(updateProject(projectToSave));
    };
    saveProject();
  }, [projectState, dispatch, currentProjectId, ownerWallet]);

  const handleFocus = (section: "media" | "text" | "export") => {
    dispatch(setActiveSection(section));
  };

  return (
    <EditorPlayerProvider>
      <SoraJobManager />
      <div className="flex h-screen flex-col select-none bg-black">
        <EditorTopBar />
        {showLoadingOverlay ? (
          <div className="fixed inset-0 flex items-center bg-black bg-opacity-50 justify-center z-50">
            <div className="bg-black bg-opacity-70 p-6 rounded-lg flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-t-white border-r-white border-opacity-30 border-t-opacity-100 rounded-full animate-spin"></div>
              <p className="mt-4 text-white text-lg">Loading project...</p>
            </div>
          </div>
        ) : null}
        <ResizablePanelGroup direction="vertical" className="flex-1 overflow-hidden">
          <ResizablePanel defaultSize={70} minSize={35}>
            <div className="flex h-full w-full overflow-hidden">
              <div className="w-[72px] shrink-0 border-r border-white/10 bg-black/60 p-2">
                <div className="flex flex-col gap-2">
                  <LibraryButton
                    active={activeSection === "media"}
                    onClick={() => handleFocus("media")}
                  />
                  <TextButton
                    active={activeSection === "text"}
                    onClick={() => handleFocus("text")}
                  />
                  <ExportButton
                    active={activeSection === "export"}
                    onClick={() => handleFocus("export")}
                  />
                </div>
              </div>

              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full flex-1 overflow-hidden"
              >
                <ResizablePanel
                  defaultSize={24}
                  minSize={18}
                  className="min-w-[280px]"
                >
                  <div className="h-full overflow-y-auto border-r border-white/10 bg-black/40 p-4">
                    {activeSection === "media" ? <LibraryPanel /> : null}

                    {activeSection === "text" ? (
                      <div>
                        <AddText />
                      </div>
                    ) : null}

                    {activeSection === "export" ? (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h2 className="text-sm font-semibold text-white">
                            Export
                          </h2>
                          <p className="text-xs text-white/50">
                            Render a cut, then download it.
                          </p>
                        </div>
                        <ExportList />
                      </div>
                    ) : null}

                    {!activeSection ? (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-sm text-white/70">
                          Select a tool from the sidebar.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={54} minSize={30}>
                  <div className="h-full w-full overflow-hidden bg-black">
                    <PreviewPlayer />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                  defaultSize={22}
                  minSize={16}
                  className="min-w-[280px]"
                >
                  <div className="h-full overflow-y-auto border-l border-white/10 bg-black/40 p-4">
                    {activeElement === "media" ? (
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">
                          Media Properties
                        </h2>
                        <MediaProperties />
                      </div>
                    ) : null}

                    {activeElement === "text" ? (
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">
                          Text Properties
                        </h2>
                        <TextProperties />
                      </div>
                    ) : null}

                    {!activeElement ? (
                      <p className="text-sm text-muted-foreground">
                        Select an element on the timeline to edit its properties.
                      </p>
                    ) : null}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={30} minSize={18}>
            <div className="flex h-full overflow-hidden border-t border-white/10 bg-black">
              <div className="flex-1 overflow-hidden">
                <ClientOnly>
                  <Timeline />
                </ClientOnly>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </EditorPlayerProvider>
  );
}
