export const money = (cents: number | null) =>
  cents === null
    ? "See offer"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
      }).format(cents / 100);
export const shortDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(date) ? "UTC" : "America/New_York",
  });
export function matchQuery(text: string, query: string) {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !/^\d+$/.test(w) &&
        ![
          "the",
          "for",
          "with",
          "under",
          "find",
          "best",
          "deal",
          "deals",
          "want",
          "need",
          "and",
        ].includes(w),
    );
  return (
    words.length === 0 ||
    words.some((word) => text.toLowerCase().includes(word))
  );
}
