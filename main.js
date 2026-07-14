// ═══════════════════════════════════════════════════════════════
// ZEUS MARIO — ULTIMATE PREMIUM
// 6 worlds, power-ups, enemies, fireballs, particles, audio
// Compact 3-button mobile layout
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ═══════════ AUDIO ═══════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
function playTone(f, d, t = 'square', v = 0.1) {
  try {
    initAudio(); const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  } catch (e) {}
}
function playNote(f, d) { playTone(f, d, 'square', 0.09); }
const SFX = {
  jump: () => { playNote(400, 0.07); setTimeout(() => playNote(600, 0.07), 50); },
  coin: () => { playNote(988, 0.05); setTimeout(() => playNote(1319, 0.09), 50); },
  stomp: () => { playNote(200, 0.08); setTimeout(() => playNote(100, 0.07), 70); },
  death: () => { playNote(400, 0.07); setTimeout(() => playNote(300, 0.07), 70); setTimeout(() => playNote(200, 0.18), 140); },
  power: () => { playNote(600, 0.05); setTimeout(() => playNote(800, 0.05), 50); setTimeout(() => playNote(1000, 0.1), 100); },
  fire: () => { playNote(900, 0.03); setTimeout(() => playNote(1200, 0.05), 35); },
  hurt: () => { playNote(250, 0.08); setTimeout(() => playNote(180, 0.12), 90); },
  oneup: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playNote(f, 0.07), i * 70)); },
  win: () => { [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => setTimeout(() => playNote(f, 0.08), i * 50)); },
  breakS: () => { playNote(150, 0.12); }
};

// ═══════════ STATE ═══════════
const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, TRANSITION: 3, GAMEOVER: 4, WIN: 5 };
let gameState = STATE.MENU;
let score = 0, totalCoins = 0, lives = 3, currentLevel = 0;
let cameraX = 0, frameCount = 0, screenShake = 0;
let timer = 300, timerAccum = 0, comboCount = 0, comboTimer = 0;
let particles = [], floatingTexts = [];
let levelTransitionTimer = 0;
let toastTimer = 0, toastMsg = '';

// ═══════════ INPUT ═══════════
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (gameState === STATE.PLAYING) gameState = STATE.PAUSED;
    else if (gameState === STATE.PAUSED) gameState = STATE.PLAYING;
  }
  if ((e.code === 'Enter' || e.code === 'Space') && gameState === STATE.MENU)
    document.getElementById('startBtn').click();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// Touch — 3 buttons only: Left, Jump, Right
const ti = { left: false, right: false, jump: false, jumpTap: false, runTap: false };

document.getElementById('btnLeft').addEventListener('touchstart', e => { e.preventDefault(); ti.left = true; });
document.getElementById('btnLeft').addEventListener('touchend', e => { e.preventDefault(); ti.left = false; });
document.getElementById('btnLeft').addEventListener('touchcancel', e => { ti.left = false; });

document.getElementById('btnRight').addEventListener('touchstart', e => { e.preventDefault(); ti.right = true; });
document.getElementById('btnRight').addEventListener('touchend', e => { e.preventDefault(); ti.right = false; });
document.getElementById('btnRight').addEventListener('touchcancel', e => { ti.right = false; });

document.getElementById('btnJump').addEventListener('touchstart', e => { e.preventDefault(); ti.jump = true; ti.jumpTap = true; });
document.getElementById('btnJump').addEventListener('touchend', e => { e.preventDefault(); ti.jump = false; });
document.getElementById('btnJump').addEventListener('touchcancel', e => { ti.jump = false; });

// ═══════════ SPRITES ═══════════
function drawMario(c, x, y, w, h, fr, fc, pu, inv) {
  c.save(); const s = Math.min(w, h);
  c.translate(x + w / 2, y + h / 2); if (fc === -1) c.scale(-1, 1); c.translate(-s / 2, -s / 2);
  if (inv > 0 && Math.floor(inv / 3) % 2 === 0) c.globalAlpha = 0.4;
  const isFire = pu === 'fire', isSuper = pu === 'super' || pu === 'fire', bH = isSuper ? s - 4 : s - 2;
  const lo = Math.sin(fr * 0.25) * 3;
  c.fillStyle = '#2980b9'; c.fillRect(6, bH - 12, 8, 8 + lo); c.fillRect(18, bH - 12, 8, 8 - lo);
  c.fillStyle = '#5D4037'; c.fillRect(4, bH - 4 + lo, 10, 4); c.fillRect(18, bH - 4 - lo, 10, 4);
  c.fillStyle = isFire ? '#e74c3c' : '#e53e30'; c.fillRect(4, 8, 24, bH - 12);
  c.fillStyle = '#2980b9'; c.fillRect(8, 12, 4, 10); c.fillRect(20, 12, 4, 10);
  c.fillStyle = '#f1c40f'; c.fillRect(10, 13, 2, 2); c.fillRect(22, 13, 2, 2);
  const ao = Math.sin(fr * 0.2) * 2; c.fillStyle = '#f5c6a0';
  c.fillRect(0, 10 + ao, 5, 8); c.fillRect(27, 10 - ao, 5, 8);
  c.fillStyle = '#c0392b'; c.fillRect(0, 10 + ao, 5, 4); c.fillRect(27, 10 - ao, 5, 4);
  c.fillStyle = '#f5c6a0'; c.fillRect(8, 0, 16, 10);
  c.fillStyle = '#000'; c.fillRect(11, 2, 4, 4); c.fillRect(19, 2, 4, 4);
  c.fillStyle = '#fff'; c.fillRect(12, 3, 2, 2); c.fillRect(20, 3, 2, 2);
  c.fillStyle = '#c0392b'; c.fillRect(6, -2, 20, 5); c.fillRect(4, 0, 24, 3);
  c.fillStyle = '#a93226'; c.fillRect(4, 3, 24, 2);
  c.fillStyle = '#fff'; c.font = 'bold 5px Arial'; c.textAlign = 'center'; c.fillText('M', s / 2, 4);
  if (isFire) { c.fillStyle = '#f39c12'; c.fillRect(14, bH - 18, 4, 6); c.fillStyle = 'rgba(243,156,18,0.3)'; c.fillRect(6, bH - 16, 8, 3); c.fillRect(18, bH - 14, 8, 3); }
  c.restore();
}

function drawGoomba(c, x, y, w, h, fr, sq) {
  c.save(); const s = Math.min(w, h); c.translate(x + w / 2 - s / 2, y + h / 2 - s / 2);
  if (sq) { c.fillStyle = '#8B4513'; c.fillRect(0, s - 8, s, 8); c.fillStyle = '#000'; c.fillRect(4, s - 6, 4, 2); c.fillRect(s - 8, s - 6, 4, 2); c.restore(); return; }
  c.fillStyle = '#8B4513'; c.beginPath(); c.arc(s / 2, s / 2 + 2, s / 2 - 2, Math.PI, 0); c.fill();
  c.fillStyle = '#A0522D'; c.fillRect(4, 5, s - 8, 14);
  c.fillStyle = '#fff'; c.fillRect(7, 9, 7, 7); c.fillRect(s - 14, 9, 7, 7);
  c.fillStyle = '#000'; c.fillRect(9, 11, 4, 5); c.fillRect(s - 13, 11, 4, 5);
  c.beginPath(); c.arc(s / 2, 20, 5, 0, Math.PI); c.stroke();
  c.fillRect(6, 7, 9, 2); c.fillRect(s - 15, 7, 9, 2);
  const ll = Math.sin(fr * 0.12) * 2; c.fillStyle = '#000';
  c.fillRect(5, 24 + ll, 9, 6); c.fillRect(s - 14, 24 - ll, 9, 6);
  c.restore();
}

function drawKoopa(c, x, y, w, h, fr, sh, sm) {
  c.save(); const s = Math.min(w, h); c.translate(x + w / 2 - s / 2, y + h / 2 - s / 2);
  if (sh) {
    c.fillStyle = '#27ae60'; c.beginPath(); c.arc(s / 2, s / 2 + 2, s / 2 - 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1e8449'; c.beginPath(); c.arc(s / 2, s / 2 + 2, s / 2 - 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2ecc71'; const rot = sm ? fr * 0.3 : 0;
    for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2; c.beginPath(); c.arc(s / 2 + Math.cos(a) * (s / 2 - 6), s / 2 + 2 + Math.sin(a) * (s / 2 - 6), 3, 0, Math.PI * 2); c.fill(); }
    c.restore(); return;
  }
  c.fillStyle = '#27ae60'; c.beginPath(); c.arc(s / 2, s / 2 + 4, s / 2 - 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1e8449'; c.beginPath(); c.arc(s / 2, s / 2 + 2, s / 2 - 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f5c6a0'; c.fillRect(s / 2 - 3, -2, 11, 11); c.fillRect(s / 2 - 1, -5, 7, 5);
  c.fillStyle = '#000'; c.fillRect(s / 2, 0, 3, 3); c.fillRect(s / 2 + 5, 0, 3, 3);
  c.fillStyle = '#fff'; c.fillRect(s / 2 + 1, 1, 1, 1); c.fillRect(s / 2 + 6, 1, 1, 1);
  const ll = Math.sin(fr * 0.12) * 3; c.fillStyle = '#f5c6a0';
  c.fillRect(s / 2 - 4, s - 7 + ll, 7, 7); c.fillRect(s / 2 + 5, s - 7 - ll, 7, 7);
  c.restore();
}

function drawBuzzy(c, x, y, w, h, fr) {
  c.save(); const s = Math.min(w, h); c.translate(x + w / 2 - s / 2, y + h / 2 - s / 2);
  c.fillStyle = '#555'; c.beginPath(); c.arc(s / 2, s / 2 + 2, s / 2 - 3, Math.PI, 0); c.fill();
  c.fillStyle = '#444'; c.beginPath(); c.arc(s / 2, s / 2 + 2, s / 2 - 3, 0, Math.PI); c.fill();
  c.fillStyle = '#666'; c.beginPath(); c.arc(s / 2, s / 2 + 2, s / 2 - 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#333'; c.fillRect(s / 2 - 1, 4, 2, s - 8); c.fillRect(6, s / 2 - 2, s - 12, 2);
  c.fillStyle = '#666'; c.fillRect(s / 2 - 3, 0, 8, 6);
  c.fillStyle = '#e74c3c'; c.fillRect(s / 2 - 1, 1, 2, 2); c.fillRect(s / 2 + 3, 1, 2, 2);
  const ll = Math.sin(fr * 0.12) * 2; c.fillStyle = '#333';
  c.fillRect(5, s - 6 + ll, 8, 6); c.fillRect(s - 13, s - 6 - ll, 8, 6);
  c.restore();
}

function drawBulletBill(c, x, y, w, h, fr) {
  c.save(); const s = Math.min(w, h); c.translate(x + w / 2 - s / 2, y + h / 2 - s / 2);
  c.fillStyle = '#555'; c.beginPath(); c.moveTo(0, s / 2); c.lineTo(8, 4); c.lineTo(s - 4, 4); c.lineTo(s, s / 2); c.lineTo(s - 4, s - 4); c.lineTo(8, s - 4); c.closePath(); c.fill();
  c.fillStyle = '#e74c3c'; c.beginPath(); c.moveTo(10, 4); c.lineTo(4, 0); c.lineTo(10, 10); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(10, s - 4); c.lineTo(4, s); c.lineTo(10, s - 10); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.fillRect(s - 18, 8, 8, 6); c.fillRect(s - 18, s - 14, 8, 6);
  c.fillStyle = '#000'; c.fillRect(s - 16, 10, 4, 4); c.fillRect(s - 16, s - 12, 4, 4);
  c.fillStyle = '#000'; c.fillRect(s - 20, 6, 12, 2); c.fillRect(s - 20, s - 8, 12, 2);
  c.fillStyle = '#f39c12'; c.fillRect(2, s / 2 - 1, 4, 2);
  c.restore();
}

function drawPiranha(c, x, y, w, h, fr, emerging) {
  c.save(); const s = Math.min(w, h);
  c.fillStyle = '#2ecc71'; c.fillRect(x + 4, y + 8, w - 8, h - 8);
  c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x + 6, y + 10, 6, h - 10);
  c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(x + w - 12, y + 10, 6, h - 10);
  c.fillStyle = '#2ecc71'; c.fillRect(x, y, w, 10);
  c.fillStyle = '#27ae60'; c.fillRect(x + 2, y + 2, w - 4, 6);
  c.fillStyle = '#2ecc71'; c.fillRect(x + 4, y + 8, w - 8, 3);
  c.fillRect(x + 2, y, w - 4, 2);
  if (emerging) {
    const em = Math.min(1, Math.sin(fr * 0.03) * 1.5 + 0.5);
    const py = y + 10 - em * 22;
    if (em > 0.1) {
      c.fillStyle = '#e74c3c'; c.beginPath(); c.arc(x + w / 2, py + 10, 12, Math.PI, 0); c.fill();
      c.fillStyle = '#fff'; c.fillRect(x + w / 2 - 8, py + 6, 6, 6); c.fillRect(x + w / 2 + 2, py + 6, 6, 6);
      c.fillStyle = '#000'; c.fillRect(x + w / 2 - 6, py + 8, 3, 4); c.fillRect(x + w / 2 + 4, py + 8, 3, 4);
      c.fillStyle = '#000'; c.beginPath(); c.arc(x + w / 2, py + 18, 4, Math.PI, 0); c.fill();
      c.fillStyle = '#fff'; for (let i = -3; i <= 3; i += 3) c.fillRect(x + w / 2 + i - 1, py + 14, 2, 3);
    }
  }
  c.restore();
}

function drawCoin(c, x, y, r, fr) {
  c.save(); const p = Math.sin(fr * 0.08) * 0.2 + 1; c.translate(x, y); c.scale(p, 1);
  c.shadowColor = '#FFD700'; c.shadowBlur = 10;
  c.fillStyle = '#FFD700'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.shadowBlur = 0; c.fillStyle = '#FFA500'; c.beginPath(); c.arc(0, 0, r - 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#FFD700'; c.font = 'bold ' + r + 'px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 0, 0);
  c.restore();
}

function drawMushroom(c, x, y, s, fr) {
  c.save(); c.translate(x, y + Math.sin(fr * 0.06) * 2);
  c.fillStyle = '#f5deb3'; c.fillRect(-4, s / 2 - 2, 8, s / 2);
  c.fillStyle = '#e74c3c'; c.beginPath(); c.arc(0, 0, s / 2, Math.PI, 0); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-4, -3, 3, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(4, -4, 2.5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(-1, -7, 2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#000'; c.fillRect(-3, 2, 2, 3); c.fillRect(1, 2, 2, 3);
  c.beginPath(); c.arc(0, 5, 3, 0, Math.PI); c.stroke();
  c.restore();
}

function drawFireFlower(c, x, y, s, fr) {
  c.save(); c.translate(x, y + Math.sin(fr * 0.06) * 2);
  c.fillStyle = '#27ae60'; c.fillRect(-2, 0, 4, s - 4);
  const cols = ['#e74c3c', '#f39c12', '#e74c3c', '#f39c12'];
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + fr * 0.02; c.fillStyle = cols[i]; c.beginPath(); c.arc(Math.cos(a) * 5, Math.sin(a) * 5 - (s - 8), 5, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#f1c40f'; c.beginPath(); c.arc(0, -(s - 8), 4, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#000'; c.fillRect(-2, -(s - 6), 1, 2); c.fillRect(1, -(s - 6), 1, 2);
  c.beginPath(); c.arc(0, -(s - 2), 2, 0, Math.PI); c.stroke();
  c.restore();
}

function drawStar(c, x, y, s, fr) {
  c.save(); c.translate(x, y); c.rotate(fr * 0.08);
  c.shadowColor = '#f1c40f'; c.shadowBlur = 15;
  c.fillStyle = '#f1c40f'; c.beginPath();
  for (let i = 0; i < 5; i++) { const oa = i * 2 * Math.PI / 5 - Math.PI / 2, ia = oa + Math.PI / 5; if (i === 0) c.moveTo(Math.cos(oa) * s / 2, Math.sin(oa) * s / 2); else c.lineTo(Math.cos(oa) * s / 2, Math.sin(oa) * s / 2); c.lineTo(Math.cos(ia) * s / 4, Math.sin(ia) * s / 4); }
  c.closePath(); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#000'; c.fillRect(-3, -2, 2, 3); c.fillRect(1, -2, 2, 3);
  c.beginPath(); c.arc(0, 3, 2, 0, Math.PI); c.stroke();
  c.restore();
}

function drawQB(c, x, y, w, h, fr, hit) {
  c.save();
  if (!hit) { c.translate(0, Math.sin(fr * 0.1) * 1.5); c.shadowColor = '#f39c12'; c.shadowBlur = 8; } else c.globalAlpha = 0.6;
  c.fillStyle = '#f39c12'; c.fillRect(x, y, w, h); c.shadowBlur = 0;
  c.strokeStyle = '#d68910'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
  c.strokeStyle = '#e67e22'; c.lineWidth = 1; c.strokeRect(x + 3, y + 3, w - 6, h - 6);
  if (!hit) { c.fillStyle = '#fff'; c.font = 'bold ' + (w * 0.5) + 'px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x + w / 2, y + h / 2 + 1); }
  c.restore();
}

function drawBrick(c, x, y, w, h) {
  c.save(); c.fillStyle = '#cd6155'; c.fillRect(x, y, w, h);
  c.strokeStyle = '#a93226'; c.lineWidth = 1.5; c.strokeRect(x, y, w, h);
  c.strokeStyle = '#a93226'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2);
  c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h / 2);
  c.moveTo(x + w / 4, y + h / 2); c.lineTo(x + w / 4, y + h);
  c.moveTo(x + w * 3 / 4, y + h / 2); c.lineTo(x + w * 3 / 4, y + h);
  c.stroke(); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x + 2, y + 2, w - 4, 2);
  c.restore();
}

function drawFlagpole(c, x, gY, fr, atPole) {
  c.save(); const pH = gY - 60, pX = x + 12;
  c.fillStyle = '#888'; c.fillRect(pX - 2, 40, 4, pH - 40);
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(pX - 1, 40, 1, pH - 40);
  c.fillStyle = '#f1c40f'; c.shadowColor = '#f1c40f'; c.shadowBlur = 10;
  c.beginPath(); c.arc(pX, 40, 8, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
  const fY = atPole ? 40 + (pH - 40) * 0.85 : 48, fw = Math.sin(fr * 0.08) * 3;
  c.fillStyle = '#27ae60'; c.beginPath(); c.moveTo(pX + 4, fY); c.lineTo(pX + 32 + fw, fY + 10); c.lineTo(pX + 4, fY + 20); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.font = '11px Arial'; c.textAlign = 'center'; c.fillText('★', pX + 12 + fw * 0.5, fY + 13);
  c.fillStyle = '#666'; c.fillRect(pX - 8, gY - 4, 16, 8); c.fillStyle = '#555'; c.fillRect(pX - 6, gY - 2, 12, 6);
  c.restore();
}

function drawFireball(c, x, y, r, fr) {
  c.save(); c.translate(x, y); c.shadowColor = '#f39c12'; c.shadowBlur = 15;
  const cs = ['#e74c3c', '#f39c12', '#e74c3c'];
  for (let i = 2; i >= 0; i--) { c.fillStyle = cs[i]; const sz = r + Math.sin(fr * 0.2 + i) * 2; c.beginPath(); c.arc(0, 0, sz - i * 2, 0, Math.PI * 2); c.fill(); }
  c.shadowBlur = 0;
  for (let i = 0; i < 3; i++) { const a = fr * 0.1 + i * 2, d = r + 4 + Math.sin(fr * 0.15 + i) * 2; c.fillStyle = 'rgba(243,156,18,' + (0.3 + Math.sin(fr * 0.2 + i) * 0.2) + ')'; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

// ═══════════ PARTICLES ═══════════
function spawnParticles(x, y, color, count = 10, speed = 5) {
  for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7); particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, decay: 0.015 + Math.random() * 0.025, size: 2 + Math.random() * 4, color, gravity: 0.2 + Math.random() * 0.2 }); }
}
function spawnCoinParticles(x, y) { spawnParticles(x, y, '#FFD700', 12, 6); }
function spawnStompParticles(x, y) { spawnParticles(x, y, '#8B4513', 15, 5); spawnParticles(x, y, '#fff', 5, 3); }
function spawnBlockParticles(x, y, w, h) { for (let i = 0; i < 8; i++) { particles.push({ x: x + Math.random() * w, y: y + Math.random() * h, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 10 - 3, life: 1, decay: 0.012 + Math.random() * 0.015, size: 6 + Math.random() * 6, color: '#cd6155', gravity: 0.4, rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10 }); } }
function spawnPowerupParticles(x, y) { const cols = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#f1c40f']; for (let i = 0; i < 20; i++) { particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 10 - 2, life: 1, decay: 0.015 + Math.random() * 0.02, size: 3 + Math.random() * 4, color: cols[Math.floor(Math.random() * cols.length)], gravity: 0.15 }); } }
function spawnFlagParticles(x, y) { const cols = ['#FFD700', '#e74c3c', '#27ae60', '#3498db', '#f39c12', '#fff']; for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6; particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 1, decay: 0.008 + Math.random() * 0.012, size: 3 + Math.random() * 5, color: cols[Math.floor(Math.random() * cols.length)], gravity: 0.05 }); } }
function spawnText(x, y, txt, color = '#fff', sz = 18) { floatingTexts.push({ x, y, text: txt, color, size: sz, life: 1, vy: -2.5 }); }

function updateParticles() {
  particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0.3; if (p.rot !== undefined) p.rot += p.rotSpeed || 0; p.life -= p.decay; return p.life > 0; });
  floatingTexts = floatingTexts.filter(ft => { ft.y += ft.vy; ft.vy *= 0.97; ft.life -= 0.018; return ft.life > 0; });
}

function drawParticles(c, camX) {
  particles.forEach(p => { c.save(); c.globalAlpha = Math.max(0, p.life); if (p.rot !== undefined) { c.translate(p.x - camX, p.y); c.rotate(p.rot * Math.PI / 180); c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); } else { c.fillStyle = p.color; c.beginPath(); c.arc(p.x - camX, p.y, p.size * p.life, 0, Math.PI * 2); c.fill(); } c.restore(); });
  floatingTexts.forEach(ft => { c.save(); c.globalAlpha = Math.max(0, ft.life); c.fillStyle = ft.color; c.font = 'bold ' + ft.size + 'px Arial'; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 4; c.fillText(ft.text, ft.x - camX, ft.y); c.restore(); });
  c.globalAlpha = 1;
}

// ═══════════ LEVELS ═══════════
const LEVELS = [{
  name: 'WORLD 1-1', subtitle: 'Green Plains', bgColor: '#6ec6ff', gradientTop: '#5dade2', gradientBot: '#87CEEB', groundColor: '#4a7c3f', groundTopColor: '#27ae60', groundY: 420, isUnderground: false, isLava: false, hasWeather: false, gravity: 0.55,
  platforms: [{ x: 250, y: 350, w: 100, h: 22, type: 'brick' }, { x: 400, y: 310, w: 100, h: 22, type: 'brick' }, { x: 550, y: 270, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 700, y: 320, w: 120, h: 22, type: 'brick' }, { x: 900, y: 280, w: 100, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 1050, y: 340, w: 80, h: 22, type: 'brick' }, { x: 1200, y: 290, w: 100, h: 22, type: 'brick' }, { x: 1400, y: 320, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 1550, y: 270, w: 120, h: 22, type: 'brick' }, { x: 1750, y: 310, w: 100, h: 22, type: 'brick' }, { x: 2000, y: 350, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 2150, y: 290, w: 120, h: 22, type: 'brick' }, { x: 2350, y: 330, w: 100, h: 22, type: 'brick' }],
  pipes: [{ x: 350, h: 60, hasPiranha: true }, { x: 850, h: 80, hasPiranha: false }, { x: 1900, h: 70, hasPiranha: true }],
  movingPlatforms: [{ x: 1100, y: 360, w: 80, h: 14, minX: 1050, maxX: 1350, speed: 1.2 }],
  coins: [{ x: 180, y: 380 }, { x: 220, y: 380 }, { x: 300, y: 310 }, { x: 450, y: 270 }, { x: 600, y: 230 }, { x: 750, y: 370 }, { x: 800, y: 370 }, { x: 950, y: 240 }, { x: 1100, y: 300 }, { x: 1250, y: 250 }, { x: 1450, y: 280 }, { x: 1600, y: 230 }, { x: 1800, y: 370 }, { x: 1850, y: 370 }, { x: 2050, y: 310 }, { x: 2200, y: 250 }],
  enemies: [{ x: 400, y: 390, type: 'goomba', patrolMin: 350, patrolMax: 500 }, { x: 650, y: 390, type: 'goomba', patrolMin: 600, patrolMax: 750 }, { x: 1000, y: 390, type: 'koopa', patrolMin: 950, patrolMax: 1150 }, { x: 1350, y: 390, type: 'goomba', patrolMin: 1300, patrolMax: 1450 }, { x: 1650, y: 390, type: 'goomba', patrolMin: 1600, patrolMax: 1750 }, { x: 1950, y: 390, type: 'koopa', patrolMin: 1900, patrolMax: 2100 }, { x: 2250, y: 390, type: 'goomba', patrolMin: 2200, patrolMax: 2350 }],
  bulletBills: [], flagX: 2600, groundLength: 3000
}, {
  name: 'WORLD 1-2', subtitle: 'Underground Caverns', bgColor: '#0a0a1a', gradientTop: '#1a1a2e', gradientBot: '#0a0a1a', groundColor: '#555', groundTopColor: '#666', groundY: 420, isUnderground: true, isLava: false, hasWeather: false, gravity: 0.58,
  platforms: [{ x: 200, y: 360, w: 100, h: 22, type: 'brick' }, { x: 380, y: 320, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 520, y: 280, w: 100, h: 22, type: 'brick' }, { x: 700, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 850, y: 290, w: 120, h: 22, type: 'brick' }, { x: 1050, y: 330, w: 100, h: 22, type: 'brick' }, { x: 1250, y: 280, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 1400, y: 320, w: 120, h: 22, type: 'brick' }, { x: 1600, y: 360, w: 100, h: 22, type: 'brick' }, { x: 1800, y: 300, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 1950, y: 270, w: 120, h: 22, type: 'brick' }, { x: 2150, y: 330, w: 100, h: 22, type: 'brick' }],
  pipes: [{ x: 450, h: 50, hasPiranha: true }, { x: 1100, h: 70, hasPiranha: true }, { x: 1700, h: 60, hasPiranha: false }],
  movingPlatforms: [{ x: 900, y: 340, w: 80, h: 14, minX: 800, maxX: 1200, speed: 1.5 }],
  coins: [{ x: 150, y: 380 }, { x: 250, y: 320 }, { x: 420, y: 280 }, { x: 570, y: 240 }, { x: 750, y: 300 }, { x: 900, y: 250 }, { x: 1100, y: 290 }, { x: 1300, y: 240 }, { x: 1450, y: 280 }, { x: 1650, y: 320 }, { x: 1850, y: 260 }, { x: 2000, y: 230 }, { x: 2200, y: 290 }],
  enemies: [{ x: 300, y: 390, type: 'goomba', patrolMin: 250, patrolMax: 400 }, { x: 600, y: 390, type: 'buzzy', patrolMin: 550, patrolMax: 750 }, { x: 950, y: 390, type: 'goomba', patrolMin: 900, patrolMax: 1100 }, { x: 1300, y: 390, type: 'koopa', patrolMin: 1250, patrolMax: 1450 }, { x: 1550, y: 390, type: 'goomba', patrolMin: 1500, patrolMax: 1700 }, { x: 2050, y: 390, type: 'buzzy', patrolMin: 2000, patrolMax: 2200 }],
  bulletBills: [], flagX: 2450, groundLength: 2800
}, {
  name: 'WORLD 2-1', subtitle: 'Sky Fortress', bgColor: '#0a0a3a', gradientTop: '#1a1a4e', gradientBot: '#0a0a2a', groundColor: '#5a4a3f', groundTopColor: '#7a5a4f', groundY: 440, isUnderground: false, isLava: false, hasWeather: false, gravity: 0.52,
  platforms: [{ x: 200, y: 370, w: 100, h: 22, type: 'brick' }, { x: 380, y: 330, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 550, y: 290, w: 120, h: 22, type: 'brick' }, { x: 750, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 920, y: 280, w: 100, h: 22, type: 'brick' }, { x: 1100, y: 320, w: 120, h: 22, type: 'brick' }, { x: 1300, y: 270, w: 80, h: 22, type: 'question', hasPowerup: 'fire' }, { x: 1480, y: 310, w: 100, h: 22, type: 'brick' }, { x: 1650, y: 360, w: 120, h: 22, type: 'brick' }, { x: 1850, y: 300, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 2000, y: 260, w: 100, h: 22, type: 'brick' }, { x: 2200, y: 330, w: 120, h: 22, type: 'brick' }],
  pipes: [{ x: 400, h: 50, hasPiranha: true }, { x: 1000, h: 60, hasPiranha: false }, { x: 2100, h: 70, hasPiranha: true }],
  movingPlatforms: [{ x: 900, y: 360, w: 80, h: 14, minX: 800, maxX: 1200, speed: 2 }, { x: 1600, y: 340, w: 80, h: 14, minX: 1500, maxX: 1900, speed: 1.8 }],
  coins: [{ x: 250, y: 330 }, { x: 420, y: 290 }, { x: 600, y: 250 }, { x: 800, y: 300 }, { x: 970, y: 240 }, { x: 1150, y: 280 }, { x: 1350, y: 230 }, { x: 1530, y: 270 }, { x: 1700, y: 320 }, { x: 1900, y: 260 }, { x: 2050, y: 220 }, { x: 2250, y: 290 }],
  enemies: [{ x: 350, y: 410, type: 'goomba', patrolMin: 300, patrolMax: 450 }, { x: 650, y: 410, type: 'koopa', patrolMin: 600, patrolMax: 800 }, { x: 1050, y: 410, type: 'goomba', patrolMin: 1000, patrolMax: 1200 }, { x: 1400, y: 410, type: 'buzzy', patrolMin: 1350, patrolMax: 1550 }, { x: 1750, y: 410, type: 'goomba', patrolMin: 1700, patrolMax: 1900 }, { x: 2150, y: 410, type: 'koopa', patrolMin: 2100, patrolMax: 2300 }],
  bulletBills: [{ spawnX: 2800, startY: 300, speed: 3 }], flagX: 2600, groundLength: 3000
}, {
  name: 'WORLD 2-2', subtitle: 'Magma Depths', bgColor: '#1a0a0a', gradientTop: '#2a0a0a', gradientBot: '#0a0000', groundColor: '#4a2a1a', groundTopColor: '#6a3a2a', groundY: 430, isUnderground: false, isLava: true, hasWeather: false, gravity: 0.6,
  platforms: [{ x: 200, y: 370, w: 100, h: 22, type: 'brick' }, { x: 400, y: 330, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 580, y: 290, w: 100, h: 22, type: 'brick' }, { x: 780, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'fire' }, { x: 950, y: 290, w: 120, h: 22, type: 'brick' }, { x: 1200, y: 330, w: 100, h: 22, type: 'brick' }, { x: 1400, y: 280, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 1580, y: 320, w: 120, h: 22, type: 'brick' }, { x: 1800, y: 370, w: 100, h: 22, type: 'brick' }, { x: 2000, y: 310, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 2180, y: 280, w: 120, h: 22, type: 'brick' }],
  pipes: [{ x: 360, h: 50, hasPiranha: true }, { x: 1100, h: 60, hasPiranha: true }],
  movingPlatforms: [{ x: 1000, y: 370, w: 80, h: 14, minX: 900, maxX: 1300, speed: 1.8 }],
  coins: [{ x: 250, y: 330 }, { x: 450, y: 290 }, { x: 630, y: 250 }, { x: 830, y: 300 }, { x: 1000, y: 250 }, { x: 1250, y: 290 }, { x: 1450, y: 240 }, { x: 1630, y: 280 }, { x: 1850, y: 330 }, { x: 2050, y: 270 }, { x: 2230, y: 240 }],
  enemies: [{ x: 350, y: 400, type: 'goomba', patrolMin: 300, patrolMax: 450 }, { x: 650, y: 400, type: 'koopa', patrolMin: 600, patrolMax: 800 }, { x: 1050, y: 400, type: 'buzzy', patrolMin: 1000, patrolMax: 1200 }, { x: 1350, y: 400, type: 'goomba', patrolMin: 1300, patrolMax: 1500 }, { x: 1700, y: 400, type: 'koopa', patrolMin: 1650, patrolMax: 1850 }, { x: 2100, y: 400, type: 'goomba', patrolMin: 2050, patrolMax: 2250 }],
  bulletBills: [{ spawnX: 2900, startY: 250, speed: 3.5 }], flagX: 2500, groundLength: 2900
}, {
  name: 'WORLD 3-1', subtitle: 'Frozen Tundra', bgColor: '#c8e6ff', gradientTop: '#b3d9ff', gradientBot: '#e0f0ff', groundColor: '#b0c4de', groundTopColor: '#d0e4ff', groundY: 420, isUnderground: false, isLava: false, hasWeather: true, gravity: 0.5,
  platforms: [{ x: 250, y: 360, w: 100, h: 22, type: 'brick' }, { x: 450, y: 320, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 620, y: 280, w: 120, h: 22, type: 'brick' }, { x: 820, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'star' }, { x: 1000, y: 290, w: 100, h: 22, type: 'brick' }, { x: 1200, y: 330, w: 120, h: 22, type: 'brick' }, { x: 1420, y: 280, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 1600, y: 320, w: 100, h: 22, type: 'brick' }, { x: 1800, y: 370, w: 120, h: 22, type: 'brick' }, { x: 2000, y: 310, w: 80, h: 22, type: 'question', hasPowerup: 'fire' }, { x: 2200, y: 270, w: 100, h: 22, type: 'brick' }],
  pipes: [{ x: 500, h: 50, hasPiranha: true }, { x: 1300, h: 60, hasPiranha: false }, { x: 1900, h: 70, hasPiranha: true }],
  movingPlatforms: [{ x: 1100, y: 360, w: 80, h: 14, minX: 1000, maxX: 1400, speed: 1.5 }],
  coins: [{ x: 200, y: 380 }, { x: 300, y: 320 }, { x: 500, y: 280 }, { x: 670, y: 240 }, { x: 870, y: 300 }, { x: 1050, y: 250 }, { x: 1250, y: 290 }, { x: 1470, y: 240 }, { x: 1650, y: 280 }, { x: 1850, y: 330 }, { x: 2050, y: 270 }, { x: 2250, y: 230 }],
  enemies: [{ x: 400, y: 390, type: 'goomba', patrolMin: 350, patrolMax: 500 }, { x: 700, y: 390, type: 'koopa', patrolMin: 650, patrolMax: 850 }, { x: 1100, y: 390, type: 'buzzy', patrolMin: 1050, patrolMax: 1250 }, { x: 1500, y: 390, type: 'goomba', patrolMin: 1450, patrolMax: 1650 }, { x: 2100, y: 390, type: 'koopa', patrolMin: 2050, patrolMax: 2250 }],
  bulletBills: [], flagX: 2500, groundLength: 2900
}, {
  name: 'WORLD 3-2', subtitle: 'Dark Citadel', bgColor: '#0a0000', gradientTop: '#1a0000', gradientBot: '#0a0000', groundColor: '#3a2a1a', groundTopColor: '#5a3a2a', groundY: 430, isUnderground: true, isLava: true, hasWeather: false, gravity: 0.6,
  platforms: [{ x: 200, y: 370, w: 100, h: 22, type: 'brick' }, { x: 400, y: 330, w: 80, h: 22, type: 'question', hasPowerup: 'fire' }, { x: 600, y: 290, w: 120, h: 22, type: 'brick' }, { x: 800, y: 350, w: 80, h: 22, type: 'question', hasPowerup: 'star' }, { x: 1000, y: 300, w: 100, h: 22, type: 'brick' }, { x: 1200, y: 340, w: 120, h: 22, type: 'brick' }, { x: 1420, y: 290, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' }, { x: 1600, y: 330, w: 100, h: 22, type: 'brick' }, { x: 1800, y: 370, w: 120, h: 22, type: 'brick' }, { x: 2000, y: 310, w: 80, h: 22, type: 'question', hasPowerup: 'coin' }, { x: 2200, y: 270, w: 120, h: 22, type: 'brick' }, { x: 2400, y: 320, w: 100, h: 22, type: 'brick' }],
  pipes: [{ x: 500, h: 50, hasPiranha: true }, { x: 1500, h: 60, hasPiranha: true }],
  movingPlatforms: [{ x: 1100, y: 360, w: 80, h: 14, minX: 1000, maxX: 1400, speed: 2 }, { x: 1900, y: 350, w: 80, h: 14, minX: 1800, maxX: 2200, speed: 2.2 }],
  coins: [{ x: 250, y: 330 }, { x: 450, y: 290 }, { x: 650, y: 250 }, { x: 850, y: 310 }, { x: 1050, y: 260 }, { x: 1250, y: 300 }, { x: 1470, y: 250 }, { x: 1650, y: 290 }, { x: 1850, y: 330 }, { x: 2050, y: 270 }, { x: 2250, y: 230 }, { x: 2450, y: 280 }],
  enemies: [{ x: 350, y: 400, type: 'goomba', patrolMin: 300, patrolMax: 450 }, { x: 650, y: 400, type: 'koopa', patrolMin: 600, patrolMax: 800 }, { x: 1050, y: 400, type: 'buzzy', patrolMin: 1000, patrolMax: 1200 }, { x: 1400, y: 400, type: 'goomba', patrolMin: 1350, patrolMax: 1550 }, { x: 1750, y: 400, type: 'koopa', patrolMin: 1700, patrolMax: 1900 }, { x: 2150, y: 400, type: 'buzzy', patrolMin: 2100, patrolMax: 2300 }, { x: 2350, y: 400, type: 'goomba', patrolMin: 2300, patrolMax: 2500 }],
  bulletBills: [{ spawnX: 3000, startY: 280, speed: 4 }, { spawnX: 3000, startY: 350, speed: 4 }], flagX: 2750, groundLength: 3100
}];

// ═══════════ GAME OBJECTS ═══════════
let player, platforms = [], pipes = [], movingPlatforms = [], coins = [], enemies = [], bulletBills = [], powerups = [], fireballs = [];
let flag = { x: 0, y: 300, w: 12, h: 80 }, level = null, playerAtFlag = false;

function initPlayer() { player = { x: 50, y: 350, w: 30, h: 34, dx: 0, dy: 0, speed: 4.5, runSpeed: 6.5, jumpForce: -11, onGround: false, facing: 1, frame: 0, invincible: 0, dead: false, powerUp: null, starTimer: 0, isRunning: false, isGroundPounding: false, groundPoundTimer: 0, fireCooldown: 0 }; }

function loadLevel(idx) {
  if (idx >= LEVELS.length) { gameState = STATE.WIN; showResult('VICTORY!', 'All worlds conquered!', true); return; }
  level = LEVELS[idx]; currentLevel = idx; initPlayer();
  const gY = level.groundY;
  platforms = [{ x: -100, y: gY, w: level.groundLength + 200, h: 80, type: 'ground' }];
  pipes = []; movingPlatforms = []; coins = []; enemies = []; bulletBills = []; powerups = []; fireballs = []; playerAtFlag = false;
  level.platforms.forEach(p => platforms.push({ ...p, hit: false }));
  level.pipes.forEach(p => pipes.push({ ...p, width: 40 }));
  level.movingPlatforms.forEach(mp => movingPlatforms.push({ ...mp, dir: 1 }));
  level.coins.forEach(c => coins.push({ x: c.x, y: c.y, r: 9, taken: false }));
  level.enemies.forEach(e => enemies.push({ x: e.x, y: e.y, w: 32, h: 34, type: e.type, dir: 1, speed: 1.2 + Math.random() * 0.6, alive: true, patrolMin: e.patrolMin, patrolMax: e.patrolMax, frame: 0, squished: false, squishTimer: 0, shellMoving: false, inShell: false }));
  level.bulletBills.forEach(bb => bulletBills.push({ x: bb.spawnX, y: bb.startY, w: 28, h: 16, speed: bb.speed, alive: true, frame: 0 }));
  flag = { x: level.flagX, y: level.groundY - 100, w: 12, h: 100 };
  cameraX = 0; timer = 300; timerAccum = 0; particles = []; floatingTexts = []; comboCount = 0; comboTimer = 0;
  document.getElementById('levelDisplay').textContent = level.name;
}

function rectCollide(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function updateGame() {
  frameCount++;
  if (gameState === STATE.PAUSED) { document.getElementById('pauseOverlay').style.display = 'flex'; return; }
  document.getElementById('pauseOverlay').style.display = 'none';
  if (gameState === STATE.TRANSITION) { levelTransitionTimer--; if (levelTransitionTimer <= 0) gameState = STATE.PLAYING; updateParticles(); return; }
  if (gameState !== STATE.PLAYING) return;
  timerAccum++;
  if (timerAccum >= 60) { timerAccum = 0; timer--; document.getElementById('timeDisplay').textContent = '⏱ ' + timer; if (timer <= 30) document.getElementById('timeDisplay').style.color = '#e74c3c'; if (timer <= 0) killPlayer(); }
  if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) comboCount = 0; }
  if (toastTimer > 0) { toastTimer--; document.getElementById('toast').textContent = toastMsg; document.getElementById('toast').classList.add('show'); } else document.getElementById('toast').classList.remove('show');
  if (!player || player.dead) return;
  const p = player;
  if (screenShake > 0) screenShake *= 0.85; if (screenShake < 0.1) screenShake = 0;
  if (p.starTimer > 0) { p.starTimer--; if (p.starTimer <= 0) p.powerUp = p.powerUp === 'star' ? null : p.powerUp; }
  if (p.invincible > 0) p.invincible--;
  if (p.fireCooldown > 0) p.fireCooldown--;
  if (p.isGroundPounding) { p.groundPoundTimer--; if (p.groundPoundTimer <= 0) p.isGroundPounding = false; }
  let mx = 0;
  if (keys['ArrowRight'] || keys['KeyD'] || ti.right) mx = 1;
  if (keys['ArrowLeft'] || keys['KeyA'] || ti.left) mx = -1;
  p.isRunning = keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyZ'];
  const spd = p.isRunning ? p.runSpeed : p.speed;
  if (mx !== 0) { p.facing = mx; p.frame++; }
  const jk = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
  if ((jk || ti.jumpTap) && p.onGround && !p.isGroundPounding) { p.dy = p.jumpForce; p.onGround = false; SFX.jump(); spawnParticles(p.x + p.w / 2, p.y + p.h, '#ccc', 4, 2); }
  if (ti.jumpTap) ti.jumpTap = false;
  if ((keys['ArrowDown'] || keys['KeyS'] || ti.jumpTap) && !p.onGround && p.dy > 1 && !p.isGroundPounding) { p.isGroundPounding = true; p.groundPoundTimer = 10; p.dy = 8; }
  if (p.powerUp === 'fire' && p.fireCooldown <= 0 && (keys['KeyX'] || keys['KeyF'])) { fireballs.push({ x: p.x + (p.facing > 0 ? p.w : 0), y: p.y + p.h / 2, r: 6, dx: p.facing * 7, dy: -2, frame: 0, alive: true, bounce: 0 }); p.fireCooldown = 15; SFX.fire(); }
  p.dx = mx * spd; p.x += p.dx;
  p.dy += level.gravity; p.y += p.dy;
  p.onGround = false;
  platforms.forEach(plat => {
    if (rectCollide(p, plat)) {
      if (p.dy > 0 && p.y + p.h - p.dy <= plat.y + 8) { p.y = plat.y - p.h; p.dy = 0; p.onGround = true; if (p.isGroundPounding) { p.isGroundPounding = false; screenShake = 6; if (plat.type === 'brick') { spawnBlockParticles(plat.x, plat.y, plat.w, plat.h); SFX.breakS(); spawnText(plat.x + plat.w / 2, plat.y, 'SMASH!', '#e74c3c', 20); plat.type = 'broken'; plat.w = 0; plat.h = 0; } } } else if (p.dy < 0 && p.y - p.dy >= plat.y + plat.h - 5) { p.y = plat.y + plat.h; p.dy = 0; if (plat.type === 'question' && !plat.hit) { plat.hit = true; const pw = plat.hasPowerup || 'coin'; spawnPowerup(plat.x + plat.w / 2, plat.y - 20, pw); SFX.coin(); if (pw === 'coin') { score += 10; spawnText(plat.x + plat.w / 2, plat.y - 30, '+10', '#FFD700'); } } } }
  });
  movingPlatforms.forEach(mp => {
    mp.x += mp.dir * mp.speed;
    if (mp.x <= mp.minX || mp.x >= mp.maxX - mp.w) mp.dir *= -1;
    if (p.dy >= 0 && p.x + p.w > mp.x + 5 && p.x < mp.x + mp.w - 5 && Math.abs(p.y + p.h - mp.y) < 10) { p.y = mp.y - p.h; p.dy = 0; p.onGround = true; p.x += mp.dir * mp.speed; }
  });
  if (p.x < 0) p.x = 0;
  if (p.y > level.groundY + 100) killPlayer();
  coins.forEach(c => {
    if (!c.taken) { const dx = (p.x + p.w / 2) - c.x, dy = (p.y + p.h / 2) - c.y; if (Math.sqrt(dx * dx + dy * dy) < 22) { c.taken = true; totalCoins++; score += 50; comboCount++; comboTimer = 120; const bonus = comboCount > 1 ? comboCount * 25 : 0; score += bonus; SFX.coin(); spawnCoinParticles(c.x, c.y); spawnText(c.x, c.y - 20, bonus > 0 ? '+' + (50 + bonus) + ' 🔥' : '+50', '#FFD700'); if (comboCount >= 5) showToast('🔥 ' + comboCount + 'x COMBO!'); } }
  });
  enemies.forEach(e => {
    if (!e.alive) return; e.frame++;
    if (e.inShell) { if (e.shellMoving) { e.x += e.dir * 6; enemies.forEach(o => { if (o !== e && o.alive && !o.inShell && rectCollide(e, o)) { o.alive = false; spawnStompParticles(o.x + o.w / 2, o.y + o.h / 2); score += 200; spawnText(o.x, o.y - 20, '+200', '#ff6b6b'); SFX.stomp(); } }); platforms.forEach(plat => { if (plat.type === 'brick' && rectCollide(e, plat)) { spawnBlockParticles(plat.x, plat.y, plat.w, plat.h); plat.type = 'broken'; plat.w = 0; plat.h = 0; SFX.breakS(); } }); } return; }
    if (e.squished) { e.squishTimer--; if (e.squishTimer <= 0) e.alive = false; return; }
    e.x += e.dir * e.speed;
    if (e.x <= e.patrolMin || e.x >= e.patrolMax) e.dir *= -1;
    if (rectCollide(p, e)) {
      if (p.starTimer > 0) { e.alive = false; score += 200; spawnStompParticles(e.x + e.w / 2, e.y + e.h / 2); spawnText(e.x, e.y - 20, '+200 ⭐', '#f1c40f'); SFX.stomp(); return; }
      if (p.dy > 0 && p.y + p.h - 12 <= e.y + 8) {
        if (e.type === 'koopa') { e.inShell = true; e.shellMoving = false; e.h = 24; } else { e.squished = true; e.squishTimer = 30; e.h = 12; }
        p.dy = -7; comboCount++; comboTimer = 120; const bonus = comboCount > 1 ? comboCount * 50 : 0; score += 100 + bonus; SFX.stomp(); spawnStompParticles(e.x + e.w / 2, e.y + e.h / 2); spawnText(e.x, e.y - 20, bonus > 0 ? '+' + (100 + bonus) + ' 🔥' : '+100', '#ff6b6b'); if (comboCount >= 5) showToast('🔥 ' + comboCount + 'x STOMP COMBO!');
      } else { if (p.starTimer <= 0) hitPlayer(); }
    }
  });
  bulletBills.forEach(bb => {
    if (!bb.alive) return; bb.frame++; bb.x -= bb.speed;
    if (bb.x < cameraX - 200) bb.alive = false;
    if (rectCollide(p, bb)) { if (p.starTimer > 0) { bb.alive = false; spawnParticles(bb.x, bb.y, '#555', 8); score += 100; } else hitPlayer(); }
  });
  powerups.forEach(pu => {
    if (!pu.alive) return; pu.vy += 0.4; pu.x += pu.vx || 0; pu.y += pu.vy;
    if (pu.y > level.groundY - 20) { pu.y = level.groundY - 20; pu.vy = 0; pu.vx = (pu.vx || 0) * 0.95; }
    platforms.forEach(plat => { if (plat.type !== 'broken' && rectCollide(pu, { x: plat.x, y: plat.y, w: plat.w, h: plat.h }) && pu.vy > 0) { pu.y = plat.y - 20; pu.vy = 0; } });
    if (rectCollide(p, pu)) { pu.alive = false; collectPowerup(pu.type); }
    if (pu.y > level.groundY + 100) pu.alive = false;
  });
  fireballs.forEach(fb => {
    if (!fb.alive) return; fb.frame++; fb.x += fb.dx; fb.dy += 0.2; fb.y += fb.dy;
    if (fb.y > level.groundY - 10) { fb.y = level.groundY - 10; fb.dy = -3; fb.bounce++; }
    platforms.forEach(plat => { if (plat.type !== 'broken' && rectCollide(fb, { x: plat.x, y: plat.y, w: plat.w, h: plat.h }) && fb.dy > 0) fb.dy = -3; });
    enemies.forEach(e => { if (e.alive && !e.inShell && rectCollide(fb, e)) { fb.alive = false; e.alive = false; score += 200; spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#f39c12', 15); spawnText(e.x, e.y - 20, '+200 🔥', '#f39c12'); SFX.stomp(); } });
    if (fb.bounce > 4 || fb.x < cameraX - 100 || fb.x > cameraX + W + 100) fb.alive = false;
  });
  if (p.x + p.w > flag.x && p.x < flag.x + flag.w + 30 && !playerAtFlag) {
    playerAtFlag = true; const fs = Math.floor(timer * 10); score += fs; SFX.win(); spawnFlagParticles(flag.x + 20, flag.y + 40); showToast('🏁 FLAG! +' + fs + ' BONUS!'); screenShake = 8;
    setTimeout(() => loadLevel(currentLevel + 1), 2000); gameState = STATE.TRANSITION; levelTransitionTimer = 180;
  }
  let tc = p.x - W * 0.35; tc = Math.max(0, Math.min(tc, level.groundLength - W)); cameraX += (tc - cameraX) * 0.08;
  updateParticles();
  fireballs = fireballs.filter(f => f.alive); powerups = powerups.filter(p => p.alive);
  document.getElementById('scoreDisplay').textContent = 'SCORE: ' + score;
  document.getElementById('coinDisplay').textContent = '🪙 × ' + totalCoins;
  document.getElementById('livesDisplay').textContent = '❤️ × ' + lives;
}

function spawnPowerup(x, y, type) { if (type === 'coin') return; powerups.push({ x, y, w: 20, h: 20, type, vy: -3, vx: 1, alive: true, frame: 0 }); spawnPowerupParticles(x, y); SFX.power(); }

function collectPowerup(type) {
  switch (type) {
    case 'mushroom':
      if (!player.powerUp || player.powerUp === 'super') { player.powerUp = 'super'; lives++; SFX.oneup(); spawnText(player.x, player.y - 30, '1-UP! ❤️', '#ff6b6b', 24); showToast('❤️ 1-UP!'); } else { player.powerUp = 'super'; spawnText(player.x, player.y - 30, 'SUPER!', '#e74c3c', 22); showToast('🍄 SUPER MARIO!'); }
      break;
    case 'fire': player.powerUp = 'fire'; spawnText(player.x, player.y - 30, 'FIRE FLOWER! 🔥', '#f39c12', 22); showToast('🔥 FIRE MARIO!'); break;
    case 'star': player.powerUp = 'star'; player.starTimer = 600; spawnText(player.x, player.y - 30, 'STAR POWER! ⭐', '#f1c40f', 22); showToast('⭐ STAR MARIO!'); break;
  }
  spawnPowerupParticles(player.x + player.w / 2, player.y + player.h / 2);
}

function hitPlayer() {
  if (player.invincible > 0 || player.starTimer > 0) return;
  if (player.powerUp && player.powerUp !== 'star') { player.powerUp = null; player.invincible = 90; SFX.hurt(); screenShake = 5; spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#fff', 10); spawnText(player.x, player.y - 30, '💥 OOF!', '#fff', 18); showToast('💥 Lost power-up!'); } else killPlayer();
}

function killPlayer() {
  if (player.invincible > 0) return;
  player.dead = true; lives--; SFX.death(); screenShake = 10;
  spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#e53e30', 25, 7);
  spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#fff', 10, 4);
  document.getElementById('livesDisplay').textContent = '❤️ × ' + lives;
  if (lives <= 0) setTimeout(() => { gameState = STATE.GAMEOVER; showResult('GAME OVER', 'Better luck next time!', false); }, 1000);
  else setTimeout(() => { player.x = 50; player.y = 300; player.dx = 0; player.dy = 0; player.powerUp = null; player.starTimer = 0; player.dead = false; player.invincible = 120; }, 1500);
}

function showResult(title, subtitle, isWin) {
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultTitle').style.color = isWin ? '#f1c40f' : '#e74c3c';
  document.getElementById('resultSubtitle').textContent = subtitle;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalCoins').textContent = totalCoins;
  document.getElementById('finalLevels').textContent = currentLevel;
  document.getElementById('resultOverlay').style.display = 'flex';
}
function showToast(msg) { toastMsg = msg; toastTimer = 90; }

// ═══════════ DRAWING ═══════════
function drawGame() {
  ctx.save();
  if (screenShake > 0.1) ctx.translate((Math.random() - 0.5) * screenShake * 2, (Math.random() - 0.5) * screenShake * 2);
  ctx.clearRect(-10, -10, W + 20, H + 20);
  if (gameState === STATE.MENU) { drawMenuBg(); ctx.restore(); return; }
  if (level) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, level.gradientTop); g.addColorStop(0.6, level.gradientBot); g.addColorStop(1, level.isLava ? '#1a0000' : '#0a0a1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawParallax(0.1, '#fff', 0.04, true); drawParallax(0.2, level.isUnderground ? '#444' : '#fff', 0.08, level.isUnderground); drawParallax(0.4, level.isLava ? '#e74c3c' : '#fff', 0.12, false);
    if (level.isLava) { const lg = ctx.createLinearGradient(0, level.groundY - 20, 0, H); lg.addColorStop(0, 'rgba(231,76,60,0)'); lg.addColorStop(0.3, 'rgba(231,76,60,0.15)'); lg.addColorStop(1, 'rgba(231,76,60,0.3)'); ctx.fillStyle = lg; ctx.fillRect(0, level.groundY - 20, W, H - level.groundY + 20); }
  }
  drawGameWorld();
  ctx.restore();
}

function drawParallax(spd, color, alpha, isStar) {
  ctx.fillStyle = color; ctx.globalAlpha = alpha; const off = -cameraX * spd;
  if (isStar || (level && level.isUnderground)) for (let i = 0; i < 20; i++) { const sx = (i * 137.5 + off) % (W + 100) - 50, sy = (i * 97.3 + 30) % ((level ? level.groundY : 420) * 0.6), sz = 1 + Math.sin(i + frameCount * 0.02) * 0.5; ctx.fillRect(sx, sy, sz, sz); }
  else for (let i = 0; i < 5; i++) { const cx = (i * 400 + off * 0.5) % (W + 400) - 200, cy = 30 + (i * 47) % 120; ctx.beginPath(); ctx.arc(cx, cy, 30 + i * 3, 0, Math.PI * 2); ctx.arc(cx + 25, cy - 8, 22 + i * 2, 0, Math.PI * 2); ctx.arc(cx - 22, cy + 4, 18 + i * 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

function drawGameWorld() {
  if (!level) return;
  ctx.save(); ctx.translate(-Math.round(cameraX), 0);
  const gY = level.groundY;
  ctx.fillStyle = level.groundColor; ctx.fillRect(-100, gY, level.groundLength + 200, 80);
  ctx.fillStyle = level.groundTopColor; ctx.fillRect(-100, gY - 5, level.groundLength + 200, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < level.groundLength; i += 40) { ctx.fillRect(i, gY + 10 + (i % 20), 20, 2); ctx.fillRect(i + 20, gY + 30 + (i % 30), 15, 2); }
  pipes.forEach(p => drawPiranha(ctx, p.x, gY - p.h, p.width, p.h, frameCount, p.hasPiranha || false));
  platforms.forEach(p => { if (p.type === 'broken') return; if (p.type === 'brick') drawBrick(ctx, p.x, p.y, p.w, p.h); else if (p.type === 'question') drawQB(ctx, p.x, p.y, p.w, p.h, frameCount, p.hit); });
  movingPlatforms.forEach(mp => { drawBrick(ctx, mp.x, mp.y, mp.w, mp.h); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.fillText(mp.dir > 0 ? '→' : '←', mp.x + mp.w / 2, mp.y - 5); });
  coins.forEach(c => { if (!c.taken) drawCoin(ctx, c.x, c.y, c.r, frameCount); });
  powerups.forEach(pu => { switch (pu.type) { case 'mushroom': drawMushroom(ctx, pu.x, pu.y, 20, frameCount); break; case 'fire': drawFireFlower(ctx, pu.x, pu.y, 20, frameCount); break; case 'star': drawStar(ctx, pu.x, pu.y, 20, frameCount); break; } });
  enemies.forEach(e => { if (!e.alive) return; if (e.inShell) { drawKoopa(ctx, e.x, e.y, e.w, 24, e.frame, true, e.shellMoving); return; } switch (e.type) { case 'goomba': drawGoomba(ctx, e.x, e.y, e.w, e.h, e.frame, e.squished); break; case 'koopa': drawKoopa(ctx, e.x, e.y, e.w, e.h, e.frame, false, false); break; case 'buzzy': drawBuzzy(ctx, e.x, e.y, e.w, e.h, e.frame); break; } });
  bulletBills.forEach(bb => { if (bb.alive) drawBulletBill(ctx, bb.x, bb.y, bb.w, bb.h, bb.frame); });
  fireballs.forEach(fb => { if (fb.alive) drawFireball(ctx, fb.x, fb.y, fb.r, fb.frame); });
  if (flag) drawFlagpole(ctx, flag.x, gY, frameCount, playerAtFlag);
  if (player && !player.dead) drawMario(ctx, player.x, player.y, player.w, player.h, player.frame, player.facing, player.powerUp, player.invincible);
  drawParticles(ctx, cameraX);
  ctx.restore();
  if (timer <= 30 && timer > 0) { ctx.fillStyle = timer % 10 < 5 ? '#e74c3c' : '#FFD700'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('⚠ TIME LOW ⚠', W / 2, 55); }
  if (gameState === STATE.TRANSITION) { ctx.fillStyle = 'rgba(0,0,0,' + (levelTransitionTimer / 180 * 0.6) + ')'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Arial'; ctx.textAlign = 'center'; ctx.fillText('✨ LEVEL COMPLETE! ✨', W / 2, H / 2); ctx.font = '18px Arial'; ctx.fillStyle = '#ffd700'; ctx.fillText('Score: ' + score, W / 2, H / 2 + 45); }
}

function drawMenuBg() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1a2e'); g.addColorStop(0.5, '#16213e'); g.addColorStop(1, '#0f3460');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = (i * 137.5 + frameCount * 0.05) % W, y = (i * 97.3 + 50) % (H * 0.7), sz = 1 + Math.sin(i + frameCount * 0.02) * 0.5; ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.sin(i + frameCount * 0.03) * 0.15) + ')'; ctx.fillRect(x, y, sz, sz); }
  ctx.fillStyle = 'rgba(233,69,96,' + (0.05 + Math.sin(frameCount * 0.02) * 0.03) + ')'; ctx.beginPath(); ctx.arc(W / 2, H / 3, 120 + Math.sin(frameCount * 0.02) * 20, 0, Math.PI * 2); ctx.fill();
}

function gameLoop() { updateGame(); drawGame(); requestAnimationFrame(gameLoop); }

document.getElementById('startBtn').addEventListener('click', () => { initAudio(); score = 0; totalCoins = 0; lives = 3; document.getElementById('menuOverlay').style.display = 'none'; document.getElementById('resultOverlay').style.display = 'none'; document.getElementById('controlsInfo').style.display = 'none'; loadLevel(0); gameState = STATE.PLAYING; });
document.getElementById('controlsBtn').addEventListener('click', () => { const e = document.getElementById('controlsInfo'); e.style.display = e.style.display === 'none' ? 'block' : 'none'; });
document.getElementById('restartBtn').addEventListener('click', () => { score = 0; totalCoins = 0; lives = 3; document.getElementById('resultOverlay').style.display = 'none'; document.getElementById('menuOverlay').style.display = 'none'; loadLevel(0); gameState = STATE.PLAYING; });

loadLevel(0); gameState = STATE.MENU;
document.getElementById('menuOverlay').style.display = 'flex';
document.getElementById('resultOverlay').style.display = 'none';
document.getElementById('pauseOverlay').style.display = 'none';
document.getElementById('controlsInfo').style.display = 'none';
gameLoop();
console.log('🔥 Zeus Mario Ultimate Premium — 3-button layout loaded!');
