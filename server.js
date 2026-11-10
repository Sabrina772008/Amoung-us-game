const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name, color, hat }) => {
    const code = generateRoomCode();
    rooms[code] = {
      code,
      host: socket.id,
      players: {},
      state: 'lobby',
      impostor: null,
      tasksCompleted: 0,
      totalTasks: 0,
      votes: {}
    };
    rooms[code].players[socket.id] = { id: socket.id, name, color, hat, alive: true, role: 'crewmate', x: 100, y: 100 };
    socket.join(code);
    socket.emit('roomJoined', { code, players: rooms[code].players, host: rooms[code].host });
    io.to(code).emit('playerList', rooms[code].players);
  });

  socket.on('joinRoom', ({ code, name, color, hat }) => {
    const room = rooms[code];
    if (!room) return socket.emit('errorMsg', 'Room not found');
    if (room.state !== 'lobby') return socket.emit('errorMsg', 'Game already in progress');
    if (Object.keys(room.players).length >= 5) return socket.emit('errorMsg', 'Room is full');
    
    const colorTaken = Object.values(room.players).some(p => p.color === color);
    if (colorTaken) return socket.emit('errorMsg', 'Color already taken');

    room.players[socket.id] = { id: socket.id, name, color, hat, alive: true, role: 'crewmate', x: 100, y: 100 };
    socket.join(code);
    socket.emit('roomJoined', { code, players: room.players, host: room.host });
    io.to(code).emit('playerList', room.players);
  });

  socket.on('startGame', (code) => {
    const room = rooms[code];
    if (room && room.host === socket.id && room.state === 'lobby') {
      room.state = 'playing';
      const playerIds = Object.keys(room.players);
      const impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];
      room.impostor = impostorId;
      room.players[impostorId].role = 'impostor';
      
      room.totalTasks = (playerIds.length - 1) * 5;
      room.tasksCompleted = 0;

      playerIds.forEach(id => {
        room.players[id].alive = true;
        room.players[id].x = 100;
        room.players[id].y = 100;
      });

      io.to(code).emit('gameStarted', { players: room.players, impostor: impostorId });
    }
  });

  socket.on('move', ({ code, x, y }) => {
    const room = rooms[code];
    if (room && room.state === 'playing' && room.players[socket.id] && room.players[socket.id].alive) {
      room.players[socket.id].x = x;
      room.players[socket.id].y = y;
      socket.to(code).emit('playerMoved', { id: socket.id, x, y });
    }
  });

  socket.on('kill', ({ code, targetId }) => {
    const room = rooms[code];
    if (room && room.state === 'playing' && room.impostor === socket.id) {
      if (room.players[targetId] && room.players[targetId].alive) {
        room.players[targetId].alive = false;
        io.to(code).emit('playerKilled', { targetId });
        checkWinCondition(code);
      }
    }
  });

  socket.on('report', ({ code }) => {
    const room = rooms[code];
    if (room && room.state === 'playing') {
      room.state = 'meeting';
      room.votes = {};
      io.to(code).emit('meetingStarted');
    }
  });

  socket.on('vote', ({ code, targetId }) => {
    const room = rooms[code];
    if (room && room.state === 'meeting') {
      room.votes[socket.id] = targetId;
      const alivePlayers = Object.values(room.players).filter(p => p.alive);
      if (Object.keys(room.votes).length >= alivePlayers.length) {
        resolveVotes(code);
      }
    }
  });

  function resolveVotes(code) {
    const room = rooms[code];
    if (!room) return;
    const voteCounts = {};
    Object.values(room.votes).forEach(target => {
      if (target !== 'skip') voteCounts[target] = (voteCounts[target] || 0) + 1;
    });
    let maxVotes = 0;
    let ejected = null;
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) { maxVotes = count; ejected = id; }
    }
    if (ejected && voteCounts[ejected] > Object.keys(room.players).filter(p => p.alive).length / 2) {
      room.players[ejected].alive = false;
      io.to(code).emit('playerEjected', { ejected });
    } else {
      io.to(code).emit('playerEjected', { ejected: null });
    }
    room.state = 'playing';
    room.votes = {};
    checkWinCondition(code);
  }

  function checkWinCondition(code) {
    const room = rooms[code];
    if (!room) return;
    const alivePlayers = Object.values(room.players).filter(p => p.alive);
    const aliveImpostors = alivePlayers.filter(p => p.role === 'impostor');
    const aliveCrewmates = alivePlayers.filter(p => p.role === 'crewmate');

    if (aliveImpostors.length === 0) {
      room.state = 'ended';
      io.to(code).emit('gameEnded', { winner: 'crewmates' });
    } else if (aliveImpostors.length >= aliveCrewmates.length) {
      room.state = 'ended';
      io.to(code).emit('gameEnded', { winner: 'impostors' });
    } else if (room.tasksCompleted >= room.totalTasks) {
      room.state = 'ended';
      io.to(code).emit('gameEnded', { winner: 'crewmates' });
    }
  }

  socket.on('taskComplete', (code) => {
    const room = rooms[code];
    if (room && room.state === 'playing') {
      room.tasksCompleted++;
      io.to(code).emit('taskUpdate', room.tasksCompleted);
      checkWinCondition(code);
    }
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(code).emit('playerList', room.players);
        if (room.host === socket.id) {
          const remaining = Object.keys(room.players);
          if (remaining.length > 0) {
            room.host = remaining[0];
            io.to(code).emit('hostChanged', room.host);
          } else {
            delete rooms[code];
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
