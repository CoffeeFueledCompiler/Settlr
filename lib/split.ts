/**
 * Divides amountCents evenly across userIds, distributing the remainder from
 * integer division one cent at a time to the first N members so the shares
 * always sum exactly to amountCents (e.g. 12345 / 4 -> [3087, 3086, 3086, 3086]).
 */
export function splitEqually(amountCents: number, userIds: string[]) {
  const base = Math.floor(amountCents / userIds.length);
  const remainder = amountCents - base * userIds.length;
  const splits = userIds.map((userId, i) => ({
    userId,
    shareCents: base + (i < remainder ? 1 : 0),
  }));

  const sum = splits.reduce((acc, s) => acc + s.shareCents, 0);
  if (sum !== amountCents) {
    throw new Error(`splitEqually invariant violated: ${sum} !== ${amountCents}`);
  }
  return splits;
}
