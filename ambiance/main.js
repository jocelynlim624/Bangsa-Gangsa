const tracks = [
  {
    title: 'Icipilli Mitirimin',
    artist: 'Omah Cangkem',
    cover: 'assets/covers/disc-icipilli.png',
    audio: 'assets/audios/track-icipilli.mp3',
    credit: 'Sound: "Icipilli Mitirimin" by @omahcangkem (Yogyakarta Gamelan Festival 2017).',
  },
  {
    title: 'Rembulan Seretokem',
    artist: 'Omah Cangkem',
    cover: 'assets/covers/disc-rembulan.png',
    audio: 'assets/audios/track-rembulan.mp3',
    credit: 'Sound: "Rembulan Seretokem" by @omahcangkem.',
  },
];

let currentIndex = 0;
let isPlaying = false;
let isAnimating = false;

const audio      = document.getElementById('audioPlayer');
const discImg    = document.getElementById('discImg');
const discWrapper = document.getElementById('discWrapper');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const playBtn    = document.getElementById('playBtn');
const playIcon   = document.getElementById('playIcon');
const prevBtn    = document.getElementById('prevBtn');
const nextBtn    = document.getElementById('nextBtn');
const infoPanel  = document.getElementById('infoPanel');
const infoHandle = document.getElementById('infoHandle');
const infoToggleBtn = document.getElementById('infoToggleBtn');
const soundCredit = document.getElementById('soundCredit');

/* ─── Load track (no animation) ─────────────── */
function loadTrack(index) {
  const t = tracks[index];
  discImg.src = t.cover;
  audio.src = t.audio;
  trackTitle.textContent = t.title;
  trackArtist.textContent = t.artist;
  soundCredit.textContent = t.credit;
}

/* ─── Play / pause ─────────────── */
function updatePlayIcon() {
  playIcon.src = isPlaying ? 'assets/images/play.png' : 'assets/images/pause.png';
}

function setPlaying(val) {
  isPlaying = val;
  if (isPlaying) {
    audio.play().catch(() => {});
    discImg.classList.add('playing');
    playIcon.classList.add('is-playing');
  } else {
    audio.pause();
    discImg.classList.remove('playing');
    playIcon.classList.remove('is-playing');
  }
  updatePlayIcon();
}

playBtn.addEventListener('click', () => {
  setPlaying(!isPlaying);
});

/* ─── Change track with disc animation ─────────── */
function changeTrack(direction) {
  if (isAnimating) return;
  isAnimating = true;

  const outClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
  const inStartClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';

  discWrapper.classList.add(outClass);

  discWrapper.addEventListener('transitionend', function onOut(e) {
    if (e.propertyName !== 'transform') return;
    discWrapper.removeEventListener('transitionend', onOut);

    currentIndex = direction === 'next'
      ? (currentIndex + 1) % tracks.length
      : (currentIndex - 1 + tracks.length) % tracks.length;

    loadTrack(currentIndex);

    discWrapper.classList.remove(outClass);
    discWrapper.classList.add(inStartClass);

    void discWrapper.offsetWidth;

    discWrapper.classList.remove(inStartClass);
    discWrapper.classList.add('slide-to-center');

    discWrapper.addEventListener('transitionend', function onIn(e2) {
      if (e2.propertyName !== 'transform') return;
      discWrapper.removeEventListener('transitionend', onIn);
      discWrapper.classList.remove('slide-to-center');
      isAnimating = false;

      if (isPlaying) {
        audio.play().catch(() => {});
      }
    });
  });
}

prevBtn.addEventListener('click', () => changeTrack('prev'));
nextBtn.addEventListener('click', () => changeTrack('next'));

audio.addEventListener('ended', () => {
  audio.currentTime = 0;
  audio.play().catch(() => {});
});

/* ─── Info panel swipe / tap ─────────────── */
let panelOpen = false;
let touchStartY = 0;
let touchStartTime = 0;

function togglePanel(forceOpen) {
  panelOpen = forceOpen !== undefined ? forceOpen : !panelOpen;
  infoPanel.classList.toggle('open', panelOpen);
}

infoHandle.addEventListener('click', () => togglePanel());
infoToggleBtn.addEventListener('click', () => togglePanel());

infoPanel.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
}, { passive: true });

infoPanel.addEventListener('touchend', (e) => {
  const dy = touchStartY - e.changedTouches[0].clientY;
  const dt = Date.now() - touchStartTime;
  const isFlick = dt < 300;

  if (isFlick && dy > 30 && !panelOpen) togglePanel(true);
  if (isFlick && dy < -30 && panelOpen) togglePanel(false);
}, { passive: true });

/* ─── Media Session (Lock Screen Controls) ─────────── */
function updateMediaMetadata() {
  if ('mediaSession' in navigator) {
    const t = tracks[currentIndex];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: 'Bangsa Gangsa',
      artwork: [
        { src: t.cover, sizes: '512x512', type: 'image/png' }
      ]
    });
  }
}

// Set up lock screen action handlers
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
  navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
  navigator.mediaSession.setActionHandler('previoustrack', () => changeTrack('prev'));
  navigator.mediaSession.setActionHandler('nexttrack', () => changeTrack('next'));
}

/* ─── Wake Lock (Prevent Screen Dimming) ─────────── */
let wakeLock = null;

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock is active');
    }
  } catch (err) {
    console.error(`${err.name}, ${err.message}`);
  }
};

// Re-request wake lock if tab becomes visible again
document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

/* ─── Modified loadTrack to update Meta ─────────── */
// Wrap your existing loadTrack function to include metadata updates
const originalLoadTrack = loadTrack;
loadTrack = function(index) {
  originalLoadTrack(index);
  updateMediaMetadata();
};

/* ─── Modified setPlaying to trigger Wake Lock ─────────── */
// Wrap your existing setPlaying to trigger wake lock on play
const originalSetPlaying = setPlaying;
setPlaying = function(val) {
  originalSetPlaying(val);
  if (val) {
    requestWakeLock();
  } else {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  }
};

/* ─── Sync Disc Animation with Reality ─────────── */
// Prevents the "frozen animation" glitch when tab goes to background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    discImg.style.animationPlayState = 'paused';
  } else {
    if (isPlaying) discImg.style.animationPlayState = 'running';
  }
});


/* ─── Init ─────────────── */
loadTrack(currentIndex);
updatePlayIcon();