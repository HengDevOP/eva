const canvas = document.getElementById("seasonCanvas");
const ctx = canvas.getContext("2d");

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);
let currentType = "valentine"; // default

window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  // Recreate particles for the current season
  if (currentType) {
    createParticles(currentType, particles.length);
  }
});

// Global variables
let particles = [];
let animationId = null;

// Create particles based on type
function createParticles(type = "snow", count = 100) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 1 + 0.5,
      wind: Math.random() * 0.5 - 0.25,
      type,
    });
  }
}

function drawHeart(x, y, size) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x,
    y - size / 2,
    x - size,
    y - size / 2,
    x - size,
    y + size / 4
  );
  ctx.bezierCurveTo(x - size, y + size, x, y + size * 1.5, x, y + size * 1.8);
  ctx.bezierCurveTo(
    x,
    y + size * 1.5,
    x + size,
    y + size,
    x + size,
    y + size / 4
  );
  ctx.bezierCurveTo(x + size, y - size / 2, x, y - size / 2, x, y);
  ctx.fill();
}

function drawPumpkin(x, y, size) {
  // Pumpkin body
  ctx.fillStyle = "orange";
  ctx.beginPath();
  ctx.ellipse(x, y, size * 2, size * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pumpkin stem
  ctx.fillStyle = "green";
  ctx.fillRect(x - size / 4, y - size * 1.5, size / 2, size / 2);
}

function drawSnowflake(x, y, size) {
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;

  ctx.beginPath();

  // Draw vertical line
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);

  // Draw horizontal line
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);

  // Draw diagonal lines
  ctx.moveTo(x - size * 0.7, y - size * 0.7);
  ctx.lineTo(x + size * 0.7, y + size * 0.7);

  ctx.moveTo(x - size * 0.7, y + size * 0.7);
  ctx.lineTo(x + size * 0.7, y - size * 0.7);

  ctx.stroke();
}

// Draw function for each particle type
function drawParticles() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach((p) => {
    if (p.type === "snow") {
      drawSnowflake(p.x, p.y, p.size * 2);
    } else if (p.type === "halloween") {
      drawPumpkin(p.x, p.y, p.size);
    } else if (p.type === "valentine") {
      drawHeart(p.x, p.y, p.size);
    }
  });
  moveParticles();
}

// Move particles based on type
function moveParticles() {
  particles.forEach((p) => {
    if (p.type === "valentine") p.y -= p.speed; // hearts float upwards
    else p.y += p.speed; // snow & pumpkin fall down
    p.x += p.wind;

    if (p.y > height) p.y = -p.size;
    if (p.y < -p.size) p.y = height + p.size;
    if (p.x > width) p.x = 0;
    if (p.x < 0) p.x = width;
  });
}

// Animate
function animate() {
  drawParticles();
  animationId = requestAnimationFrame(animate);
}

// Public function to start animation
function showSeason(type = "snow", count = 100) {
  cancelAnimationFrame(animationId); // stop previous animation if any
  currentType = type; // store current type
  createParticles(type, count);
  animate();
}

// showSeason("snow");

// Example usage:
// showSeason("snow"); // Snow
// showSeason("halloween"); // Halloween pumpkins
// showSeason("valentine"); // Valentine hearts
