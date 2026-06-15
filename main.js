const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

// Player
let player = {
  x: 50,
  y: 300,
  width: 40,
  height: 40,
  dx: 0,
  dy: 0,
  jumpPower: -10,
  onGround: false
};

// Gravity
let gravity = 0.5;

// Platforms
let platforms = [
  { x: 0, y: 360, width: 800, height: 40 },
  { x: 200, y: 280, width: 120, height: 20 },
  { x: 400, y: 220, width: 120, height: 20 }
];

// Controls
let keys = {};

document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

// Update Game
function update() {

  // Left / Right
  if (keys["ArrowRight"]) player.dx = 3;
  else if (keys["ArrowLeft"]) player.dx = -3;
  else player.dx = 0;

  // Jump
  if (keys["Space"] && player.onGround) {
    player.dy = player.jumpPower;
    player.onGround = false;
  }

  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  // Platform collision
  player.onGround = false;
  platforms.forEach(p => {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
      player.y = p.y - player.height;
      player.dy = 0;
      player.onGround = true;
    }
  });

}

// Draw Game
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Platforms
  ctx.fillStyle = "green";
  platforms.forEach(p => {
    ctx.fillRect(p.x, p.y, p.width, p.height);
  });
}

// Game Loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
