import { useMemo } from "react";
import { useDomains } from "@/api/useDownloads";
import type { DomainRule, DownloadRuleValue } from "@/api/downloads.api";
import {
  DomainRulesEditor,
  type DomainRuleItem,
  type DomainRuleOption,
} from "./shared/DomainRulesEditor";

const RULE_OPTIONS: DomainRuleOption<DownloadRuleValue>[] = [
  { label: "Track and Don't Remove", value: "track_keep" },
  { label: "Track and Remove", value: "track_remove" },
  { label: "Dont Track", value: "dont_track" },
];

interface DomainRulesSectionProps {
  domainRules: DomainRule[];
  isLoading?: boolean;
  isDisabled?: boolean;
  onDomainRulesChange: (next: DomainRule[]) => void;
}

export function DomainRulesSection({
  domainRules,
  isLoading = false,
  isDisabled = false,
  onDomainRulesChange,
}: DomainRulesSectionProps) {
  const { data: domains = [], isLoading: isDomainsLoading } =
    useDomains({ period: "all" });

  const suggestions = useMemo(() => {
    return [...domains]
      .sort((a, b) => b.totalCount - a.totalCount)
      .map((domain) => ({
        domain: domain.domain,
        meta: `${domain.totalCount} total · ${domain.newCount} new · ${domain.dupCount} dup`,
      }));
  }, [domains]);

  return (
    <DomainRulesEditor<DownloadRuleValue>
      title="Domain rules"
      description="Define per-domain behavior for tracking and auto-removal."
      domainPlaceholder="www.example.com"
      emptyRulesText="No rules added yet. Add a domain rule above."
      suggestionsTitle="Domains From Your Downloads"
      emptySuggestionsText="No downloads recorded yet. Start downloading to see domains here."
      domainRules={domainRules as DomainRuleItem<DownloadRuleValue>[]}
      ruleOptions={RULE_OPTIONS}
      defaultRule="track_keep"
      suggestions={suggestions}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isSuggestionsLoading={isDomainsLoading}
      onDomainRulesChange={(next) => onDomainRulesChange(next as DomainRule[])}
    />
  );
}
