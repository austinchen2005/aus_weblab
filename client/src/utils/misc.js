// General combination helper: n choose k
export function combination(n, k) {
  if (k > n || k < 0 || n < 0) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k; // Use symmetry for efficiency

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

// General audio play helper
export function playSound(audio, volume = 1) {
  if (!audio) return;
  try {
    audio.volume = volume;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Silently ignore autoplay or other audio errors
      });
    }
  } catch {
    // Silently ignore errors
  }
}

