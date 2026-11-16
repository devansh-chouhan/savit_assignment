import { format, formatDistanceToNow } from "date-fns";

export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d MMM yyyy");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d MMM yyyy, h:mm a");
}

export function fromNow(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function toDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function endOfDay(isoDate: string) {
  const date = new Date(`${isoDate}T23:59:59.999`);
  return date;
}

export function digits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}
