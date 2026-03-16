import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import {
  useCreateRoutingFolder,
  useCreateDomainRule,
  useDeleteDomainRule,
  useDeleteRoutingFolder,
  useDownloadSettings,
  useUpdateRoutingFolder,
  useUpdateDomainRule,
  useUpdateDownloadSettings,
} from '@/api/useDownloads';
import type { GracePeriodMinutes, GracePeriodType } from '@/api/downloads.api';
import { MasterToggles } from '../components/features/configure/MasterToggles';
import { AutoRemoveBehavior } from '../components/features/configure/AutoRemoveBehavior';
import { DomainRulesSection } from '../components/features/configure/DomainRulesSection';
import { DownloadRoutingSection } from '../components/features/configure/DownloadRoutingSection';
import type { DomainRule, RoutingFolder } from '@/api/downloads.api';
import { notifyExtensionSettingsSync } from '../utils/authBridge';

interface ConfigureDraft {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  gracePeriodType: GracePeriodType;
  gracePeriodMinutes: GracePeriodMinutes;
  routingEnabled: boolean;
  domainRules: DomainRule[];
  routingFolders: RoutingFolder[];
}

function serializeDomainRules(rules: DomainRule[]): string {
  return [...rules]
    .sort((a, b) => a._id.localeCompare(b._id))
    .map((rule) => `${rule._id}|${rule.domain}|${rule.rule}`)
    .join('||');
}

function serializeRoutingFolders(folders: RoutingFolder[]): string {
  return [...folders]
    .sort((a, b) => a._id.localeCompare(b._id))
    .map((folder) => `${folder._id}|${folder.folderName}|${folder.category ?? ''}`)
    .join('||');
}

const EMPTY_DRAFT: ConfigureDraft = {
  trackingEnabled: true,
  autoRemoveEnabled: false,
  gracePeriodType: 'immediate',
  gracePeriodMinutes: 15,
  routingEnabled: false,
  domainRules: [],
  routingFolders: [],
};

export function ConfigurePage() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useDownloadSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateDownloadSettings();
  const { mutateAsync: createDomainRule, isPending: isCreatingRule } = useCreateDomainRule();
  const { mutateAsync: updateDomainRule, isPending: isUpdatingRule } = useUpdateDomainRule();
  const { mutateAsync: deleteDomainRule, isPending: isDeletingRule } = useDeleteDomainRule();
  const { mutateAsync: createRoutingFolder, isPending: isCreatingRoutingFolder } = useCreateRoutingFolder();
  const { mutateAsync: updateRoutingFolder, isPending: isUpdatingRoutingFolder } = useUpdateRoutingFolder();
  const { mutateAsync: deleteRoutingFolder, isPending: isDeletingRoutingFolder } = useDeleteRoutingFolder();

  const [initialDraft, setInitialDraft] = useState<ConfigureDraft | null>(null);
  const [draft, setDraft] = useState<ConfigureDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;

    const nextDraft: ConfigureDraft = {
      trackingEnabled: settings.trackingEnabled,
      autoRemoveEnabled: settings.autoRemoveEnabled,
      gracePeriodType: settings.gracePeriodType,
      gracePeriodMinutes: settings.gracePeriodMinutes,
      routingEnabled: settings.routingEnabled,
      domainRules: settings.domainRules,
      routingFolders: settings.routingFolders,
    };

    setInitialDraft((current) => current ?? nextDraft);
    setDraft((current) => current ?? nextDraft);
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!draft || !initialDraft) return false;

    return (
      draft.trackingEnabled !== initialDraft.trackingEnabled
      || draft.autoRemoveEnabled !== initialDraft.autoRemoveEnabled
      || draft.gracePeriodType !== initialDraft.gracePeriodType
      || draft.gracePeriodMinutes !== initialDraft.gracePeriodMinutes
      || draft.routingEnabled !== initialDraft.routingEnabled
      || serializeDomainRules(draft.domainRules) !== serializeDomainRules(initialDraft.domainRules)
      || serializeRoutingFolders(draft.routingFolders) !== serializeRoutingFolders(initialDraft.routingFolders)
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

  const handleGracePeriodTypeChange = (next: GracePeriodType) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return { ...base, gracePeriodType: next };
    });
  };

  const handleGracePeriodMinutesChange = (next: GracePeriodMinutes) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return { ...base, gracePeriodMinutes: next };
    });
  };

  const handleDomainRulesChange = (nextDomainRules: DomainRule[]) => {
    setDraft((previous) => {
      const base = previous ?? EMPTY_DRAFT;
      return { ...base, domainRules: nextDomainRules };
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
      const initialRules = initialDraft?.domainRules ?? [];
      const draftRules = draft.domainRules;
      const initialRoutingFolders = initialDraft?.routingFolders ?? [];
      const draftRoutingFolders = draft.routingFolders;

      const initialById = new Map(initialRules.map((rule) => [rule._id, rule]));
      const draftById = new Map(draftRules.map((rule) => [rule._id, rule]));

      const deletedRules = initialRules.filter((rule) => !draftById.has(rule._id));
      const createdRules = draftRules.filter((rule) => !initialById.has(rule._id));
      const updatedRules = draftRules.filter((rule) => {
        const initialRule = initialById.get(rule._id);
        return !!initialRule && initialRule.rule !== rule.rule;
      });

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
        return !!initialFolder && (
          initialFolder.folderName !== folder.folderName
          || initialFolder.category !== folder.category
        );
      });

      const payload = {
        trackingEnabled: draft.trackingEnabled,
        autoRemoveEnabled: draft.trackingEnabled ? draft.autoRemoveEnabled : false,
        gracePeriodType: draft.gracePeriodType,
        gracePeriodMinutes: draft.gracePeriodMinutes,
        routingEnabled: draft.routingEnabled,
      };

      let latest = await updateSettings(payload);

      for (const rule of deletedRules) {
        latest = await deleteDomainRule(rule._id);
      }

      for (const rule of updatedRules) {
        latest = await updateDomainRule({ id: rule._id, payload: { rule: rule.rule } });
      }

      for (const rule of createdRules) {
        latest = await createDomainRule({ domain: rule.domain, rule: rule.rule });
      }

      for (const folder of deletedRoutingFolders) {
        latest = await deleteRoutingFolder(folder._id);
      }

      for (const folder of updatedRoutingFolders) {
        const initialFolder = initialRoutingById.get(folder._id);
        if (!initialFolder) continue;

        const updatePayload: { folderName?: string; category?: RoutingFolder['category'] } = {};

        if (initialFolder.folderName !== folder.folderName) {
          updatePayload.folderName = folder.folderName;
        }

        if (initialFolder.category !== folder.category) {
          updatePayload.category = folder.category;
        }

        latest = await updateRoutingFolder({ id: folder._id, payload: updatePayload });
      }

      for (const folder of createdRoutingFolders) {
        const beforeIds = new Set(latest.routingFolders.map((item) => item._id));
        latest = await createRoutingFolder({ folderName: folder.folderName });

        if (folder.category !== null) {
          const createdFolder = latest.routingFolders.find(
            (item) => !beforeIds.has(item._id) && item.folderName === folder.folderName,
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
        gracePeriodType: latest.gracePeriodType,
        gracePeriodMinutes: latest.gracePeriodMinutes,
        routingEnabled: latest.routingEnabled,
        domainRules: latest.domainRules,
        routingFolders: latest.routingFolders,
      };

      setInitialDraft(nextInitial);
      setDraft(nextInitial);
      notifyExtensionSettingsSync(latest);
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy =
    isSaving
    || isPending
    || isCreatingRule
    || isUpdatingRule
    || isDeletingRule
    || isCreatingRoutingFolder
    || isUpdatingRoutingFolder
    || isDeletingRoutingFolder;

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      <BackButton
        label="Back to Downloads"
        onClick={() => navigate('/downloads')}
        className="mb-6"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="section-title-display">
            Tracking Configuration
          </h1>
          <p className="section-description mt-1">
            Manage how SurfBud tracks and handles your downloads.
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
        <MasterToggles
          trackingEnabled={draft?.trackingEnabled ?? true}
          autoRemoveEnabled={draft?.autoRemoveEnabled ?? false}
          isLoading={isLoading && !draft}
          isDisabled={isBusy}
          onTrackingChange={handleTrackingChange}
          onAutoRemoveChange={handleAutoRemoveChange}
        />

        <AutoRemoveBehavior
          autoRemoveEnabled={draft?.autoRemoveEnabled ?? false}
          gracePeriodType={draft?.gracePeriodType ?? 'immediate'}
          gracePeriodMinutes={draft?.gracePeriodMinutes ?? 15}
          isLoading={isLoading && !draft}
          isDisabled={isBusy}
          onGracePeriodTypeChange={handleGracePeriodTypeChange}
          onGracePeriodMinutesChange={handleGracePeriodMinutesChange}
        />

        <DomainRulesSection
          domainRules={draft?.domainRules ?? []}
          isLoading={isLoading && !draft}
          isDisabled={isBusy}
          onDomainRulesChange={handleDomainRulesChange}
        />

        <DownloadRoutingSection
          routingEnabled={draft?.routingEnabled ?? false}
          routingFolders={draft?.routingFolders ?? []}
          isLoading={isLoading && !draft}
          isDisabled={isBusy}
          onRoutingEnabledChange={handleRoutingEnabledChange}
          onRoutingFoldersChange={handleRoutingFoldersChange}
        />
      </div>
    </div>
  );
}
