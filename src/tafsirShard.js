export function decodeTafsirEntries(shard, verseNumber) {
  if (shard?.schemaVersion === 2) {
    return (shard.verses?.[String(verseNumber)] || []).map(item => ({
      ...item,
      pages: (item.refs || []).map(([hash, page]) => ({page, text: shard.chunks?.[hash] || ''})).filter(page => page.text),
    }));
  }
  return shard?.[String(verseNumber)] || [];
}
