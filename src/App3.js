import React, { useState, useRef   } from "react";
import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  let pc = useRef(new RTCPeerConnection());
  let localStream = useRef(null);
  console.log('process.env', process.env)
  async function fetchTavilyResults(query) {
    const TAVILY_API_KEY = "your-tavily-api-key"; // Replace with actual key
    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: process.env.REACT_APP_TAVILY_API_KEY, query, num_results: 3 })
    });

    const data = await response.json();
    console.log('data', data);
    return data.results.map(res => res.content).join("\n");
}
  async function init() {
    // Get OpenAI token
    const tokenResponse = await fetch("http://localhost:5000/session");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;
    
    // Set up remote audio playback
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    pc.current.ontrack = e => audioEl.srcObject = e.streams[0];
  
    // ✅ Store the microphone stream
    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.current.addTrack(localStream.current.getTracks()[0]);
  
    // Set up data channel for events
    const dc = pc.current.createDataChannel("oai-events");
    dc.addEventListener("message", async (e) => {
      const { item } = JSON.parse(e.data);
      if (item?.content?.[0]?.transcript) {
        let transcript = item.content[0].transcript;
        console.log("User Transcript:", transcript);
        setTranscript(prev => [...prev, transcript]);

        // 🔥 Step 1: Detect if User Needs Live Data
        if (/weather|news|latest/i.test(transcript)) {
            console.log("Fetching live web data for:", transcript);
            const searchResults = await fetchTavilyResults(transcript);
            const responseCreate = {
              type: "response.create",
              response: {
                input: [],
                instructions: `Get the info from this text, and say the weather: ${searchResults}`,
              },
            };
            dc.send(JSON.stringify(responseCreate));
        }
    }
    });
  
    // Start WebRTC session
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
  
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp"
      },
    });
  
    const sdp = await sdpResponse.text();
    const answer = { type: "answer", sdp };
    await pc.current.setRemoteDescription(answer);
  }
  
  
  const handleToggleRecording = () => {
    if (isRecording) {
      pc.current.getSenders().forEach(sender => pc.current.removeTrack(sender));
      pc.current.ontrack = null;
      pc.current.onicecandidate = null;
      pc.current.close();
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop()); 
        localStream.current = null;
      }
  
      pc.current = new RTCPeerConnection();
    } else {
        init();
    }
  
    setIsRecording(!isRecording);
  };

  return (
    <div className="app-container">
    <header className="header">
      <h1>AI Voice Assistant</h1>
    </header>

    <main className="main-content">
      <button
        className={`button ${isRecording ? 'button--stop' : 'button--start'}`}
        onClick={handleToggleRecording}
      >
        {isRecording ? 'Stop Call' : 'Start Call'}
      </button>

      {isRecording && <p className="status-text">Recording in progress...</p>}
      <div className="transcript">
        {transcript.map((item, index) => {
          if (item?.length > 0) {
            return <p key={index}>{item}</p>
          }
          return null;
        }
        )}
      </div>
    </main>
    <footer className="footer">
      <p>&copy; 2025 Bookai</p>
    </footer>
  </div>
  );
}

export default App;
