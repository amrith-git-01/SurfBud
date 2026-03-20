import { useMemo } from "react";
import { useBrowsingDomainStats } from "@/api/useBrowsing";
import type {
  BrowsingDomainRule,
  BrowsingRuleValue,
} from "@/types/shared/browsing-settings.types";
import {
  DomainRulesEditor,
  type DomainRuleItem,
  type DomainRuleOption,
} from "./shared/DomainRulesEditor";

const RULE_OPTIONS: DomainRuleOption<BrowsingRuleValue>[] = [
  { label: "Track", value: "track" },
  { label: "Dont Track", value: "dont_track" },
];

interface BrowsingDomainRulesSectionProps {
  domainRules: BrowsingDomainRule[];
  isLoading?: boolean;
  isDisabled?: boolean;
  onDomainRulesChange: (next: BrowsingDomainRule[]) => void;
}

export function BrowsingDomainRulesSection({
  domainRules,
  isLoading = false,
  isDisabled = false,
  onDomainRulesChange,
}: BrowsingDomainRulesSectionProps) {
  const { data, isLoading: isDomainsLoading } = useBrowsingDomainStats(
    { period: "all" },
    { staleTime: 30_000 },
  );

  const suggestions = useMemo(() => {
    const domains = data?.domains ?? [];
    return [...domains]
      .sort((a, b) => b.totalActiveTime - a.totalActiveTime)
      .map((domain) => {
        const roundedMinutes = Math.round(domain.totalActiveTime / 60);
        const durationLabel =
          roundedMinutes >= 60
            ? `${(roundedMinutes / 60).toFixed(1).replace(/\.0$/, "")}h`
            : `${roundedMinutes}m`;

        const tagLabel =
          domain.productivityType === "productive"
            ? "Productive"
            : domain.productivityType === "distractive"
              ? "Distractive"
              : "Neutral";

        const tagTone: "positive" | "negative" | "neutral" =
          domain.productivityType === "productive"
            ? "positive"
            : domain.productivityType === "distractive"
              ? "negative"
              : "neutral";

        return {
          domain: domain.domain,
          meta: `${domain.visitCount} ${domain.visitCount === 1 ? "session" : "sessions"} · ${durationLabel}`,
          tagLabel,
          tagTone,
        };
      });
  }, [data?.domains]);

  return (
    <DomainRulesEditor<BrowsingRuleValue>
      title="Domain rules"
      description="Define per-domain browsing tracking behavior."
      domainPlaceholder="www.example.com"
      emptyRulesText="No rules added yet. Add a domain rule above."
      suggestionsTitle="Domains From Your Browsing"
      emptySuggestionsText="No browsing sessions recorded yet. Browse a few sites to see suggestions here."
      domainRules={domainRules as DomainRuleItem<BrowsingRuleValue>[]}
      ruleOptions={RULE_OPTIONS}
      defaultRule="track"
      suggestions={suggestions}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isSuggestionsLoading={isDomainsLoading}
      onDomainRulesChange={(next) => onDomainRulesChange(next as BrowsingDomainRule[])}
    />
  );
}
