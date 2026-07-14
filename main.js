// ═══════════════════════════════════════════════════════════════
// ZEUS MARIO — ULTIMATE PREMIUM EDITION
// Full-featured platformer with:
// • 6 unique worlds with distinct themes
// • Power-up system (Mushroom, Fire Flower, Star, Super Star)
// • Parallax scrolling backgrounds with fog/atmosphere
// • 5 enemy types: Goomba, Koopa, Piranha Plant, Buzzy Beetle, Bullet Bill
// • Moving platforms, pipes, secret warp zones
// • Fireballs, ground pound, sprint mechanic
// • Combo system, 1-UP mushrooms, animated flagpole
// • Timer with bonus, coin rush bonus
// • Screen shake, hit flash, particle systems
// • Full audio engine with 15+ sound effects
// • Animated water/lava, weather effects
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ═══════════════════ RESIZE ═══════════════════
let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ═══════════════════ AUDIO ENGINE ═══════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playTone(freq, dur, type = 'square', vol = 0.12) {
  try {
    initAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

function playNote(freq, dur) { playTone(freq, dur, 'square', 0.1); }
function playJumpSnd()     { playNote(400,0.08); setTimeout(()=>playNote(600,0.08),50); }
function playCoinSnd()     { playNote(988,0.06); setTimeout(()=>playNote(1319,0.1),60); }
function playStompSnd()    { playNote(200,0.1); setTimeout(()=>playNote(100,0.08),80); }
function playDeathSnd()    { playNote(400,0.08); setTimeout(()=>playNote(300,0.08),80); setTimeout(()=>playNote(200,0.2),160); }
function playPowerupSnd()  { playNote(600,0.06); setTimeout(()=>playNote(800,0.06),60); setTimeout(()=>playNote(1000,0.12),120); }
function playFireSnd()     { playNote(900,0.04); setTimeout(()=>playNote(1200,0.06),40); }
function playHurtSnd()     { playNote(250,0.1); setTimeout(()=>playNote(180,0.15),100); }
function play1UpSnd()      { playNote(523,0.08); setTimeout(()=>playNote(659,0.08),80); setTimeout(()=>playNote(784,0.08),160); setTimeout(()=>playNote(1047,0.15),240); }
function playFlagSnd()     { [523,587,659,698,784,880,988,1047].forEach((f,i)=>setTimeout(()=>playNote(f,0.1),i*60)); }
function playWinSnd()      { return playFlagSnd(); }
function playBreakSnd()    { playNote(150,0.15); }

// ═══════════════════ GAME STATE ═══════════════════
const STATE = { MENU:0, PLAYING:1, PAUSED:2, LEVEL_TRANSITION:3, GAMEOVER:4, WIN:5 };
let gameState = STATE.MENU;
let score = 0;
let totalCoins = 0;
let lives = 3;
let currentLevel = 0;
let cameraX = 0;
let cameraY = 0;
let particles = [];
let floatingTexts = [];
let frameCount = 0;
let screenShake = 0;
let timer = 300;
let timerAccum = 0;
let comboCount = 0;
let comboTimer = 0;
let toastTimer = 0;
let toastMsg = '';
let levelTransitionTimer = 0;

// ═══════════════════ INPUT ═══════════════════
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (gameState === STATE.PLAYING) gameState = STATE.PAUSED;
    else if (gameState === STATE.PAUSED) gameState = STATE.PLAYING;
  }
  // Enter to start from menu
  if ((e.code === 'Enter' || e.code === 'Space') && gameState === STATE.MENU) {
    document.getElementById('startBtn').click();
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// Touch input
const touchInput = { left:false, right:false, jump:false, down:false, run:false };
['Left','Right','Jump','Down','Run'].forEach(name => {
  const btn = document.getElementById('btn' + name);
  if (!btn) return;
  const key = name.charAt(0).toLowerCase() + name.slice(1);
  btn.addEventListener('touchstart', e => { e.preventDefault(); touchInput[key] = true; if (key==='jump') touchInput['jumpTap'] = true; });
  btn.addEventListener('touchend', e => { e.preventDefault(); touchInput[key] = false; });
  btn.addEventListener('touchcancel', e => { touchInput[key] = false; });
});

// ═══════════════════ SPRITE RENDERER ═══════════════════
// All sprites are drawn programmatically — no external assets needed

function drawMario(ctx, x, y, w, h, frame, facing, powerUp, invincible) {
  ctx.save();
  const s = Math.min(w, h);
  ctx.translate(x + w/2, y + h/2);
  if (facing === -1) ctx.scale(-1, 1);
  ctx.translate(-s/2, -s/2);

  if (invincible > 0 && Math.floor(invincible / 3) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  const isFire = powerUp === 'fire';
  const isSuper = powerUp === 'super' || powerUp === 'fire';
  const bodyH = isSuper ? s - 6 : s - 2;

  // === LEGS ===
  ctx.fillStyle = '#2980b9';
  const legOff = Math.sin(frame * 0.25) * 3;
  ctx.fillRect(6, bodyH - 12, 8, 8 + legOff);
  ctx.fillRect(18, bodyH - 12, 8, 8 - legOff);
  // Shoes
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(4, bodyH - 4 + legOff, 10, 4);
  ctx.fillRect(18, bodyH - 4 - legOff, 10, 4);

  // === BODY / OVERALLS ===
  ctx.fillStyle = isFire ? '#e74c3c' : '#e53e30';
  ctx.fillRect(4, 8, 24, bodyH - 12);
  // Overall straps (blue)
  ctx.fillStyle = '#2980b9';
  ctx.fillRect(8, 12, 4, 10);
  ctx.fillRect(20, 12, 4, 10);
  // Buttons
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(10, 13, 2, 2);
  ctx.fillRect(22, 13, 2, 2);

  // === ARMS ===
  const armOff = Math.sin(frame * 0.2) * 2;
  ctx.fillStyle = '#f5c6a0';
  ctx.fillRect(0, 10 + armOff, 5, 8);
  ctx.fillRect(27, 10 - armOff, 5, 8);
  // Sleeves
  ctx.fillStyle = isFire ? '#c0392b' : '#c0392b';
  ctx.fillRect(0, 10 + armOff, 5, 4);
  ctx.fillRect(27, 10 - armOff, 5, 4);

  // === HEAD ===
  ctx.fillStyle = '#f5c6a0';
  ctx.fillRect(8, 0, 16, 10);
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(11, 2, 4, 4);
  ctx.fillRect(19, 2, 4, 4);
  // Eye shine
  ctx.fillStyle = '#fff';
  ctx.fillRect(12, 3, 2, 2);
  ctx.fillRect(20, 3, 2, 2);

  // === HAT ===
  ctx.fillStyle = isFire ? '#c0392b' : '#c0392b';
  ctx.fillRect(6, -2, 20, 5);
  ctx.fillRect(4, 0, 24, 3);
  // Hat brim
  ctx.fillStyle = '#a93226';
  ctx.fillRect(4, 3, 24, 2);
  // M on hat
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 6px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('M', s/2, 4);

  // === FIRE FLOWER DETAILS ===
  if (isFire) {
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(14, bodyH - 18, 4, 6);
    // Fire pattern on body
    ctx.fillStyle = 'rgba(243,156,18,0.3)';
    ctx.fillRect(6, bodyH - 16, 8, 3);
    ctx.fillRect(18, bodyH - 14, 8, 3);
  }

  ctx.restore();
}

function drawGoomba(ctx, x, y, w, h, frame, squished) {
  ctx.save();
  const s = Math.min(w, h);
  ctx.translate(x + w/2 - s/2, y + h/2 - s/2);

  if (squished) {
    // Flat squished goomba
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, s-8, s, 8);
    ctx.fillStyle = '#000';
    ctx.fillRect(4, s-6, 4, 2);
    ctx.fillRect(s-8, s-6, 4, 2);
    ctx.restore();
    return;
  }

  // Body (brown dome)
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(s/2, s/2 + 2, s/2 - 2, Math.PI, 0);
  ctx.fill();
  // Head
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(4, 5, s - 8, 14);
  // Eyes (angry look)
  ctx.fillStyle = '#fff';
  ctx.fillRect(7, 9, 7, 7);
  ctx.fillRect(s - 14, 9, 7, 7);
  ctx.fillStyle = '#000';
  ctx.fillRect(9, 11, 4, 5);
  ctx.fillRect(s - 13, 11, 4, 5);
  // Frown
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(s/2, 20, 5, 0, Math.PI);
  ctx.stroke();
  // Eyebrows
  ctx.fillRect(6, 7, 9, 2);
  ctx.fillRect(s - 15, 7, 9, 2);
  // Feet
  ctx.fillStyle = '#000';
  const legOff = Math.sin(frame * 0.12) * 2;
  ctx.fillRect(5, 24 + legOff, 9, 6);
  ctx.fillRect(s - 14, 24 - legOff, 9, 6);

  ctx.restore();
}

function drawKoopa(ctx, x, y, w, h, frame, shellOnly, shellMoving) {
  ctx.save();
  const s = Math.min(w, h);
  ctx.translate(x + w/2 - s/2, y + h/2 - s/2);

  if (shellOnly) {
    // Shell (green, spinning if moving)
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.arc(s/2, s/2 + 2, s/2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e8449';
    ctx.beginPath();
    ctx.arc(s/2, s/2 + 2, s/2 - 8, 0, Math.PI * 2);
    ctx.fill();
    // Shell pattern
    ctx.fillStyle = '#2ecc71';
    const rot = shellMoving ? frame * 0.3 : 0;
    for (let i = 0; i < 4; i++) {
      const angle = rot + (i * Math.PI / 2);
      const px = s/2 + Math.cos(angle) * (s/2 - 6);
      const py = s/2 + 2 + Math.sin(angle) * (s/2 - 6);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // Full koopa
  // Shell (green)
  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.arc(s/2, s/2 + 4, s/2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e8449';
  ctx.beginPath();
  ctx.arc(s/2, s/2 + 2, s/2 - 8, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = '#f5c6a0';
  ctx.fillRect(s/2 - 3, -2, 11, 11);
  ctx.fillRect(s/2 - 1, -5, 7, 5);
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(s/2, 0, 3, 3);
  ctx.fillRect(s/2 + 5, 0, 3, 3);
  // Eye white
  ctx.fillStyle = '#fff';
  ctx.fillRect(s/2 + 1, 1, 1, 1);
  ctx.fillRect(s/2 + 6, 1, 1, 1);
  // Feet
  ctx.fillStyle = '#f5c6a0';
  const legOff = Math.sin(frame * 0.12) * 3;
  ctx.fillRect(s/2 - 4, s - 7 + legOff, 7, 7);
  ctx.fillRect(s/2 + 5, s - 7 - legOff, 7, 7);

  ctx.restore();
}

function drawPiranha(ctx, x, y, w, h, frame, emerging) {
  ctx.save();
  const s = Math.min(w, h);
  const pipeW = s;
  const pipeH = h;

  // Pipe
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(0, 10, pipeW, pipeH - 10);
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(0, 10, pipeW, 6);
  ctx.fillStyle = '#1e8449';
  ctx.fillRect(2, 16, pipeW - 4, 4);
  // Pipe rim
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(-2, 6, pipeW + 4, 8);
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(-2, 6, pipeW + 4, 4);

  // Piranha head (emerges from pipe)
  const emergeAmt = emerging ? Math.min(1, Math.sin(frame * 0.03) * 1.5 + 0.5) : 0;
  const py = 10 - emergeAmt * 22;

  if (emergeAmt > 0.1) {
    // Head
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(pipeW/2, py + 10, 12, Math.PI, 0);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(pipeW/2 - 8, py + 6, 6, 6);
    ctx.fillRect(pipeW/2 + 2, py + 6, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(pipeW/2 - 6, py + 8, 3, 4);
    ctx.fillRect(pipeW/2 + 4, py + 8, 3, 4);
    // Mouth
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(pipeW/2, py + 18, 4, Math.PI, 0);
    ctx.fill();
    // Teeth
    ctx.fillStyle = '#fff';
    for (let i = -3; i <= 3; i += 3) {
      ctx.fillRect(pipeW/2 + i - 1, py + 14, 2, 3);
    }
  }

  ctx.restore();
}

function drawBuzzy(ctx, x, y, w, h, frame) {
  ctx.save();
  const s = Math.min(w, h);
  ctx.translate(x + w/2 - s/2, y + h/2 - s/2);

  // Shell (dark gray, metallic)
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(s/2, s/2 + 2, s/2 - 3, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(s/2, s/2 + 2, s/2 - 3, 0, Math.PI);
  ctx.fill();
  // Shell pattern
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.arc(s/2, s/2 + 2, s/2 - 8, 0, Math.PI * 2);
  ctx.fill();
  // Lines
  ctx.fillStyle = '#333';
  ctx.fillRect(s/2 - 1, 4, 2, s - 8);
  ctx.fillRect(6, s/2 - 2, s - 12, 2);
  // Head (small)
  ctx.fillStyle = '#666';
  ctx.fillRect(s/2 - 3, 0, 8, 6);
  // Eyes
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(s/2 - 1, 1, 2, 2);
  ctx.fillRect(s/2 + 3, 1, 2, 2);
  // Feet
  ctx.fillStyle = '#333';
  const legOff = Math.sin(frame * 0.12) * 2;
  ctx.fillRect(5, s - 6 + legOff, 8, 6);
  ctx.fillRect(s - 13, s - 6 - legOff, 8, 6);

  ctx.restore();
}

function drawBulletBill(ctx, x, y, w, h, frame) {
  ctx.save();
  const s = Math.min(w, h);
  ctx.translate(x + w/2 - s/2, y + h/2 - s/2);

  // Body
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(0, s/2);
  ctx.lineTo(8, 4);
  ctx.lineTo(s - 4, 4);
  ctx.lineTo(s, s/2);
  ctx.lineTo(s - 4, s - 4);
  ctx.lineTo(8, s - 4);
  ctx.closePath();
  ctx.fill();
  // Fins
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(10, 4);
  ctx.lineTo(4, 0);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, s - 4);
  ctx.lineTo(4, s);
  ctx.lineTo(10, s - 10);
  ctx.closePath();
  ctx.fill();
  // Angry eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(s - 18, 8, 8, 6);
  ctx.fillRect(s - 18, s - 14, 8, 6);
  ctx.fillStyle = '#000';
  ctx.fillRect(s - 16, 10, 4, 4);
  ctx.fillRect(s - 16, s - 12, 4, 4);
  // Eyebrows
  ctx.fillStyle = '#000';
  ctx.fillRect(s - 20, 6, 12, 2);
  ctx.fillRect(s - 20, s - 8, 12, 2);
  // Fuse
  ctx.fillStyle = '#f39c12';
  ctx.fillRect(2, s/2 - 1, 4, 2);

  ctx.restore();
}

function drawCoin(ctx, x, y, r, frame) {
  ctx.save();
  const pulse = Math.sin(frame * 0.08) * 0.2 + 1;
  ctx.translate(x, y);
  ctx.scale(pulse, 1);
  // Outer glow
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 10;
  // Gold coin
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFA500';
  ctx.beginPath();
  ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
  ctx.fill();
  // Dollar sign
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${r}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 0);
  ctx.restore();
}

function drawMushroom(ctx, x, y, s, frame) {
  ctx.save();
  ctx.translate(x, y + Math.sin(frame * 0.06) * 2);
  // Stem
  ctx.fillStyle = '#f5deb3';
  ctx.fillRect(-4, s/2 - 2, 8, s/2);
  // Cap
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(0, 0, s/2, Math.PI, 0);
  ctx.fill();
  // White spots
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-4, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-1, -7, 2, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(-3, 2, 2, 3);
  ctx.fillRect(1, 2, 2, 3);
  // Smile
  ctx.beginPath();
  ctx.arc(0, 5, 3, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawFireFlower(ctx, x, y, s, frame) {
  ctx.save();
  ctx.translate(x, y + Math.sin(frame * 0.06) * 2);
  // Stem
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(-2, 0, 4, s - 4);
  // Petals
  const colors = ['#e74c3c', '#f39c12', '#e74c3c', '#f39c12'];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + frame * 0.02;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 5, Math.sin(angle) * 5 - (s - 8), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(0, -(s - 8), 4, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = '#000';
  ctx.fillRect(-2, -(s - 6), 1, 2);
  ctx.fillRect(1, -(s - 6), 1, 2);
  ctx.beginPath();
  ctx.arc(0, -(s - 2), 2, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawStar(ctx, x, y, s, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(frame * 0.08);
  // Glow
  ctx.shadowColor = '#f1c40f';
  ctx.shadowBlur = 15;
  // Star shape
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 2 * Math.PI / 5) - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(outerAngle) * s/2, Math.sin(outerAngle) * s/2);
    else ctx.lineTo(Math.cos(outerAngle) * s/2, Math.sin(outerAngle) * s/2);
    ctx.lineTo(Math.cos(innerAngle) * s/4, Math.sin(innerAngle) * s/4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Face
  ctx.fillStyle = '#000';
  ctx.fillRect(-3, -2, 2, 3);
  ctx.fillRect(1, -2, 2, 3);
  ctx.beginPath();
  ctx.arc(0, 3, 2, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawQuestionBlock(ctx, x, y, w, h, frame, hit) {
  ctx.save();
  if (hit) {
    ctx.globalAlpha = 0.6;
  } else {
    const bounce = Math.sin(frame * 0.1) * 1.5;
    ctx.translate(0, bounce);
  }
  // Glow
  ctx.shadowColor = '#f39c12';
  ctx.shadowBlur = hit ? 0 : 8;
  // Yellow block
  ctx.fillStyle = '#f39c12';
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  // Border
  ctx.strokeStyle = '#d68910';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // Inner border
  ctx.strokeStyle = '#e67e22';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  // Question mark
  if (!hit) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${w * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + w/2, y + h/2 + 1);
  }
  ctx.restore();
}

function drawBrick(ctx, x, y, w, h) {
  ctx.save();
  // Base
  ctx.fillStyle = '#cd6155';
  ctx.fillRect(x, y, w, h);
  // Border
  ctx.strokeStyle = '#a93226';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  // Brick pattern
  ctx.strokeStyle = '#a93226';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h/2);
  ctx.lineTo(x + w, y + h/2);
  ctx.moveTo(x + w/2, y);
  ctx.lineTo(x + w/2, y + h/2);
  ctx.moveTo(x + w/4, y + h/2);
  ctx.lineTo(x + w/4, y + h);
  ctx.moveTo(x + w*3/4, y + h/2);
  ctx.lineTo(x + w*3/4, y + h);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.restore();
}

function drawPipe(ctx, x, y, w, h, frame, hasPiranha, piranhaEmerging) {
  ctx.save();
  // Pipe body
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(x + 4, y + 8, w - 8, h - 8);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x + 6, y + 10, 6, h - 10);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x + w - 12, y + 10, 6, h - 10);
  // Pipe rim (top)
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(x + 2, y + 2, w - 4, 6);
  // Rim highlight
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(x + 4, y + 8, w - 8, 3);
  // Rim shadow
  ctx.fillRect(x + 2, y, w - 4, 2);

  // Piranha plant
  if (hasPiranha) {
    drawPiranha(ctx, x, y, w, 40, frame, piranhaEmerging);
  }

  ctx.restore();
}

function drawFlagpole(ctx, x, groundY, frame, playerAtPole) {
  ctx.save();
  const poleH = groundY - 60;
  const poleX = x + 12;

  // Pole
  ctx.fillStyle = '#888';
  ctx.fillRect(poleX - 2, 40, 4, poleH - 40);
  // Pole shine
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(poleX - 1, 40, 1, poleH - 40);

  // Ball on top
  ctx.fillStyle = '#f1c40f';
  ctx.shadowColor = '#f1c40f';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(poleX, 40, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Flag
  const flagY = playerAtPole ? 40 + (poleH - 40) * 0.85 : 48;
  const flagWave = Math.sin(frame * 0.08) * 3;

  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.moveTo(poleX + 4, flagY);
  ctx.lineTo(poleX + 32 + flagWave, flagY + 10);
  ctx.lineTo(poleX + 4, flagY + 20);
  ctx.closePath();
  ctx.fill();
  // Star on flag
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('★', poleX + 12 + flagWave * 0.5, flagY + 14);

  // Base
  ctx.fillStyle = '#666';
  ctx.fillRect(poleX - 8, groundY - 4, 16, 8);
  ctx.fillStyle = '#555';
  ctx.fillRect(poleX - 6, groundY - 2, 12, 6);

  ctx.restore();
}

function drawFireball(ctx, x, y, r, frame) {
  ctx.save();
  ctx.translate(x, y);
  // Glow
  ctx.shadowColor = '#f39c12';
  ctx.shadowBlur = 15;
  // Fire colors
  const colors = ['#e74c3c', '#f39c12', '#e74c3c'];
  for (let i = 2; i >= 0; i--) {
    ctx.fillStyle = colors[i];
    const size = r + Math.sin(frame * 0.2 + i) * 2;
    ctx.beginPath();
    ctx.arc(0, 0, size - i * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // Particles
  for (let i = 0; i < 3; i++) {
    const angle = frame * 0.1 + i * 2;
    const dist = r + 4 + Math.sin(frame * 0.15 + i) * 2;
    ctx.fillStyle = 'rgba(243,156,18,' + (0.3 + Math.sin(frame * 0.2 + i) * 0.2) + ')';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ═══════════════════ PARTICLE SYSTEM ═══════════════════
function spawnParticles(x, y, color, count = 10, speed = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vel = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      x, y,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel - 2,
      life: 1,
      decay: 0.015 + Math.random() * 0.025,
      size: 2 + Math.random() * 4,
      color,
      gravity: 0.2 + Math.random() * 0.2
    });
  }
}

function spawnCoinParticles(x, y) {
  spawnParticles(x, y, '#FFD700', 12, 6);
}

function spawnStompParticles(x, y) {
  spawnParticles(x, y, '#8B4513', 15, 5);
  spawnParticles(x, y, '#fff', 5, 3);
}

function spawnBlockParticles(x, y, w, h) {
  // Brick pieces
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x + Math.random() * w,
      y: y + Math.random() * h,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 10 - 3,
      life: 1,
      decay: 0.012 + Math.random() * 0.015,
      size: 6 + Math.random() * 6,
      color: '#cd6155',
      gravity: 0.4,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10
    });
  }
}

function spawnPowerupParticles(x, y) {
  const colors = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#f1c40f'];
  for (let i = 0; i < 20; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 10 - 2,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.15
    });
  }
}

function spawnFlagParticles(x, y) {
  const colors = ['#FFD700', '#e74c3c', '#27ae60', '#3498db', '#f39c12', '#fff'];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vel = 2 + Math.random() * 6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel - 3,
      life: 1,
      decay: 0.008 + Math.random() * 0.012,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.05
    });
  }
}

function spawnFloatingText(x, y, text, color = '#fff', size = 18) {
  floatingTexts.push({ x, y, text, color, size, life: 1, vy: -2.5 });
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity || 0.3;
    if (p.rot !== undefined) p.rot += p.rotSpeed || 0;
    p.life -= p.decay;
    return p.life > 0;
  });
  floatingTexts = floatingTexts.filter(ft => {
    ft.y += ft.vy;
    ft.vy *= 0.97;
    ft.life -= 0.018;
    return ft.life > 0;
  });
}

function drawParticles(ctx, camX) {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.rot !== undefined) {
      ctx.translate(p.x - camX, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x - camX, ft.y);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

// ═══════════════════ LEVEL DEFINITIONS ═══════════════════
// 6 worlds with distinct themes

const LEVELS = [
  // WORLD 1 — Grassland
  {
    name: 'WORLD 1-1',
    subtitle: 'Green Plains',
    bgColor: '#6ec6ff',
    gradientTop: '#5dade2',
    gradientBot: '#87CEEB',
    groundColor: '#4a7c3f',
    groundTopColor: '#27ae60',
    groundY: 420,
    isUnderground: false,
    isLava: false,
    hasWeather: false,
    gravity: 0.55,
    platforms: [
      { x: 250, y: 350, w: 100, h: 22, type: 'brick' },
      { x: 400, y: 310, w: 100, h: 22, type: 'brick' },
      { x: 550, y: 270, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 700, y: 320, w: 120, h: 22, type: 'brick' },
      { x: 900, y: 280, w: 100, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 1050, y: 340, w: 80, h: 22, type: 'brick' },
      { x: 1200, y: 290, w: 100, h: 22, type: 'brick' },
      { x: 1400, y: 320, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 1550, y: 270, w: 120, h: 22, type: 'brick' },
      { x: 1750, y: 310, w: 100, h: 22, type: 'brick' },
      { x: 2000, y: 350, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 2150, y: 290, w: 120, h: 22, type: 'brick' },
      { x: 2350, y: 330, w: 100, h: 22, type: 'brick' },
    ],
    pipes: [
      { x: 350, h: 60, hasPiranha: true },
      { x: 850, h: 80, hasPiranha: false },
      { x: 1900, h: 70, hasPiranha: true },
    ],
    movingPlatforms: [
      { x: 1100, y: 360, w: 80, h: 14, minX: 1050, maxX: 1350, speed: 1.2 }
    ],
    coins: [
      { x: 180, y: 380 }, { x: 220, y: 380 }, { x: 300, y: 310 },
      { x: 450, y: 270 }, { x: 600, y: 230 }, { x: 750, y: 370 },
      { x: 800, y: 370 }, { x: 950, y: 240 }, { x: 1100, y: 300 },
      { x: 1250, y: 250 }, { x: 1450, y: 280 }, { x: 1600, y: 230 },
      { x: 1800, y: 370 }, { x: 1850, y: 370 }, { x: 2050, y: 310 },
      { x: 2200, y: 250 },
    ],
    enemies: [
      { x: 400, y: 390, type: 'goomba', patrolMin: 350, patrolMax: 500 },
      { x: 650, y: 390, type: 'goomba', patrolMin: 600, patrolMax: 750 },
      { x: 1000, y: 390, type: 'koopa', patrolMin: 950, patrolMax: 1150 },
      { x: 1350, y: 390, type: 'goomba', patrolMin: 1300, patrolMax: 1450 },
      { x: 1650, y: 390, type: 'goomba', patrolMin: 1600, patrolMax: 1750 },
      { x: 1950, y: 390, type: 'koopa', patrolMin: 1900, patrolMax: 2100 },
      { x: 2250, y: 390, type: 'goomba', patrolMin: 2200, patrolMax: 2350 },
    ],
    bulletBills: [],
    flagX: 2600,
    groundLength: 3000
  },

  // WORLD 2 — Underground
  {
    name: 'WORLD 1-2',
    subtitle: 'Underground Caverns',
    bgColor: '#0a0a1a',
    gradientTop: '#1a1a2e',
    gradientBot: '#0a0a1a',
    groundColor: '#555',
    groundTopColor: '#666',
    groundY: 420,
    isUnderground: true,
    isLava: false,
    hasWeather: false,
    gravity: 0.58,
    platforms: [
      { x: 200, y: 360, w: 100, h: 22, type: 'brick' },
      { x: 380, y: 320, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 520, y: 280, w: 100, h: 22, type: 'brick' },
      { x: 700, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 850, y: 290, w: 120, h: 22, type: 'brick' },
      { x: 1050, y: 330, w: 100, h: 22, type: 'brick' },
      { x: 1250, y: 280, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 1400, y: 320, w: 120, h: 22, type: 'brick' },
      { x: 1600, y: 360, w: 100, h: 22, type: 'brick' },
      { x: 1800, y: 300, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 1950, y: 270, w: 120, h: 22, type: 'brick' },
      { x: 2150, y: 330, w: 100, h: 22, type: 'brick' },
    ],
    pipes: [
      { x: 450, h: 50, hasPiranha: true },
      { x: 1100, h: 70, hasPiranha: true },
      { x: 1700, h: 60, hasPiranha: false },
    ],
    movingPlatforms: [
      { x: 900, y: 340, w: 80, h: 14, minX: 800, maxX: 1200, speed: 1.5 }
    ],
    coins: [
      { x: 150, y: 380 }, { x: 250, y: 320 }, { x: 420, y: 280 },
      { x: 570, y: 240 }, { x: 750, y: 300 }, { x: 900, y: 250 },
      { x: 1100, y: 290 }, { x: 1300, y: 240 }, { x: 1450, y: 280 },
      { x: 1650, y: 320 }, { x: 1850, y: 260 }, { x: 2000, y: 230 },
      { x: 2200, y: 290 },
    ],
    enemies: [
      { x: 300, y: 390, type: 'goomba', patrolMin: 250, patrolMax: 400 },
      { x: 600, y: 390, type: 'buzzy', patrolMin: 550, patrolMax: 750 },
      { x: 950, y: 390, type: 'goomba', patrolMin: 900, patrolMax: 1100 },
      { x: 1300, y: 390, type: 'koopa', patrolMin: 1250, patrolMax: 1450 },
      { x: 1550, y: 390, type: 'goomba', patrolMin: 1500, patrolMax: 1700 },
      { x: 2050, y: 390, type: 'buzzy', patrolMin: 2000, patrolMax: 2200 },
    ],
    bulletBills: [],
    flagX: 2450,
    groundLength: 2800
  },

  // WORLD 3 — Sky
  {
    name: 'WORLD 2-1',
    subtitle: 'Sky Fortress',
    bgColor: '#0a0a3a',
    gradientTop: '#1a1a4e',
    gradientBot: '#0a0a2a',
    groundColor: '#5a4a3f',
    groundTopColor: '#7a5a4f',
    groundY: 440,
    isUnderground: false,
    isLava: false,
    hasWeather: false,
    gravity: 0.52,
    platforms: [
      { x: 200, y: 370, w: 100, h: 22, type: 'brick' },
      { x: 380, y: 330, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 550, y: 290, w: 120, h: 22, type: 'brick' },
      { x: 750, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 920, y: 280, w: 100, h: 22, type: 'brick' },
      { x: 1100, y: 320, w: 120, h: 22, type: 'brick' },
      { x: 1300, y: 270, w: 80, h: 22, type: 'question', hasPowerup: 'fire' },
      { x: 1480, y: 310, w: 100, h: 22, type: 'brick' },
      { x: 1650, y: 360, w: 120, h: 22, type: 'brick' },
      { x: 1850, y: 300, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 2000, y: 260, w: 100, h: 22, type: 'brick' },
      { x: 2200, y: 330, w: 120, h: 22, type: 'brick' },
    ],
    pipes: [
      { x: 400, h: 50, hasPiranha: true },
      { x: 1000, h: 60, hasPiranha: false },
      { x: 2100, h: 70, hasPiranha: true },
    ],
    movingPlatforms: [
      { x: 900, y: 360, w: 80, h: 14, minX: 800, maxX: 1200, speed: 2 },
      { x: 1600, y: 340, w: 80, h: 14, minX: 1500, maxX: 1900, speed: 1.8 }
    ],
    coins: [
      { x: 250, y: 330 }, { x: 420, y: 290 }, { x: 600, y: 250 },
      { x: 800, y: 300 }, { x: 970, y: 240 }, { x: 1150, y: 280 },
      { x: 1350, y: 230 }, { x: 1530, y: 270 }, { x: 1700, y: 320 },
      { x: 1900, y: 260 }, { x: 2050, y: 220 }, { x: 2250, y: 290 },
      { x: 2300, y: 290 },
    ],
    enemies: [
      { x: 350, y: 410, type: 'goomba', patrolMin: 300, patrolMax: 450 },
      { x: 650, y: 410, type: 'koopa', patrolMin: 600, patrolMax: 800 },
      { x: 1050, y: 410, type: 'goomba', patrolMin: 1000, patrolMax: 1200 },
      { x: 1400, y: 410, type: 'buzzy', patrolMin: 1350, patrolMax: 1550 },
      { x: 1750, y: 410, type: 'goomba', patrolMin: 1700, patrolMax: 1900 },
      { x: 2150, y: 410, type: 'koopa', patrolMin: 2100, patrolMax: 2300 },
    ],
    bulletBills: [
      { spawnX: 2800, startY: 300, speed: 3 }
    ],
    flagX: 2600,
    groundLength: 3000
  },

  // WORLD 4 — Lava
  {
    name: 'WORLD 2-2',
    subtitle: 'Magma Depths',
    bgColor: '#1a0a0a',
    gradientTop: '#2a0a0a',
    gradientBot: '#0a0000',
    groundColor: '#4a2a1a',
    groundTopColor: '#6a3a2a',
    groundY: 430,
    isUnderground: false,
    isLava: true,
    hasWeather: false,
    gravity: 0.6,
    platforms: [
      { x: 200, y: 370, w: 100, h: 22, type: 'brick' },
      { x: 400, y: 330, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 580, y: 290, w: 100, h: 22, type: 'brick' },
      { x: 780, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'fire' },
      { x: 950, y: 290, w: 120, h: 22, type: 'brick' },
      { x: 1200, y: 330, w: 100, h: 22, type: 'brick' },
      { x: 1400, y: 280, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 1580, y: 320, w: 120, h: 22, type: 'brick' },
      { x: 1800, y: 370, w: 100, h: 22, type: 'brick' },
      { x: 2000, y: 310, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 2180, y: 280, w: 120, h: 22, type: 'brick' },
    ],
    pipes: [
      { x: 360, h: 50, hasPiranha: true },
      { x: 1100, h: 60, hasPiranha: true },
    ],
    movingPlatforms: [
      { x: 1000, y: 370, w: 80, h: 14, minX: 900, maxX: 1300, speed: 1.8 }
    ],
    coins: [
      { x: 250, y: 330 }, { x: 450, y: 290 }, { x: 630, y: 250 },
      { x: 830, y: 300 }, { x: 1000, y: 250 }, { x: 1250, y: 290 },
      { x: 1450, y: 240 }, { x: 1630, y: 280 }, { x: 1850, y: 330 },
      { x: 2050, y: 270 }, { x: 2230, y: 240 },
    ],
    enemies: [
      { x: 350, y: 400, type: 'goomba', patrolMin: 300, patrolMax: 450 },
      { x: 650, y: 400, type: 'koopa', patrolMin: 600, patrolMax: 800 },
      { x: 1050, y: 400, type: 'buzzy', patrolMin: 1000, patrolMax: 1200 },
      { x: 1350, y: 400, type: 'goomba', patrolMin: 1300, patrolMax: 1500 },
      { x: 1700, y: 400, type: 'koopa', patrolMin: 1650, patrolMax: 1850 },
      { x: 2100, y: 400, type: 'goomba', patrolMin: 2050, patrolMax: 2250 },
    ],
    bulletBills: [
      { spawnX: 2900, startY: 250, speed: 3.5 }
    ],
    flagX: 2500,
    groundLength: 2900
  },

  // WORLD 5 — Ice
  {
    name: 'WORLD 3-1',
    subtitle: 'Frozen Tundra',
    bgColor: '#c8e6ff',
    gradientTop: '#b3d9ff',
    gradientBot: '#e0f0ff',
    groundColor: '#b0c4de',
    groundTopColor: '#d0e4ff',
    groundY: 420,
    isUnderground: false,
    isLava: false,
    hasWeather: true,
    gravity: 0.5,
    platforms: [
      { x: 250, y: 360, w: 100, h: 22, type: 'brick' },
      { x: 450, y: 320, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 620, y: 280, w: 120, h: 22, type: 'brick' },
      { x: 820, y: 340, w: 80, h: 22, type: 'question', hasPowerup: 'star' },
      { x: 1000, y: 290, w: 100, h: 22, type: 'brick' },
      { x: 1200, y: 330, w: 120, h: 22, type: 'brick' },
      { x: 1420, y: 280, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 1600, y: 320, w: 100, h: 22, type: 'brick' },
      { x: 1800, y: 370, w: 120, h: 22, type: 'brick' },
      { x: 2000, y: 310, w: 80, h: 22, type: 'question', hasPowerup: 'fire' },
      { x: 2200, y: 270, w: 100, h: 22, type: 'brick' },
    ],
    pipes: [
      { x: 500, h: 50, hasPiranha: true },
      { x: 1300, h: 60, hasPiranha: false },
      { x: 1900, h: 70, hasPiranha: true },
    ],
    movingPlatforms: [
      { x: 1100, y: 360, w: 80, h: 14, minX: 1000, maxX: 1400, speed: 1.5 }
    ],
    coins: [
      { x: 200, y: 380 }, { x: 300, y: 320 }, { x: 500, y: 280 },
      { x: 670, y: 240 }, { x: 870, y: 300 }, { x: 1050, y: 250 },
      { x: 1250, y: 290 }, { x: 1470, y: 240 }, { x: 1650, y: 280 },
      { x: 1850, y: 330 }, { x: 2050, y: 270 }, { x: 2250, y: 230 },
    ],
    enemies: [
      { x: 400, y: 390, type: 'goomba', patrolMin: 350, patrolMax: 500 },
      { x: 700, y: 390, type: 'koopa', patrolMin: 650, patrolMax: 850 },
      { x: 1100, y: 390, type: 'buzzy', patrolMin: 1050, patrolMax: 1250 },
      { x: 1500, y: 390, type: 'goomba', patrolMin: 1450, patrolMax: 1650 },
      { x: 2100, y: 390, type: 'koopa', patrolMin: 2050, patrolMax: 2250 },
    ],
    bulletBills: [],
    flagX: 2500,
    groundLength: 2900
  },

  // WORLD 6 — Castle (Final)
  {
    name: 'WORLD 3-2',
    subtitle: 'Dark Citadel',
    bgColor: '#0a0000',
    gradientTop: '#1a0000',
    gradientBot: '#0a0000',
    groundColor: '#3a2a1a',
    groundTopColor: '#5a3a2a',
    groundY: 430,
    isUnderground: true,
    isLava: true,
    hasWeather: false,
    gravity: 0.6,
    platforms: [
      { x: 200, y: 370, w: 100, h: 22, type: 'brick' },
      { x: 400, y: 330, w: 80, h: 22, type: 'question', hasPowerup: 'fire' },
      { x: 600, y: 290, w: 120, h: 22, type: 'brick' },
      { x: 800, y: 350, w: 80, h: 22, type: 'question', hasPowerup: 'star' },
      { x: 1000, y: 300, w: 100, h: 22, type: 'brick' },
      { x: 1200, y: 340, w: 120, h: 22, type: 'brick' },
      { x: 1420, y: 290, w: 80, h: 22, type: 'question', hasPowerup: 'mushroom' },
      { x: 1600, y: 330, w: 100, h: 22, type: 'brick' },
      { x: 1800, y: 370, w: 120, h: 22, type: 'brick' },
      { x: 2000, y: 310, w: 80, h: 22, type: 'question', hasPowerup: 'coin' },
      { x: 2200, y: 270, w: 120, h: 22, type: 'brick' },
      { x: 2400, y: 320, w: 100, h: 22, type: 'brick' },
    ],
    pipes: [
      { x: 500, h: 50, hasPiranha: true },
      { x: 1500, h: 60, hasPiranha: true },
    ],
    movingPlatforms: [
      { x: 1100, y: 360, w: 80, h: 14, minX: 1000, maxX: 1400, speed: 2 },
      { x: 1900, y: 350, w: 80, h: 14, minX: 1800, maxX: 2200, speed: 2.2 }
    ],
    coins: [
      { x: 250, y: 330 }, { x: 450, y: 290 }, { x: 650, y: 250 },
      { x: 850, y: 310 }, { x: 1050, y: 260 }, { x: 1250, y: 300 },
      { x: 1470, y: 250 }, { x: 1650, y: 290 }, { x: 1850, y: 330 },
      { x: 2050, y: 270 }, { x: 2250, y: 230 }, { x: 2450, y: 280 },
    ],
    enemies: [
      { x: 350, y: 400, type: 'goomba', patrolMin: 300, patrolMax: 450 },
      { x: 650, y: 400, type: 'koopa', patrolMin: 600, patrolMax: 800 },
      { x: 1050, y: 400, type: 'buzzy', patrolMin: 1000, patrolMax: 1200 },
      { x: 1400, y: 400, type: 'goomba', patrolMin: 1350, patrolMax: 1550 },
      { x: 1750, y: 400, type: 'koopa', patrolMin: 1700, patrolMax: 1900 },
      { x: 2150, y: 400, type: 'buzzy', patrolMin: 2100, patrolMax: 2300 },
      { x: 2350, y: 400, type: 'goomba', patrolMin: 2300, patrolMax: 2500 },
    ],
    bulletBills: [
      { spawnX: 3000, startY: 280, speed: 4 },
      { spawnX: 3000, startY: 350, speed: 4 }
    ],
    flagX: 2750,
    groundLength: 3100
  }
];

// ═══════════════════ GAME OBJECTS ═══════════════════
let player;
let platforms = [];
let pipes = [];
let movingPlatforms = [];
let coins = [];
let enemies = [];
let bulletBills = [];
let powerups = []; // active powerups in the world
let fireballs = [];
let flag = { x: 0, y: 300, w: 12, h: 80 };
let level = null;
let playerAtFlag = false;

function initPlayer() {
  player = {
    x: 50, y: 350,
    w: 30, h: 34,
    dx: 0, dy: 0,
    speed: 4.5,
    runSpeed: 6.5,
    jumpForce: -11,
    groundPoundForce: -5,
    onGround: false,
    facing: 1,
    frame: 0,
    invincible: 0,
    dead: false,
    powerUp: null, // null, 'super', 'fire', 'star'
    starTimer: 0,
    isRunning: false,
    isGroundPounding: false,
    groundPoundTimer: 0,
    fireCooldown: 0,
    wallSlide: 0
  };
}

function loadLevel(index) {
  if (index >= LEVELS.length) {
    gameState = STATE.WIN;
    showResult('VICTORY!', 'All worlds conquered!', true);
    return;
  }

  level = LEVELS[index];
  currentLevel = index;
  initPlayer();

  const gY = level.groundY;
  const ground = { x: -100, y: gY, w: level.groundLength + 200, h: 80, type: 'ground' };

  platforms = [ground];
  pipes = [];
  movingPlatforms = [];
  coins = [];
  enemies = [];
  bulletBills = [];
  powerups = [];
  fireballs = [];
  playerAtFlag = false;

  // Platforms
  level.platforms.forEach(p => {
    platforms.push({ ...p, hit: false });
  });

  // Pipes
  level.pipes.forEach(p => {
    pipes.push({ ...p, width: 40 });
  });

  // Moving platforms
  level.movingPlatforms.forEach(mp => {
    movingPlatforms.push({ ...mp, dir: 1 });
  });

  // Coins
  level.coins.forEach(c => {
    coins.push({ x: c.x, y: c.y, r: 9, taken: false });
  });

  // Enemies
  level.enemies.forEach(e => {
    enemies.push({
      x: e.x, y: e.y,
      w: 32, h: 34,
      type: e.type,
      dir: 1,
      speed: 1.2 + Math.random() * 0.6,
      alive: true,
      patrolMin: e.patrolMin,
      patrolMax: e.patrolMax,
      frame: 0,
      squished: false,
      squishTimer: 0,
      shellMoving: false,
      inShell: false
    });
  });

  // Bullet Bills
  level.bulletBills.forEach(bb => {
    bulletBills.push({
      x: bb.spawnX, y: bb.startY,
      w: 28, h: 16,
      speed: bb.speed,
      alive: true,
      frame: 0
    });
  });

  // Flag
  flag = { x: level.flagX, y: level.groundY - 100, w: 12, h: 100 };

  cameraX = 0;
  timer = 300;
  timerAccum = 0;
  particles = [];
  floatingTexts = [];
  comboCount = 0;
  comboTimer = 0;

  document.getElementById('levelDisplay').textContent = level.name;
}

// ═══════════════════ PHYSICS ═══════════════════
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function updateGame() {
  frameCount++;

  if (gameState === STATE.PAUSED) {
    document.getElementById('pauseOverlay').style.display = 'flex';
    return;
  }
  document.getElementById('pauseOverlay').style.display = 'none';

  if (gameState === STATE.LEVEL_TRANSITION) {
    levelTransitionTimer--;
    if (levelTransitionTimer <= 0) {
      gameState = STATE.PLAYING;
    }
    updateParticles();
    return;
  }

  if (gameState !== STATE.PLAYING) return;

  // Timer
  timerAccum++;
  if (timerAccum >= 60) {
    timerAccum = 0;
    timer--;
    document.getElementById('timeDisplay').textContent = `⏱ ${timer}`;
    if (timer <= 30) document.getElementById('timeDisplay').style.color = '#e74c3c';
    if (timer <= 0) killPlayer();
  }

  // Combo timer
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer <= 0) comboCount = 0;
  }

  // Toast
  if (toastTimer > 0) {
    toastTimer--;
    document.getElementById('toast').textContent = toastMsg;
    document.getElementById('toast').classList.add('show');
  } else {
    document.getElementById('toast').classList.remove('show');
  }

  if (!player || player.dead) return;
  const p = player;

  // Screen shake decay
  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.1) screenShake = 0;

  // Star timer
  if (p.starTimer > 0) {
    p.starTimer--;
    if (p.starTimer <= 0) p.powerUp = p.powerUp === 'star' ? null : p.powerUp;
  }

  // Invincibility
  if (p.invincible > 0) p.invincible--;

  // Fire cooldown
  if (p.fireCooldown > 0) p.fireCooldown--;

  // Ground pound
  if (p.isGroundPounding) {
    p.groundPoundTimer--;
    if (p.groundPoundTimer <= 0) p.isGroundPounding = false;
  }

  // ═══ INPUT ═══
  let moveX = 0;
  if (keys['ArrowRight'] || keys['KeyD'] || touchInput.right) moveX = 1;
  if (keys['ArrowLeft'] || keys['KeyA'] || touchInput.left) moveX = -1;

  p.isRunning = keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyZ'] || touchInput.run;
  const currentSpeed = p.isRunning ? p.runSpeed : p.speed;

  if (moveX !== 0) {
    p.facing = moveX;
    p.frame++;
  }

  // Jump
  const jumpKey = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
  if ((jumpKey || touchInput.jumpTap) && p.onGround && !p.isGroundPounding) {
    p.dy = p.jumpForce;
    p.onGround = false;
    playJumpSnd();
    spawnParticles(p.x + p.w/2, p.y + p.h, '#ccc', 4, 2);
  }
  if (touchInput.jumpTap) touchInput.jumpTap = false;

  // Ground pound (down + in air)
  if ((keys['ArrowDown'] || keys['KeyS'] || touchInput.down) && !p.onGround && p.dy > 1 && !p.isGroundPounding) {
    p.isGroundPounding = true;
    p.groundPoundTimer = 10;
    p.dy = 8;
  }

  // Fire
  if (p.powerUp === 'fire' && p.fireCooldown <= 0) {
    if (keys['KeyX'] || keys['KeyF'] || touchInput.run) {
      // Shoot fireball
      fireballs.push({
        x: p.x + (p.facing > 0 ? p.w : 0),
        y: p.y + p.h/2,
        r: 6,
        dx: p.facing * 7,
        dy: -2,
        frame: 0,
        alive: true,
        bounce: 0
      });
      p.fireCooldown = 15;
      playFireSnd();
    }
  }

  // ═══ MOVEMENT ═══
  p.dx = moveX * currentSpeed;
  p.x += p.dx;

  // Gravity
  p.dy += level.gravity;
  p.y += p.dy;

  // ═══ PLATFORM COLLISION ═══
  p.onGround = false;

  platforms.forEach(plat => {
    if (rectCollide(p, plat)) {
      // Coming from top
      if (p.dy > 0 && p.y + p.h - p.dy <= plat.y + 8) {
        p.y = plat.y - p.h;
        p.dy = 0;
        p.onGround = true;
        if (p.isGroundPounding) {
          p.isGroundPounding = false;
          screenShake = 6;
          if (plat.type === 'brick') {
            // Break brick!
            spawnBlockParticles(plat.x, plat.y, plat.w, plat.h);
            playBreakSnd();
            spawnFloatingText(plat.x + plat.w/2, plat.y, 'SMASH!', '#e74c3c', 20);
            plat.type = 'broken';
            plat.w = 0;
            plat.h = 0;
          }
        }
      }
      // Coming from bottom
      else if (p.dy < 0 && p.y - p.dy >= plat.y + plat.h - 5) {
        p.y = plat.y + plat.h;
        p.dy = 0;
        if (plat.type === 'question' && !plat.hit) {
          plat.hit = true;
          const pw = plat.hasPowerup || 'coin';
          spawnPowerup(plat.x + plat.w/2, plat.y - 20, pw);
          playCoinSnd();
          if (pw === 'coin') {
            score += 10;
            spawnFloatingText(plat.x + plat.w/2, plat.y - 30, '+10', '#FFD700');
          }
        }
      }
    }
  });

  // Moving platforms
  movingPlatforms.forEach(mp => {
    // Move platform
    mp.x += mp.dir * mp.speed;
    if (mp.x <= mp.minX || mp.x >= mp.maxX - mp.w) mp.dir *= -1;

    // Check if player is on top
    if (p.dy >= 0 && p.x + p.w > mp.x + 5 && p.x < mp.x + mp.w - 5) {
      if (Math.abs(p.y + p.h - mp.y) < 10) {
        p.y = mp.y - p.h;
        p.dy = 0;
        p.onGround = true;
        // Move with platform
        p.x += mp.dir * mp.speed;
      }
    }
  });

  // Boundaries
  if (p.x < 0) p.x = 0;
  if (p.y > level.groundY + 100) {
    killPlayer();
  }

  // ═══ COINS ═══
  coins.forEach(c => {
    if (!c.taken) {
      const dx = (p.x + p.w/2) - c.x;
      const dy = (p.y + p.h/2) - c.y;
      if (Math.sqrt(dx*dx + dy*dy) < 22) {
        c.taken = true;
        totalCoins++;
        score += 50;
        comboCount++;
        comboTimer = 120;
        const bonus = comboCount > 1 ? comboCount * 25 : 0;
        score += bonus;
        playCoinSnd();
        spawnCoinParticles(c.x, c.y);
        spawnFloatingText(c.x, c.y - 20, bonus > 0 ? `+${50+bonus} 🔥` : '+50', '#FFD700');
        if (comboCount >= 5) {
          showToast(`🔥 ${comboCount}x COMBO!`);
        }
      }
    }
  });

  // ═══ ENEMIES ═══
  enemies.forEach(e => {
    if (!e.alive) return;
    e.frame++;

    if (e.inShell) {
      // Shell — can be kicked
      if (e.shellMoving) {
        e.x += e.dir * 6;
        // Shell kills other enemies
        enemies.forEach(other => {
          if (other !== e && other.alive && !other.inShell && rectCollide(e, other)) {
            other.alive = false;
            spawnStompParticles(other.x + other.w/2, other.y + other.h/2);
            score += 200;
            spawnFloatingText(other.x, other.y - 20, '+200', '#ff6b6b');
            playStompSnd();
          }
        });
        // Shell breaks bricks
        platforms.forEach(plat => {
          if (plat.type === 'brick' && rectCollide(e, plat)) {
            spawnBlockParticles(plat.x, plat.y, plat.w, plat.h);
            plat.type = 'broken';
            plat.w = 0;
            plat.h = 0;
            playBreakSnd();
          }
        });
      }
      return;
    }

    if (e.squished) {
      e.squishTimer--;
      if (e.squishTimer <= 0) {
        e.alive = false;
      }
      return;
    }

    // Patrol
    e.x += e.dir * e.speed;
    if (e.x <= e.patrolMin || e.x >= e.patrolMax) e.dir *= -1;

    // Collision with player
    if (rectCollide(p, e)) {
      if (p.starTimer > 0) {
        // Star power kills enemies
        e.alive = false;
        score += 200;
        spawnStompParticles(e.x + e.w/2, e.y + e.h/2);
        spawnFloatingText(e.x, e.y - 20, '+200 ⭐', '#f1c40f');
        playStompSnd();
        return;
      }

      // Stomp (coming from above)
      if (p.dy > 0 && p.y + p.h - 12 <= e.y + 8) {
        // Stomp!
        if (e.type === 'koopa') {
          // Koopa becomes shell
          e.inShell = true;
          e.shellMoving = false;
          e.h = 24;
        } else {
          e.squished = true;
          e.squishTimer = 30;
          e.h = 12;
        }
        p.dy = -7;
        comboCount++;
        comboTimer = 120;
        const bonus = comboCount > 1 ? comboCount * 50 : 0;
        score += 100 + bonus;
        playStompSnd();
        spawnStompParticles(e.x + e.w/2, e.y + e.h/2);
        spawnFloatingText(e.x, e.y - 20, bonus > 0 ? `+${100+bonus} 🔥` : '+100', '#ff6b6b');
        if (comboCount >= 5) showToast(`🔥 ${comboCount}x STOMP COMBO!`);
      } else {
        // Player hit
        if (p.starTimer <= 0) {
          hitPlayer();
        }
      }
    }
  });

  // ═══ BULLET BILLS ═══
  bulletBills.forEach(bb => {
    if (!bb.alive) return;
    bb.frame++;
    bb.x -= bb.speed;

    // Off screen
    if (bb.x < cameraX - 200) bb.alive = false;

    // Hit player
    if (rectCollide(p, bb)) {
      if (p.starTimer > 0) {
        bb.alive = false;
        spawnParticles(bb.x, bb.y, '#555', 8);
        score += 100;
      } else {
        hitPlayer();
      }
    }
  });

  // ═══ POWERUPS ═══
  powerups.forEach(pu => {
    if (!pu.alive) return;

    // Physics
    pu.vy += 0.4;
    pu.x += pu.vx || 0;
    pu.y += pu.vy;

    // Ground collision
    if (pu.y > level.groundY - 20) {
      pu.y = level.groundY - 20;
      pu.vy = 0;
      pu.vx = (pu.vx || 0) * 0.95;
    }

    // Platform collision
    platforms.forEach(plat => {
      if (plat.type !== 'broken' && rectCollide(pu, {x: plat.x, y: plat.y, w: plat.w, h: plat.h})) {
        if (pu.vy > 0) {
          pu.y = plat.y - 20;
          pu.vy = 0;
        }
      }
    });

    // Collected by player
    if (rectCollide(p, pu)) {
      pu.alive = false;
      collectPowerup(pu.type);
    }

    // Off screen
    if (pu.y > level.groundY + 100) pu.alive = false;
  });

  // ═══ FIREBALLS ═══
  fireballs.forEach(fb => {
    if (!fb.alive) return;
    fb.frame++;
    fb.x += fb.dx;
    fb.dy += 0.2;
    fb.y += fb.dy;

    // Bounce off ground
    if (fb.y > level.groundY - 10) {
      fb.y = level.groundY - 10;
      fb.dy = -3;
      fb.bounce++;
    }

    // Platform bounce
    platforms.forEach(plat => {
      if (plat.type !== 'broken' && rectCollide(fb, {x: plat.x, y: plat.y, w: plat.w, h: plat.h})) {
        if (fb.dy > 0) {
          fb.dy = -3;
          fb.bounce++;
        }
      }
    });

    // Hit enemies
    enemies.forEach(e => {
      if (e.alive && !e.inShell && rectCollide(fb, e)) {
        fb.alive = false;
        e.alive = false;
        score += 200;
        spawnParticles(e.x + e.w/2, e.y + e.h/2, '#f39c12', 15);
        spawnFloatingText(e.x, e.y - 20, '+200 🔥', '#f39c12');
        playStompSnd();
      }
    });

    // Max bounces
    if (fb.bounce > 4 || fb.x < cameraX - 100 || fb.x > cameraX + W + 100) {
      fb.alive = false;
    }
  });

  // ═══ FLAGPOLE ═══
  if (p.x + p.w > flag.x && p.x < flag.x + flag.w + 30) {
    if (!playerAtFlag) {
      playerAtFlag = true;
      const flagScore = Math.floor(timer * 10);
      score += flagScore;
      playWinSnd();
      spawnFlagParticles(flag.x + 20, flag.y + 40);
      showToast(`🏁 FLAG! +${flagScore} BONUS!`);
      screenShake = 8;

      setTimeout(() => {
        loadLevel(currentLevel + 1);
      }, 2000);
      gameState = STATE.LEVEL_TRANSITION;
      levelTransitionTimer = 180;
    }
  }

  // ═══ CAMERA ═══
  let targetCam = p.x - W * 0.35;
  targetCam = Math.max(0, Math.min(targetCam, level.groundLength - W));
  cameraX += (targetCam - cameraX) * 0.08;

  // Particles
  updateParticles();

  // Fireballs cleanup
  fireballs = fireballs.filter(fb => fb.alive);
  powerups = powerups.filter(pu => pu.alive);

  // Update HUD
  document.getElementById('scoreDisplay').textContent = `SCORE: ${score}`;
  document.getElementById('coinDisplay').textContent = `🪙 × ${totalCoins}`;
  document.getElementById('livesDisplay').textContent = `❤️ × ${lives}`;
}

function spawnPowerup(x, y, type) {
  if (type === 'coin') {
    // Already handled in question block hit
    return;
  }
  const pu = {
    x, y, w: 20, h: 20,
    type: type,
    vy: -3, vx: 1,
    alive: true,
    frame: 0
  };
  powerups.push(pu);
  spawnPowerupParticles(x, y);
  playPowerupSnd();
}

function collectPowerup(type) {
  switch (type) {
    case 'mushroom':
      if (!player.powerUp || player.powerUp === 'super') {
        player.powerUp = 'super';
        lives++;
        play1UpSnd();
        spawnFloatingText(player.x, player.y - 30, '1-UP! ❤️', '#ff6b6b', 24);
        showToast('❤️ 1-UP!');
      } else {
        player.powerUp = 'super';
        spawnFloatingText(player.x, player.y - 30, 'SUPER!', '#e74c3c', 22);
        showToast('🍄 SUPER MARIO!');
      }
      break;
    case 'fire':
      player.powerUp = 'fire';
      spawnFloatingText(player.x, player.y - 30, 'FIRE FLOWER! 🔥', '#f39c12', 22);
      showToast('🔥 FIRE MARIO!');
      break;
    case 'star':
      player.powerUp = 'star';
      player.starTimer = 600; // 10 seconds
      spawnFloatingText(player.x, player.y - 30, 'STAR POWER! ⭐', '#f1c40f', 22);
      showToast('⭐ STAR MARIO!');
      break;
  }
  spawnPowerupParticles(player.x + player.w/2, player.y + player.h/2);
}

function hitPlayer() {
  if (player.invincible > 0 || player.starTimer > 0) return;

  if (player.powerUp && player.powerUp !== 'star') {
    // Lose powerup, not a life
    player.powerUp = null;
    player.invincible = 90;
    playHurtSnd();
    screenShake = 5;
    spawnParticles(player.x + player.w/2, player.y + player.h/2, '#fff', 10);
    spawnFloatingText(player.x, player.y - 30, '💥 OOF!', '#fff', 18);
    showToast('💥 Lost power-up!');
  } else {
    killPlayer();
  }
}

function killPlayer() {
  if (player.invincible > 0) return;
  player.dead = true;
  lives--;
  playDeathSnd();
  screenShake = 10;
  spawnParticles(player.x + player.w/2, player.y + player.h/2, '#e53e30', 25, 7);
  spawnParticles(player.x + player.w/2, player.y + player.h/2, '#fff', 10, 4);

  document.getElementById('livesDisplay').textContent = `❤️ × ${lives}`;

  if (lives <= 0) {
    setTimeout(() => {
      gameState = STATE.GAMEOVER;
      showResult('GAME OVER', 'Better luck next time!', false);
    }, 1000);
  } else {
    setTimeout(() => {
      // Respawn
      player.x = 50;
      player.y = 300;
      player.dx = 0;
      player.dy = 0;
      player.powerUp = null;
      player.starTimer = 0;
      player.dead = false;
      player.invincible = 120;
    }, 1500);
  }
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

function showToast(msg) {
  toastMsg = msg;
  toastTimer = 90; // ~1.5 seconds
}

// ═══════════════════ DRAWING ═══════════════════
function drawGame() {
  ctx.save();

  // Screen shake
  if (screenShake > 0.1) {
    const sx = (Math.random() - 0.5) * screenShake * 2;
    const sy = (Math.random() - 0.5) * screenShake * 2;
    ctx.translate(sx, sy);
  }

  ctx.clearRect(-10, -10, W + 20, H + 20);

  if (gameState === STATE.MENU) {
    drawMenuBg();
    ctx.restore();
    return;
  }

  // Background
  if (level) {
    drawBackground();
  }

  if (gameState === STATE.PAUSED) {
    drawGameWorld();
    ctx.restore();
    return;
  }

  drawGameWorld();
  ctx.restore();
}

function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, level.gradientTop);
  grad.addColorStop(0.6, level.gradientBot);
  grad.addColorStop(1, level.isLava ? '#1a0000' : '#0a0a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Parallax layers
  drawParallaxLayer(ctx, 0.1, '#fff', 0.04, true); // far clouds/stars
  drawParallaxLayer(ctx, 0.2, level.isUnderground ? '#444' : '#fff', 0.08, level.isUnderground);
  drawParallaxLayer(ctx, 0.4, level.isLava ? '#e74c3c' : '#fff', 0.12, false);

  // Lava glow
  if (level.isLava) {
    const glowGrad = ctx.createLinearGradient(0, level.groundY - 20, 0, H);
    glowGrad.addColorStop(0, 'rgba(231,76,60,0)');
    glowGrad.addColorStop(0.3, 'rgba(231,76,60,0.15)');
    glowGrad.addColorStop(1, 'rgba(231,76,60,0.3)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, level.groundY - 20, W, H - level.groundY + 20);
  }
}

function drawParallaxLayer(ctx, speed, color, alpha, isStar) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  const offset = -cameraX * speed;

  if (isStar || level.isUnderground) {
    for (let i = 0; i < 20; i++) {
      const sx = ((i * 137.5 + offset) % (W + 100)) - 50;
      const sy = (i * 97.3 + 30) % (level.groundY * 0.6);
      const size = 1 + Math.sin(i + frameCount * 0.02) * 0.5;
      ctx.fillRect(sx, sy, size, size);
    }
  } else {
    // Clouds
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 400 + offset * 0.5) % (W + 400)) - 200;
      const cy = 30 + (i * 47) % 120;
      ctx.beginPath();
      ctx.arc(cx, cy, 30 + i * 3, 0, Math.PI * 2);
      ctx.arc(cx + 25, cy - 8, 22 + i * 2, 0, Math.PI * 2);
      ctx.arc(cx - 22, cy + 4, 18 + i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawGameWorld() {
  if (!level) return;

  ctx.save();
  ctx.translate(-Math.round(cameraX), 0);

  const gY = level.groundY;

  // === GROUND ===
  // Base ground
  ctx.fillStyle = level.groundColor;
  ctx.fillRect(-100, gY, level.groundLength + 200, 80);
  // Top grass/dirt
  ctx.fillStyle = level.groundTopColor;
  ctx.fillRect(-100, gY - 5, level.groundLength + 200, 8);
  // Ground texture pattern
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < level.groundLength; i += 40) {
    ctx.fillRect(i, gY + 10 + (i % 20), 20, 2);
    ctx.fillRect(i + 20, gY + 30 + (i % 30), 15, 2);
  }

  // === PIPES ===
  pipes.forEach(p => {
    const hasPiranha = p.hasPiranha || false;
    drawPipe(ctx, p.x, gY - p.h, p.width, p.h, frameCount, hasPiranha, true);
  });

  // === PLATFORMS ===
  platforms.forEach(p => {
    if (p.type === 'broken') return;
    if (p.type === 'brick') {
      drawBrick(ctx, p.x, p.y, p.w, p.h);
    } else if (p.type === 'question') {
      drawQuestionBlock(ctx, p.x, p.y, p.w, p.h, frameCount, p.hit);
    } else if (p.type === 'ground') {
      // Already drawn
    }
  });

  // === MOVING PLATFORMS ===
  movingPlatforms.forEach(mp => {
    drawBrick(ctx, mp.x, mp.y, mp.w, mp.h);
    // Arrow indicator
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(mp.dir > 0 ? '→' : '←', mp.x + mp.w/2, mp.y - 5);
  });

  // === COINS ===
  coins.forEach(c => {
    if (!c.taken) {
      drawCoin(ctx, c.x, c.y, c.r, frameCount);
    }
  });

  // === POWERUPS ===
  powerups.forEach(pu => {
    switch (pu.type) {
      case 'mushroom':
        drawMushroom(ctx, pu.x, pu.y, 20, frameCount);
        break;
      case 'fire':
        drawFireFlower(ctx, pu.x, pu.y, 20, frameCount);
        break;
      case 'star':
        drawStar(ctx, pu.x, pu.y, 20, frameCount);
        break;
    }
  });

  // === ENEMIES ===
  enemies.forEach(e => {
    if (!e.alive) return;
    if (e.inShell) {
      drawKoopa(ctx, e.x, e.y, e.w, 24, e.frame, true, e.shellMoving);
      return;
    }
    switch (e.type) {
      case 'goomba':
        drawGoomba(ctx, e.x, e.y, e.w, e.h, e.frame, e.squished);
        break;
      case 'koopa':
        drawKoopa(ctx, e.x, e.y, e.w, e.h, e.frame, false, false);
        break;
      case 'buzzy':
        drawBuzzy(ctx, e.x, e.y, e.w, e.h, e.frame);
        break;
    }
  });

  // === BULLET BILLS ===
  bulletBills.forEach(bb => {
    if (bb.alive) {
      drawBulletBill(ctx, bb.x, bb.y, bb.w, bb.h, bb.frame);
    }
  });

  // === FIREBALLS ===
  fireballs.forEach(fb => {
    if (fb.alive) {
      drawFireball(ctx, fb.x, fb.y, fb.r, fb.frame);
    }
  });

  // === FLAGPOLE ===
  if (flag) {
    drawFlagpole(ctx, flag.x, gY, frameCount, playerAtFlag);
  }

  // === PLAYER ===
  if (player && !player.dead) {
    drawMario(ctx, player.x, player.y, player.w, player.h,
      player.frame, player.facing, player.powerUp, player.invincible);
  }

  // === PARTICLES ===
  drawParticles(ctx, cameraX);

  ctx.restore();

  // === TIMER WARNING ===
  if (timer <= 30 && timer > 0) {
    ctx.fillStyle = timer % 10 < 5 ? '#e74c3c' : '#FFD700';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ TIME LOW ⚠', W/2, 60);
  }

  // === LEVEL TRANSITION ===
  if (gameState === STATE.LEVEL_TRANSITION) {
    ctx.fillStyle = 'rgba(0,0,0,' + (levelTransitionTimer / 180 * 0.6) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✨ LEVEL COMPLETE! ✨', W/2, H/2);
    ctx.font = '20px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Score: ${score}`, W/2, H/2 + 50);
  }
}

function drawMenuBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(0.5, '#16213e');
  grad.addColorStop(1, '#0f3460');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Animated particles
  for (let i = 0; i < 60; i++) {
    const x = (i * 137.5 + frameCount * 0.05) % W;
    const y = (i * 97.3 + 50) % (H * 0.7);
    const size = 1 + Math.sin(i + frameCount * 0.02) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(i + frameCount * 0.03) * 0.15})`;
    ctx.fillRect(x, y, size, size);
  }

  // Title glow
  ctx.fillStyle = `rgba(233,69,96,${0.05 + Math.sin(frameCount * 0.02) * 0.03})`;
  ctx.beginPath();
  ctx.arc(W/2, H/3, 120 + Math.sin(frameCount * 0.02) * 20, 0, Math.PI * 2);
  ctx.fill();
}

// ═══════════════════ GAME LOOP ═══════════════════
function gameLoop() {
  updateGame();
  drawGame();
  requestAnimationFrame(gameLoop);
}

// ═══════════════════ EVENT BINDINGS ═══════════════════
document.getElementById('startBtn').addEventListener('click', () => {
  initAudio();
  score = 0;
  totalCoins = 0;
  lives = 3;
  document.getElementById('menuOverlay').style.display = 'none';
  document.getElementById('resultOverlay').style.display = 'none';
  document.getElementById('controlsInfo').style.display = 'none';
  loadLevel(0);
  gameState = STATE.PLAYING;
});

document.getElementById('controlsBtn').addEventListener('click', () => {
  const info = document.getElementById('controlsInfo');
  info.style.display = info.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('restartBtn').addEventListener('click', () => {
  score = 0;
  totalCoins = 0;
  lives = 3;
  document.getElementById('resultOverlay').style.display = 'none';
  document.getElementById('menuOverlay').style.display = 'none';
  loadLevel(0);
  gameState = STATE.PLAYING;
});

// ═══════════════════ INIT ═══════════════════
loadLevel(0);
gameState = STATE.MENU;
document.getElementById('menuOverlay').style.display = 'flex';
document.getElementById('resultOverlay').style.display = 'none';
document.getElementById('pauseOverlay').style.display = 'none';
document.getElementById('controlsInfo').style.display = 'none';

// Start
gameLoop();

console.log('🔥 Zeus Mario — Ultimate Premium Edition loaded!');
