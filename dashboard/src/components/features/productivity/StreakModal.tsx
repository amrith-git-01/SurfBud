import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import type {
  CreateStreakInput,
  UpdateStreakInput,
} from "@/api/productivity.api";
import type { UserStreak } from "@/types/shared/productivity.types";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { TextField } from "@/components/ui/TextField";

const MIN_MINUTE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15, label: "15 mins" },
  { value: 30, label: "30 mins" },
  { value: 45, label: "45 mins" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const DAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();

  if (!raw) {
    return "";
  }

  try {
    const prefixed =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `https://${raw}`;
    const parsed = new URL(prefixed);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^www\./, "");
  }
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

  return "Could not save streak. Please try again.";
}

interface StreakModalProps {
  isOpen: boolean;
  isSaving: boolean;
  editingStreak?: UserStreak | null;
  initialDomain?: string;
  changesApplyOnPageSave?: boolean;
  onClose: () => void;
  onCreate: (payload: CreateStreakInput) => void | Promise<void>;
  onUpdate?: (
    streakId: string,
    payload: UpdateStreakInput,
  ) => void | Promise<void>;
}

export function StreakModal({
  isOpen,
  isSaving,
  editingStreak = null,
  initialDomain = "",
  changesApplyOnPageSave = false,
  onClose,
  onCreate,
  onUpdate,
}: StreakModalProps) {
  const modalTitleId = useId();
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("");
  const [minMinutes, setMinMinutes] = useState<number>(30);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [labelError, setLabelError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLabelError(null);
    setDomainError(null);
    setDaysError(null);
    setSaveError(null);

    if (editingStreak) {
      setLabel(editingStreak.label);
      setDomain(editingStreak.domain);
      setMinMinutes(editingStreak.minMinutes);
      setActiveDays([...editingStreak.activeDays].sort((a, b) => a - b));
      return;
    }

    setLabel("");
    setDomain(initialDomain);
    setMinMinutes(30);
    setActiveDays([1, 2, 3, 4, 5]);
  }, [editingStreak, initialDomain, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropPointerDown = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const handleToggleDay = (dayValue: number) => {
    setDaysError(null);

    setActiveDays((previous) => {
      if (previous.includes(dayValue)) {
        return previous.filter((item) => item !== dayValue);
      }

      return [...previous, dayValue].sort((a, b) => a - b);
    });
  };

  const handleSave = async () => {
    setLabelError(null);
    setDomainError(null);
    setDaysError(null);
    setSaveError(null);

    const trimmedLabel = label.trim();
    const normalizedDomain = normalizeDomain(domain);

    let hasValidationError = false;

    if (trimmedLabel.length === 0) {
      setLabelError("Label is required");
      hasValidationError = true;
    }

    if (trimmedLabel.length > 100) {
      setLabelError("Label must be 100 characters or fewer");
      hasValidationError = true;
    }

    if (normalizedDomain.length === 0) {
      setDomainError("Domain is required");
      hasValidationError = true;
    }

    if (activeDays.length === 0) {
      setDaysError("Select at least one active day");
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    try {
      if (editingStreak) {
        if (!onUpdate) {
          setSaveError("Update is not available.");
          return;
        }
        await onUpdate(editingStreak._id, {
          label: trimmedLabel,
          domain: normalizedDomain,
          minMinutes,
          activeDays,
        });
      } else {
        await onCreate({
          label: trimmedLabel,
          domain: normalizedDomain,
          minMinutes,
          activeDays,
        });
      }
      onClose();
    } catch (error: unknown) {
      setSaveError(parseErrorMessage(error));
    }
  };

  const isEdit = Boolean(editingStreak);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      data-testid="streak-modal-backdrop"
      onPointerDown={handleBackdropPointerDown}
      role="presentation"
    >
      <div
        data-testid="streak-modal"
        className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3
              id={modalTitleId}
              className="text-lg font-semibold text-[var(--color-text-heading)]"
            >
              {isEdit ? "Edit streak" : "New Streak"}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {changesApplyOnPageSave
                ? isEdit
                  ? "Update the name, domain, or schedule here — use Save at the top of the configuration page to sync to your account."
                  : "Set up the streak here — it is added to the list when you confirm; use Save at the top to push everything to your account."
                : isEdit
                  ? "Update the display name, domain, or schedule. Changes save to your account immediately."
                  : "Choose a domain, how many minutes count as done for the day, and which weekdays apply."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[#F1F5F9]"
            aria-label="Close streak modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <p className="section-label mb-2 block">Name</p>
            <TextField
              label="Streak label"
              showLabel={false}
              placeholder="Daily LeetCode"
              value={label}
              onChange={(value) => {
                setLabel(value);
                setLabelError(null);
              }}
              onClear={() => {
                setLabel("");
                setLabelError(null);
              }}
              maxLength={100}
              error={labelError ?? undefined}
              helperText={`${label.trim().length}/100`}
              containerClassName="space-y-1"
              className="py-2.5 text-sm"
            />
          </div>

          <div>
            <p className="section-label mb-2 block">Domain</p>
            <TextField
              label="Domain"
              showLabel={false}
              placeholder="leetcode.com"
              value={domain}
              onChange={(value) => {
                setDomain(value);
                setDomainError(null);
              }}
              onClear={() => {
                setDomain("");
                setDomainError(null);
              }}
              error={domainError ?? undefined}
              containerClassName="space-y-1"
              className="py-2.5 text-sm"
            />
          </div>

          <div>
            <p className="section-label mb-2 block">Schedule</p>
            <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-3">
              <div
                data-testid="streak-schedule-row"
                className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start"
              >
                <div className="sm:col-span-4">
                  <p className="section-label mb-2 block">
                    Minimum time per day
                  </p>
                  <Dropdown<number>
                    value={minMinutes}
                    options={MIN_MINUTE_OPTIONS}
                    onChange={(value) => setMinMinutes(value)}
                    buttonClassName="h-11 w-full justify-between"
                    className="w-full"
                  />
                </div>

                <div className="min-w-0 sm:col-span-8">
                  <p className="section-label mb-2 block">Active days</p>
                  <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                    Tap a day to include or exclude it from the streak. At least
                    one day must stay selected.
                  </p>
                  <div
                    role="group"
                    aria-label="Days of the week"
                    className="grid grid-cols-7 gap-2"
                  >
                    {DAY_OPTIONS.map((day) => {
                      const isActive = activeDays.includes(day.value);

                      return (
                        <Button
                          key={day.value}
                          type="button"
                          variant={isActive ? "primary" : "secondary"}
                          size="sm"
                          hoverEffect="flat"
                          className="w-full min-w-0"
                          onClick={() => handleToggleDay(day.value)}
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                  {daysError ? (
                    <p className="mt-2 text-xs text-[#DC2626]" role="alert">
                      {daysError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
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
            {changesApplyOnPageSave
              ? isEdit
                ? "Apply"
                : "Add streak"
              : isEdit
                ? "Save changes"
                : "Create Streak"}
          </Button>
        </div>
      </div>
    </div>
  );
}
