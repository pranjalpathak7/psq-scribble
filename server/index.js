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

// server/index.js

const WORDS = [
  // --- ANIMALS & CREATURES ---
  "armadillo", "baboon", "badger", "bat", "beaver", "bison", "camel", "chameleon", "cheetah", 
  "chimpanzee", "cobra", "crab", "crocodile", "dinosaur", "dolphin", "dragon", "duck", "eagle", 
  "elephant", "flamingo", "frog", "giraffe", "gorilla", "hedgehog", "hippo", "hyena", "iguana", 
  "jellyfish", "kangaroo", "koala", "lemur", "lion", "llama", "lobster", "meerkat", "mosquito", 
  "narwhal", "octopus", "ostrich", "owl", "panda", "pangolin", "parrot", "peacock", "penguin", 
  "platypus", "porcupine", "pufferfish", "rabbit", "raccoon", "rhino", "scorpion", "seahorse", 
  "seal", "shark", "sheep", "sloth", "snail", "snake", "spider", "squid", "squirrel", "starfish", 
  "swan", "tiger", "toucan", "turtle", "unicorn", "vulture", "walrus", "whale", "wolf", "worm", 
  "yeti", "zebra",

  // --- CHARACTERS & PROFESSIONS ---
  "alien", "angel", "artist", "astronaut", "baby", "baker", "barber", "batman", "chef", "clown", 
  "cowboy", "cyclops", "detective", "devil", "diver", "doctor", "dracula", "elf", "farmer", 
  "firefighter", "genie", "ghost", "giant", "gladiator", "gnome", "goblin", "godzilla", "hacker", 
  "jester", "king", "knight", "leprechaun", "magician", "mermaid", "mime", "minion", "monster", 
  "mummy", "ninja", "nurse", "pilot", "pirate", "plumber", "police", "president", "princess", 
  "queen", "robot", "santa", "scarecrow", "scientist", "sheriff", "skeleton", "soldier", "spider-man", 
  "spy", "superhero", "surfer", "teacher", "thief", "vampire", "viking", "witch", "wizard", "zombie",

  // --- OBJECTS & ITEMS ---
  "accordion", "airplane", "alarm clock", "anchor", "anvil", "apple", "backpack", "balloon", "banana", 
  "bandage", "basket", "battery", "bed", "bicycle", "binoculars", "bomb", "book", "boomerang", 
  "bottle", "bow", "box", "brain", "bread", "bridge", "broom", "brush", "bucket", "bus", "cake", 
  "calculator", "camera", "candle", "cannon", "car", "carrot", "castle", "catapult", "chair", 
  "chainsaw", "cheese", "chess", "clock", "cloud", "compass", "computer", "cookie", "corn", "crayon", 
  "crown", "cup", "dagger", "diamond", "dice", "door", "donut", "drum", "dynamite", "egg", 
  "electricity", "envelope", "eraser", "eye", "fan", "feather", "fence", "fire", "flashlight", 
  "flower", "flute", "fork", "fossil", "fridge", "ghost", "glasses", "glove", "glue", "guitar", 
  "gun", "hammer", "hat", "headphones", "heart", "helicopter", "helmet", "hook", "house", "ice cream", 
  "igloo", "island", "jacket", "jar", "jewel", "key", "kite", "knife", "ladder", "lamp", "laptop", 
  "leaf", "lightbulb", "lighter", "lighthouse", "lightning", "lock", "magnet", "map", "mask", "match", 
  "microphone", "microscope", "mirror", "money", "moon", "mountain", "mousetrap", "mushroom", "nail", 
  "needle", "net", "newspaper", "nose", "notebook", "ocean", "oven", "paintbrush", "pants", "paper", 
  "parachute", "pencil", "phone", "piano", "pillow", "pipe", "pizza", "planet", "plant", "plate", 
  "plug", "pocket", "poison", "pot", "potato", "printer", "prism", "pumpkin", "purse", "pyramid", 
  "radar", "radio", "rainbow", "ring", "rocket", "roof", "rope", "rug", "ruler", "sandwich", 
  "satellite", "saxophone", "scale", "scissors", "screw", "shoe", "shovel", "skateboard", "skull", 
  "skyscraper", "sled", "soap", "sock", "sofa", "spoon", "stairs", "star", "statue", "stethoscope", 
  "stove", "submarine", "sun", "sunglasses", "sword", "syringe", "table", "tank", "tape", "target", 
  "taxi", "teacup", "telescope", "television", "tent", "thermometer", "thunder", "ticket", "tie", 
  "toast", "toilet", "tomato", "tooth", "toothbrush", "torch", "tornado", "towel", "toy", "tractor", 
  "train", "trash", "tree", "triangle", "trophy", "truck", "trumpet", "umbrella", "vacuum", "vase", 
  "violin", "volcano", "wall", "watch", "water", "waterfall", "watermelon", "web", "well", "wheel", 
  "whistle", "window", "wing", "witch", "wood", "worm", "x-ray", "yoyo", "zipper",

  // --- ACTIONS & CONCEPTS ---
  "archery", "balance", "camping", "clapping", "climbing", "cooking", "crying", "dancing", "digging", 
  "diving", "drawing", "dream", "drinking", "driving", "eating", "explosion", "falling", "fighting", 
  "fishing", "flying", "game over", "gardening", "hiding", "hiking", "hitting", "hunting", "jumping", 
  "kick", "kissing", "knitting", "laughing", "magic", "melting", "nightmare", "painting", "party", 
  "picnic", "playing", "praying", "punch", "racing", "reading", "running", "scream", "shaking", 
  "shopping", "singing", "skating", "skiing", "sleeping", "smiling", "smoking", "sneezing", "snoring", 
  "swimming", "swinging", "thinking", "throwing", "vomit", "walking", "waving", "whispering", "writing", "yoga",

  // ---KGP Lingo---
  "nalanda", "mainbuilding", "toat", "vikramshila", "cic", "dc", "mc", "aerospace", "mmm", "lbs", "azad", "ms", 
  "civil", "chemistry", "amit", "guru", "maneesh", "fuck", "moon", "nigga", "rajesh", "gymkhana", "pepsicut", "snvh",
  "fakka", "porn", "harsh", "psq", "pranjal",
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
        secretWord: (isDrawer || player.hasGuessed || room.gameState === 'finished') ? room.currentWord : null,
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

app.get("/", (req, res) => {
  res.send("PSQ-Scribble Server is Running Live!");
});

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
        // SAFETY CAP: Prevent memory explosion
        // If history is huge (e.g. > 3000 lines), stop saving but still broadcast
        if (room.drawHistory.length < 3000) {
            room.drawHistory.push(data.drawData); 
        }
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