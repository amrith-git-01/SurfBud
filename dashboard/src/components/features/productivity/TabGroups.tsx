import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Code,
  Globe,
  Pencil,
  Rocket,
  Smile,
  Trash2,
  Video,
  Plus,
  Terminal,
  GraduationCap,
  Brain,
  Coffee,
  Music,
  Heart,
  Gamepad2,
  Camera,
  Plane,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateProductivityTabGroup,
  useDeleteProductivityTabGroup,
  PRODUCTIVITY_TAB_GROUPS_QUERY_KEY,
  useProductivityTabGroups,
  useUpdateProductivityTabGroup,
} from "@/api/useProductivity";
import type {
  CreateProductivityTabGroupInput,
  UpdateProductivityTabGroupInput,
} from "@/api/productivity.api";
import { PREDEFINED_TAB_GROUP_TEMPLATES } from "@/constants/productivity-presets";
import type {
  DashboardProductivityTabGroup,
  ProductivityUserSettings,
} from "@/types/shared/productivity.types";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/Button";
import { TabGroupEvolutionSettings } from "./TabGroupEvolutionSettings";
import { TabGroupModal } from "./TabGroupModal";

const DRAFT_ID_PREFIX = "draft:";

function parseErrorMessage(error: unknown): string {
  const maybeResponse = error as {
    response?: { data?: { error?: { message?: string } } };
  };

  const message = maybeResponse.response?.data?.error?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function cloneCustom(
  groups: DashboardProductivityTabGroup[],
): DashboardProductivityTabGroup[] {
  return groups.map((g) => ({
    ...g,
    urls: [...g.urls],
    evolvedDomains: [...g.evolvedDomains],
  }));
}

function isDraftId(id: string): boolean {
  return id.startsWith(DRAFT_ID_PREFIX);
}

function groupsEqual(
  a: DashboardProductivityTabGroup,
  b: DashboardProductivityTabGroup,
): boolean {
  return (
    a.name === b.name &&
    a.color === b.color &&
    a.icon === b.icon &&
    a.urls.length === b.urls.length &&
    a.urls.every((u, i) => u === b.urls[i])
  );
}

export type TabGroupsConfigureHandle = {
  commitTabGroups: () => Promise<void>;
  resetDrafts: () => void;
};

interface TabGroupsProps {
  isConfigure?: boolean;
  headerBusy?: boolean;
  onTabGroupsDraftDirtyChange?: (dirty: boolean) => void;
  productivityBehavior?: {
    value: ProductivityUserSettings;
    onChange: (next: ProductivityUserSettings) => void;
    isLoading: boolean;
    isDisabled: boolean;
  };
}

interface HoverPreviewState {
  id: string;
  name: string;
  urls: string[];
}

const TAB_GROUP_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Briefcase,
  Code,
  Globe,
  Rocket,
  Smile,
  Video,
  Terminal,
  GraduationCap,
  Brain,
  Coffee,
  Music,
  Heart,
  Gamepad2,
  Camera,
  Plane,
};

function getTabGroupIcon(icon: string): LucideIcon {
  return TAB_GROUP_ICONS[icon] ?? Briefcase;
}

function toDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

export const TabGroups = forwardRef<TabGroupsConfigureHandle, TabGroupsProps>(
  function TabGroups(
    {
      isConfigure = false,
      headerBusy = false,
      onTabGroupsDraftDirtyChange,
      productivityBehavior,
    },
    ref,
  ) {
    const queryClient = useQueryClient();
    const {
      data: tabGroups = [],
      isLoading,
      isError,
      refetch,
    } = useProductivityTabGroups();

    const createMutation = useCreateProductivityTabGroup();
    const updateMutation = useUpdateProductivityTabGroup();
    const deleteMutation = useDeleteProductivityTabGroup();

    const [draftGroups, setDraftGroups] = useState<
      DashboardProductivityTabGroup[]
    >([]);
    const [baselineGroups, setBaselineGroups] = useState<
      DashboardProductivityTabGroup[]
    >([]);
    const [dirty, setDirty] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTabGroup, setEditingTabGroup] =
      useState<DashboardProductivityTabGroup | null>(null);
    const [createPrefill, setCreatePrefill] =
      useState<CreateProductivityTabGroupInput | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [hoverPreview, setHoverPreview] = useState<HoverPreviewState | null>(
      null,
    );
    const [pointer, setPointer] = useState<{ x: number; y: number } | null>(
      null,
    );
    const isModalOpenRef = useRef(false);

    const customTabGroups = useMemo(
      () =>
        tabGroups
          .filter((g) => g.sortOrder === 0)
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
      [tabGroups],
    );

    useEffect(() => {
      onTabGroupsDraftDirtyChange?.(dirty);
    }, [dirty, onTabGroupsDraftDirtyChange]);

    useEffect(() => {
      if (isLoading || isError) return;
      if (dirty) return;
      const next = cloneCustom(customTabGroups);
      setDraftGroups(next);
      setBaselineGroups(next);
    }, [customTabGroups, isLoading, isError, dirty]);

    const canCreateCustom = draftGroups.length < 10;

    const openCreateModal = (prefill?: CreateProductivityTabGroupInput) => {
      if (!canCreateCustom) return;
      endHoverPreview();
      isModalOpenRef.current = true;
      setActionError(null);
      setEditingTabGroup(null);
      setCreatePrefill(prefill ?? null);
      setIsModalOpen(true);
    };

    const openEditModal = (group: DashboardProductivityTabGroup) => {
      endHoverPreview();
      isModalOpenRef.current = true;
      setActionError(null);
      setCreatePrefill(null);
      setEditingTabGroup(group);
      setIsModalOpen(true);
    };

    const closeModal = () => {
      isModalOpenRef.current = false;
      setIsModalOpen(false);
      setCreatePrefill(null);
    };

    const startHoverPreview = (
      group: DashboardProductivityTabGroup,
      event: MouseEvent<HTMLElement>,
    ) => {
      if (isModalOpenRef.current) return;
      setHoverPreview({
        id: group._id,
        name: group.name,
        urls: group.urls,
      });
      setPointer({ x: event.clientX, y: event.clientY });
    };

    const moveHoverPreview = (event: MouseEvent<HTMLElement>) => {
      if (isModalOpenRef.current) return;
      setPointer({ x: event.clientX, y: event.clientY });
    };

    const endHoverPreview = () => {
      setHoverPreview(null);
      setPointer(null);
    };

    useEffect(() => {
      if (!hoverPreview) return;

      const handleUserScroll = () => {
        setHoverPreview(null);
        setPointer(null);
      };

      document.addEventListener("scroll", handleUserScroll, true);

      return () => {
        document.removeEventListener("scroll", handleUserScroll, true);
      };
    }, [hoverPreview]);

    const previewDomains = useMemo(
      () => hoverPreview?.urls.map(toDisplayHost) ?? [],
      [hoverPreview],
    );

    const handleCreate = (payload: CreateProductivityTabGroupInput) => {
      setActionError(null);
      const userId =
        draftGroups[0]?.userId ??
        customTabGroups[0]?.userId ??
        useAuthStore.getState().userId ??
        "";
      const now = new Date().toISOString();
      const row: DashboardProductivityTabGroup = {
        _id: `${DRAFT_ID_PREFIX}${crypto.randomUUID()}`,
        userId,
        name: payload.name.trim(),
        color: payload.color,
        icon: payload.icon,
        sortOrder: 0,
        urls: [...payload.urls],
        evolvedDomains: [],
        evolvedAt: null,
        createdAt: now,
        updatedAt: now,
        isPredefined: false,
      };
      setDraftGroups((d) =>
        [...d, row].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      setDirty(true);
      closeModal();
    };

    const handleUpdate = (
      tabGroupId: string,
      payload: UpdateProductivityTabGroupInput,
    ) => {
      setActionError(null);
      setDraftGroups((d) =>
        d.map((g) => {
          if (g._id !== tabGroupId) return g;
          return {
            ...g,
            ...(payload.name !== undefined ? { name: payload.name } : {}),
            ...(payload.color !== undefined ? { color: payload.color } : {}),
            ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
            ...(payload.urls !== undefined ? { urls: [...payload.urls] } : {}),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
      setDirty(true);
      closeModal();
    };

    const handleDelete = (group: DashboardProductivityTabGroup) => {
      setActionError(null);
      setDraftGroups((d) => d.filter((g) => g._id !== group._id));
      if (hoverPreview?.id === group._id) {
        endHoverPreview();
      }
      setDirty(true);
    };

    const commitTabGroups = useCallback(async () => {
      setActionError(null);
      const baselineById = new Map(baselineGroups.map((g) => [g._id, g]));
      const draftById = new Map(draftGroups.map((g) => [g._id, g]));

      const toCreate = draftGroups.filter((g) => isDraftId(g._id));
      const toDelete = baselineGroups.filter(
        (g) => !isDraftId(g._id) && !draftById.has(g._id),
      );
      const toUpdate = draftGroups.filter((g) => {
        if (isDraftId(g._id)) return false;
        const b = baselineById.get(g._id);
        return b !== undefined && !groupsEqual(b, g);
      });

      try {
        for (const g of toCreate) {
          await createMutation.mutateAsync({
            name: g.name,
            color: g.color,
            icon: g.icon,
            urls: g.urls,
          });
        }
        for (const g of toUpdate) {
          await updateMutation.mutateAsync({
            id: g._id,
            data: {
              name: g.name,
              color: g.color,
              icon: g.icon,
              urls: g.urls,
            },
          });
        }
        for (const g of toDelete) {
          await deleteMutation.mutateAsync(g._id);
        }

        await queryClient.refetchQueries({
          queryKey: PRODUCTIVITY_TAB_GROUPS_QUERY_KEY,
        });
        setDirty(false);
      } catch (error: unknown) {
        setActionError(parseErrorMessage(error));
        throw error;
      }
    }, [
      baselineGroups,
      draftGroups,
      createMutation,
      updateMutation,
      deleteMutation,
      queryClient,
    ]);

    const resetDrafts = useCallback(() => {
      setDraftGroups(cloneCustom(customTabGroups));
      setDirty(false);
    }, [customTabGroups]);

    useImperativeHandle(
      ref,
      () => ({
        commitTabGroups,
        resetDrafts,
      }),
      [commitTabGroups, resetDrafts],
    );

    useEffect(() => {
      if (!hoverPreview) return;
      const isPresetRow = PREDEFINED_TAB_GROUP_TEMPLATES.some(
        (t) => t._id === hoverPreview.id,
      );
      if (isPresetRow) return;
      const exists = draftGroups.some((g) => g._id === hoverPreview.id);
      if (!exists) endHoverPreview();
    }, [draftGroups, hoverPreview]);

    if (!isConfigure) {
      return null;
    }

    const evolutionDisabled =
      (productivityBehavior?.isDisabled ?? false) || headerBusy;

    return (
      <section>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">
              Tab groups
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Build your own tab groups, browse starter templates, and pick
              evolution options. Use Save at the top to push changes to your
              account and extension.
            </p>
          </div>

          <Button
            size="sm"
            variant="secondary"
            hoverEffect="flat"
            className="productivity-outline-pill shrink-0"
            onClick={() => openCreateModal()}
            disabled={!canCreateCustom || headerBusy}
          >
            <Plus size={14} />
            New group
          </Button>
        </div>

        {actionError ? (
          <div className="error-banner mb-4 text-xs text-[var(--color-danger)]">
            {actionError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-5">
          <div className="chart-glass flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden md:col-span-3">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <p className="section-label">Your Groups</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {draftGroups.length} / 10
                {dirty ? (
                  <span className="ml-1.5 text-[var(--color-primary)]">
                    · unsaved
                  </span>
                ) : null}
              </p>
            </div>

            {isError ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-white/50 p-4">
                <p className="text-sm text-[var(--color-text-body)]">
                  Could not load your custom groups.
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="relative mt-3 inline-flex items-center justify-center rounded-lg cursor-pointer"
                >
                  <span className="btn-inner btn-secondary px-3 py-1.5 text-xs">
                    Retry
                  </span>
                </button>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="skeleton h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : draftGroups.length === 0 ? (
              <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-[var(--color-text-body)]">
                  No custom groups yet.
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Create your own group set for quick launch.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  hoverEffect="flat"
                  className="productivity-outline-pill mt-4"
                  onClick={() => openCreateModal()}
                  disabled={!canCreateCustom || headerBusy}
                >
                  <Plus size={14} />
                  Create your first group
                </Button>
              </div>
            ) : (
              <div className="space-y-2" onMouseLeave={endHoverPreview}>
                {draftGroups.map((group, index) => {
                  const previewHosts = group.urls
                    .slice(0, 3)
                    .map(toDisplayHost);
                  const remainder = group.urls.length - previewHosts.length;
                  const GroupIcon = getTabGroupIcon(group.icon);
                  const rowStyle = {
                    animationDelay: `${index * 35}ms`,
                    "--group-hover-color": group.color,
                  } as CSSProperties;

                  return (
                    <article
                      key={group._id}
                      className="anim-list-item-enter ui-hover-row rounded-xl border border-[var(--color-border)] bg-white/55 px-4 py-3 transition-colors hover:border-[var(--group-hover-color)]"
                      style={rowStyle}
                      onMouseEnter={(event) => startHoverPreview(group, event)}
                      onMouseMove={moveHoverPreview}
                      onMouseLeave={endHoverPreview}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/80"
                              style={{ color: group.color }}
                            >
                              <GroupIcon size={14} />
                            </span>
                            <h3 className="truncate text-sm font-semibold text-[var(--color-text-heading)]">
                              {group.name}
                            </h3>
                            {isDraftId(group._id) ? (
                              <span className="rounded bg-[#E0F2FE] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                                Draft
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {group.urls.length} tabs •{" "}
                            {previewHosts.join(" • ")}
                            {remainder > 0 ? ` • +${remainder} more` : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(group)}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              endHoverPreview();
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              if (isModalOpenRef.current) return;
                              startHoverPreview(group, e);
                            }}
                            disabled={headerBusy}
                            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#E2F4FB] hover:text-[var(--color-primary)] disabled:opacity-50"
                            aria-label={`Edit ${group.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(group)}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              endHoverPreview();
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              if (isModalOpenRef.current) return;
                              startHoverPreview(group, e);
                            }}
                            disabled={headerBusy}
                            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#FEE2E2] hover:text-[var(--color-danger)] disabled:opacity-50"
                            aria-label={`Delete ${group.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="chart-glass min-w-0 overflow-x-hidden md:col-span-2">
            <p className="section-label">Template Groups</p>
            <p className="mb-4 mt-1 text-xs text-[var(--color-text-muted)]">
              Hover a template to preview its tab list.
            </p>

            <ul className="space-y-2">
              {PREDEFINED_TAB_GROUP_TEMPLATES.map((template, index) => {
                const TemplateIcon = getTabGroupIcon(template.icon);

                return (
                  <li key={template._id} className="relative">
                    <div
                      className="anim-list-item-enter ui-hover-row flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white/50 px-3 py-2.5 transition-colors hover:border-[var(--color-border-strong)]"
                      style={{ animationDelay: `${index * 35}ms` }}
                      onMouseEnter={(event) =>
                        startHoverPreview(template, event)
                      }
                      onMouseMove={moveHoverPreview}
                      onMouseLeave={endHoverPreview}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/80"
                          style={{ color: template.color }}
                        >
                          <TemplateIcon size={14} />
                        </span>
                        <p className="truncate text-sm font-medium text-[var(--color-text-heading)]">
                          {template.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {template.urls.length} tabs
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openCreateModal({
                              name: template.name,
                              color: template.color,
                              icon: template.icon,
                              urls: template.urls,
                            })
                          }
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            endHoverPreview();
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            if (isModalOpenRef.current) return;
                            startHoverPreview(template, e);
                          }}
                          disabled={!canCreateCustom || headerBusy}
                          className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-body)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {productivityBehavior ? (
          <TabGroupEvolutionSettings
            value={productivityBehavior.value}
            onChange={productivityBehavior.onChange}
            isLoading={productivityBehavior.isLoading}
            isDisabled={evolutionDisabled}
          />
        ) : null}

        {!isModalOpen &&
        hoverPreview &&
        pointer &&
        typeof document !== "undefined"
          ? createPortal(
              <div
                className="pointer-events-none fixed z-[9999] max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-left text-xs shadow-lg"
                style={{
                  left: pointer.x + 12,
                  top: pointer.y + 12,
                }}
              >
                <p className="font-semibold text-[var(--color-text-heading)]">
                  {hoverPreview.name}
                </p>
                <div className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
                  {previewDomains.length === 0 ? (
                    <p className="text-[var(--color-text-muted)]">
                      No tabs configured
                    </p>
                  ) : (
                    previewDomains.map((domain, index) => (
                      <p
                        key={`${hoverPreview.id}-${index}-${domain}`}
                        className="truncate font-mono text-[var(--color-text-body)]"
                      >
                        {domain}
                      </p>
                    ))
                  )}
                </div>
              </div>,
              document.body,
            )
          : null}

        <TabGroupModal
          isOpen={isModalOpen}
          editingTabGroup={editingTabGroup}
          createPrefill={createPrefill}
          isSaving={headerBusy}
          onClose={closeModal}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      </section>
    );
  },
);
