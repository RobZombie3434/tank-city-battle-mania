// === Sprite Loading ===
const spriteImages = {
  player: new Image(),
  brick: new Image(),
  steel: new Image(),
  enemy: new Image(),
  playerBase: new Image(),
  enemyBase: new Image(),
};
spriteImages.player.src = 'sprites/tank.png';
spriteImages.brick.src = 'sprites/wall-1.png';
spriteImages.steel.src = 'sprites/wall-2.png';
spriteImages.enemy.src = 'sprites/enemy-1.png';
spriteImages.playerBase.src = 'sprites/player-base.png';
spriteImages.enemyBase.src = 'sprites/enemy-base.png';

// === Constants ===
const TILE_SIZE = 32;
const MAP_SIZE = 20;
const CANVAS_SIZE = TILE_SIZE * MAP_SIZE;

// === Map Data ===
// 0 = empty, 1 = brick wall, 2 = steel wall, 3 = player base, 4 = enemy base
const map = [
  [2,0,1,0,0,0,1,0,0,2,4,0,1,0,0,0,1,0,0,2],
  [0,1,1,0,2,2,1,1,0,0,2,2,1,1,0,0,2,2,1,0],
  [1,1,0,0,2,2,0,1,1,0,1,1,0,0,2,2,0,1,1,0],
  [0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0],
  [0,2,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,2,0,0],
  [0,2,0,1,1,1,0,2,0,0,0,2,0,1,1,1,0,2,0,0],
  [1,1,0,0,2,2,0,1,1,0,1,1,0,0,2,2,0,1,1,0],
  [0,0,1,0,2,2,1,0,0,0,0,0,1,0,2,2,1,0,0,0],
  [2,1,1,0,0,0,1,1,1,2,2,1,1,1,0,0,0,1,1,2],
  [0,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,0,0,0],
  [2,0,1,0,0,0,1,0,0,2,0,0,1,0,0,0,1,0,0,2],
  [0,1,1,0,2,2,1,1,0,0,2,2,1,1,0,0,2,2,1,0],
  [1,1,0,0,2,2,0,1,1,0,1,1,0,0,2,2,0,1,1,0],
  [0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0],
  [0,2,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,2,0,0],
  [0,2,0,1,1,1,0,2,0,0,0,2,0,1,1,1,0,2,0,0],
  [1,1,0,0,2,2,0,1,1,0,1,1,0,0,2,2,0,1,1,0],
  [0,0,1,0,2,2,1,0,0,0,0,0,1,0,2,2,1,0,0,0],
  [2,1,1,0,0,0,1,1,1,2,2,1,1,1,0,0,0,1,1,2],
  [0,0,0,0,2,2,0,0,0,3,0,0,2,2,0,0,0,0,0,0],
];

// === Wall Health Data ===
const wallHealth = map.map(row => row.map(cell => (cell === 1 ? 3 : 0)));

// Find player base position and spawn player just above it
function findPlayerBasePosition() {
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x] === 3) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

const playerBasePos = findPlayerBasePosition();
const playerSpawnX = playerBasePos.x * TILE_SIZE;
const playerSpawnY = (playerBasePos.y - 1) * TILE_SIZE;

// === Player Data ===
const player = {
  x: playerSpawnX,
  y: playerSpawnY,
  width: TILE_SIZE,
  height: TILE_SIZE,
  color: 'lime',
  moving: false,
  targetX: playerSpawnX,
  targetY: playerSpawnY,
  velocity: 0.5, // pixels per frame (even slower)
};

// === Enemy Tank Management ===
const ENEMY_TOTAL = 20;
const ENEMY_ONSCREEN = 5;
let enemiesSpawned = 0;
let activeEnemies = [];
const enemySpawnPoints = [
  { x: 1, y: 1 },
  { x: MAP_SIZE - 2, y: 1 },
  { x: Math.floor(MAP_SIZE / 2), y: 1 },
  { x: 3, y: 1 },
  { x: MAP_SIZE - 4, y: 1 }
];

// === Enemy Bullets ===
const ENEMY_BULLET_SPEED = 1.2;
const ENEMY_BULLET_SIZE = 8;
let enemyBullets = [];

function spawnEnemy() {
  if (enemiesSpawned >= ENEMY_TOTAL) return;
  // Find the first available spawn point that is not occupied by an alive enemy
  for (let i = 0; i < enemySpawnPoints.length; i++) {
    const sp = enemySpawnPoints[i];
    const occupied = activeEnemies.some(e => e.alive && e.x === sp.x * TILE_SIZE && e.y === sp.y * TILE_SIZE);
    if (map[sp.y][sp.x] === 0 && !occupied) {
      activeEnemies.push({
        x: sp.x * TILE_SIZE,
        y: sp.y * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE,
        alive: true,
        moving: false,
        targetX: sp.x * TILE_SIZE,
        targetY: sp.y * TILE_SIZE,
        velocity: 0.5, // match player speed
        dir: { dx: 0, dy: 1 },
        lastShot: 0,
        canShoot: true
      });
      enemiesSpawned++;
      break;
    }
  }
}

// On game start, fill each spawn point with one enemy (if possible)
function initialEnemySpawn() {
  for (let i = 0; i < enemySpawnPoints.length && enemiesSpawned < ENEMY_TOTAL && activeEnemies.length < ENEMY_ONSCREEN; i++) {
    spawnEnemy();
  }
}

function enemyShoot(enemy) {
  // Only one bullet per enemy at a time
  if (!enemy.canShoot) return;
  const px = enemy.x + enemy.width / 2 - ENEMY_BULLET_SIZE / 2;
  const py = enemy.y + enemy.height / 2 - ENEMY_BULLET_SIZE / 2;
  enemyBullets.push({
    x: px,
    y: py,
    dx: enemy.dir.dx,
    dy: enemy.dir.dy,
    owner: enemy,
    active: true
  });
  enemy.canShoot = false;
  enemy.lastShot = Date.now();
}

function updateEnemies() {
  for (const enemy of activeEnemies) {
    if (!enemy.alive) continue;
    if (!enemy.moving) {
      const newTileX = (enemy.targetX / TILE_SIZE) + enemy.dir.dx;
      const newTileY = (enemy.targetY / TILE_SIZE) + enemy.dir.dy;
      if (canEnemyMoveTo(newTileX, newTileY)) {
        enemy.targetX = newTileX * TILE_SIZE;
        enemy.targetY = newTileY * TILE_SIZE;
        enemy.moving = true;
      } else {
        const dirs = [
          { dx: 0, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }
        ];
        const possible = dirs.filter(d => {
          const tx = (enemy.targetX / TILE_SIZE) + d.dx;
          const ty = (enemy.targetY / TILE_SIZE) + d.dy;
          return canEnemyMoveTo(tx, ty);
        });
        if (possible.length > 0) {
          enemy.dir = possible[Math.floor(Math.random() * possible.length)];
        } else {
          enemy.dir = { dx: 0, dy: 0 };
        }
      }
    } else {
      const dx = enemy.targetX - enemy.x;
      const dy = enemy.targetY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < enemy.velocity) {
        enemy.x = enemy.targetX;
        enemy.y = enemy.targetY;
        enemy.moving = false;
      } else {
        enemy.x += enemy.velocity * Math.sign(dx);
        enemy.y += enemy.velocity * Math.sign(dy);
      }
    }
    // Shooting logic: shoot every 1.5-2.5 seconds if no bullet on screen for this enemy
    const now = Date.now();
    const hasBullet = enemyBullets.some(b => b.owner === enemy && b.active);
    if (!hasBullet && enemy.canShoot && now - enemy.lastShot > 1200 + Math.random() * 1000) {
      enemyShoot(enemy);
    }
    // Reset canShoot if bullet is gone
    if (!hasBullet) enemy.canShoot = true;
  }
}

function drawEnemies() {
  for (const enemy of activeEnemies) {
    if (!enemy.alive) continue;
    // Determine rotation angle based on enemy.dir
    let angle = 0;
    if (enemy.dir.dx === 0 && enemy.dir.dy === -1) angle = 0; // Up
    else if (enemy.dir.dx === 1 && enemy.dir.dy === 0) angle = Math.PI / 2; // Right
    else if (enemy.dir.dx === 0 && enemy.dir.dy === 1) angle = Math.PI; // Down
    else if (enemy.dir.dx === -1 && enemy.dir.dy === 0) angle = -Math.PI / 2; // Left
    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    ctx.rotate(angle);
    ctx.drawImage(
      spriteImages.enemy,
      -enemy.width / 2,
      -enemy.height / 2,
      enemy.width,
      enemy.height
    );
    ctx.restore();
  }
}

// === Bullet Data ===
const MAX_BULLETS = 3;
const BULLET_SPEED = 1.2; // slower bullet speed
const BULLET_SIZE = 8;
let bullets = [];
let lastDirection = { dx: 0, dy: -1 }; // Default: up

// === Base Health ===
let playerBaseHealth = 10;
let enemyBaseHealth = 10;

// === Timer ===
let startTime = null;
let elapsedTime = 0;
let gameEnded = false;

// === Canvas Setup ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// === Drawing Functions ===
function drawTile(x, y, type) {
  if (type === 1) {
    // Brick wall
    ctx.drawImage(spriteImages.brick, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    if (wallHealth[y][x] > 0 && wallHealth[y][x] < 3) {
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(wallHealth[y][x], x * TILE_SIZE + 10, y * TILE_SIZE + 22);
    }
  } else if (type === 2) {
    // Steel wall
    ctx.drawImage(spriteImages.steel, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  } else if (type === 3) {
    // Player base
    ctx.drawImage(spriteImages.playerBase, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // Draw health above base
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('HP: ' + playerBaseHealth, x * TILE_SIZE + 2, y * TILE_SIZE - 4);
  } else if (type === 4) {
    // Enemy base
    ctx.drawImage(spriteImages.enemyBase, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // Draw health above base
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('HP: ' + enemyBaseHealth, x * TILE_SIZE + 2, y * TILE_SIZE - 4);
  }
}

function drawPlayer() {
  // Determine rotation angle based on lastDirection
  let angle = 0;
  if (lastDirection.dx === 0 && lastDirection.dy === -1) angle = 0; // Up
  else if (lastDirection.dx === 1 && lastDirection.dy === 0) angle = Math.PI / 2; // Right
  else if (lastDirection.dx === 0 && lastDirection.dy === 1) angle = Math.PI; // Down
  else if (lastDirection.dx === -1 && lastDirection.dy === 0) angle = -Math.PI / 2; // Left

  ctx.save();
  // Move to center of player
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(angle);
  // Draw sprite centered
  ctx.drawImage(
    spriteImages.player,
    -player.width / 2,
    -player.height / 2,
    player.width,
    player.height
  );
  ctx.restore();
}

function drawMap() {
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      drawTile(x, y, map[y][x]);
    }
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// === Game Logic ===
function canMoveTo(x, y) {
  // x, y are in tile coordinates
  if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
  return map[y][x] === 0;
}

function movePlayer(dx, dy) {
  if (player.moving) return; // Only allow new move if not already moving
  const newTileX = (player.targetX / TILE_SIZE) + dx;
  const newTileY = (player.targetY / TILE_SIZE) + dy;
  if (canMoveTo(newTileX, newTileY)) {
    player.targetX = newTileX * TILE_SIZE;
    player.targetY = newTileY * TILE_SIZE;
    player.moving = true;
  }
}

function updatePlayer() {
  if (!player.moving) return;
  const dx = player.targetX - player.x;
  const dy = player.targetY - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < player.velocity) {
    player.x = player.targetX;
    player.y = player.targetY;
    player.moving = false;
  } else {
    player.x += player.velocity * Math.sign(dx);
    player.y += player.velocity * Math.sign(dy);
  }
}

function canEnemyMoveTo(x, y) {
  if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
  return map[y][x] === 0;
}

// === Bullet Functions ===
function shootBullet() {
  if (bullets.length >= MAX_BULLETS) return;
  // Bullet starts at center of player
  const px = player.x + player.width / 2 - BULLET_SIZE / 2;
  const py = player.y + player.height / 2 - BULLET_SIZE / 2;
  bullets.push({
    x: px,
    y: py,
    dx: lastDirection.dx,
    dy: lastDirection.dy,
    active: true
  });
}

function showGamePopup(message, time) {
  const popup = document.getElementById('gamePopup');
  const msg = document.getElementById('popupMessage');
  const t = document.getElementById('popupTime');
  if (popup && msg && t) {
    msg.textContent = message;
    t.textContent = 'Time: ' + time + 's';
    popup.style.display = 'flex';
  }
}

function hideGamePopup() {
  const popup = document.getElementById('gamePopup');
  if (popup) popup.style.display = 'none';
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx * BULLET_SPEED;
    b.y += b.dy * BULLET_SPEED;

    // Check off-screen
    if (
      b.x < 0 || b.x > TILE_SIZE * MAP_SIZE - BULLET_SIZE ||
      b.y < 0 || b.y > TILE_SIZE * MAP_SIZE - BULLET_SIZE
    ) {
      bullets.splice(i, 1);
      continue;
    }

    // Check collision with map
    const tileX = Math.floor((b.x + BULLET_SIZE / 2) / TILE_SIZE);
    const tileY = Math.floor((b.y + BULLET_SIZE / 2) / TILE_SIZE);
    if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
      if (map[tileY][tileX] === 1) {
        wallHealth[tileY][tileX]--;
        if (wallHealth[tileY][tileX] <= 0) {
          map[tileY][tileX] = 0;
        }
        bullets.splice(i, 1);
        continue;
      } else if (map[tileY][tileX] === 2) {
        bullets.splice(i, 1);
        continue;
      } else if (map[tileY][tileX] === 3) {
        // Player base hit
        playerBaseHealth--;
        bullets.splice(i, 1);
        if (playerBaseHealth <= 0 && !gameEnded) {
          map[tileY][tileX] = 0;
          gameEnded = true;
          elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
          setTimeout(() => showGamePopup('Game Over!', elapsedTime), 10);
        }
        continue;
      } else if (map[tileY][tileX] === 4) {
        // Enemy base hit
        enemyBaseHealth--;
        bullets.splice(i, 1);
        if (enemyBaseHealth <= 0 && !gameEnded) {
          map[tileY][tileX] = 0;
          gameEnded = true;
          elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
          setTimeout(() => showGamePopup('You Win!', elapsedTime), 10);
        }
        continue;
      }
    }
  }
}

function drawBullets() {
  ctx.fillStyle = 'yellow';
  for (const b of bullets) {
    ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE);
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function checkBulletEnemyCollision() {
  for (let j = 0; j < activeEnemies.length; j++) {
    const enemy = activeEnemies[j];
    if (!enemy.alive) continue;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const bulletRect = { x: b.x, y: b.y, width: BULLET_SIZE, height: BULLET_SIZE };
      if (rectsOverlap(bulletRect, enemy)) {
        enemy.alive = false;
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

function checkPlayerEnemyCollision() {
  for (const enemy of activeEnemies) {
    if (!enemy.alive) continue;
    if (rectsOverlap(player, enemy)) {
      console.log('Game Over!');
      // Optionally, you could stop the game loop or show a message
    }
  }
}

// === Input Handling ===
function handleKeyDown(e) {
  let moved = false;
  if (e.key === 'ArrowUp') { movePlayer(0, -1); lastDirection = { dx: 0, dy: -1 }; moved = true; }
  if (e.key === 'ArrowDown') { movePlayer(0, 1); lastDirection = { dx: 0, dy: 1 }; moved = true; }
  if (e.key === 'ArrowLeft') { movePlayer(-1, 0); lastDirection = { dx: -1, dy: 0 }; moved = true; }
  if (e.key === 'ArrowRight') { movePlayer(1, 0); lastDirection = { dx: 1, dy: 0 }; moved = true; }
  if (e.key === ' ' || e.code === 'Space') {
    shootBullet();
    e.preventDefault();
  }
}
document.addEventListener('keydown', handleKeyDown);

function formatTime(secs) {
  const min = Math.floor(secs / 60);
  const sec = Math.floor(secs % 60);
  const ms = Math.floor((secs - Math.floor(secs)) * 100);
  return (
    (min < 10 ? '0' : '') + min + ':' +
    (sec < 10 ? '0' : '') + sec + '.' +
    (ms < 10 ? '0' : '') + ms
  );
}

function updateTimerDisplay() {
  const timerDiv = document.getElementById('timerDisplay');
  if (timerDiv) timerDiv.textContent = formatTime(Number(elapsedTime));
}

// === Main Game Loop ===
let didInitialSpawn = false;
function gameLoop() {
  if (!startTime) startTime = Date.now();
  clearCanvas();
  drawMap();
  drawPlayer();
  drawEnemies();
  updatePlayer();
  updateEnemies();
  // Initial spawn: fill up to ENEMY_ONSCREEN spawn points
  if (!didInitialSpawn) {
    initialEnemySpawn();
    didInitialSpawn = true;
  } else if (activeEnemies.filter(e => e.alive).length < ENEMY_ONSCREEN && enemiesSpawned < ENEMY_TOTAL) {
    spawnEnemy(); // Only try to spawn one per frame
  }
  updateBullets();
  drawBullets();
  updateEnemyBullets();
  drawEnemyBullets();
  checkBulletEnemyCollision();
  checkPlayerEnemyCollision();
  if (!gameEnded) {
    elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  }
  updateTimerDisplay();
  if (!gameEnded) requestAnimationFrame(gameLoop);
}

// === Start Game ===
// Wait for all sprites to load before starting the game
let spritesLoaded = 0;
const totalSprites = 6; // player, brick, steel, enemy, playerBase, enemyBase
for (let key of ['player', 'brick', 'steel', 'enemy', 'playerBase', 'enemyBase']) {
  spriteImages[key].onload = () => {
    spritesLoaded++;
    if (spritesLoaded === totalSprites) {
      gameLoop();
    }
  };
}

// Hide popup at game start
hideGamePopup();

function updateEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.dx * ENEMY_BULLET_SPEED;
    b.y += b.dy * ENEMY_BULLET_SPEED;
    // Remove if off screen
    if (
      b.x < 0 || b.x > TILE_SIZE * MAP_SIZE - ENEMY_BULLET_SIZE ||
      b.y < 0 || b.y > TILE_SIZE * MAP_SIZE - ENEMY_BULLET_SIZE
    ) {
      enemyBullets.splice(i, 1);
      continue;
    }
    // Check collision with map
    const tileX = Math.floor((b.x + ENEMY_BULLET_SIZE / 2) / TILE_SIZE);
    const tileY = Math.floor((b.y + ENEMY_BULLET_SIZE / 2) / TILE_SIZE);
    if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
      if (map[tileY][tileX] === 1) {
        wallHealth[tileY][tileX]--;
        if (wallHealth[tileY][tileX] <= 0) {
          map[tileY][tileX] = 0;
        }
        enemyBullets.splice(i, 1);
        continue;
      } else if (map[tileY][tileX] === 2) {
        enemyBullets.splice(i, 1);
        continue;
      } else if (map[tileY][tileX] === 3) {
        // Player base hit
        playerBaseHealth--;
        enemyBullets.splice(i, 1);
        if (playerBaseHealth <= 0 && !gameEnded) {
          map[tileY][tileX] = 0;
          gameEnded = true;
          elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
          setTimeout(() => showGamePopup('Game Over!', elapsedTime), 10);
        }
        continue;
      }
    }
    // Check collision with player
    if (
      b.x < player.x + player.width &&
      b.x + ENEMY_BULLET_SIZE > player.x &&
      b.y < player.y + player.height &&
      b.y + ENEMY_BULLET_SIZE > player.y
    ) {
      enemyBullets.splice(i, 1);
      if (!gameEnded) {
        gameEnded = true;
        elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        setTimeout(() => showGamePopup('Game Over!', elapsedTime), 10);
      }
      continue;
    }
  }
}

function drawEnemyBullets() {
  ctx.fillStyle = 'red';
  for (const b of enemyBullets) {
    ctx.fillRect(b.x, b.y, ENEMY_BULLET_SIZE, ENEMY_BULLET_SIZE);
  }
} 