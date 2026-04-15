import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  Coffee,
  Code,
  Gamepad2,
  Globe,
  GraduationCap,
  Heart,
  Music,
  Plane,
  Rocket,
  Smile,
  Terminal,
  Video,
  X,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type {
  CreateProductivityTabGroupInput,
  UpdateProductivityTabGroupInput,
} from "@/api/productivity.api";
import type { DashboardProductivityTabGroup } from "@/types/shared/productivity.types";

const MAX_URLS = 10;
const DEFAULT_TAB_GROUP_COLOR = "#000000";
const DEFAULT_TAB_GROUP_ICON = "Briefcase";

const COLOR_SWATCHES = [
  "#000000",
  "#0F172A",
  "#0891B2",
  "#0E7490",
  "#0284C7",
  "#2563EB",
  "#14B8A6",
  "#7C3AED",
  "#9333EA",
  "#E11D48",
  "#DB2777",
  "#F43F5E",
  "#DC2626",
  "#EA580C",
  "#059669",
  "#16A34A",
  "#D97706",
  "#CA8A04",
  "#94A3B8",
] as const;

const ICON_OPTIONS = [
  { value: "Briefcase", label: "Work", Icon: Briefcase },
  { value: "Code", label: "Coding", Icon: Code },
  { value: "Terminal", label: "Terminal", Icon: Terminal },
  { value: "BookOpen", label: "Reading", Icon: BookOpen },
  { value: "GraduationCap", label: "Study", Icon: GraduationCap },
  { value: "Brain", label: "Deep Work", Icon: Brain },
  { value: "Video", label: "Meetings", Icon: Video },
  { value: "Globe", label: "Web", Icon: Globe },
  { value: "Rocket", label: "Launch", Icon: Rocket },
  { value: "Smile", label: "Break", Icon: Smile },
  { value: "Coffee", label: "Coffee", Icon: Coffee },
  { value: "Music", label: "Music", Icon: Music },
  { value: "Heart", label: "Personal", Icon: Heart },
  { value: "Gamepad2", label: "Gaming", Icon: Gamepad2 },
  { value: "Camera", label: "Creative", Icon: Camera },
  { value: "Plane", label: "Travel", Icon: Plane },
] as const;

const ICON_COMPONENTS: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map((option) => [option.value, option.Icon]),
);

function resolveColor(color: string | undefined): string {
  if (!color || color.trim().length === 0) {
    return DEFAULT_TAB_GROUP_COLOR;
  }

  return color;
}

function resolveIcon(icon: string | undefined): string {
  if (!icon || !ICON_COMPONENTS[icon]) {
    return DEFAULT_TAB_GROUP_ICON;
  }

  return icon;
}

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

  return "Could not save tab group. Please try again.";
}

function normalizeUrl(input: string): string {
  const parsed = new URL(input.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Please enter a valid URL");
  }
  return parsed.toString();
}

function toDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

interface TabGroupModalProps {
  isOpen: boolean;
  isSaving: boolean;
  editingTabGroup: DashboardProductivityTabGroup | null;
  createPrefill?: CreateProductivityTabGroupInput | null;
  onClose: () => void;
  onCreate: (payload: CreateProductivityTabGroupInput) => void | Promise<void>;
  onUpdate: (
    tabGroupId: string,
    payload: UpdateProductivityTabGroupInput,
  ) => void | Promise<void>;
}

export function TabGroupModal({
  isOpen,
  isSaving,
  editingTabGroup,
  createPrefill = null,
  onClose,
  onCreate,
  onUpdate,
}: TabGroupModalProps) {
  const isEditing = editingTabGroup !== null;
  const canEditMeta = editingTabGroup ? editingTabGroup.sortOrder === 0 : true;

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_TAB_GROUP_COLOR);
  const [icon, setIcon] = useState<string>(DEFAULT_TAB_GROUP_ICON);
  const [urls, setUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlInputError, setUrlInputError] = useState<string | null>(null);
  const [tabsError, setTabsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<"icon" | "color" | null>(null);
  const iconPickerRef = useRef<HTMLDivElement | null>(null);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);
  const modalTitleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    if (editingTabGroup) {
      setName(editingTabGroup.name);
      setColor(resolveColor(editingTabGroup.color));
      setIcon(resolveIcon(editingTabGroup.icon));
      setUrls(editingTabGroup.urls);
    } else if (createPrefill) {
      setName(createPrefill.name);
      setColor(resolveColor(createPrefill.color));
      setIcon(resolveIcon(createPrefill.icon));
      setUrls(createPrefill.urls);
    } else {
      setName("");
      setColor(DEFAULT_TAB_GROUP_COLOR);
      setIcon(DEFAULT_TAB_GROUP_ICON);
      setUrls([]);
    }

    setNewUrl("");
    setNameError(null);
    setUrlInputError(null);
    setTabsError(null);
    setSaveError(null);
    setOpenPicker(null);
  }, [createPrefill, isOpen, editingTabGroup]);

  useEffect(() => {
    if (!isOpen || !openPicker) {
      return;
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideIconPicker =
        iconPickerRef.current?.contains(target) ?? false;
      const isInsideColorPicker =
        colorPickerRef.current?.contains(target) ?? false;

      if (!isInsideIconPicker && !isInsideColorPicker) {
        setOpenPicker(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [isOpen, openPicker]);

  const IconPreview = useMemo(() => {
    return ICON_COMPONENTS[icon] ?? Briefcase;
  }, [icon]);

  const toggleIconPicker = () => {
    if (!canEditMeta) {
      return;
    }

    setOpenPicker((current) => (current === "icon" ? null : "icon"));
  };

  const toggleColorPicker = () => {
    if (!canEditMeta) {
      return;
    }

    setOpenPicker((current) => (current === "color" ? null : "color"));
  };

  if (!isOpen) {
    return null;
  }

  const tabsContainerClass = `custom-scrollbar ${
    urls.length >= 3 ? "max-h-[180px] overflow-y-auto" : ""
  } space-y-2 rounded-xl border border-[var(--color-border)] p-3`;

  const handleAddUrl = () => {
    setSaveError(null);
    setTabsError(null);

    if (urls.length >= MAX_URLS) {
      setUrlInputError(`Maximum ${MAX_URLS} tabs reached`);
      return;
    }

    if (!newUrl.trim()) {
      setUrlInputError("Please enter a valid URL");
      return;
    }

    try {
      const normalized = normalizeUrl(newUrl);
      const key = normalized.toLowerCase();

      if (urls.some((url) => url.toLowerCase() === key)) {
        setUrlInputError("This URL is already in this mode");
        return;
      }

      setUrls((prev) => [...prev, normalized]);
      setNewUrl("");
      setUrlInputError(null);
    } catch {
      setUrlInputError("Please enter a valid URL");
    }
  };

  const handleRemoveUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
    setTabsError(null);
    setUrlInputError(null);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    setNameError(null);
    setUrlInputError(null);
    setTabsError(null);
    setSaveError(null);

    let hasValidationError = false;

    if (canEditMeta && trimmedName.length === 0) {
      setNameError("Name is required");
      hasValidationError = true;
    }

    if (urls.length === 0) {
      setTabsError("Add at least one URL");
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    try {
      if (!isEditing) {
        await onCreate({
          name: trimmedName,
          color,
          icon,
          urls,
        });
        onClose();
        return;
      }

      if (!editingTabGroup) {
        return;
      }

      const payload: UpdateProductivityTabGroupInput = { urls };

      if (canEditMeta) {
        payload.name = trimmedName;
        payload.color = color;
        payload.icon = icon;
      }

      await onUpdate(editingTabGroup._id, payload);
      onClose();
    } catch (error: unknown) {
      setSaveError(parseErrorMessage(error));
    }
  };

  const handleBackdropPointerDown = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      data-testid="tab-group-modal-backdrop"
      onPointerDown={handleBackdropPointerDown}
      role="presentation"
    >
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3
              id={modalTitleId}
              className="text-lg font-semibold text-[var(--color-text-heading)]"
            >
              {isEditing && editingTabGroup
                ? `Edit ${editingTabGroup.name}`
                : "New Group"}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {isEditing
                ? "Changes stay in this browser until you press Save on the productivity configuration page."
                : "New groups are drafts here — use Save on the configuration page to store them on your account."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[#F1F5F9]"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <p className="section-label mb-2 block">Name</p>
              <TextField
                label="Name"
                showLabel={false}
                placeholder="Mode name"
                value={name}
                onChange={(value) => {
                  setName(value);
                  setNameError(null);
                }}
                maxLength={50}
                disabled={!canEditMeta}
                error={nameError ?? undefined}
                helperText={`${name.trim().length}/50`}
                containerClassName="space-y-1"
                className="py-2.5 text-sm"
              />
            </div>

            <div className="lg:col-span-2">
              <p className="section-label mb-2 block">Icon</p>
              <div ref={iconPickerRef} className="relative">
                <button
                  type="button"
                  disabled={!canEditMeta}
                  onClick={toggleIconPicker}
                  className="flex h-[44px] w-full items-center justify-center rounded-xl border border-[var(--color-border)] bg-[#F8FAFC] transition-colors hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Open icon picker"
                >
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white"
                    style={{ color }}
                  >
                    <IconPreview size={15} />
                  </span>
                </button>

                {openPicker === "icon" ? (
                  <div className="absolute left-1/2 top-full z-30 mt-2 w-[260px] -translate-x-1/2 rounded-2xl border border-[var(--color-border)] bg-white/95 p-3 shadow-glass">
                    <div className="grid grid-cols-6 gap-2.5">
                      {ICON_OPTIONS.map((option) => {
                        const IconOption = option.Icon;
                        const isSelected = option.value === icon;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setIcon(option.value);
                              setSaveError(null);
                              setOpenPicker(null);
                            }}
                            title={option.label}
                            className={[
                              "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                              isSelected
                                ? "border-[var(--color-primary)] bg-[#E0F2FE] text-[var(--color-primary)]"
                                : "border-transparent bg-[#F8FAFC] text-[var(--color-text-muted)] hover:border-[#CBD5E1] hover:text-[var(--color-text-heading)]",
                            ].join(" ")}
                            aria-label={`Select icon ${option.label}`}
                          >
                            <IconOption size={15} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-2">
              <p className="section-label mb-2 block">Color</p>
              <div ref={colorPickerRef} className="relative">
                <button
                  type="button"
                  disabled={!canEditMeta}
                  onClick={toggleColorPicker}
                  className="flex h-[44px] w-full items-center justify-center rounded-xl border border-[var(--color-border)] bg-[#F8FAFC] transition-colors hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Open color picker"
                >
                  <span
                    className="inline-block h-7 w-7 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                </button>

                {openPicker === "color" ? (
                  <div className="absolute left-1/2 top-full z-30 mt-2 w-[274px] -translate-x-1/2 rounded-2xl border border-[var(--color-border)] bg-white/95 p-3 shadow-glass">
                    <HexColorPicker
                      color={color}
                      onChange={(nextColor) => {
                        setColor(nextColor);
                        setSaveError(null);
                      }}
                      className="sb-color-wheel"
                    />

                    <div className="mt-3 grid grid-cols-6 gap-2">
                      {COLOR_SWATCHES.slice(0, 12).map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => {
                            setColor(swatch);
                            setSaveError(null);
                          }}
                          className={[
                            "h-6 w-6 rounded-full border-2 transition-colors",
                            color === swatch
                              ? "border-[#0F172A]"
                              : "border-transparent hover:border-[#94A3B8]",
                          ].join(" ")}
                          style={{ backgroundColor: swatch }}
                          aria-label={`Select color ${swatch}`}
                        />
                      ))}
                    </div>

                    <p className="mt-3 rounded-lg bg-[#F8FAFC] px-2 py-1 text-center font-mono text-xs text-[var(--color-text-body)]">
                      {color.toUpperCase()}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <label className="section-label mb-2 block">Tabs</label>
            <div className={tabsContainerClass}>
              {urls.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  No URLs added yet.
                </p>
              ) : null}

              {urls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-3 py-2"
                >
                  <p
                    className="truncate pr-3 text-xs font-mono text-[var(--color-text-body)]"
                    title={url}
                  >
                    {toDisplayHost(url)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(index)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-white"
                    aria-label="Remove URL"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
              <TextField
                label="Add tab URL"
                showLabel={false}
                placeholder="https://example.com"
                value={newUrl}
                onChange={(value) => {
                  setNewUrl(value);
                  setUrlInputError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddUrl();
                  }
                }}
                disabled={urls.length >= MAX_URLS}
                error={urlInputError ?? undefined}
                containerClassName="space-y-1"
                className="py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={urls.length >= MAX_URLS}
                className="relative inline-flex h-[46px] items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[108px]"
              >
                <span className="btn-inner btn-secondary flex h-full w-full items-center justify-center px-5 text-sm">
                  Add
                </span>
              </button>
            </div>

            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {urls.length} / {MAX_URLS} tabs
            </p>
            {tabsError ? (
              <p className="mt-1 text-xs text-[#DC2626]">{tabsError}</p>
            ) : null}
          </div>

          {saveError ? (
            <div className="error-banner text-xs text-[var(--color-danger)]">
              {saveError}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            isLoading={isSaving}
            disabled={isSaving}
          >
            {isEditing ? "Apply" : "Add group"}
          </Button>
        </div>
      </div>
    </div>
  );
}
