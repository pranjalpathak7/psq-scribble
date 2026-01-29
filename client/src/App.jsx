import { useState, useEffect } from 'react';
import { socket } from './utils/socket';
import Canvas from './components/Canvas';
import Chat from './components/Chat';

function App() {
  // --- CONNECTION STATE ---
  const [room, setRoom] = useState('');
  const [username, setUsername] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // --- GAME STATE ---
  const [gameState, setGameState] = useState('lobby'); 
  const [players, setPlayers] = useState([]);
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [timer, setTimer] = useState(0);
  const [wordChoices, setWordChoices] = useState([]);
  const [wordLength, setWordLength] = useState(0);
  const [secretWord, setSecretWord] = useState(null);
  // NEW STATE FOR HINT
  const [maskedWord, setMaskedWord] = useState("");
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(3);
  const [ownerId, setOwnerId] = useState(null); 
  
  // Lobby Settings
  const [selectedRounds, setSelectedRounds] = useState(3);

  // --- CUSTOM WORD STATE ---
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customWord, setCustomWord] = useState("");

  useEffect(() => {
    // 1. Listen for Room Updates
    socket.on("room_update", (data) => {
      setGameState(data.gameState);
      setPlayers(data.players);
      setCurrentDrawer(data.currentDrawer);
      setTimer(data.timer);
      setRound(data.round);
      setMaxRounds(data.maxRounds);
      setOwnerId(data.ownerId); 
      
      if(data.wordLength) setWordLength(data.wordLength);
      
      // Update Masked Word (Hints)
      if(data.maskedWord) setMaskedWord(data.maskedWord);

      if(data.secretWord) {
        setSecretWord(data.secretWord);
      } else {
        setSecretWord(null);
      }
    });

    // 2. Timer
    socket.on("timer_update", (time) => setTimer(time));

    // 3. Word Choices
    socket.on("choose_word", (choices) => {
      setWordChoices(choices);
      setShowCustomInput(false); 
      setCustomWord("");
    });

    // 4. Round Start
    socket.on("round_start", (data) => {
       setWordLength(data.length);
       setWordChoices([]); 
       setShowCustomInput(false);
       // Reset masked word initially
       setMaskedWord(""); 
    });

    return () => {
      socket.off("room_update");
      socket.off("timer_update");
      socket.off("choose_word");
      socket.off("round_start");
    };
  }, []);

  const joinRoom = () => {
    if (room && username) {
      socket.emit('join_room', { room, username }, (response) => {
         if (response.success) {
            setIsInRoom(true);
            setErrorMsg("");
         } else {
            setErrorMsg(response.error); 
         }
      });
    }
  };

  const startGame = () => {
    socket.emit('start_game', { room, rounds: selectedRounds });
  };

  const selectWord = (word) => {
    if(!word || word.trim() === "") return;
    socket.emit('word_selected', { room, word: word.trim() });
    setWordChoices([]);
  };

  const isDrawer = socket.id === currentDrawer;
  const isOwner = socket.id === ownerId;

  const drawerName = players.find(p => p.id === currentDrawer)?.username || "Someone";
  const amICorrect = players.find(p => p.id === socket.id)?.hasGuessed;

  return (
    <div className="lg:h-screen h-auto bg-slate-900 text-white flex flex-col font-sans overflow-hidden">
      
      {/* 1. Header Bar */}
      <div className="flex-none p-4 flex justify-between items-center bg-slate-800 shadow-md z-20 min-h-[80px] h-auto">
         <div className="flex items-center gap-4">
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 hidden md:block">
              PSQ-Scribble
            </h1>
            
            {isInRoom && (
              <div className="flex items-center gap-4">
                 <div className="text-3xl font-mono font-bold text-yellow-400 w-12 text-center">
                    {timer}s
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ROOM</span>
                    <span className="text-lg font-bold text-white leading-none">{room}</span>
                 </div>
              </div>
            )}
         </div>

         {/* Center: Word Display */}
         {isInRoom && (
             <div className="flex-1 flex justify-center px-2">
                <div className="text-xl md:text-3xl font-bold uppercase text-center break-words leading-tight flex flex-col md:flex-row items-center gap-2">
                    {gameState === 'drawing' ? (
                       // SHOW WORD IF: Drawer OR Guessed Correctly
                       (isDrawer || amICorrect) ? (
                          <span className="text-green-400 drop-shadow-md tracking-wider">
                             {wordChoices.length > 0 ? "CHOOSING..." : secretWord}
                          </span>
                       ) : (
                          // SHOW DASHES IF: Haven't guessed yet
                          <div className="flex flex-wrap justify-center gap-2">
                              <span className="text-slate-200 tracking-[0.2em] md:tracking-[0.5em]">
                                 {maskedWord ? maskedWord.split('').join(' ') : Array(wordLength).fill('_').join(' ')}
                              </span>
                              {wordLength > 0 && (
                                <span className="text-slate-500 text-sm md:text-xl font-mono self-center">
                                    ({wordLength})
                                </span>
                              )}
                          </div>
                       )
                    ) : (
                       <span className="tracking-widest">
                          {gameState === 'lobby' ? "WAITING..." : "SELECTING..."}
                       </span>
                    )}
                </div>
             </div>
         )}

         {/* Right: Round Info */}
         {isInRoom && (
             <div className="flex items-center gap-2">
                {gameState === 'lobby' ? (
                   players.length > 1 ? (
                      <div className="flex items-center gap-2">
                        {isOwner && (
                           <select 
                             className="bg-slate-700 text-white text-xs p-1 rounded border border-slate-600 cursor-pointer hover:bg-slate-600 hidden sm:block"
                             value={selectedRounds}
                             onChange={(e) => setSelectedRounds(e.target.value)}
                           >
                             <option value="2">2 Rnds</option>
                             <option value="3">3 Rnds</option>
                             <option value="4">4 Rnds</option>
                             <option value="5">5 Rnds</option>
                           </select>
                        )}
                        {isOwner ? (
                           <button onClick={startGame} className="bg-green-500 text-white text-xs md:text-sm font-bold px-3 py-2 rounded hover:bg-green-600 animate-pulse">
                             START
                           </button>
                        ) : (
                           <span className="text-xs text-slate-400 font-bold">Host will start</span>
                        )}
                      </div>
                   ) : (
                      <span className="text-xs text-slate-400 font-bold text-center block">WAITING...</span>
                   )
                ) : (
                   <div className="bg-slate-700 px-3 py-1 rounded text-xs font-bold text-slate-300">
                      Rnd {gameState === 'finished' ? 'End' : `${round}/${maxRounds}`}
                   </div>
                )}
             </div>
         )}
      </div>

      {!isInRoom ? (
        // --- LOBBY LOGIN ---
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col gap-6 w-96 border border-slate-700">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-white">Join a Game</h2>
              <p className="text-slate-400 text-sm">Enter your details to start playing</p>
            </div>

            {errorMsg && (
               <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded text-sm text-center font-bold">
                  {errorMsg}
               </div>
            )}
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
                <input
                  className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-white placeholder-slate-500"
                  type="text"
                  placeholder="Ex: Pranjal"
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Room ID</label>
                <input
                  className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-white placeholder-slate-500"
                  type="text"
                  placeholder="Ex: 1234"
                  onChange={(event) => setRoom(event.target.value)}
                  onKeyPress={(event) => { event.key === 'Enter' && joinRoom() }}
                />
              </div>
            </div>

            <button 
              onClick={joinRoom}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-lg transform transition active:scale-95 shadow-lg mt-2"
            >
              Enter Game
            </button>
          </div>
        </div>
      ) : (
        // --- GAME INTERFACE ---
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-slate-900 w-full">
           
           {/* Left Column: Scoreboard */}
           <div className="lg:w-64 w-full lg:h-full h-32 flex-none bg-slate-800 border-r border-slate-700 flex flex-col z-10 order-3 lg:order-1 overflow-hidden shadow-lg">
              <div className="p-3 font-bold text-xs text-slate-400 uppercase border-b border-slate-700 bg-slate-800 sticky top-0">
                Players ({players.filter(p => p.connected).length})
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {players.sort((a,b) => b.score - a.score).map((p, i) => (
                    <div key={i} className={`flex justify-between items-center p-2 rounded text-sm transition-all ${currentDrawer === p.id ? "bg-slate-700 ring-1 ring-yellow-500" : "hover:bg-slate-700/50"} ${p.hasGuessed ? "bg-green-900/30" : ""} ${!p.connected ? "opacity-40 grayscale" : ""}`}>
                       <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-slate-500 font-mono text-xs">#{i+1}</span>
                          <span className={`truncate font-bold max-w-[100px] ${p.id === socket.id ? "text-blue-400" : "text-white"}`}>
                            {p.username}
                          </span>
                          {p.id === ownerId && <span title="Room Host">👑</span>}
                          {currentDrawer === p.id && <span title="Drawing now">✏️</span>}
                       </div>
                       <span className="font-bold">{p.score}</span>
                    </div>
                 ))}
              </div>
           </div>

           {/* Center Column: Canvas */}
           <div className="flex-1 relative bg-slate-900 flex flex-col items-center justify-center p-2 order-1 lg:order-2 overflow-hidden w-full">
              
              {/* WORD SELECTION OVERLAY */}
              {gameState === 'selecting_word' && isDrawer && wordChoices.length > 0 && (
                 <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-4">
                    <h2 className="text-xl md:text-3xl font-bold mb-6 text-white">Choose a Word!</h2>
                    
                    {!showCustomInput ? (
                        <>
                            <div className="flex flex-wrap justify-center gap-4 mb-4">
                            {wordChoices.map((word) => (
                                <button key={word} onClick={() => selectWord(word)} className="px-6 py-3 bg-white text-slate-900 font-bold text-lg rounded-lg hover:scale-105 transition uppercase shadow-lg">
                                    {word}
                                </button>
                            ))}
                            </div>
                            <button 
                                onClick={() => setShowCustomInput(true)} 
                                className="px-6 py-2 bg-transparent border-2 border-slate-500 text-slate-300 font-bold rounded-lg hover:bg-slate-800 hover:text-white transition"
                            >
                                Custom Word
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 w-full max-w-sm">
                            <input 
                                autoFocus
                                type="text" 
                                value={customWord}
                                onChange={(e) => setCustomWord(e.target.value)}
                                placeholder="Type your word..."
                                className="p-4 rounded-lg bg-slate-700 text-white border border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && selectWord(customWord)}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setShowCustomInput(false)} className="flex-1 py-3 bg-slate-600 rounded-lg font-bold hover:bg-slate-500">Back</button>
                                <button onClick={() => selectWord(customWord)} className="flex-1 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-500">Go</button>
                            </div>
                        </div>
                    )}
                 </div>
              )}

              {/* GAME OVER OVERLAY */}
              {gameState === 'finished' && (
                 <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center text-center p-4">
                    <h2 className="text-4xl font-bold text-yellow-400 mb-6">GAME OVER</h2>
                    <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm mb-6 max-h-64 overflow-y-auto border border-slate-700">
                      {players.filter(p=>p.connected).sort((a,b) => b.score - a.score).map((p, index) => (
                          <div key={index} className="flex justify-between items-center bg-slate-700 p-2 mb-2 rounded">
                             <div className="flex items-center gap-2 font-bold">
                                <span>#{index+1}</span>
                                <span>{p.username}</span>
                                {p.id === ownerId && <span>👑</span>}
                             </div>
                             <div className="text-green-400 font-bold">{p.score}</div>
                          </div>
                       ))}
                    </div>
                    <button onClick={()=>window.location.reload()} className="bg-blue-600 px-8 py-3 rounded-lg font-bold text-white shadow-lg">Play Again</button>
                 </div>
              )}

              {/* Canvas Container */}
              <div className={`relative w-full h-full flex items-center justify-center ${isDrawer ? "" : "pointer-events-none"}`}>
                  <div className="w-full max-w-[800px] aspect-[4/3] max-h-full">
                     <Canvas room={room} />
                  </div>
              </div>

              {/* DRAWING STATUS */}
              {!isDrawer && gameState === 'drawing' && (
                <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none z-10">
                   <div className="bg-black/60 text-white px-4 py-1 rounded-full text-sm font-bold backdrop-blur-md border border-white/10 shadow-lg animate-pulse">
                      {currentDrawer ? `${drawerName} is drawing...` : "Waiting for drawer..."}
                   </div>
                </div>
              )}
           </div>

           {/* Right Column: Chat */}
           <div className="lg:w-80 w-full lg:h-full h-48 flex-none bg-slate-800 border-l border-slate-700 flex flex-col order-2 lg:order-3 z-10 shadow-lg">
              <Chat room={room} username={username} />
           </div>

        </div>
      )}
    </div>
  );
}

export default App;