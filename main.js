const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// CAMERA
let cameraX = 0;

// PLAYER
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
let score = 0;

// WORLD (long map)
let platforms = [
  { x: 0, y: 380, w: 1000, h: 40 },
  { x: 200, y: 300, w: 120, h: 20 },
  { x: 400, y: 250, w: 120, h: 20 },
  { x: 650, y: 200, w: 120, h: 20 },
  { x: 900, y: 320, w: 200, h: 40 }
];

// COINS
let coins = [
  { x: 220, y: 260, r: 8, taken: false },
  { x: 420, y: 210, r: 8, taken: false },
  { x: 680, y: 160, r: 8, taken: false }
];

// ENEMY
let enemy = {
  x: 500,
  y: 350,
  w: 30,
  h: 30,
  dir: 1
};

// INPUT
let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

// MOBILE BUTTONS (optional if you add later)
function moveLeft() { player.dx = -player.speed; }
function moveRight() { player.dx = player.speed; }
function stopMove() { player.dx = 0; }
function jump() {
  if (player.onGround) {
    player.dy = player.jump;
    player.onGround = false;
  }
}

// UPDATE
function update() {

  // keyboard
  if (keys["ArrowRight"]) player.dx = player.speed;
  else if (keys["ArrowLeft"]) player.dx = -player.speed;
  else player.dx = 0;

  if (keys["Space"]) jump();

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
    if (!c.taken &&
      Math.hypot(player.x - c.x, player.y - c.y) < 25
    ) {
      c.taken = true;
      score += 10;
    }
  });

  // enemy movement
  enemy.x += enemy.dir * 2;
  if (enemy.x > 800 || enemy.x < 400) enemy.dir *= -1;

  // enemy collision
  if (
    player.x < enemy.x + enemy.w &&
    player.x + player.w > enemy.x &&
    player.y < enemy.y + enemy.h &&
    player.y + player.h > enemy.y
  ) {
    location.reload();
  }

  // CAMERA FOLLOW
  cameraX = player.x - 150;
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // sky
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cameraX, 0);

  // platforms
  ctx.fillStyle = "green";
  platforms.forEach(p => {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  });

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

  // player (replace later with image)
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.restore();

  // UI
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 30);
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
