import { clsx } from "clsx";

type Status = "new" | "duplicate";

const styles: Record<Status, string> = {
  new: "bg-[#DCFCE7] text-[#16A34A]",
  duplicate: "bg-[#FEF3C7] text-[#D97706]",
};

export function StatusBadge({ status }: { status: Status }) {
  const label = status === "new" ? "NEW" : "DUP";
  return (
    <span
      className={clsx(
        "text-xs font-semibold px-2 py-0.5 rounded-md inline-block",
        styles[status],
      )}
    >
      {label}
    </span>
  );
}
