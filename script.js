// --- Get livestream info from HTML data attributes ---
const video = document.getElementById("video");
const header = document.querySelector(".header h1"); // works with your HTML

const streamUrl = document.body.dataset.streamUrl;
const streamTitle = document.body.dataset.streamTitle || "LIVE STREAM";

if (!streamUrl) {
  document.body.innerHTML = '<p style="color:white;text-align:center;font-size:24px;">Stream Not Found</p>';
  throw new Error("Stream URL not set in HTML data attribute");
}

// Update header/title
header.textContent = streamTitle;

// --- Helper function to show offline message ---
function showOfflineMessage() {
  document.body.innerHTML = '<p style="color:white;text-align:center;font-size:24px;">Stream Offline</p>';
}

// --- Function to handle autoplay and delayed unmute ---
function playAndUnmute(videoEl, delay = 5000) {
  videoEl.muted = true;
  videoEl.play().catch(() => {});

  setTimeout(() => {
    // Only unmute if the video is visible
    if (document.visibilityState === "visible") {
      videoEl.muted = false;
    }
  }, delay);
}

// --- HLS setup ---
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(streamUrl);
  hls.attachMedia(video);

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    playAndUnmute(video, 5000);
  });

  hls.on(Hls.Events.ERROR, (event, data) => {
    if (data.fatal) showOfflineMessage();
  });

  // --- Watch from Beginning button ---
  const restartBtn = document.getElementById("restart-btn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      if (hls.streamController && hls.streamController._startPosition !== undefined) {
        video.currentTime = hls.streamController._startPosition; // DVR start
      } else {
        video.currentTime = 0; // fallback
      }
      video.play().catch(() => {});
    });
  }

} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  // Safari native HLS
  video.src = streamUrl;
  video.addEventListener('loadedmetadata', () => {
    playAndUnmute(video, 5000);
  });
  video.addEventListener('error', () => showOfflineMessage());
} else {
  showOfflineMessage();
}

// --- Background muted playback ---
// 1. When the user switches tabs
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    video.muted = true;
    video.play().catch(() => {});
  }
});

// 2. When the video scrolls out of view
const observer = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) {
    video.muted = true;
    video.play().catch(() => {});
  } else {
    // Optional: unmute if still within 5s auto-unmute window
    if (!video.muted) return; // already unmuted
    video.muted = false;
  }
}, { threshold: 0.1 });

observer.observe(video);