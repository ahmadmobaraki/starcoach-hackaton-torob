import { formatToman } from "@/lib/format";

export function Price({
  value,
  className = "",
  full = false,
}: {
  value: number | null | undefined;
  className?: string;
  full?: boolean;
}) {
  const text = full
    ? value == null
      ? "قیمت نامشخص"
      : `${formatToman(value)}`
    : formatToman(value);
  return <span className={`font-bold ${className}`}>{text}</span>;
}
