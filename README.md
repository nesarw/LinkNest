# LinkNest - Video Conferencing Application

LinkNest is a modern video conferencing application built with React, Node.js, and WebRTC technology. It enables real-time video communication, chat functionality, and participant management in virtual rooms.

## Features

- Real-time video conferencing
- Text chat functionality
- Participant management
- Room creation and joining
- Modern and intuitive user interface
- Responsive design

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- [Git](https://git-scm.com/) for version control

## Installation

### 1. Clone the Repository

```bash
git clone <(https://github.com/nesarw/LinkNest)>
cd LinkNest
```

### 2. Server Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

The server will run on `http://localhost:5000` by default.

### 3. Client Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The client application will run on `http://localhost:5173` by default.

## Environment Variables

### Server
Create a `.env` file in the server directory with the following variables:
```env
PORT=5000
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

### Client
Create a `.env` file in the client directory with:
```env
VITE_API_URL=http://localhost:5000
```

## Tech Stack

### Frontend
- React.js
- Redux Toolkit for state management
- Material-UI for components
- Socket.io-client for real-time communication
- WebRTC for video streaming
- Vite for build tooling

### Backend
- Node.js
- Express.js
- Socket.io for WebSocket connections
- Twilio for TURN/STUN servers
- UUID for room ID generation

## Usage

1. Open the application in your web browser
2. Create a new room or join an existing one using a room code
3. Allow camera and microphone permissions when prompted
4. Share the room code with others to invite them to join
5. Use the in-room controls to manage your video, audio, and chat

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Author

Nesar

## Acknowledgments

- WebRTC Community
- React Community
- Socket.io Team 