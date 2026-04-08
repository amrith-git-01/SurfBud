import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import {
  useCreateRoutingFolder,
  useDeleteRoutingFolder,
  useDownloadSettings,
  useUpdateRoutingFolder,
  useUpdateDownloadSettings,
} from "@/api/useDownloads";
import { MasterToggles } from "../components/features/configure/MasterToggles";
import { DownloadRoutingGroup } from "../components/features/configure/DownloadRoutingGroup";
import type { RoutingFolder } from "@/api/downloads.api";
import { notifyExtensionSettingsSync } from "../utils/authBridge";
import { useToast } from "@/hooks/useToast";
import { extractApiErrorMessage } from "@/utils/extractApiErrorMessage";

interface ConfigureDraft {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  routingEnabled: boolean;
  routingFolders: RoutingFolder[];
}

function serializeRoutingFolders(folders: RoutingFolder[]): string {
  return [...folders]
    .sort((a, b) => a._id.localeCompare(b._id))
    .map(
      (folder) => `${folder._id}|${folder.folderName}|${folder.category ?? ""}`,
    )
    .join("||");
}

const EMPTY_DRAFT: ConfigureDraft = {
  trackingEnabled: true,
  autoRemoveEnabled: false,
  routingEnabled: false,
  routingFolders: [],
};

export function ConfigurePage() {
  const { success, error: showErrorToast } = useToast();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useDownloadSettings();
  const { mutateAsync: updateSettings, isPending } =
    useUpdateDownloadSettings();
  const {
    mutateAsync: createRoutingFolder,
    isPending: isCreatingRoutingFolder,
  } = useCreateRoutingFolder();
  const {
    mutateAsync: updateRoutingFolder,
    isPending: isUpdatingRoutingFolder,
  } = useUpdateRoutingFolder();
  const {
    mutateAsync: deleteRoutingFolder,
    isPending: isDeletingRoutingFolder,
  } = useDeleteRoutingFolder();

  const [initialDraft, setInitialDraft] = useState<ConfigureDraft | null>(null);
  const [draft, setDraft] = useState<ConfigureDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;

    const nextDraft: ConfigureDraft = {
      trackingEnabled: settings.trackingEnabled,
      autoRemoveEnabled: settings.autoRemoveEnabled,
      routingEnabled: settings.routingEnabled,
      routingFolders: settings.routingFolders,
    };

    setInitialDraft((current) => current ?? nextDraft);
    setDraft((current) => current ?? nextDraft);
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!draft || !initialDraft) return false;

    return (
      draft.trackingEnabled !== initialDraft.trackingEnabled ||
      draft.autoRemoveEnabled !== initialDraft.autoRemoveEnabled ||
      draft.routingEnabled !== initialDraft.routingEnabled ||
      serializeRoutingFolders(draft.routingFolders) !==
        serializeRoutingFolders(initialDraft.routingFolders)
    );
  }, [draft, initialDraft]);

  const handleTrackingChange = (next: boolean) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return {
        ...base,
        trackingEnabled: next,
        autoRemoveEnabled: next ? base.autoRemoveEnabled : false,
      };
    });
  };

  const handleAutoRemoveChange = (next: boolean) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      if (!base.trackingEnabled) return base;
      return { ...base, autoRemoveEnabled: next };
    });
  };

  const handleRoutingEnabledChange = (next: boolean) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return { ...base, routingEnabled: next };
    });
  };

  const handleRoutingFoldersChange = (nextRoutingFolders: RoutingFolder[]) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return { ...base, routingFolders: nextRoutingFolders };
    });
  };

  const handleCancel = () => {
    setDraft(initialDraft);
  };

  const handleSave = async () => {
    if (!draft || !isDirty) return;

    setIsSaving(true);

    try {
      const initialRoutingFolders = initialDraft?.routingFolders ?? [];
      const draftRoutingFolders = draft.routingFolders;

      const initialRoutingById = new Map(
        initialRoutingFolders.map((folder) => [folder._id, folder]),
      );
      const draftRoutingById = new Map(
        draftRoutingFolders.map((folder) => [folder._id, folder]),
      );

      const deletedRoutingFolders = initialRoutingFolders.filter(
        (folder) => !draftRoutingById.has(folder._id),
      );
      const createdRoutingFolders = draftRoutingFolders.filter(
        (folder) => !initialRoutingById.has(folder._id),
      );
      const updatedRoutingFolders = draftRoutingFolders.filter((folder) => {
        const initialFolder = initialRoutingById.get(folder._id);
        return (
          !!initialFolder &&
          (initialFolder.folderName !== folder.folderName ||
            initialFolder.category !== folder.category)
        );
      });

      const payload = {
        trackingEnabled: draft.trackingEnabled,
        autoRemoveEnabled: draft.trackingEnabled
          ? draft.autoRemoveEnabled
          : false,
        routingEnabled: draft.routingEnabled,
      };

      let latest = await updateSettings(payload);

      for (const folder of deletedRoutingFolders) {
        latest = await deleteRoutingFolder(folder._id);
      }

      for (const folder of updatedRoutingFolders) {
        const initialFolder = initialRoutingById.get(folder._id);
        if (!initialFolder) continue;

        const updatePayload: {
          folderName?: string;
          category?: RoutingFolder["category"];
        } = {};

        if (initialFolder.folderName !== folder.folderName) {
          updatePayload.folderName = folder.folderName;
        }

        if (initialFolder.category !== folder.category) {
          updatePayload.category = folder.category;
        }

        latest = await updateRoutingFolder({
          id: folder._id,
          payload: updatePayload,
        });
      }

      for (const folder of createdRoutingFolders) {
        const beforeIds = new Set(
          latest.routingFolders.map((item) => item._id),
        );
        latest = await createRoutingFolder({ folderName: folder.folderName });

        if (folder.category !== null) {
          const createdFolder =
            latest.routingFolders.find(
              (item) =>
                !beforeIds.has(item._id) &&
                item.folderName === folder.folderName,
            ) ?? latest.routingFolders.find((item) => !beforeIds.has(item._id));

          if (createdFolder) {
            latest = await updateRoutingFolder({
              id: createdFolder._id,
              payload: { category: folder.category },
            });
          }
        }
      }

      const nextInitial: ConfigureDraft = {
        trackingEnabled: latest.trackingEnabled,
        autoRemoveEnabled: latest.autoRemoveEnabled,
        routingEnabled: latest.routingEnabled,
        routingFolders: latest.routingFolders,
      };

      setInitialDraft(nextInitial);
      setDraft(nextInitial);
      notifyExtensionSettingsSync(latest);
      success(
        "Settings saved",
        "Download preferences synced to your extension.",
      );
    } catch (err) {
      showErrorToast(
        "Could not save settings",
        extractApiErrorMessage(err, "Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy =
    isSaving ||
    isPending ||
    isCreatingRoutingFolder ||
    isUpdatingRoutingFolder ||
    isDeletingRoutingFolder;

  return (
    <div className="productivity-configure-shell min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 md:px-10">
        <BackButton
          label="Back to Downloads"
          onClick={() => navigate("/downloads")}
          className="mb-6"
        />

        <header className="mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="section-title-display text-3xl font-bold tracking-tight text-[var(--color-text-heading)] md:text-4xl">
              Download configuration
            </h1>
            <p className="section-description mt-2 max-w-xl text-sm text-[var(--color-text-muted)] md:text-[13px]">
              Choose how SurfBud records downloads, removes duplicate files, and
              sorts them into subfolders.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:pt-1">
            <Button
              variant="secondary"
              size="sm"
              hoverEffect="flat"
              className="productivity-outline-pill"
              onClick={handleCancel}
              disabled={!isDirty || isBusy || isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSave()}
              disabled={!isDirty || isLoading || isBusy}
              isLoading={isBusy}
            >
              Save
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-8 md:gap-10">
          <MasterToggles
            trackingEnabled={draft?.trackingEnabled ?? true}
            autoRemoveEnabled={draft?.autoRemoveEnabled ?? false}
            isLoading={isLoading && !draft}
            isDisabled={isBusy}
            onTrackingChange={handleTrackingChange}
            onAutoRemoveChange={handleAutoRemoveChange}
          />

          <DownloadRoutingGroup
            routingEnabled={draft?.routingEnabled ?? false}
            routingFolders={draft?.routingFolders ?? []}
            isLoading={isLoading && !draft}
            isDisabled={isBusy}
            onRoutingEnabledChange={handleRoutingEnabledChange}
            onRoutingFoldersChange={handleRoutingFoldersChange}
          />
        </div>
      </div>
    </div>
  );
}
