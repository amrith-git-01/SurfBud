interface ExtensionPlaceholderPageProps {
  title: string;
}

export function ExtensionPlaceholderPage({
  title,
}: ExtensionPlaceholderPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 pt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Coming soon.
      </p>
      <div className="mt-8 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-white/60 px-4 py-12">
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Empty for now
        </p>
      </div>
    </div>
  );
}
