const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// =================== GAME STATE ===================
let gameStarted = false;
let level = 1;
let score = 0;
let cameraX = 0;

// =================== PLAYER ===================
let player = {
  x: 50,
  y: 300,
  w: 30,
  h: 30,
  dx: 0,
  dy: 0,
  speed: 4,
  jump: -11,
  onGround: false
};

let gravity = 0.6;

// =================== INPUT ===================
let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

// =================== MOBILE CONTROLS ===================
function moveLeft() { player.dx = -player.speed; }
function moveRight() { player.dx = player.speed; }
function stopMove() { player.dx = 0; }
function jump() {
  if (player.onGround) {
    player.dy = player.jump;
    player.onGround = false;
  }
}

// tap to start
document.addEventListener("click", () => {
  gameStarted = true;
});

// =================== LEVEL LOADER ===================
let platforms = [];
let coins = [];
let enemy;
let flag;

function loadLevel(lv) {

  if (lv === 1) {
    platforms = [
      { x: 0, y: 380, w: 1200, h: 40 },
      { x: 200, y: 300, w: 120, h: 20 },
      { x: 400, y: 250, w: 120, h: 20 },
      { x: 650, y: 200, w: 120, h: 20 }
    ];

    coins = [
      { x: 220, y: 260, r: 8, taken: false },
      { x: 420, y: 210, r: 8, taken: false },
      { x: 680, y: 160, r: 8, taken: false }
    ];

    enemy = { x: 500, y: 350, w: 30, h: 30, dir: 1 };

    flag = { x: 1000, y: 300, w: 20, h: 80 };
  }

  if (lv === 2) {
    platforms = [
      { x: 0, y: 380, w: 1400, h: 40 },
      { x: 250, y: 320, w: 120, h: 20 },
      { x: 500, y: 260, w: 120, h: 20 },
      { x: 800, y: 220, w: 120, h: 20 },
      { x: 1100, y: 300, w: 150, h: 20 }
    ];

    coins = [
      { x: 260, y: 280, r: 8, taken: false },
      { x: 520, y: 220, r: 8, taken: false },
      { x: 820, y: 180, r: 8, taken: false }
    ];

    enemy = { x: 700, y: 350, w: 30, h: 30, dir: 1 };

    flag = { x: 1300, y: 300, w: 20, h: 80 };
  }
}

loadLevel(level);

// =================== UPDATE ===================
function update() {

  if (!gameStarted) return;

  // keyboard
  if (keys["ArrowRight"]) player.dx = player.speed;
  else if (keys["ArrowLeft"]) player.dx = -player.speed;
  else player.dx = 0;

  if (keys["Space"]) jump();

  // movement
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  // platforms
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

  // enemy
  enemy.x += enemy.dir * 2;
  if (enemy.x > flag.x || enemy.x < 400) enemy.dir *= -1;

  if (
    player.x < enemy.x + enemy.w &&
    player.x + player.w > enemy.x &&
    player.y < enemy.y + enemy.h &&
    player.y + player.h > enemy.y
  ) {
    location.reload();
  }

  // flag win
  if (
    player.x < flag.x + flag.w &&
    player.x + player.w > flag.x &&
    player.y < flag.y + flag.h &&
    player.y + player.h > flag.y
  ) {
    level++;
    if (level > 2) {
      alert("YOU WIN ALL LEVELS 🎉");
      location.reload();
    } else {
      loadLevel(level);
      player.x = 50;
      player.y = 300;
    }
  }

  // camera
  cameraX = player.x - 150;
}

// =================== DRAW ===================
function draw() {

  // background
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("CLICK TO START", 200, 200);
    return;
  }

  ctx.save();
  ctx.translate(-cameraX, 0);

  // platforms
  ctx.fillStyle = "green";
  platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

  // coins
  coins.forEach(c => {
    if (!c.taken) {
      ctx.fillStyle = "gold";
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // enemy
  ctx.fillStyle = "purple";
  ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);

  // flag
  ctx.fillStyle = "black";
  ctx.fillRect(flag.x, flag.y, flag.w, flag.h);
  ctx.fillStyle = "yellow";
  ctx.fillRect(flag.x, flag.y, flag.w, 20);

  // player
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.restore();

  // UI
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 30);
  ctx.fillText("Level: " + level, 20, 60);
}

// =================== LOOP ===================
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
