import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, IconButton, TextField, InputAdornment } from "@mui/material";
import { X, PaperPlaneRight } from "phosphor-react";
import { useSelector } from "react-redux";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:8000"); // Connect to meet backend

const Chat = ({ onClose, sx, userName }) => {
    const [identity, setIdentity] = useState(null);
    const [participants, setParticipants] = useState([]);
    const roomId = useSelector((state) => state.app.roomId); 
    console.log("Room ID from Redux:", roomId);     

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const chatContainerRef = useRef(null);

    useEffect(() => {
        const fetchLatestIdentity = async () => {
           
            try {
                const response = await axios.get('http://localhost:8000/api/participants');
                const participants = response.data.participants;

                if (participants.length > 0) {
                    const latestIdentity = participants[participants.length - 1].identity || "Anonymous";
                    setIdentity(latestIdentity);
                    console.log("Latest Identity:", latestIdentity); // Log the latest identity
                }
            } catch (error) {
                console.error("Error fetching participants:", error);
            }
        };

        fetchLatestIdentity();
    }, []);

    console.log("outside useeffect identity testing:", identity); // Log the latest identity    

    const convertTimestamp = (timestamp) => {
        if (!timestamp) return "Unknown time";
        if (timestamp._seconds) return new Date(timestamp._seconds * 1000).toLocaleString();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleString();
        return "Invalid Date";
    };
    
    useEffect(() => {
        if (!roomId) return;
    
        socket.emit("join-chat-room", { roomId });
    
        socket.on("new-message", (messageData) => {
            setMessages((prevMessages) => [...prevMessages, messageData]);
    
            // Auto-scroll to the bottom when a new message arrives
            setTimeout(() => {
                chatContainerRef.current?.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: "smooth",
                });
            }, 100);
        });
    
        return () => {
            socket.off("new-message"); // Cleanup event listener on unmount
            socket.emit("leave-room", { roomId }); // Cleanup room membership
        };
    }, [roomId]);
    


    useEffect(() => {
        const fetchMessages = async () => {
            if (!roomId || !identity) return; // If identity is still null, return early
            try {
                const response = await fetch(`http://localhost:8000/api/rooms/${roomId}`);
                const data = await response.json();
                if (data.success) {
                    console.log("Fetched Messages:", data); // Debugging log
    
                    const formattedMessages = data.messages.map(msg => ({
                        username: msg.sender, // Use 'sender' instead of 'username'
                        message: msg.text, // Use 'text' instead of 'message'
                        timestamp: msg.timestamp // Keep timestamp format
                    }));
    
                    setMessages(formattedMessages);
                    console.log("Formatted Messages:", formattedMessages); // Debugging log
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };
    
        fetchMessages();
    }, [roomId, identity]);
    
    
    const sendMessage = async () => {
        if (!identity || newMessage.trim() === "") {
            alert("Please wait until your identity is set and enter a message.");
            return;
        }
    
        console.log("Current Identity (Before Sending):", identity);
    
        const messageData = {
            username: identity,
            message: newMessage,
            timestamp: new Date().toISOString(), // Add timestamp in ISO format
            roomId: roomId, 
        };

        
        try {
            const response = await fetch(`http://localhost:8000/api/rooms/${roomId}`, {  
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(messageData),
            });
    
            if (!response.ok) {
                const errorData = await response.json(); // Read error response
                throw new Error(`Server responded with status: ${response.status} - ${errorData.message || "Unknown error"}`);
            }
    
            const result = await response.json();
            
        } catch (error) {
            console.error("Error sending message:", error);
        }
    
        setNewMessage("");
    
        document.getElementById("messageInput")?.focus();
    
        setTimeout(() => {
            chatContainerRef.current?.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }, 100);
    };
    
    
    


    return (
        <Box sx={{
            p: 0,
            width: 320,
            height: '98vh',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid black',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            backgroundColor: 'white',
            m: '8px 0',
            borderRadius: '20px',
        }}>
            <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', rowGap: 0, width: '100%', flexGrow: 1 }}>
                {/* Chat Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" align="left">Chat</Typography>
                    <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <X color="black" />
                    </IconButton>
                </Box>

               {/* Messages Container */}
<Box ref={chatContainerRef} sx={{ 
    flexGrow: 1, 
    overflowY: "auto", 
    p: 1, 
    maxHeight: "80vh",
    '& > *': { mb: 2 } // Add spacing between messages
}}>
  {messages.map((msg, index) => (
    <Box key={index} sx={{ 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        mb: 2 // Margin between messages
    }}>
      {/* Username and Time */}
      <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 0.5,
          px: 1
      }}>
        <Typography variant="caption" sx={{ 
            fontWeight: 'bold', 
            color: 'text.primary',
            mr: 1
        }}>
          {msg.username}
        </Typography>
        <Typography variant="caption" sx={{ 
            color: 'text.secondary',
            fontSize: '0.65rem'
        }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { 
            hour: "2-digit", 
            minute: "2-digit", 
            hour12: true 
          })}
        </Typography>
      </Box>

      {/* Message Bubble */}
      <Box sx={{
          bgcolor: 'grey.100',
          color: 'text.primary',
          px: 2,
          py: 1,
          borderRadius: 4,
          maxWidth: '80%',
          wordBreak: 'break-word',
          boxShadow: 1,
          ml: 1 // Keep messages left-aligned
      }}>
        <Typography variant="body2">{msg.message}</Typography>
      </Box>
    </Box>
  ))}
</Box>
                {/* Message Input */}
                <Box sx={{ px: 1, pb: 0, position:'relative',width: '100%' }}>
                    <TextField
                        id="messageInput"
                        fullWidth
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default Chat;
