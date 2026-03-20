import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { TextField } from "@/components/ui/TextField";
import { ConfigureSectionSkeleton } from "./ConfigureSectionSkeleton";

export interface DomainRuleOption<T extends string> {
  label: string;
  value: T;
}

export interface DomainRuleItem<T extends string> {
  _id: string;
  domain: string;
  rule: T;
}

export interface DomainSuggestion {
  domain: string;
  meta: string;
  tagLabel?: string;
  tagTone?: "positive" | "negative" | "neutral";
}

interface DomainRulesEditorProps<T extends string> {
  title: string;
  description: string;
  domainPlaceholder: string;
  emptyRulesText: string;
  suggestionsTitle: string;
  emptySuggestionsText: string;
  domainRules: DomainRuleItem<T>[];
  ruleOptions: DomainRuleOption<T>[];
  defaultRule: T;
  suggestions?: DomainSuggestion[];
  isLoading?: boolean;
  isDisabled?: boolean;
  isSuggestionsLoading?: boolean;
  onDomainRulesChange: (next: DomainRuleItem<T>[]) => void;
}

function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const hasProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://");
    const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) return null;
    const isValidHost =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(host);
    return isValidHost ? host : null;
  } catch {
    return null;
  }
}

function createDraftRuleId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function DomainSuggestionRow({
  suggestion,
  index,
  onAdd,
}: {
  suggestion: DomainSuggestion;
  index: number;
  onAdd: (domainName: string) => void;
}) {
  const tagClassName =
    suggestion.tagTone === "positive"
      ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
      : suggestion.tagTone === "negative"
        ? "bg-[var(--color-danger-light)] text-[var(--color-danger)]"
        : "bg-gray-100 text-[var(--color-text-muted)]";

  return (
    <div
      className="anim-list-item-enter ui-hover-row mr-1 flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
      style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[var(--color-text-heading)]">
          {suggestion.domain}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-[11px] text-[var(--color-text-muted)]">
            {suggestion.meta}
          </p>
          {suggestion.tagLabel ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tagClassName}`}
            >
              {suggestion.tagLabel}
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAdd(suggestion.domain)}
        className="ml-3 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
        aria-label={`Use ${suggestion.domain}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DomainRulesEditor<T extends string>({
  title,
  description,
  domainPlaceholder,
  emptyRulesText,
  suggestionsTitle,
  emptySuggestionsText,
  domainRules,
  ruleOptions,
  defaultRule,
  suggestions = [],
  isLoading = false,
  isDisabled = false,
  isSuggestionsLoading = false,
  onDomainRulesChange,
}: DomainRulesEditorProps<T>) {
  const [domainInput, setDomainInput] = useState("");
  const [selectedRule, setSelectedRule] = useState<T>(defaultRule);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ruleLabelMap = useMemo(() => {
    return new Map(ruleOptions.map((option) => [option.value, option.label]));
  }, [ruleOptions]);

  const sortedSuggestions = useMemo(() => {
    return suggestions;
  }, [suggestions]);

  const normalizedSearchInput = searchInput.trim().toLowerCase();

  const filteredDomainRules = useMemo(() => {
    if (!normalizedSearchInput) {
      return domainRules;
    }

    return domainRules.filter((rule) => {
      const domainText = rule.domain.toLowerCase();
      const labelText = (ruleLabelMap.get(rule.rule) ?? "").toLowerCase();

      return (
        domainText.includes(normalizedSearchInput) ||
        labelText.includes(normalizedSearchInput)
      );
    });
  }, [domainRules, normalizedSearchInput, ruleLabelMap]);

  const filteredSuggestions = useMemo(() => {
    if (!normalizedSearchInput) {
      return sortedSuggestions;
    }

    return sortedSuggestions.filter((suggestion) => {
      const domainText = suggestion.domain.toLowerCase();
      const metaText = suggestion.meta.toLowerCase();

      return (
        domainText.includes(normalizedSearchInput) ||
        metaText.includes(normalizedSearchInput)
      );
    });
  }, [normalizedSearchInput, sortedSuggestions]);

  const isMutating = isDisabled;

  const resetForm = () => {
    setDomainInput("");
    setSelectedRule(defaultRule);
    setEditingRuleId(null);
    setError(null);
  };

  const handleSubmit = () => {
    const normalized = normalizeDomain(domainInput);
    if (!normalized) {
      setError("Please enter a valid domain");
      return;
    }

    const duplicate = domainRules.find(
      (rule) =>
        rule.domain.toLowerCase() === normalized &&
        (editingRuleId ? rule._id !== editingRuleId : true),
    );

    if (duplicate) {
      setError("A rule for this domain already exists");
      return;
    }

    if (editingRuleId) {
      const existing = domainRules.find((rule) => rule._id === editingRuleId);
      if (!existing) return;
      if (normalized !== existing.domain.toLowerCase()) {
        setError("Domain cannot be changed while editing. Delete and add a new rule.");
        return;
      }

      onDomainRulesChange(
        domainRules.map((rule) =>
          rule._id === editingRuleId ? { ...rule, rule: selectedRule } : rule,
        ),
      );
      resetForm();
      return;
    }

    onDomainRulesChange([
      ...domainRules,
      {
        _id: createDraftRuleId(),
        domain: normalized,
        rule: selectedRule,
      },
    ]);
    resetForm();
  };

  const handleEdit = (ruleId: string) => {
    const rule = domainRules.find((item) => item._id === ruleId);
    if (!rule) return;
    setDomainInput(rule.domain);
    setSelectedRule(rule.rule);
    setEditingRuleId(rule._id);
    setError(null);
  };

  const handleDelete = (ruleId: string) => {
    onDomainRulesChange(domainRules.filter((rule) => rule._id !== ruleId));
    if (editingRuleId === ruleId) resetForm();
  };

  if (isLoading) {
    return (
      <ConfigureSectionSkeleton
        title={title}
        description={description}
        cardClassName="h-[320px]"
      >
          <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="flex h-full flex-col">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-center">
                <div className="skeleton h-8 w-full rounded-lg" />
                <div className="skeleton h-8 w-full rounded-md" />
                <div className="skeleton h-8 w-24 rounded-md" />
              </div>
              <div className="mt-4 min-h-0 flex-1">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="mt-2 space-y-2 h-[calc(100%-22px)]">
                  <div className="skeleton h-12 w-full rounded-lg" />
                  <div className="skeleton h-12 w-full rounded-lg" />
                  <div className="skeleton h-12 w-full rounded-lg" />
                </div>
              </div>
            </div>

            <div className="flex h-full flex-col min-h-0 lg:border-l lg:border-[var(--color-border)] lg:pl-5">
              <div className="skeleton h-3 w-44 rounded" />
              <div className="mt-2 skeleton h-8 w-full rounded-lg" />
              <div className="mt-2 space-y-2 min-h-0 flex-1">
                <div className="skeleton h-12 w-full rounded-lg" />
                <div className="skeleton h-12 w-full rounded-lg" />
                <div className="skeleton h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>
      </ConfigureSectionSkeleton>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">{title}</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
      </div>

      <div className="card-metric-glass p-5 mt-4 h-[320px]">
        <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex h-full flex-col">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-center">
              <div className={isMutating ? "pointer-events-none opacity-60" : ""}>
                <TextField
                  label="Domain"
                  showLabel={false}
                  type="text"
                  value={domainInput}
                  onChange={(value) => {
                    setDomainInput(value);
                    if (error) setError(null);
                  }}
                  onClear={() => {
                    setDomainInput("");
                    if (error) setError(null);
                  }}
                  placeholder={domainPlaceholder}
                  className="h-8 py-1.5 text-xs border rounded-lg"
                  containerClassName="!space-y-0"
                  autoComplete="off"
                />
              </div>

              <Dropdown<T>
                value={selectedRule}
                options={ruleOptions}
                onChange={setSelectedRule}
                disabled={isMutating}
                size="sm"
                buttonClassName="justify-between w-full"
              />

              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleSubmit()}
                disabled={!domainInput.trim() || isMutating}
                className="w-full sm:w-auto [&>span]:h-8 [&>span]:px-4 [&>span]:py-1.5"
              >
                {editingRuleId ? "Save" : "Add Rule"}
              </Button>
            </div>

            {error ? <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p> : null}

            {editingRuleId ? (
              <button
                type="button"
                onClick={resetForm}
                className="mt-2 cursor-pointer text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
              >
                Cancel edit
              </button>
            ) : null}

            <div className="mt-4 min-h-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Active Rules
              </p>

              {domainRules.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">{emptyRulesText}</p>
              ) : filteredDomainRules.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  No active rules match your search.
                </p>
              ) : (
                <div className="mt-2 space-y-2 h-[calc(100%-22px)] overflow-y-auto overflow-x-hidden pr-1">
                  {filteredDomainRules.map((rule, index) => (
                    <div
                      key={rule._id}
                      className="anim-list-item-enter ui-hover-row mr-1 flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                      style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--color-text-heading)]">
                          {rule.domain}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {ruleLabelMap.get(rule.rule) ?? rule.rule}
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(rule._id)}
                          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed"
                          aria-label={`Edit ${rule.domain}`}
                          disabled={isMutating}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(rule._id)}
                          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] disabled:cursor-not-allowed"
                          aria-label={`Delete ${rule.domain}`}
                          disabled={isMutating}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex h-full flex-col min-h-0 lg:border-l lg:border-[var(--color-border)] lg:pl-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {suggestionsTitle}
            </p>

            <div className="mt-2">
              <TextField
                label="Search domains"
                showLabel={false}
                type="text"
                value={searchInput}
                onChange={setSearchInput}
                onClear={() => setSearchInput("")}
                placeholder="Search active rules and suggestions"
                className="h-8 py-1.5 text-xs border rounded-lg"
                containerClassName="!space-y-0"
                autoComplete="off"
              />
            </div>

            {isSuggestionsLoading ? (
              <div className="mt-2 space-y-2">
                <div className="skeleton h-12 w-full rounded" />
                <div className="skeleton h-12 w-full rounded" />
                <div className="skeleton h-12 w-full rounded" />
              </div>
            ) : sortedSuggestions.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">{emptySuggestionsText}</p>
            ) : filteredSuggestions.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                No suggested domains match your search.
              </p>
            ) : (
              <div className="mt-2 space-y-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                {filteredSuggestions.map((suggestion, index) => (
                  <DomainSuggestionRow
                    key={suggestion.domain}
                    suggestion={suggestion}
                    index={index}
                    onAdd={(domainName) => {
                      setDomainInput(domainName);
                      if (error) setError(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
