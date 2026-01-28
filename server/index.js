import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    // allow all origins for simplicity so your friends can play instantly
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

const rooms = {};

const WORDS = [
  "apple", "banana", "house", "car", "tree", "computer", "sun", "moon", "star", 
  "robot", "cat", "dog", "fish", "guitar", "elephant", "flower", "mountain", 
  "pizza", "helicopter", "rainbow", "pencil", "spider", "clock", "ghost", "turtle",
  "book", "chair", "table", "shoe", "hat", "glasses", "key", "phone", "cloud"
];

const getRoom = (roomId) => rooms[roomId];

const broadcastRoomUpdate = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return;
  
  room.players.forEach(player => {
      if(!player.connected) return;

      const isDrawer = room.players[room.currentDrawerIndex]?.id === player.id;
      
      const publicData = {
        gameState: room.gameState,
        players: room.players,
        currentDrawer: room.players[room.currentDrawerIndex]?.id,
        round: room.round,
        maxRounds: room.maxRounds,
        timer: room.timer,
        wordLength: room.currentWord.length,
        // NEW: Send the masked word (e.g., "_ P P _ _") to everyone
        maskedWord: room.maskedWord.join(""),
        secretWord: (isDrawer || room.gameState === 'finished') ? room.currentWord : null,
        ownerId: room.ownerId
      };
      
      io.to(player.id).emit("room_update", publicData);
  });
};

const startTimer = (roomId, duration, callback) => {
  const room = getRoom(roomId);
  if (!room) return;
  
  if (room.timerInterval) clearInterval(room.timerInterval);
  room.timer = duration;
  
  room.timerInterval = setInterval(() => {
    room.timer -= 1;
    io.to(roomId).emit("timer_update", room.timer);

    // --- HINT LOGIC ---
    if (room.gameState === 'drawing') {
        // Reveal hints at specific timestamps (e.g., 40s, 25s, 10s)
        if (room.timer === 40 || room.timer === 25 || room.timer === 11) {
            
            // Find indices that are still underscores
            const unrevealedIndices = room.maskedWord
                .map((char, index) => char === '_' ? index : -1)
                .filter(index => index !== -1);
            
            // Only reveal if there are enough unrevealed letters (don't reveal the whole word)
            // Leave at least 2 letters hidden (or 1 if word is short)
            const minHidden = room.currentWord.length <= 4 ? 1 : 2;

            if (unrevealedIndices.length > minHidden) {
                const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
                room.maskedWord[randomIndex] = room.currentWord[randomIndex];
                
                // Broadcast the new hint to everyone
                broadcastRoomUpdate(roomId);
            }
        }
    }

    if (room.timer <= 0) {
      clearInterval(room.timerInterval);
      callback();
    }
  }, 1000);
};

const nextTurn = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return;

  room.drawHistory = [];
  io.to(roomId).emit("clear_canvas");
  
  let attempts = 0;
  do {
      room.currentDrawerIndex++;
      if (room.currentDrawerIndex >= room.players.length) {
        room.currentDrawerIndex = 0;
        room.round++;
      }
      attempts++;
  } while (!room.players[room.currentDrawerIndex]?.connected && attempts < room.players.length);

  if (room.round > room.maxRounds || attempts >= room.players.length) {
    room.gameState = "finished";
    broadcastRoomUpdate(roomId);
    return;
  }

  room.gameState = "selecting_word";
  room.currentWord = "";
  room.maskedWord = [];
  
  const options = [];
  const usedIndices = new Set();
  
  while(options.length < 5 && options.length < WORDS.length) {
      const idx = Math.floor(Math.random() * WORDS.length);
      if(!usedIndices.has(idx)) {
          usedIndices.add(idx);
          options.push(WORDS[idx]);
      }
  }
  
  const drawerId = room.players[room.currentDrawerIndex].id;
  
  broadcastRoomUpdate(roomId);
  io.to(drawerId).emit("choose_word", options);
  
  startTimer(roomId, 15, () => {
    startGameRound(roomId, options[0]);
  });
};

const startGameRound = (roomId, word) => {
  const room = getRoom(roomId);
  if (!room) return;

  room.gameState = "drawing";
  room.currentWord = word.toLowerCase();
  
  // Initialize Masked Word (e.g., "apple" -> ['_', '_', '_', '_', '_'])
  // Handle spaces if you add multi-word options later
  room.maskedWord = word.split('').map(c => c === ' ' ? ' ' : '_');
  
  room.drawHistory = []; 
  room.players.forEach(p => p.hasGuessed = false);

  broadcastRoomUpdate(roomId);
  io.to(roomId).emit("round_start", { length: word.length });

  startTimer(roomId, 60, () => {
    io.to(roomId).emit("receive_message", {
      author: "System",
      message: `Time's up! The word was: ${room.currentWord}`,
      type: "system"
    });
    nextTurn(roomId);
  });
};


io.on("connection", (socket) => {
  
  socket.on("join_room", ({ room: roomId, username }, callback) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        gameState: 'lobby',
        players: [],
        drawHistory: [], 
        currentDrawerIndex: -1,
        currentWord: "",
        maskedWord: [], // NEW STATE
        round: 1,
        maxRounds: 3,
        timer: 0,
        timerInterval: null,
        ownerId: socket.id
      };
    }

    const room = rooms[roomId];
    const existingPlayer = room.players.find(p => p.username === username);

    if (existingPlayer) {
        if (existingPlayer.connected) {
            return callback({ error: "Username taken!" });
        } else {
            existingPlayer.connected = true;
            existingPlayer.id = socket.id;
            socket.join(roomId);
            callback({ success: true });
            broadcastRoomUpdate(roomId);
            io.to(roomId).emit("receive_message", { author: "System", message: `${username} returned!`, type: "system" });
            return;
        }
    }

    const newPlayer = { id: socket.id, username, score: 0, hasGuessed: false, connected: true };
    room.players.push(newPlayer);
    socket.join(roomId);
    
    if (callback) callback({ success: true });

    broadcastRoomUpdate(roomId);
    io.to(roomId).emit("receive_message", { author: "System", message: `${username} joined!`, type: "system" });
  });

  socket.on("request_canvas_history", (roomId) => {
     const room = getRoom(roomId);
     if (room && room.drawHistory.length > 0) {
        socket.emit("load_canvas_history", room.drawHistory);
     }
  });

  socket.on("start_game", ({ room: roomId, rounds }) => {
    const room = getRoom(roomId);
    if (room && room.players.filter(p=>p.connected).length >= 2) { 
       room.maxRounds = parseInt(rounds) || 3;
       room.currentDrawerIndex = -1; 
       room.round = 1;
       room.players.forEach(p => p.score = 0);
       nextTurn(roomId);
    }
  });

  socket.on("word_selected", ({ room: roomId, word }) => {
    startGameRound(roomId, word);
  });

  socket.on("send_message", (data) => {
    const room = getRoom(data.room);
    if (!room) return;

    if (room.gameState === "drawing") {
        const drawerIndex = room.currentDrawerIndex;
        const isDrawer = socket.id === room.players[drawerIndex].id;
        
        if (isDrawer) return; 

        if (data.message.toLowerCase().trim() === room.currentWord) {
            const player = room.players.find(p => p.id === socket.id);
            if (player && !player.hasGuessed) {
                player.hasGuessed = true;
                const points = Math.max(10, Math.ceil(room.timer * 1.5)); 
                player.score += points;

                const drawer = room.players[drawerIndex];
                if (drawer) drawer.score += Math.ceil(points / 4); 
                
                io.to(data.room).emit("receive_message", { author: "System", message: `${data.author} guessed it!`, type: "success" });
                broadcastRoomUpdate(data.room);

                const activePlayers = room.players.filter(p => p.id !== room.players[drawerIndex].id && p.connected);
                if (activePlayers.every(p => p.hasGuessed)) {
                    clearInterval(room.timerInterval);
                    io.to(data.room).emit("receive_message", { author: "System", message: `Everyone guessed it! Word: ${room.currentWord}`, type: "system" });
                    nextTurn(data.room);
                }
                return;
            }
        }
    }
    io.to(data.room).emit("receive_message", data);
  });

  socket.on("draw_line", (data) => {
    const room = getRoom(data.room);
    if (room) {
        room.drawHistory.push(data.drawData); 
        socket.to(data.room).emit("draw_line", data.drawData);
    }
  });

  socket.on("clear_canvas", (roomId) => {
    const room = getRoom(roomId);
    if(room) room.drawHistory = [];
    socket.to(roomId).emit("clear_canvas");
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const player = room.players.find(p => p.id === socket.id);
        
        if (player) {
            player.connected = false;
            const allDisconnected = room.players.every(p => !p.connected);
            if (allDisconnected) {
                delete rooms[roomId];
            } else {
                if (room.ownerId === socket.id) {
                    const nextOwner = room.players.find(p => p.connected);
                    if (nextOwner) room.ownerId = nextOwner.id;
                }
                broadcastRoomUpdate(roomId);
            }
            break;
        }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});