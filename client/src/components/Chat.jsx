import { useEffect, useState, useRef } from "react";
import { socket } from "../utils/socket";

const Chat = ({ room, username }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  
  // Ref to auto-scroll to bottom
  const messagesEndRef = useRef(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (currentMessage !== "") {
      const messageData = {
        room: room,
        author: username,
        message: currentMessage,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
      };

      await socket.emit("send_message", messageData);
      setCurrentMessage("");
    }
  };

  useEffect(() => {
    const handler = (data) => {
      setMessageList((list) => [...list, data]);
    };
    
    socket.on("receive_message", handler);

    // Cleanup listener to prevent double messages
    return () => socket.off("receive_message", handler);
  }, [socket]);

  // Auto-scroll when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList]);

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md bg-white rounded-lg shadow-lg border border-slate-300 overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-800 p-4 text-white font-bold text-center">
        Game Chat
      </div>

      {/* Message Body */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-100 space-y-2">
        {messageList.map((msgContent, index) => {
        const isMe = msgContent.author === username;
        const isSystem = msgContent.type === "system";
        const isSuccess = msgContent.type === "success";

        if (isSystem || isSuccess) {
            return (
            <div key={index} className={`text-center text-xs font-bold py-1 ${isSuccess ? "text-green-400" : "text-yellow-500"}`}>
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
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm break-words ${
                isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-700 text-white rounded-bl-none"
                }`}
            >
                {!isMe && <span className="text-[10px] font-bold block text-slate-400 mb-1">{msgContent.author}</span>}
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
          onChange={(event) => setCurrentMessage(event.target.value)}
          className="flex-1 p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
        />
        <button 
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold transition"
        >
            &#9658;
        </button>
      </form>
    </div>
  );
};

export default Chat;