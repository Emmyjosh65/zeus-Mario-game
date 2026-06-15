const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ================= CAMERA =================
let cameraX = 0;

// ================= GAME STATE =================
let gameStarted = false;
let score = 0;

// ================= PLAYER =================
let player = {
  x: 50,
  y: 300,
  w: 32,
  h: 32,
  dx: 0,
  dy: 0,
  speed: 4,
  jump: -12,
  onGround: false
};

let gravity = 0.6;

// ================= INPUT =================
let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

// tap to start (mobile safe)
document.addEventListener("touchstart", () => gameStarted = true);
document.addEventListener("click", () => gameStarted = true);

// ================= MOBILE CONTROLS =================
function moveLeft() { player.dx = -player.speed; }
function moveRight() { player.dx = player.speed; }
function stopMove() { player.dx = 0; }
function jump() {
  if (player.onGround) {
    player.dy = player.jump;
    player.onGround = false;
  }
}

// ================= ASSETS (SAFE LOAD) =================
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

let playerImg = loadImage("assets/player.png");
let coinImg = loadImage("assets/coin.png");
let enemyImg = loadImage("assets/enemy.png");
let bgImg = loadImage("assets/bg.png");
let groundImg = loadImage("assets/ground.png");

// ================= WORLD =================
let platforms = [];
let coins = [];
let enemy;
let flag;

function loadLevel() {

  platforms = [
    { x: 0, y: 380, w: 2000, h: 40 }
  ];

  for (let i = 200; i < 1800; i += 200) {
    platforms.push({
      x: i,
      y: 300 - (Math.random() * 80),
      w: 120,
      h: 20
    });
  }

  coins = [];
  for (let i = 200; i < 1500; i += 150) {
    coins.push({
      x: i,
      y: 200,
      r: 10,
      taken: false
    });
  }

  enemy = {
    x: 600,
    y: 340,
    w: 32,
    h: 32,
    dir: 1
  };

  flag = {
    x: 1800,
    y: 300,
    w: 20,
    h: 80
  };
}

loadLevel();

// ================= UPDATE =================
function update() {

  if (!gameStarted) return;

  // keyboard
  if (keys["ArrowRight"]) player.dx = player.speed;
  else if (keys["ArrowLeft"]) player.dx = -player.speed;
  else player.dx = 0;

  if (keys["Space"]) jump();

  // physics
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  // platforms collision
  player.onGround = false;
  platforms.forEach(p => {
    if (
      player.x < p.x + p.w &&
      player.x + player.w > p.x &&
      player.y < p.y + p.h &&
      player.y + player.h > p.y
    ) {
      player.y = p.y - player.h;
      player.dy = 0;
      player.onGround = true;
    }
  });

  // coins
  coins.forEach(c => {
    if (!c.taken && Math.hypot(player.x - c.x, player.y - c.y) < 25) {
      c.taken = true;
      score += 10;
    }
  });

  // enemy movement
  enemy.x += enemy.dir * 2;
  if (enemy.x > 1600 || enemy.x < 500) enemy.dir *= -1;

  // enemy collision
  if (
    player.x < enemy.x + enemy.w &&
    player.x + player.w > enemy.x &&
    player.y < enemy.y + enemy.h &&
    player.y + player.h > enemy.y
  ) {
    location.reload();
  }

  // win condition
  if (player.x > flag.x) {
    alert("YOU WIN 🎉");
    location.reload();
  }

  // camera
  cameraX = player.x - 150;
}

// ================= DRAW =================
function draw() {

  // BACKGROUND (image OR fallback)
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // clouds (parallax feel)
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(100 - cameraX * 0.2, 80, 120, 40);
  ctx.fillRect(400 - cameraX * 0.2, 120, 150, 50);

  if (!gameStarted) {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("CLICK / TAP TO START", 180, 200);
    return;
  }

  ctx.save();
  ctx.translate(-cameraX, 0);

  // platforms (ground image OR fallback)
  platforms.forEach(p => {
    if (groundImg.complete && groundImg.naturalWidth > 0) {
      ctx.drawImage(groundImg, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  });

  // coins
  coins.forEach(c => {
    if (!c.taken) {
      if (coinImg.complete && coinImg.naturalWidth > 0) {
        ctx.drawImage(coinImg, c.x, c.y, 20, 20);
      } else {
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // enemy
  if (enemyImg.complete && enemyImg.naturalWidth > 0) {
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.w, enemy.h);
  } else {
    ctx.fillStyle = "purple";
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
  }

  // flag
  ctx.fillStyle = "black";
  ctx.fillRect(flag.x, flag.y, flag.w, flag.h);
  ctx.fillStyle = "yellow";
  ctx.fillRect(flag.x, flag.y, flag.w, 20);

  // player
  if (playerImg.complete && playerImg.naturalWidth > 0) {
    ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = "red";
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  ctx.restore();

  // UI
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 30);
}

// ================= LOOP =================
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
