import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { tracksData } from "./tracks.js";

// ========== FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyDtgOzn6FU5LP1S0kmiR55W0LFBPIcVNpQ",
    authDomain: "tepstack.firebaseapp.com",
    projectId: "tepstack",
    storageBucket: "tepstack.firebasestorage.app",
    messagingSenderId: "1026996075508",
    appId: "1:1026996075508:web:cbe0303d8c48b60f9097a1",
    measurementId: "G-L4W7WNP4YT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
window.db = db;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.updateProfile = updateProfile;
window.doc = doc;
window.getDoc = getDoc;
window.setDoc = setDoc;

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let listeningStats = { totalPlays: 0, totalSeconds: 0, trackPlays: {}, artistPlays: {}, recentTracks: [] };
let currentIndex = 0, isPlaying = false, audio = null, shuffleMode = false, repeatMode = 'none', searchQuery = '';
let currentUser = null, favorites = new Set(), currentTab = 'home';
let preloadAudio = null, nextPreloadIndex = -1;
let playStartTime = null;

// ========== DOM ЭЛЕМЕНТЫ ==========
const trackListEl = document.getElementById('trackList');
const favoritesListEl = document.getElementById('favoritesList');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const homeTab = document.getElementById('homeTab');
const searchTab = document.getElementById('searchTab');
const favoritesTab = document.getElementById('favoritesTab');
const profileTab = document.getElementById('profileTab');
const navItems = document.querySelectorAll('.nav-item[data-tab], .tab-item[data-tab]');
const mobileSearchBtn = document.getElementById('mobileSearchBtn');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileAvatar = document.getElementById('profileAvatar');
const editProfileBtn = document.getElementById('editProfileBtn');
const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');
const editModal = document.getElementById('editModal');
const logoutModal = document.getElementById('logoutModal');
const authModal = document.getElementById('authModal');
const pcAccountIcon = document.getElementById('pcAccountIcon');
const themeToggle = document.getElementById('themeToggle');
const themeToggleMobile = document.getElementById('themeToggleMobile');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeSubtitle = document.getElementById('welcomeSubtitle');
const statsContainer = document.getElementById('statsContainer');

const desktopPlayer = document.getElementById('desktopPlayer');
const miniPlayer = document.getElementById('miniPlayer');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniPlay = document.getElementById('miniPlay');
const miniNext = document.getElementById('miniNext');
const desktopTitle = document.getElementById('desktopTitle');
const desktopArtist = document.getElementById('desktopArtist');
const playerPlay = document.getElementById('playerPlay');
const playerPrev = document.getElementById('playerPrev');
const playerNext = document.getElementById('playerNext');
const playerShuffle = document.getElementById('playerShuffle');
const playerRepeat = document.getElementById('playerRepeat');
const progressFill = document.getElementById('progressFill');
const progressBarBg = document.getElementById('progressBarBg');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');

// ========== ПОЛНОЭКРАННЫЙ ПЛЕЕР (ДОБАВЛЕНО) ==========
const fullscreenPlayer = document.getElementById('fullscreenPlayer');
const fullscreenTitle = document.getElementById('fullscreenTitle');
const fullscreenArtist = document.getElementById('fullscreenArtist');
const fullscreenPlay = document.getElementById('fullscreenPlay');
const fullscreenPrev = document.getElementById('fullscreenPrev');
const fullscreenNext = document.getElementById('fullscreenNext');
const fullscreenRepeat = document.getElementById('fullscreenRepeat');
const fullscreenProgressBar = document.getElementById('fullscreenProgressBar');
const fullscreenProgressFill = document.getElementById('fullscreenProgressFill');
const fullscreenCurrentTime = document.getElementById('fullscreenCurrentTime');
const fullscreenDurationSpan = document.getElementById('fullscreenDuration');
const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');

function openFullscreenPlayer() {
    if (!tracksData[currentIndex]) return;
    fullscreenPlayer.classList.add('open');
    updateFullscreenInfo();
}

function closeFullscreenPlayer() {
    fullscreenPlayer.classList.remove('open');
}

function updateFullscreenInfo() {
    const track = tracksData[currentIndex];
    if (track) {
        fullscreenTitle.textContent = track.title;
        fullscreenArtist.textContent = track.artist;
    }
    if (audio && audio.duration) {
        fullscreenDurationSpan.textContent = formatDuration(audio.duration);
        fullscreenCurrentTime.textContent = formatDuration(audio.currentTime);
        const percent = (audio.currentTime / audio.duration) * 100;
        fullscreenProgressFill.style.width = `${percent}%`;
    }
    updateFullscreenPlayBtn();
    updateFullscreenRepeatIcon();
}

function updateFullscreenPlayBtn() {
    const icon = fullscreenPlay.querySelector('i');
    if (isPlaying) {
        icon.className = 'fas fa-pause';
    } else {
        icon.className = 'fas fa-play';
    }
}

function updateFullscreenRepeatIcon() {
    if (repeatMode === 'all') {
        fullscreenRepeat.classList.add('active');
        fullscreenRepeat.querySelector('i').className = 'fas fa-repeat';
    } else if (repeatMode === 'one') {
        fullscreenRepeat.classList.add('active');
        fullscreenRepeat.querySelector('i').className = 'fas fa-repeat-1';
    } else {
        fullscreenRepeat.classList.remove('active');
        fullscreenRepeat.querySelector('i').className = 'fas fa-repeat';
    }
}

function fullscreenTogglePlay() {
    togglePlay();
    updateFullscreenPlayBtn();
}

function fullscreenNextTrack() {
    nextTrack();
    updateFullscreenInfo();
}

function fullscreenPrevTrack() {
    prevTrack();
    updateFullscreenInfo();
}

function fullscreenToggleRepeat() {
    if (repeatMode === 'none') {
        repeatMode = 'all';
        playerRepeat.classList.add('active');
        playerRepeat.innerHTML = '<i class="fas fa-repeat"></i>';
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        playerRepeat.innerHTML = '<i class="fas fa-repeat-1"></i>';
    } else {
        repeatMode = 'none';
        playerRepeat.classList.remove('active');
        playerRepeat.innerHTML = '<i class="fas fa-repeat"></i>';
    }
    updateFullscreenRepeatIcon();
    const nextIdx = getNextIndex();
    if (nextIdx !== currentIndex && audio) preloadTrack(nextIdx);
}

function fullscreenSeek(e) {
    if (!audio || !audio.duration) return;
    const rect = fullscreenProgressBar.getBoundingClientRect();
    const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = percent * audio.duration;
}

// Обновляем существующие функции для синхронизации с полноэкранным плеером
const originalUpdatePlayBtn = updatePlayBtn;
updatePlayBtn = function() {
    originalUpdatePlayBtn();
    updateFullscreenPlayBtn();
};

const originalUpdatePlayerInfo = updatePlayerInfo;
updatePlayerInfo = function(track) {
    originalUpdatePlayerInfo(track);
    if (fullscreenPlayer.classList.contains('open')) {
        fullscreenTitle.textContent = track.title;
        fullscreenArtist.textContent = track.artist;
    }
};

const originalUpdateProgress = function() {
    if (audio && audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = `${percent}%`;
        currentTimeSpan.textContent = formatDuration(audio.currentTime);
        if (fullscreenPlayer.classList.contains('open')) {
            fullscreenProgressFill.style.width = `${percent}%`;
            fullscreenCurrentTime.textContent = formatDuration(audio.currentTime);
        }
    }
};

// Переопределяем обработчик времени
const originalTimeUpdate = (audioElem) => {
    audioElem.addEventListener('timeupdate', () => {
        if (audioElem.duration) {
            const percent = (audioElem.currentTime / audioElem.duration) * 100;
            progressFill.style.width = `${percent}%`;
            currentTimeSpan.textContent = formatDuration(audioElem.currentTime);
            if (fullscreenPlayer.classList.contains('open')) {
                fullscreenProgressFill.style.width = `${percent}%`;
                fullscreenCurrentTime.textContent = formatDuration(audioElem.currentTime);
            }
        }
    });
};

// Подключаем события полноэкранного плеера
if (fullscreenPlay) fullscreenPlay.addEventListener('click', fullscreenTogglePlay);
if (fullscreenPrev) fullscreenPrev.addEventListener('click', fullscreenPrevTrack);
if (fullscreenNext) fullscreenNext.addEventListener('click', fullscreenNextTrack);
if (fullscreenRepeat) fullscreenRepeat.addEventListener('click', fullscreenToggleRepeat);
if (fullscreenProgressBar) fullscreenProgressBar.addEventListener('click', fullscreenSeek);
if (closeFullscreenBtn) closeFullscreenBtn.addEventListener('click', closeFullscreenPlayer);
if (miniPlayer) miniPlayer.addEventListener('click', openFullscreenPlayer);

// ========== СТАТИСТИКА ==========
function loadStats() {
    const saved = localStorage.getItem('qqmusic_stats');
    if (saved) {
        try { listeningStats = JSON.parse(saved); } catch(e) {}
    }
    if (!listeningStats.trackPlays) listeningStats.trackPlays = {};
    if (!listeningStats.artistPlays) listeningStats.artistPlays = {};
    if (!listeningStats.recentTracks) listeningStats.recentTracks = [];
    if (!listeningStats.totalPlays) listeningStats.totalPlays = 0;
    if (!listeningStats.totalSeconds) listeningStats.totalSeconds = 0;
}

function saveStats() {
    localStorage.setItem('qqmusic_stats', JSON.stringify(listeningStats));
    if (currentUser) saveStatsToFirebase();
    renderHomeStats();
}

async function saveStatsToFirebase() {
    if (!currentUser) return;
    try { await window.setDoc(window.doc(window.db, 'users', currentUser.uid), { stats: listeningStats }, { merge: true }); } catch(e) {}
}

async function loadStatsFromFirebase() {
    if (!currentUser) return;
    try {
        const userDoc = await window.getDoc(window.doc(window.db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().stats) {
            listeningStats = userDoc.data().stats;
            localStorage.setItem('qqmusic_stats', JSON.stringify(listeningStats));
            renderHomeStats();
        }
    } catch(e) {}
}

function recordPlay(trackId, artist, seconds) {
    if (!trackId) return;
    listeningStats.totalPlays++;
    listeningStats.totalSeconds += seconds;
    listeningStats.trackPlays[trackId] = (listeningStats.trackPlays[trackId] || 0) + 1;
    listeningStats.artistPlays[artist] = (listeningStats.artistPlays[artist] || 0) + 1;
    listeningStats.recentTracks.unshift({ trackId, artist, title: tracksData.find(t => t.id === trackId)?.title, timestamp: Date.now() });
    if (listeningStats.recentTracks.length > 20) listeningStats.recentTracks.pop();
    saveStats();
}

function renderHomeStats() {
    if (!statsContainer) return;
    const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Гость';
    welcomeTitle.innerHTML = `<i class="fas fa-hand-peace"></i> Добро пожаловать, ${userName}!`;
    welcomeSubtitle.innerHTML = listeningStats.totalPlays > 0 ? `Ты прослушал ${listeningStats.totalPlays} треков за всё время` : 'Начни слушать музыку, чтобы увидеть статистику';
    
    if (listeningStats.totalPlays === 0) {
        statsContainer.innerHTML = '<div class="empty-stats"><i class="fas fa-chart-line"></i>Статистика появится после прослушивания треков</div>';
        return;
    }
    
    const totalMinutes = Math.floor(listeningStats.totalSeconds / 60);
    const topTracks = Object.entries(listeningStats.trackPlays).sort((a,b) => b[1] - a[1]).slice(0, 3);
    const topArtists = Object.entries(listeningStats.artistPlays).sort((a,b) => b[1] - a[1]).slice(0, 3);
    
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${listeningStats.totalPlays}</div><div class="stat-label">Всего треков</div></div>
            <div class="stat-card"><div class="stat-number">${totalMinutes}</div><div class="stat-label">Минут прослушивания</div></div>
        </div>
        ${topTracks.length > 0 ? `
        <div class="top-list">
            <h3><i class="fas fa-music"></i> Чаще всего слушаемые треки</h3>
            ${topTracks.map(([id, count], idx) => {
                const track = tracksData.find(t => t.id == id);
                return `<div class="top-item"><div class="top-rank">${idx+1}</div><div class="top-info"><div class="top-name">${track?.title || 'Неизвестно'}</div><div class="top-count">${count} прослушиваний</div></div></div>`;
            }).join('')}
        </div>` : ''}
        ${topArtists.length > 0 ? `
        <div class="top-list">
            <h3><i class="fas fa-microphone"></i> Чаще всего слушаемые исполнители</h3>
            ${topArtists.map(([artist, count], idx) => `<div class="top-item"><div class="top-rank">${idx+1}</div><div class="top-info"><div class="top-name">${artist}</div><div class="top-count">${count} прослушиваний</div></div></div>`).join('')}
        </div>` : ''}
    `;
}

// ========== ПЛЕЕР ==========
function getAudioUrl(file) { return `audio/${file}`; }

function preloadTrack(index) {
    if (index < 0 || index >= tracksData.length) return;
    if (nextPreloadIndex === index && preloadAudio && preloadAudio.src) return;
    const track = tracksData[index];
    if (!track) return;
    if (!preloadAudio) preloadAudio = new Audio();
    preloadAudio.src = getAudioUrl(track.file);
    preloadAudio.load();
    nextPreloadIndex = index;
}

function getNextIndex() {
    if (shuffleMode) {
        let next;
        do { next = Math.floor(Math.random() * tracksData.length); } while (next === currentIndex && tracksData.length > 1);
        return next;
    } else {
        let next = currentIndex + 1;
        if (next >= tracksData.length) next = repeatMode === 'all' ? 0 : currentIndex;
        return next;
    }
}

function setupAudioEvents(audioElem, track, autoPlay) {
    audioElem.addEventListener('loadedmetadata', () => { 
        durationSpan.textContent = formatDuration(audioElem.duration);
        if (fullscreenPlayer.classList.contains('open')) {
            fullscreenDurationSpan.textContent = formatDuration(audioElem.duration);
        }
    });
    audioElem.addEventListener('timeupdate', () => {
        if (audioElem.duration) {
            const percent = (audioElem.currentTime / audioElem.duration) * 100;
            progressFill.style.width = `${percent}%`;
            currentTimeSpan.textContent = formatDuration(audioElem.currentTime);
            if (fullscreenPlayer.classList.contains('open')) {
                fullscreenProgressFill.style.width = `${percent}%`;
                fullscreenCurrentTime.textContent = formatDuration(audioElem.currentTime);
            }
        }
    });
    audioElem.addEventListener('play', () => { playStartTime = Date.now(); });
    audioElem.addEventListener('pause', () => {
        if (playStartTime) {
            const playedSeconds = (Date.now() - playStartTime) / 1000;
            if (playedSeconds > 3) recordPlay(track.id, track.artist, playedSeconds);
            playStartTime = null;
        }
    });
    audioElem.addEventListener('ended', () => {
        if (playStartTime) {
            const playedSeconds = (Date.now() - playStartTime) / 1000;
            if (playedSeconds > 3) recordPlay(track.id, track.artist, playedSeconds);
            playStartTime = null;
        }
        if (repeatMode === 'one') {
            audioElem.currentTime = 0;
            audioElem.play();
        } else {
            const nextIdx = getNextIndex();
            if (nextIdx !== currentIndex) {
                currentIndex = nextIdx;
                loadTrack(currentIndex, true);
            } else {
                isPlaying = false;
                updatePlayBtn();
            }
        }
    });
    updatePlayerInfo(track);
    showPlayer();
    if (autoPlay) {
        audioElem.play().then(() => {
            isPlaying = true;
            updatePlayBtn();
            const nextIdx = getNextIndex();
            if (nextIdx !== currentIndex) preloadTrack(nextIdx);
        }).catch(() => { isPlaying = false; updatePlayBtn(); });
    } else {
        isPlaying = false;
        updatePlayBtn();
        const nextIdx = getNextIndex();
        if (nextIdx !== currentIndex) preloadTrack(nextIdx);
    }
}

function loadTrack(index, autoPlay = false) {
    if (index < 0) index = 0;
    if (index >= tracksData.length) index = 0;
    currentIndex = index;
    const track = tracksData[currentIndex];
    if (!track) return;
    const currentVolume = volumeSlider.value;
    if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
    if (nextPreloadIndex === index && preloadAudio && preloadAudio.src) {
        audio = preloadAudio;
        preloadAudio = null;
        nextPreloadIndex = -1;
    } else {
        audio = new Audio(getAudioUrl(track.file));
    }
    audio.volume = currentVolume;
    setupAudioEvents(audio, track, autoPlay);
    renderTrackList();
}

function updatePlayerInfo(track) {
    const title = track.title, artist = track.artist;
    if (window.innerWidth <= 768) {
        miniTitle.textContent = title;
        miniArtist.textContent = artist;
    } else {
        desktopTitle.textContent = title;
        desktopArtist.textContent = artist;
    }
    if (fullscreenPlayer.classList.contains('open')) {
        fullscreenTitle.textContent = title;
        fullscreenArtist.textContent = artist;
    }
}

function togglePlay() {
    if (!tracksData[currentIndex]) return;
    if (!audio || !audio.src) { loadTrack(currentIndex, true); return; }
    if (audio.paused) { audio.play(); } else { audio.pause(); }
}

function updatePlayBtn() {
    const icon = window.innerWidth <= 768 ? miniPlay.querySelector('i') : playerPlay.querySelector('i');
    if (icon) icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    updateFullscreenPlayBtn();
}

function nextTrack() { const nextIdx = getNextIndex(); if (nextIdx !== currentIndex) { currentIndex = nextIdx; loadTrack(currentIndex, true); } }
function prevTrack() { let prevIdx = currentIndex - 1; if (prevIdx < 0) prevIdx = repeatMode === 'all' ? tracksData.length - 1 : currentIndex; if (prevIdx !== currentIndex) { currentIndex = prevIdx; loadTrack(currentIndex, true); } }
function showPlayer() { if (window.innerWidth <= 768) miniPlayer.classList.remove('hidden'); else desktopPlayer.classList.remove('hidden'); }
function hidePlayer() { if (window.innerWidth <= 768) miniPlayer.classList.add('hidden'); else desktopPlayer.classList.add('hidden'); }

// ========== РЕНДЕР СПИСКОВ ==========
function renderTrackList() {
    const filtered = tracksData.filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!filtered.length) { trackListEl.innerHTML = '<div class="empty-state"><i class="fas fa-music"></i> Ничего не найдено</div>'; return; }
    trackListEl.innerHTML = filtered.map((t, i) => {
        const idx = tracksData.findIndex(tr => tr.id === t.id);
        const isFav = favorites.has(t.id);
        return `<div class="track-item" data-index="${idx}"><div class="track-number">${i+1}</div><div class="track-cover"><i class="fas fa-music"></i></div><div class="track-info"><div class="track-name">${escapeHtml(t.title)}</div><div class="track-artist">${escapeHtml(t.artist)}</div></div><button class="favorite-btn ${isFav ? 'active' : ''}" data-id="${t.id}"><i class="fas fa-heart"></i></button></div>`;
    }).join('');
    attachTrackEvents(trackListEl);
}

function renderFavoritesList() {
    const fav = tracksData.filter(t => favorites.has(t.id));
    if (!fav.length) { favoritesListEl.innerHTML = '<div class="empty-state"><i class="fas fa-heart"></i> Нет избранных треков</div>'; return; }
    favoritesListEl.innerHTML = fav.map((t, i) => {
        const idx = tracksData.findIndex(tr => tr.id === t.id);
        return `<div class="track-item" data-index="${idx}"><div class="track-number">${i+1}</div><div class="track-cover"><i class="fas fa-music"></i></div><div class="track-info"><div class="track-name">${escapeHtml(t.title)}</div><div class="track-artist">${escapeHtml(t.artist)}</div></div><button class="favorite-btn active" data-id="${t.id}"><i class="fas fa-heart"></i></button></div>`;
    }).join('');
    attachTrackEvents(favoritesListEl);
}

function attachTrackEvents(container) {
    container.querySelectorAll('.track-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.favorite-btn')) return;
            const idx = parseInt(el.dataset.index);
            if (!isNaN(idx)) { currentIndex = idx; loadTrack(currentIndex, true); }
        });
    });
    container.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            if (!currentUser) { showAuthModal(); return; }
            btn.style.transform = 'scale(1.2)';
            setTimeout(() => { btn.style.transform = ''; }, 150);
            if (favorites.has(id)) favorites.delete(id);
            else favorites.add(id);
            await saveFavorites();
            renderTrackList();
            if (currentTab === 'favorites') renderFavoritesList();
            btn.classList.toggle('active', favorites.has(id));
        });
    });
}

async function saveFavorites() { if (currentUser) await window.setDoc(window.doc(window.db, 'users', currentUser.uid), { favorites: Array.from(favorites) }, { merge: true }); }
async function loadFavorites() { if (currentUser) { const doc = await window.getDoc(window.doc(window.db, 'users', currentUser.uid)); favorites = new Set(doc.exists() && doc.data().favorites ? doc.data().favorites : []); renderTrackList(); if (currentTab === 'favorites') renderFavoritesList(); } }

// ========== ТЕМА ==========
function initTheme() {
    const savedTheme = localStorage.getItem('qqmusic_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        updateThemeIcons(true);
    } else {
        document.body.classList.remove('dark');
        updateThemeIcons(false);
    }
}
function updateThemeIcons(isDark) {
    const icons = document.querySelectorAll('#themeToggle i, #themeToggleMobile i');
    icons.forEach(icon => icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon');
}
function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
        document.body.classList.remove('dark');
        localStorage.setItem('qqmusic_theme', 'light');
        updateThemeIcons(false);
        if (currentUser) saveThemeToFirebase('light');
    } else {
        document.body.classList.add('dark');
        localStorage.setItem('qqmusic_theme', 'dark');
        updateThemeIcons(true);
        if (currentUser) saveThemeToFirebase('dark');
    }
}
async function saveThemeToFirebase(theme) { if (!currentUser) return; try { await window.setDoc(window.doc(window.db, 'users', currentUser.uid), { theme }, { merge: true }); } catch(e) {} }
async function loadThemeFromFirebase() { if (!currentUser) return; try { const userDoc = await window.getDoc(window.doc(window.db, 'users', currentUser.uid)); if (userDoc.exists() && userDoc.data().theme) { const savedTheme = userDoc.data().theme; if (savedTheme === 'dark') { document.body.classList.add('dark'); localStorage.setItem('qqmusic_theme', 'dark'); updateThemeIcons(true); } else { document.body.classList.remove('dark'); localStorage.setItem('qqmusic_theme', 'light'); updateThemeIcons(false); } } } catch(e) {} }

// ========== ПРОФИЛЬ И АВТОРИЗАЦИЯ ==========
function updateUI() {
    if (currentUser) {
        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        profileName.textContent = displayName;
        profileEmail.textContent = currentUser.email;
        profileAvatar.textContent = displayName.charAt(0).toUpperCase();
    } else {
        profileName.textContent = 'Гость';
        profileEmail.textContent = 'Не авторизован';
        profileAvatar.textContent = '👤';
    }
    renderHomeStats();
}

function showAuthModal() { authModal.classList.add('active'); }
function hideAuthModal() { authModal.classList.remove('active'); }
function showEditModal() { if (currentUser) { document.getElementById('editName').value = currentUser.displayName || ''; editModal.classList.add('active'); } }
function hideEditModal() { editModal.classList.remove('active'); }
function showLogoutConfirm() { if (currentUser) logoutModal.classList.add('active'); }
function hideLogoutModal() { logoutModal.classList.remove('active'); }

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showAuthError('Заполните все поля'); return; }
    try {
        const res = await window.signInWithEmailAndPassword(window.auth, email, password);
        currentUser = res.user;
        updateUI();
        hideAuthModal();
        await loadFavorites();
        await loadStatsFromFirebase();
        await loadThemeFromFirebase();
    } catch(e) { showAuthError('Неверный email или пароль'); }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    if (!name || !email || !password) { showAuthError('Заполните все поля'); return; }
    if (password !== confirm) { showAuthError('Пароли не совпадают'); return; }
    if (password.length < 6) { showAuthError('Пароль минимум 6 символов'); return; }
    try {
        const res = await window.createUserWithEmailAndPassword(window.auth, email, password);
        await window.updateProfile(res.user, { displayName: name });
        await window.setDoc(window.doc(window.db, 'users', res.user.uid), { displayName: name, email, favorites: [] });
        currentUser = res.user;
        updateUI();
        hideAuthModal();
        await loadFavorites();
    } catch(e) { showAuthError('Email уже зарегистрирован'); }
}

async function handleSaveName() {
    const newName = document.getElementById('editName').value.trim();
    if (newName && currentUser) {
        await window.updateProfile(currentUser, { displayName: newName });
        await window.setDoc(window.doc(window.db, 'users', currentUser.uid), { displayName: newName }, { merge: true });
        updateUI();
    }
    hideEditModal();
}

async function handleLogout() {
    await window.signOut(window.auth);
    currentUser = null;
    favorites.clear();
    updateUI();
    hideLogoutModal();
    renderTrackList();
    if (currentTab === 'favorites') renderFavoritesList();
    hidePlayer();
    renderHomeStats();
}

function showAuthError(msg) {
    const errDiv = document.getElementById('authError');
    errDiv.textContent = msg;
    errDiv.style.display = 'block';
    setTimeout(() => errDiv.style.display = 'none', 3000);
}

let isLoginMode = true;
document.getElementById('switchBtn').onclick = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('loginForm').style.display = isLoginMode ? 'block' : 'none';
    document.getElementById('registerForm').style.display = isLoginMode ? 'none' : 'block';
    document.getElementById('modalTitle').textContent = isLoginMode ? 'Вход' : 'Регистрация';
    document.getElementById('switchText').textContent = isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?';
    document.getElementById('switchBtn').textContent = isLoginMode ? 'Зарегистрироваться' : 'Войти';
};

// ========== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ==========
function switchTab(tabId) {
    currentTab = tabId;
    homeTab.style.display = tabId === 'home' ? 'block' : 'none';
    searchTab.style.display = tabId === 'search' ? 'block' : 'none';
    favoritesTab.style.display = tabId === 'favorites' ? 'block' : 'none';
    profileTab.style.display = tabId === 'profile' ? 'block' : 'none';
    document.querySelectorAll('.nav-item, .tab-item').forEach(el => {
        if (el.dataset?.tab === tabId) el.classList.add('active');
        else el.classList.remove('active');
    });
    if (tabId === 'favorites') renderFavoritesList();
    if (tabId === 'profile' && !currentUser) showAuthModal();
    if (tabId === 'home') renderHomeStats();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function formatDuration(sec) { if (isNaN(sec)) return '0:00'; const m = Math.floor(sec/60), s = Math.floor(sec%60); return `${m}:${s<10?'0':''}${s}`; }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function seek(e) { if (!audio || !audio.duration) return; const rect = progressBarBg.getBoundingClientRect(); audio.currentTime = (e.clientX - rect.left) / rect.width * audio.duration; }
function toggleShuffle() { shuffleMode = !shuffleMode; playerShuffle.classList.toggle('active', shuffleMode); }
function toggleRepeat() {
    if (repeatMode === 'none') { repeatMode = 'all'; playerRepeat.classList.add('active'); playerRepeat.innerHTML = '<i class="fas fa-repeat"></i>'; }
    else if (repeatMode === 'all') { repeatMode = 'one'; playerRepeat.innerHTML = '<i class="fas fa-repeat-1"></i>'; }
    else { repeatMode = 'none'; playerRepeat.classList.remove('active'); playerRepeat.innerHTML = '<i class="fas fa-repeat"></i>'; }
    const nextIdx = getNextIndex();
    if (nextIdx !== currentIndex && audio) preloadTrack(nextIdx);
    updateFullscreenRepeatIcon();
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function init() {
    loadStats();
    initTheme();
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);
    renderTrackList();
    document.querySelectorAll('.nav-item[data-tab], .tab-item[data-tab]').forEach(i => i.addEventListener('click', () => switchTab(i.dataset.tab)));
    mobileSearchBtn?.addEventListener('click', () => switchTab('search'));
    playerPlay?.addEventListener('click', togglePlay);
    playerPrev?.addEventListener('click', prevTrack);
    playerNext?.addEventListener('click', nextTrack);
    playerShuffle?.addEventListener('click', toggleShuffle);
    playerRepeat?.addEventListener('click', toggleRepeat);
    miniPlay?.addEventListener('click', togglePlay);
    miniNext?.addEventListener('click', nextTrack);
    progressBarBg?.addEventListener('click', seek);
    volumeSlider?.addEventListener('input', e => { if(audio) audio.volume = e.target.value; });
    searchInput?.addEventListener('input', e => { searchQuery = e.target.value; searchClear.style.display = searchQuery ? 'block' : 'none'; renderTrackList(); });
    searchClear?.addEventListener('click', () => { searchInput.value = ''; searchQuery = ''; searchClear.style.display = 'none'; renderTrackList(); });
    pcAccountIcon?.addEventListener('click', () => { if(currentUser) switchTab('profile'); else showAuthModal(); });
    editProfileBtn?.addEventListener('click', showEditModal);
    logoutConfirmBtn?.addEventListener('click', showLogoutConfirm);
    document.getElementById('saveEditBtn')?.addEventListener('click', handleSaveName);
    document.getElementById('closeEditBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('confirmLogoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('cancelLogoutBtn')?.addEventListener('click', hideLogoutModal);
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('registerBtn')?.addEventListener('click', handleRegister);
    document.getElementById('closeAuthBtn')?.addEventListener('click', hideAuthModal);
    window.onAuthStateChanged(window.auth, async (user) => { 
        currentUser = user; 
        updateUI(); 
        await loadFavorites(); 
        if (user) {
            await loadStatsFromFirebase();
            await loadThemeFromFirebase();
        } else {
            loadStats();
            renderHomeStats();
        }
    });
    window.addEventListener('click', e => { if(e.target === editModal) hideEditModal(); if(e.target === logoutModal) hideLogoutModal(); if(e.target === authModal) hideAuthModal(); });
    switchTab('home');
    hidePlayer();
    if (tracksData.length) preloadTrack(0);
    renderHomeStats();
    
    // ПРИНУДИТЕЛЬНО ПОДКЛЮЧАЕМ КНОПКУ ЗАКРЫТИЯ ПОСЛЕ ЗАГРУЗКИ
    setTimeout(() => {
        const closeBtn = document.getElementById('closeFullscreenBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeFullscreenPlayer);
            console.log('✅ Кнопка закрытия подключена');
        } else {
            console.log('❌ Кнопка закрытия не найдена');
        }
    }, 100);
}

// Запускаем
init();
