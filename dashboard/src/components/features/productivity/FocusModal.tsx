import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { TextField } from "@/components/ui/TextField";
import { FOCUS_DURATION_SELECT_OPTIONS } from "./focusDurationPresets";

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
    return new URL(prefixed).hostname.toLowerCase();
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

  return "Could not save focus target. Try again.";
}

export interface FocusModalSuggestion {
  domain: string;
  label: string;
}

interface FocusModalProps {
  isOpen: boolean;
  isSaving: boolean;
  initialDomain?: string;
  initialName?: string;
  suggestions: FocusModalSuggestion[];
  onClose: () => void;
  onSave: (input: {
    label: string;
    domain: string;
    plannedMins: number | null;
  }) => Promise<void>;
}

export function FocusModal({
  isOpen,
  isSaving,
  initialDomain = "",
  initialName = "",
  suggestions,
  onClose,
  onSave,
}: FocusModalProps) {
  const [nameInput, setNameInput] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [durationValue, setDurationValue] = useState("30");
  const [nameError, setNameError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setNameInput(initialName);
    setDomainInput(initialDomain);
    setDurationValue("30");
    setNameError(null);
    setDomainError(null);
    setSaveError(null);
  }, [initialDomain, initialName, isOpen]);

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

  const handleSubmit = async () => {
    setNameError(null);
    setDomainError(null);
    setSaveError(null);

    const label = nameInput.trim();
    if (!label) {
      setNameError("Enter a name");
      return;
    }

    const domain = normalizeDomain(domainInput);
    if (!domain) {
      setDomainError("Enter a valid domain");
      return;
    }

    const plannedMins = durationValue === "none" ? null : Number(durationValue);

    try {
      await onSave({ label, domain, plannedMins });
      onClose();
    } catch (error: unknown) {
      setSaveError(parseErrorMessage(error));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        className="fixed left-1/2 top-1/2 z-[71] w-[95vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">
              Add focus target
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Adds a row on the left. Start the timer and open the site from the
              extension when you are ready.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[#F1F5F9] disabled:opacity-50"
            aria-label="Close focus modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <TextField
            label="Name"
            type="text"
            value={nameInput}
            onChange={(value) => {
              setNameInput(value);
              setNameError(null);
            }}
            onClear={() => {
              setNameInput("");
              setNameError(null);
            }}
            placeholder="e.g. YouTube study"
            error={nameError ?? undefined}
            className="h-10 rounded-lg border py-2 text-sm"
            containerClassName="!space-y-0 w-full"
            autoComplete="off"
          />
          <div>
            <p className="section-label mb-2 block">Domain</p>
            <TextField
              label="Domain"
              showLabel={false}
              type="text"
              value={domainInput}
              onChange={(value) => {
                setDomainInput(value);
                setDomainError(null);
              }}
              onClear={() => {
                setDomainInput("");
                setDomainError(null);
              }}
              placeholder="example.com"
              error={domainError ?? undefined}
              className="h-10 rounded-lg border py-2 text-sm"
              containerClassName="!space-y-0 w-full"
              autoComplete="off"
            />
            {suggestions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.slice(0, 8).map((item) => (
                  <button
                    key={item.domain}
                    type="button"
                    onClick={() => {
                      setDomainInput(item.domain);
                      setNameInput(item.label);
                      setDomainError(null);
                      setNameError(null);
                    }}
                    className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <p className="section-label mb-2 block">Duration</p>
            <Dropdown<string>
              value={durationValue}
              options={FOCUS_DURATION_SELECT_OPTIONS}
              onChange={setDurationValue}
              buttonClassName="w-full justify-between"
              className="w-full"
            />
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
            onClick={() => void handleSubmit()}
            isLoading={isSaving}
            disabled={
              isSaving ||
              nameInput.trim().length === 0 ||
              normalizeDomain(domainInput).length === 0
            }
          >
            Add to sessions
          </Button>
        </div>
      </div>
    </div>
  );
}
