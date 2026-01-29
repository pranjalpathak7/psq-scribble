import { useEffect, useState, useRef } from "react";
import { socket } from "../utils/socket";

const Chat = ({ room, username }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  
  // Ref to auto-scroll to bottom
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    // FIX: Scroll only this specific container, not the whole window
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const sendMessage = async (e) => {
    e.preventDefault(); // FIX: Prevents page reload/jump
    if (currentMessage !== "") {
      const messageData = {
        room: room,
        author: username,
        message: currentMessage,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
        type: "user" 
      };

      await socket.emit("send_message", messageData);
      setCurrentMessage("");
      // Focus stays on input naturally without forcing a scroll
    }
  };

  useEffect(() => {
    const handler = (data) => {
      setMessageList((list) => [...list, data]);
      // Small timeout ensures DOM is updated before scrolling
      setTimeout(scrollToBottom, 100);
    };
    
    socket.on("receive_message", handler);

    // Cleanup listener to prevent double messages
    return () => socket.off("receive_message", handler);
  }, [socket]);

  // FIX: Prevent mobile keyboard from pushing the whole page up aggressively
  const handleFocus = (e) => {
    // We explicitly avoid calling scrollIntoView on the window here
    // The flex layout should handle the resize when keyboard opens
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md bg-white rounded-lg shadow-lg border border-slate-300 overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-800 p-4 text-white font-bold text-center">
        Game Chat
      </div>

      {/* Message Body */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-100 space-y-2 scrollbar-thin scrollbar-thumb-slate-400">
        {messageList.map((msgContent, index) => {
        const isMe = msgContent.author === username;
        const isSystem = msgContent.type === "system";
        const isSuccess = msgContent.type === "success";

        if (isSystem || isSuccess) {
            return (
            <div key={index} className={`text-center text-xs font-bold py-1 ${isSuccess ? "text-green-600 bg-green-100 rounded border border-green-200" : "text-yellow-600 bg-yellow-50 rounded border border-yellow-200"}`}>
                {msgContent.message}
            </div>
            );
        }

        return (
            <div
            key={index}
            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
            <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm break-words shadow-sm ${
                isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                }`}
            >
                {!isMe && <span className="text-[10px] font-bold block text-slate-500 mb-1">{msgContent.author}</span>}
                {msgContent.message}
            </div>
            </div>
        );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={currentMessage}
          placeholder="Type your guess here..."
          onFocus={handleFocus}
          onChange={(event) => setCurrentMessage(event.target.value)}
          className="flex-1 p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
        />
        <button 
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold transition flex items-center justify-center shadow"
        >
            &#9658;
        </button>
      </form>
    </div>
  );
};

export default Chat;