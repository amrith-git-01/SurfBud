import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { TextField } from "@/components/ui/TextField";
import type { FocusSession } from "@/types/shared/productivity.types";
import {
  durationOptionsForPlannedMins,
  plannedMinsToSelectValue,
  selectValueToPlannedMins,
} from "./focusDurationPresets";

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
  return "Could not save. Try again.";
}

interface FocusSessionEditModalProps {
  isOpen: boolean;
  session: FocusSession | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: {
    label: string;
    domain: string;
    plannedMins: number | null;
  }) => Promise<void>;
}

export function FocusSessionEditModal({
  isOpen,
  session,
  isSaving,
  onClose,
  onSave,
}: FocusSessionEditModalProps) {
  const [labelInput, setLabelInput] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [durationValue, setDurationValue] = useState("none");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !session) {
      return;
    }
    setLabelInput(session.label);
    setDomainInput(session.domain);
    setDurationValue(plannedMinsToSelectValue(session.plannedMins ?? null));
    setLabelError(null);
    setDomainError(null);
    setSaveError(null);
  }, [isOpen, session]);

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

  if (!isOpen || !session) {
    return null;
  }

  const handleSubmit = async () => {
    setLabelError(null);
    setDomainError(null);
    setSaveError(null);

    const label = labelInput.trim();
    if (!label) {
      setLabelError("Label is required");
      return;
    }
    const domain = normalizeDomain(domainInput);
    if (!domain) {
      setDomainError("Enter a valid domain");
      return;
    }

    const plannedMins = selectValueToPlannedMins(durationValue);

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
        className="fixed left-1/2 top-1/2 z-[71] w-[95vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">
              Edit focus target
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Label, domain, and planned timer. Launch and timing still run from the extension.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[#F1F5F9] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <TextField
            label="Label"
            type="text"
            value={labelInput}
            onChange={(value) => {
              setLabelInput(value);
              setLabelError(null);
            }}
            onClear={() => {
              setLabelInput("");
              setLabelError(null);
            }}
            error={labelError ?? undefined}
            className="h-10 rounded-lg border py-2 text-sm"
            containerClassName="!space-y-0 w-full"
            autoComplete="off"
          />
          <TextField
            label="Domain"
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
            error={domainError ?? undefined}
            className="h-10 rounded-lg border py-2 text-sm"
            containerClassName="!space-y-0 w-full"
            autoComplete="off"
          />
          <div>
            <p className="section-label mb-2 block">Duration</p>
            <Dropdown<string>
              value={durationValue}
              options={durationOptionsForPlannedMins(session.plannedMins ?? null)}
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
            disabled={isSaving}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
