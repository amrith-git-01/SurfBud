import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import {
  FocusMode,
  type FocusModeConfigureHandle,
} from "@/components/features/productivity/FocusMode";
import {
  StreakSection,
  type StreakSectionConfigureHandle,
} from "@/components/features/productivity/StreakSection";
import {
  TabGroups,
  type TabGroupsConfigureHandle,
} from "@/components/features/productivity/TabGroups";
import {
  useProductivityTabGroups,
  useProductivityUserSettings,
  useUpdateProductivityUserSettings,
} from "@/api/useProductivity";
import type { ProductivityUserSettings } from "@/types/shared/productivity.types";
import { notifyExtensionProductivityUserSettingsSync } from "@/utils/authBridge";
import { useToast } from "@/hooks/useToast";
import { extractApiErrorMessage } from "@/utils/extractApiErrorMessage";

const EMPTY_PRODUCTIVITY_USER_SETTINGS: ProductivityUserSettings = {
  tabEvolutionEnabled: true,
  streakTabEvolutionEnabled: true,
  trackNewTabsInTabGroupEnabled: false,
};

export function ProductivityConfigurePage() {
  const navigate = useNavigate();
  const { success, error: showErrorToast } = useToast();
  const { data: settings, isLoading } = useProductivityUserSettings();
  const { isLoading: tabGroupsLoading, isError: tabGroupsError } =
    useProductivityTabGroups();
  const { mutateAsync: updateProductivityUserSettings, isPending } =
    useUpdateProductivityUserSettings();

  const tabGroupsRef = useRef<TabGroupsConfigureHandle>(null);
  const focusRef = useRef<FocusModeConfigureHandle>(null);
  const streakRef = useRef<StreakSectionConfigureHandle>(null);
  const [tabGroupsDirty, setTabGroupsDirty] = useState(false);
  const [focusDraftsDirty, setFocusDraftsDirty] = useState(false);
  const [streakDraftDirty, setStreakDraftDirty] = useState(false);

  const [initialBehavior, setInitialBehavior] =
    useState<ProductivityUserSettings | null>(null);
  const [draftBehavior, setDraftBehavior] =
    useState<ProductivityUserSettings | null>(null);
  const [pageSaving, setPageSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setInitialBehavior((current) => current ?? settings);
    setDraftBehavior((current) => current ?? settings);
  }, [settings]);

  const isDirtyBehavior = useMemo(() => {
    if (!draftBehavior || !initialBehavior) return false;
    return (
      draftBehavior.tabEvolutionEnabled !==
        initialBehavior.tabEvolutionEnabled ||
      draftBehavior.trackNewTabsInTabGroupEnabled !==
        initialBehavior.trackNewTabsInTabGroupEnabled
    );
  }, [draftBehavior, initialBehavior]);

  const isDirty =
    isDirtyBehavior || tabGroupsDirty || focusDraftsDirty || streakDraftDirty;

  const handleCancel = () => {
    if (initialBehavior) {
      setDraftBehavior(initialBehavior);
    }
    tabGroupsRef.current?.resetDrafts();
    focusRef.current?.resetPendingFocusDrafts();
    streakRef.current?.resetStreakDrafts();
  };

  const handleSave = async () => {
    if (!draftBehavior || !initialBehavior) return;
    if (!isDirty) return;

    const hadBehaviorDirty = isDirtyBehavior;
    const hadTabGroupsDirty = tabGroupsDirty;
    const hadStreakDirty = streakDraftDirty;
    const hadFocusDirty = focusDraftsDirty;

    setPageSaving(true);
    try {
      if (hadTabGroupsDirty) {
        await tabGroupsRef.current?.commitTabGroups();
      }
      if (hadStreakDirty) {
        await streakRef.current?.commitStreakDrafts();
      }
      const focusSaved = hadFocusDirty
        ? ((await focusRef.current?.commitPendingFocusDrafts()) ?? 0)
        : 0;
      if (hadBehaviorDirty) {
        const updated = await updateProductivityUserSettings({
          tabEvolutionEnabled: draftBehavior.tabEvolutionEnabled,
          trackNewTabsInTabGroupEnabled:
            draftBehavior.trackNewTabsInTabGroupEnabled,
        });
        notifyExtensionProductivityUserSettingsSync(updated);
        setInitialBehavior(updated);
        setDraftBehavior(updated);
      }

      const parts: string[] = [];
      if (hadTabGroupsDirty) {
        parts.push("Custom tab groups");
      }
      if (hadStreakDirty) {
        parts.push("Streaks");
      }
      if (hadBehaviorDirty) {
        parts.push("Settings");
      }
      if (hadFocusDirty && focusSaved > 0) {
        parts.push(
          focusSaved === 1 ? "1 focus target" : `${focusSaved} focus targets`,
        );
      }
      if (parts.length > 0) {
        success("Saved", `${parts.join(" · ")} synced.`);
      }
    } catch (err) {
      showErrorToast(
        "Could not save",
        extractApiErrorMessage(err, "Please try again."),
      );
    } finally {
      setPageSaving(false);
    }
  };

  const headerBusy = pageSaving || isPending;
  const behaviorDraft = draftBehavior ?? EMPTY_PRODUCTIVITY_USER_SETTINGS;
  const behaviorLoading = isLoading && !draftBehavior;
  const tabGroupsBlocked =
    tabGroupsLoading || tabGroupsError || behaviorLoading;

  return (
    <div className="productivity-configure-shell min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 md:px-10">
        <BackButton
          label="Back to Productivity"
          onClick={() => navigate("/productivity")}
          className="mb-6"
        />

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl min-w-0">
            <h1 className="section-title-display text-3xl font-bold tracking-tight text-[var(--color-text-heading)] md:text-4xl">
              Productivity Configuration
            </h1>
            <p className="section-description mt-2 max-w-lg text-sm leading-relaxed text-[var(--color-text-muted)] md:text-[13px]">
              Set up tab groups, daily streaks on sites you care about, and
              focus sessions — all synced with the extension.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:pt-1">
            <Button
              variant="secondary"
              size="sm"
              hoverEffect="flat"
              className="productivity-outline-pill"
              onClick={handleCancel}
              disabled={!isDirty || headerBusy || tabGroupsBlocked}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSave()}
              disabled={!isDirty || tabGroupsBlocked || headerBusy}
              isLoading={headerBusy}
            >
              Save
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-7 md:gap-8">
          <TabGroups
            ref={tabGroupsRef}
            isConfigure
            headerBusy={headerBusy}
            onTabGroupsDraftDirtyChange={setTabGroupsDirty}
            productivityBehavior={{
              value: behaviorDraft,
              onChange: setDraftBehavior,
              isLoading: behaviorLoading,
              isDisabled: headerBusy,
            }}
          />
          <StreakSection
            ref={streakRef}
            isConfigure
            headerBusy={headerBusy}
            onStreakDraftDirtyChange={setStreakDraftDirty}
          />
          <FocusMode
            ref={focusRef}
            isConfigure
            headerBusy={headerBusy}
            onFocusDraftsDirtyChange={setFocusDraftsDirty}
          />
        </div>
      </div>
    </div>
  );
}
