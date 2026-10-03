// Short vibrations on phones that support them (Android; iOS Safari ignores it).
export function buzz(pattern) {
  if (!navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
