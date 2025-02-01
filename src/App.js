// import React, { useState } from 'react';
// import './App.css'; // Include your styles or CSS modules

// function App() {
//   const [isRecording, setIsRecording] = useState(false);

//   const handleToggleRecording = () => {
//     setIsRecording((prev) => !prev);
//     // Add logic to start/stop audio here
//   };

//   return (
//     <div className="app-container">
//       <header className="header">
//         {/* Optional App Title or Logo */}
//         <h1>AI Voice Assistant</h1>
//       </header>

//       <main className="main-content">
//         <button
//           className={`button ${isRecording ? 'button--stop' : 'button--start'}`}
//           onClick={handleToggleRecording}
//         >
//           {isRecording ? 'Stop Call' : 'Start Call'}
//         </button>

//         {/* Optional status text or wave animation */}
//         {isRecording && <p className="status-text">Recording in progress...</p>}
//       </main>

//       <footer className="footer">
//         {/* Optional Footer Content */}
//         <p>&copy; 2025 Your Company</p>
//       </footer>
//     </div>
//   );
// }

// export default App;
import React, { useState, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [responseText, setResponseText] = useState("");
  const [audioChunks, setAudioChunks] = useState([]);
  const mediaRecorderRef = useRef(null);

  // 🎤 Start/Stop Recording
  const toggleRecording = async () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    let localChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        localChunks.push(event.data);
        socket.emit("audio_stream", event.data); // Stream audio in chunks
      }
    };

    mediaRecorder.onstop = () => {
      setAudioChunks(localChunks);
    };

    mediaRecorder.start(500); // Send chunks every 500ms
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorderRef.current.stop();
  };

  // 📝 Receive Transcription from AI
  socket.on("gpt_response", (data) => {
    setResponseText(data);
  });

  // 🔊 Play AI Voice Response
  socket.on("audio_response", (data) => {
    const blob = new Blob([data], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  });

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Real-Time AI Assistant</h1>
      <button
        onClick={toggleRecording}
        style={{
          padding: "15px 30px",
          fontSize: "18px",
          background: isRecording ? "red" : "green",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
        }}
      >
        {isRecording ? "Stop Talking" : "Start Talking"}
      </button>

      {transcription && <h2>Transcription: {transcription}</h2>}
      {responseText && <h2>AI: {responseText}</h2>}
    </div>
  );
}

export default App;
