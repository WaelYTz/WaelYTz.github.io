// Opening links from inside the game without tripping popup blockers.
/** Open in a new tab; if the browser blocks it (no user gesture), navigate this tab instead. */
export function openLink(url: string) {
  if (url.startsWith('/')) {
    window.location.href = url;
    return;
  }
  const w = window.open(url, '_blank');
  if (w) {
    try {
      w.opener = null;
    } catch {
      /* ignore */
    }
  } else window.location.href = url;
}
