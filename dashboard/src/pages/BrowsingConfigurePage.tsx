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
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy =
    isSaving || isPending || isCreatingRule || isUpdatingRule || isDeletingRule;

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      <BackButton
        label="Back to Browsing"
        onClick={() => navigate("/browsing")}
        className="mb-6"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="section-title-display">Browsing Configuration</h1>
          <p className="section-description mt-1">
            Manage how SurfBud tracks your browsing sessions.
          </p>
        </div>
        <div className="flex items-center gap-3 md:pt-1">
          <Button
            variant="secondary"
            size="sm"
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
      </div>

      <div className="mt-8 space-y-12">
        <SettingsToggleCards
          sectionTitle="Master Toggles"
          sectionDescription="Control whether browsing sessions are tracked."
          isLoading={isLoading && !draft}
          isDisabled={isBusy}
          cards={[
            {
              id: "browsing-tracking",
              label: "Browsing Tracking",
              description: "Track and record browsing sessions",
              checked: draft?.trackingEnabled ?? true,
              onChange: handleTrackingChange,
              warningText: "SurfBud is not recording browsing sessions",
            },
            {
              id: "interaction-tracking",
              label: "Interaction Tracking",
              description: "Track clicks, keypresses, and scrolls within sessions",
              checked: draft?.interactionTrackingEnabled ?? true,
              onChange: handleInteractionTrackingChange,
              disabled: !(draft?.trackingEnabled ?? true),
              disabledTooltip: "Enable Browsing Tracking first",
              warningText: "Session activity will be recorded without interaction counts",
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
  );
}
