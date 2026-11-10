const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let players = {};
let myId = null;
let impostorId = null;
let isMeeting = false;
let currentRoomCode = null;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let cameraX = 0;
let cameraY = 0;

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-cameraX, -cameraY);
  Art.buildMap(ctx, 800, 600);
  
  for (const id in players) {
    const p = players[id];
    if (p.alive) {
      Art.drawBean(ctx, p.x, p.y, p.color, p.hat, p.name);
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 2);
      Art.drawBean(ctx, 0, 0, p.color, p.hat, null);
      ctx.restore();
    }
  }
  ctx.restore();
  requestAnimationFrame(render);
}
render();

const joystick = document.getElementById('joystick');
let joystickActive = false;
let joystickStart = { x: 0, y: 0 };
let joystickDelta = { x: 0, y: 0 };

joystick.addEventListener('touchstart', (e) => {
  joystickActive = true;
  const touch = e.touches[0];
  joystickStart = { x: touch.clientX, y: touch.clientY };
});

joystick.addEventListener('touchmove', (e) => {
  if (!joystickActive) return;
  const touch = e.touches[0];
  joystickDelta.x = touch.clientX - joystickStart.x;
  joystickDelta.y = touch.clientY - joystickStart.y;
  
  const maxDist = 50;
  const dist = Math.sqrt(joystickDelta.x ** 2 + joystickDelta.y ** 2);
  if (dist > maxDist) {
    joystickDelta.x = (joystickDelta.x / dist) * maxDist;
    joystickDelta.y = (joystickDelta.y / dist) * maxDist;
  }
});

joystick.addEventListener('touchend', () => {
  joystickActive = false;
  joystickDelta = { x: 0, y: 0 };
});

setInterval(() => {
  if (isMeeting || !myId || !players[myId] || !players[myId].alive) return;
  
  const speed = 5;
  const dx = (joystickDelta.x / 50) * speed;
  const dy = (joystickDelta.y / 50) * speed;
  
  if (dx !== 0 || dy !== 0) {
    players[myId].x += dx;
    players[myId].y += dy;
    
    cameraX = players[myId].x - canvas.width / 2;
    cameraY = players[myId].y - canvas.height / 2;
    
    socket.emit('move', { code: currentRoomCode, x: players[myId].x, y: players[myId].y });
  }
}, 1000 / 60);

document.getElementById('useBtn').addEventListener('click', () => {
  if (!myId || !players[myId] || !players[myId].alive) return;
  const p = players[myId];
  const tasks = [{ x: 100, y: 100 }, { x: 400, y: 100 }, { x: 100, y: 350 }, { x: 400, y: 350 }];
  for (const task of tasks) {
    const dist = Math.sqrt((p.x - task.x) ** 2 + (p.y - task.y) ** 2);
    if (dist < 50) {
      socket.emit('taskComplete', currentRoomCode);
      break;
    }
  }
});

document.getElementById('reportBtn').addEventListener('click', () => {
  if (!myId || !players[myId] || !players[myId].alive) return;
  const p = players[myId];
  for (const id in players) {
    if (id !== myId && !players[id].alive) {
      const dist = Math.sqrt((p.x - players[id].x) ** 2 + (p.y - players[id].y) ** 2);
      if (dist < 50) {
        socket.emit('report', { code: currentRoomCode });
        break;
      }
    }
  }
});

document.getElementById('emergencyBtn').addEventListener('click', () => {
  if (!myId || !players[myId] || !players[myId].alive) return;
  socket.emit('emergency', currentRoomCode);
});

document.getElementById('killBtn').addEventListener('click', () => {
  if (!myId || !players[myId] || !players[myId].alive) return;
  const p = players[myId];
  for (const id in players) {
    if (id !== myId && players[id].alive) {
      const dist = Math.sqrt((p.x - players[id].x) ** 2 + (p.y - players[id].y) ** 2);
      if (dist < 50) {
        socket.emit('kill', { code: currentRoomCode, targetId: id });
        break;
      }
    }
  }
});
