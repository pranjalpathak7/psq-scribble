import { useEffect, useRef, useState } from 'react';
import { socket } from '../utils/socket';

const Canvas = ({ room }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const drawLine = ({ prevX, prevY, currentX, currentY, color, width }) => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
  
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  useEffect(() => {
    // 1. Listen for new lines
    socket.on('draw_line', (data) => {
      drawLine(data);
    });

    // 2. Listen for clear
    socket.on('clear_canvas', () => {
      const canvas = canvasRef.current;
      if(canvas) {
         const ctx = canvas.getContext('2d');
         ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // 3. Listen for History Load (The Sync Fix)
    socket.on('load_canvas_history', (history) => {
        history.forEach(line => {
            drawLine(line);
        });
    });

    // --- TRIGGER THE REQUEST ---
    // As soon as this component mounts, ask server for current drawing
    socket.emit("request_canvas_history", room);

    return () => {
      socket.off('draw_line');
      socket.off('clear_canvas');
      socket.off('load_canvas_history');
    };
  }, [room]);

  const prevPos = useRef(null);

  const startDrawing = (e) => {
    setIsDrawing(true);
    prevPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const currentPos = getPos(e);
    const drawData = {
      prevX: prevPos.current.x,
      prevY: prevPos.current.y,
      currentX: currentPos.x,
      currentY: currentPos.y,
      color,
      width: lineWidth,
    };

    drawLine(drawData);
    socket.emit('draw_line', { drawData, room });
    prevPos.current = currentPos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    socket.emit('clear_canvas', room);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // ... (imports and logic remain same)

  return (
    <div className="flex flex-col items-center gap-2 w-full h-full">
      {/* FIX: Width 100% and Height 100% to fill the parent container */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600} // Increased internal resolution slightly
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="bg-white rounded-lg shadow-lg cursor-crosshair touch-none w-full h-full object-contain bg-white"
      />
      
      {/* Floating Toolbar */}
      <div className="absolute bottom-4 flex gap-2 p-2 bg-slate-800/90 backdrop-blur rounded-xl shadow-xl border border-white/10 items-center overflow-x-auto max-w-[90%]">
         <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"/>
         
         <div className="w-px h-6 bg-slate-600 mx-1"></div>

         <div className="flex gap-1">
            {[2, 5, 10, 20].map(size => (
               <button 
                  key={size} 
                  onClick={()=>setLineWidth(size)} 
                  className={`w-6 h-6 rounded-full bg-slate-300 hover:bg-white flex items-center justify-center transition ${lineWidth === size ? 'ring-2 ring-blue-500 scale-110' : ''}`}
               >
                 <div className="bg-black rounded-full" style={{width: size/1.5, height: size/1.5}}/>
               </button>
            ))}
         </div>
         
         <div className="w-px h-6 bg-slate-600 mx-1"></div>

         <button onClick={clearCanvas} className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition" title="Clear Canvas">
            🗑️
         </button>
      </div>
    </div>
  );
};

export default Canvas;