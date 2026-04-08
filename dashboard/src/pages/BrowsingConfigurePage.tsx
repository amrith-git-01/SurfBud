import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import {
  useBrowsingSettings,
  useCreateBrowsingDomainRule,
  useDeleteBrowsingDomainRule,
  useUpdateBrowsingDomainRule,
  useUpdateBrowsingSettings,
} from "@/api/useBrowsing";
import type {
  BrowsingDomainRule,
  BrowsingSettings,
} from "@/types/shared/browsing-settings.types";
import { SettingsToggleCards } from "@/components/features/configure/shared/SettingsToggleCards";
import { BrowsingDomainRulesSection } from "@/components/features/configure/BrowsingDomainRulesSection";
import { BrowsingSessionThresholdsSection } from "@/components/features/configure/BrowsingSessionThresholdsSection";
import { notifyExtensionBrowsingSettingsSync } from "@/utils/authBridge";
import { useToast } from "@/hooks/useToast";
import { extractApiErrorMessage } from "@/utils/extractApiErrorMessage";

interface BrowsingConfigureDraft {
  trackingEnabled: boolean;
  interactionTrackingEnabled: boolean;
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
  domainRules: BrowsingDomainRule[];
}

const EMPTY_DRAFT: BrowsingConfigureDraft = {
  trackingEnabled: true,
  interactionTrackingEnabled: true,
  minSessionDurationSeconds: 10,
  mergeGapSeconds: 30,
  domainRules: [],
};

function serializeDomainRules(rules: BrowsingDomainRule[]): string {
  return [...rules]
    .sort((a, b) => a._id.localeCompare(b._id))
    .map((rule) => `${rule._id}|${rule.domain}|${rule.rule}`)
    .join("||");
}

function toDraft(settings: BrowsingSettings): BrowsingConfigureDraft {
  return {
    trackingEnabled: settings.trackingEnabled,
    interactionTrackingEnabled: settings.interactionTrackingEnabled,
    minSessionDurationSeconds: settings.minSessionDurationSeconds ?? 10,
    mergeGapSeconds: settings.mergeGapSeconds ?? 30,
    domainRules: settings.domainRules,
  };
}

export function BrowsingConfigurePage() {
  const { success, error: showErrorToast } = useToast();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useBrowsingSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateBrowsingSettings();
  const { mutateAsync: createDomainRule, isPending: isCreatingRule } =
    useCreateBrowsingDomainRule();
  const { mutateAsync: updateDomainRule, isPending: isUpdatingRule } =
    useUpdateBrowsingDomainRule();
  const { mutateAsync: deleteDomainRule, isPending: isDeletingRule } =
    useDeleteBrowsingDomainRule();

  const [initialDraft, setInitialDraft] = useState<BrowsingConfigureDraft | null>(null);
  const [draft, setDraft] = useState<BrowsingConfigureDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;

    const nextDraft = toDraft(settings);
    setInitialDraft((current) => current ?? nextDraft);
    setDraft((current) => current ?? nextDraft);
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!draft || !initialDraft) return false;

    return (
      draft.trackingEnabled !== initialDraft.trackingEnabled ||
      draft.interactionTrackingEnabled !==
        initialDraft.interactionTrackingEnabled ||
      draft.minSessionDurationSeconds !==
        initialDraft.minSessionDurationSeconds ||
      draft.mergeGapSeconds !== initialDraft.mergeGapSeconds ||
      serializeDomainRules(draft.domainRules) !==
        serializeDomainRules(initialDraft.domainRules)
    );
  }, [draft, initialDraft]);

  const handleTrackingChange = (next: boolean) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return {
        ...base,
        trackingEnabled: next,
      };
    });
  };

  const handleDomainRulesChange = (nextDomainRules: BrowsingDomainRule[]) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return {
        ...base,
        domainRules: nextDomainRules,
      };
    });
  };

  const handleInteractionTrackingChange = (next: boolean) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return {
        ...base,
        interactionTrackingEnabled: next,
      };
    });
  };

  const handleMinSessionDurationChange = (next: number) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return {
        ...base,
        minSessionDurationSeconds: next,
      };
    });
  };

  const handleMergeGapSecondsChange = (next: number) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return {
        ...base,
        mergeGapSeconds: next,
      };
    });
  };

  const handleCancel = () => {
    setDraft(initialDraft);
  };

  const handleSave = async () => {
    if (!draft || !isDirty) return;

    setIsSaving(true);

    try {
      const initialRules = initialDraft?.domainRules ?? [];
      const draftRules = draft.domainRules;

      const initialById = new Map(initialRules.map((rule) => [rule._id, rule]));
      const draftById = new Map(draftRules.map((rule) => [rule._id, rule]));

      const deletedRules = initialRules.filter((rule) => !draftById.has(rule._id));
      const createdRules = draftRules.filter((rule) => !initialById.has(rule._id));
      const updatedRules = draftRules.filter((rule) => {
        const initialRule = initialById.get(rule._id);
        return !!initialRule && initialRule.rule !== rule.rule;
      });

      let latest = await updateSettings({
        trackingEnabled: draft.trackingEnabled,
        interactionTrackingEnabled: draft.interactionTrackingEnabled,
        minSessionDurationSeconds: draft.minSessionDurationSeconds,
        mergeGapSeconds: draft.mergeGapSeconds,
      });

      for (const rule of deletedRules) {
        latest = await deleteDomainRule(rule._id);
      }

      for (const rule of updatedRules) {
        latest = await updateDomainRule({ id: rule._id, payload: { rule: rule.rule } });
      }

      for (const rule of createdRules) {
        latest = await createDomainRule({
          domain: rule.domain,
          rule: rule.rule,
        });
      }

      const nextInitial = toDraft(latest);
      setInitialDraft(nextInitial);
      setDraft(nextInitial);
      notifyExtensionBrowsingSettingsSync(latest);
      success("Settings saved", "Browsing preferences synced to your extension.");
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
    isSaving || isPending || isCreatingRule || isUpdatingRule || isDeletingRule;

  return (
    <div className="productivity-configure-shell min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 md:px-10">
        <BackButton
          label="Back to Browsing"
          onClick={() => navigate("/browsing")}
          className="mb-6"
        />

        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="section-title-display text-3xl font-bold tracking-tight text-[var(--color-text-heading)] md:text-4xl">
              Browsing Configuration
            </h1>
            <p className="section-description mt-2 max-w-lg text-sm leading-relaxed text-[var(--color-text-muted)] md:text-[13px]">
              Decide how browsing sessions are recorded and whether clicks, keys, and scrolls are included.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:pt-1">
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
          <SettingsToggleCards
            sectionTitle="Master Toggles"
            sectionDescription="Session logging is the main switch; interaction stats add extra detail when it is on."
            isLoading={isLoading && !draft}
            isDisabled={isBusy}
            cards={[
              {
                id: "browsing-tracking",
                label: "Browsing Tracking",
                description: "Records site visits and time on page so browsing analytics stay up to date.",
                checked: draft?.trackingEnabled ?? true,
                onChange: handleTrackingChange,
                warningText: "Browsing tracking is off — new sessions are not recorded.",
              },
              {
                id: "interaction-tracking",
                label: "Interaction Tracking",
                description: "Counts clicks, keypresses, and scrolls inside each session for richer session detail.",
                checked: draft?.interactionTrackingEnabled ?? true,
                onChange: handleInteractionTrackingChange,
                disabled: !(draft?.trackingEnabled ?? true),
                disabledTooltip: "Enable browsing tracking first — interactions are attached to sessions.",
                warningText: "Sessions are still logged, but without interaction counts.",
              },
            ]}
          />

          <BrowsingDomainRulesSection
            domainRules={draft?.domainRules ?? []}
            isLoading={isLoading && !draft}
            isDisabled={isBusy}
            onDomainRulesChange={handleDomainRulesChange}
          />

          <BrowsingSessionThresholdsSection
            minSessionDurationSeconds={draft?.minSessionDurationSeconds ?? 10}
            mergeGapSeconds={draft?.mergeGapSeconds ?? 30}
            isLoading={isLoading && !draft}
            isDisabled={isBusy || !(draft?.trackingEnabled ?? true)}
            onMinSessionDurationChange={handleMinSessionDurationChange}
            onMergeGapSecondsChange={handleMergeGapSecondsChange}
          />
        </div>
      </div>
    </div>
  );
}
