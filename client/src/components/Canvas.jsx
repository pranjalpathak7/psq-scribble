import { useEffect, useRef, useState } from 'react';
import { socket } from '../utils/socket';

const Canvas = ({ room }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);

  // Throttling state
  const lastEmit = useRef(0);
  const prevPos = useRef({ x: 0, y: 0 });

  // 1. COORDINATE FIX: Account for CSS scaling
  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Check if it's a touch event or mouse event
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate scale (Internal Resolution / Display Size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
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
    socket.on('draw_line', (data) => drawLine(data));
    
    socket.on('clear_canvas', () => {
      const canvas = canvasRef.current;
      if(canvas) {
         const ctx = canvas.getContext('2d');
         ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    socket.on('load_canvas_history', (history) => {
        history.forEach(line => drawLine(line));
    });

    socket.emit("request_canvas_history", room);

    return () => {
      socket.off('draw_line');
      socket.off('clear_canvas');
      socket.off('load_canvas_history');
    };
  }, [room]);

  const startDrawing = (e) => {
    // Prevent scrolling on mobile when touching canvas
    if(e.cancelable) e.preventDefault(); 
    
    setIsDrawing(true);
    prevPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if(e.cancelable) e.preventDefault(); // Stop scrolling

    const currentPos = getPos(e);
    const now = Date.now();

    // Throttling: 20ms delay OR significant movement
    if (now - lastEmit.current > 20 || 
        Math.abs(currentPos.x - prevPos.current.x) > 5 || 
        Math.abs(currentPos.y - prevPos.current.y) > 5) {
            
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
        lastEmit.current = now;
    }
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

  return (
    <div className="flex flex-col items-center gap-2 w-full h-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        // Mouse Events
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        // Touch Events (Mobile)
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="bg-white rounded-lg shadow-lg cursor-crosshair touch-none w-full h-full object-contain bg-white"
      />
      
      {/* Floating Toolbar */}
      <div className="absolute bottom-4 flex gap-2 p-2 bg-slate-800/90 backdrop-blur rounded-xl shadow-xl border border-white/10 items-center overflow-x-auto max-w-[90%] z-20">
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
         <button onClick={clearCanvas} className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition" title="Clear">🗑️</button>
      </div>
    </div>
  );
};

export default Canvas;