import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Intro from "./pages/intro";
import Room from "./pages/room";
import Join from "./pages/join";
import "./App.css";
import { connect } from "react-redux";
import { connectwithSocketIOServer } from "./sections/utils/wss";

function App() {
  useEffect(()=>{
    connectwithSocketIOServer();
  },[])

  return (
    <>
    <Routes>
      <Route path="/" index element={<Intro />} />
      <Route path="/room" element={<Room />} />
      <Route path="/join-room" element={<Join />} />
    </Routes>
    </>
  );
}

export default App;
