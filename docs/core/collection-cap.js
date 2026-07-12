// Shared accounting for bounded collection previews. Renderers keep their own presentation, but
// all derive shown/total/remainder from the unsliced source collection through this helper.

function collectionLength(value) {
  if (value == null) return 0;
  if (Number.isFinite(value.length)) return Math.max(0, Math.trunc(value.length));
  if (Number.isFinite(value.size)) return Math.max(0, Math.trunc(value.size));
  return 0;
}

export function describeCollectionCap(source, shown) {
  const total = collectionLength(source);
  const requested = typeof shown === 'number' ? shown : collectionLength(shown);
  const shownCount = Math.min(total, Math.max(0, Math.trunc(Number(requested) || 0)));
  const omitted = total - shownCount;
  return Object.freeze({
    total,
    shown: shownCount,
    omitted,
    label: `Showing ${shownCount} of ${total}`,
    remainder: omitted ? `+${omitted} more` : '',
  });
}
