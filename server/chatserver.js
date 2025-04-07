const express = require("express");
const cors = require("cors");
const db = require("./firebase");
const admin = require("firebase-admin"); // ADD THIS LINE


const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Test Route
app.get("/", (req, res) => {
  res.send("Chat Backend is Running...");
});

app.post('/api/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const { username, message } = req.body;

  try {
      const messageRef = db.collection('rooms').doc(roomId).collection('messages').doc();
      await messageRef.set({
          sender: username,
          text: message,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true, message: 'Message sent!' });
  } catch (error) {
      res.status(500).json({ error: 'Error sending message', details: error.message });
  }
});


app.get('/api/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;

  try {
      const messagesRef = db.collection('rooms').doc(roomId).collection('messages').orderBy('timestamp');
      const snapshot = await messagesRef.get();

      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            sender: data.sender,
            text: data.text,
            timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null, // Convert Firestore timestamp to ISO format
        };
    });
    

      res.json({ success: true, messages });
  } catch (error) {
      res.status(500).json({ error: 'Error fetching messages', details: error.message });
  }
});

  


  


// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
