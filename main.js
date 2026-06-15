const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

// Player
let player = {
  x: 50,
  y: 300,
  w: 30,
  h: 30,
  dx: 0,
  dy: 0,
  jump: -10,
  onGround: false
};

let gravity = 0.5;
let score = 0;

// Platforms
let platforms = [
  { x: 0, y: 360, w: 800, h: 40 },
  { x: 200, y: 280, w: 120, h: 20 },
  { x: 400, y: 220, w: 120, h: 20 }
];

// Coins
let coins = [
  { x: 220, y: 250, r: 8, collected: false },
  { x: 420, y: 190, r: 8, collected: false }
];

// Enemy
let enemy = {
  x: 500,
  y: 330,
  w: 30,
  h: 30,
  dir: 1
};

let keys = {};

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

function update() {

  // Movement
  if (keys["ArrowRight"]) player.dx = 3;
  else if (keys["ArrowLeft"]) player.dx = -3;
  else player.dx = 0;

  // Jump
  if (keys["Space"] && player.onGround) {
    player.dy = player.jump;
    player.onGround = false;
  }

  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  // Platforms collision
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

  // Coins
  coins.forEach(c => {
    if (!c.collected &&
      Math.hypot(player.x - c.x, player.y - c.y) < 25
    ) {
      c.collected = true;
      score += 10;
    }
  });

  // Enemy movement
  enemy.x += enemy.dir * 2;
  if (enemy.x > 700 || enemy.x < 400) enemy.dir *= -1;

  // Enemy collision (reset)
  if (
    player.x < enemy.x + enemy.w &&
    player.x + player.w > enemy.x &&
    player.y < enemy.y + enemy.h &&
    player.y + player.h > enemy.y
  ) {
    alert("Game Over!");
    location.reload();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Score
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 30);

  // Player
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Platforms
  ctx.fillStyle = "green";
  platforms.forEach(p => {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  });

  // Coins
  coins.forEach(c => {
    if (!c.collected) {
      ctx.beginPath();
      ctx.fillStyle = "gold";
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Enemy
  ctx.fillStyle = "purple";
  ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
