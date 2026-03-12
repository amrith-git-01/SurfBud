import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useDomains } from '@/api/useDownloads';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import type { DomainRule, DomainStat, DownloadRuleValue } from '@/api/downloads.api';

const RULE_OPTIONS: Array<{ label: string; value: DownloadRuleValue }> = [
  { label: 'Track and Don\'t Remove', value: 'track_keep' },
  { label: 'Track and Remove', value: 'track_remove' },
  { label: 'Dont Track', value: 'dont_track' },
];

function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const hasProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) return null;
    const isValidHost = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(host);
    return isValidHost ? host : null;
  } catch {
    return null;
  }
}

function toRuleLabel(rule: DownloadRuleValue): string {
  if (rule === 'track_keep') return 'Track and Don\'t Remove';
  if (rule === 'track_remove') return 'Track and Remove';
  return 'Dont Track';
}

interface DomainSourceRowProps {
  domain: DomainStat;
  onAdd: (domainName: string) => void;
}

function DomainSourceRow({ domain, onAdd }: DomainSourceRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[var(--color-text-heading)]">
          {domain.domain}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
          {domain.totalCount} total · {domain.newCount} new · {domain.dupCount} dup
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(domain.domain)}
        className="ml-3 inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
        aria-label={`Use ${domain.domain}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface DomainRulesSectionProps {
  domainRules: DomainRule[];
  isLoading?: boolean;
  isDisabled?: boolean;
  onDomainRulesChange: (next: DomainRule[]) => void;
}

function createDraftRuleId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DomainRulesSection({
  domainRules,
  isLoading = false,
  isDisabled = false,
  onDomainRulesChange,
}: DomainRulesSectionProps) {
  const { data: domains = [], isLoading: isDomainsLoading } = useDomains();

  const [domainInput, setDomainInput] = useState('');
  const [selectedRule, setSelectedRule] = useState<DownloadRuleValue>('track_keep');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMutating = isDisabled;

  const discoveredDomains = useMemo(
    () => [...domains].sort((a, b) => b.totalCount - a.totalCount),
    [domains],
  );

  const resetForm = () => {
    setDomainInput('');
    setSelectedRule('track_keep');
    setEditingRuleId(null);
    setError(null);
  };

  const handleSubmit = () => {
    const normalized = normalizeDomain(domainInput);
    if (!normalized) {
      setError('Please enter a valid domain');
      return;
    }

    const duplicate = domainRules.find(
      (rule) =>
        rule.domain.toLowerCase() === normalized &&
        (editingRuleId ? rule._id !== editingRuleId : true),
    );

    if (duplicate) {
      setError('A rule for this domain already exists');
      return;
    }

    if (editingRuleId) {
      const existing = domainRules.find((rule) => rule._id === editingRuleId);
      if (!existing) return;
      if (normalized !== existing.domain.toLowerCase()) {
        setError('Domain cannot be changed while editing. Delete and add a new rule.');
        return;
      }

      onDomainRulesChange(
        domainRules.map((rule) =>
          rule._id === editingRuleId
            ? { ...rule, rule: selectedRule }
            : rule,
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
      <section>
        <p className="section-label">DOMAIN RULES</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Define per-domain behavior for tracking and auto-removal.
        </p>
        <div className="card-metric-glass p-5 mt-3 h-[320px]">
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="skeleton h-8 w-full rounded" />
              <div className="skeleton h-8 w-full rounded" />
              <div className="skeleton h-20 w-full rounded" />
            </div>
            <div className="space-y-3 lg:border-l lg:border-[var(--color-border)] lg:pl-5">
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton h-12 w-full rounded" />
              <div className="skeleton h-12 w-full rounded" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="section-label">DOMAIN RULES</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Define per-domain behavior for tracking and auto-removal.
      </p>

      <div className="card-metric-glass p-5 mt-3 h-[320px]">
        <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex h-full flex-col">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-center">
              <div className={isMutating ? 'pointer-events-none opacity-60' : ''}>
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
                    setDomainInput('');
                    if (error) setError(null);
                  }}
                  placeholder="www.example.com"
                  className="h-8 py-1.5 text-xs border rounded-lg"
                  containerClassName="!space-y-0"
                  autoComplete="off"
                />
              </div>

              <Dropdown<DownloadRuleValue>
                value={selectedRule}
                options={RULE_OPTIONS}
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
                {editingRuleId ? 'Save' : 'Add Rule'}
              </Button>
            </div>

            {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}

            {editingRuleId && (
              <button
                type="button"
                onClick={resetForm}
                className="mt-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
              >
                Cancel edit
              </button>
            )}

            <div className="mt-4 min-h-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Active Rules
              </p>

              {domainRules.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  No rules added yet. Add a domain rule above.
                </p>
              ) : (
                <div className="mt-2 space-y-2 h-[calc(100%-22px)] overflow-y-auto pr-1">
                  {domainRules.map((rule) => (
                    <div
                      key={rule._id}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--color-text-heading)]">
                          {rule.domain}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {toRuleLabel(rule.rule)}
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(rule._id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                          aria-label={`Edit ${rule.domain}`}
                          disabled={isMutating}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(rule._id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]"
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
              Domains From Your Downloads
            </p>

            {isDomainsLoading ? (
              <div className="mt-2 space-y-2">
                <div className="skeleton h-12 w-full rounded" />
                <div className="skeleton h-12 w-full rounded" />
                <div className="skeleton h-12 w-full rounded" />
              </div>
            ) : discoveredDomains.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                No downloads recorded yet. Start downloading to see domains here.
              </p>
            ) : (
              <div className="mt-2 space-y-2 min-h-0 flex-1 overflow-y-auto pr-1">
                {discoveredDomains.map((domain) => (
                  <DomainSourceRow
                    key={domain.domain}
                    domain={domain}
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
