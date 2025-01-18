import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Intro from "./pages/intro";
import Room from "./pages/room";
import Join from "./pages/join";
import "./App.css";

function App() {
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
