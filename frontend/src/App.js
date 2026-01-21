import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import VideoDisplay from './components/VideoDisplay';
import ControlPanel from './components/ControlPanel';
import ResultsPanel from './components/ResultsPanel';
import AlertsPanel from './components/AlertsPanel';
import BlacklistPanel from './components/BlacklistPanel';
import SearchPanel from './components/SearchPanel';

const API_URL = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [results, setResults] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [videoSession, setVideoSession] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [minConfidence, setMinConfidence] = useState(0);
  const [outputFile, setOutputFile] = useState(null);
  const eventSourceRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ['polling', 'websocket'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('get_blacklist');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('blacklist', (data) => {
      setBlacklist(data.blacklist);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Filter results by confidence
  useEffect(() => {
    const filtered = allResults.filter(r => r.license_plate_confidence >= minConfidence);
    setResults(filtered);
  }, [allResults, minConfidence]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file) => {
    setProcessing(true);
    setAllResults([]);
    setOutputFile(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const response = await fetch(`${API_URL}/api/process-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: e.target.result }),
        });
        
        const data = await response.json();
        
        if (data.error) {
          alert('Error: ' + data.error);
        } else {
          setCurrentFrame(data.image);
          setAllResults(data.results || []);
          
          const blacklistedAlerts = (data.results || []).filter(r => r.is_blacklisted);
          if (blacklistedAlerts.length > 0) {
            setAlerts(prev => [...blacklistedAlerts, ...prev].slice(0, 100));
          }
        }
      } catch (error) {
        alert('Error processing image: ' + error.message);
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle video upload
  const handleVideoUpload = useCallback(async (file) => {
    setProcessing(true);
    setAllResults([]);
    setProgress({ current: 0, total: 0 });
    setOutputFile(null);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const uploadResponse = await fetch(`${API_URL}/api/upload-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video: e.target.result }),
        });
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.error) {
          alert('Error: ' + uploadData.error);
          setProcessing(false);
          return;
        }
        
        setVideoSession(uploadData.session_id);
        setProgress({ current: 0, total: uploadData.total_frames });
        
        const eventSource = new EventSource(`${API_URL}/api/stream-video/${uploadData.session_id}`);
        eventSourceRef.current = eventSource;
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'frame') {
              setCurrentFrame(data.frame);
              setProgress(prev => ({ ...prev, current: data.frame_number + 1 }));
              
              if (data.results && data.results.length > 0) {
                setAllResults(prev => [...prev.slice(-50), ...data.results]);
                
                const blacklistedAlerts = data.results.filter(r => r.is_blacklisted);
                if (blacklistedAlerts.length > 0) {
                  setAlerts(prev => [...blacklistedAlerts, ...prev].slice(0, 100));
                }
              }
            } else if (data.type === 'complete') {
              eventSource.close();
              eventSourceRef.current = null;
              setProcessing(false);
              setVideoSession(null);
              
              // Set output file for download
              if (data.output_file) {
                setOutputFile(data.output_file);
              }
            }
          } catch (err) {
            console.error('SSE error:', err);
          }
        };
        
        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;
          setProcessing(false);
          setVideoSession(null);
        };
        
      } catch (error) {
        alert('Error uploading video: ' + error.message);
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Stop video processing
  const handleStopVideo = useCallback(async () => {
    if (videoSession) {
      try {
        await fetch(`${API_URL}/api/stop-video/${videoSession}`, { method: 'POST' });
      } catch (err) {
        console.error('Error stopping video:', err);
      }
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setProcessing(false);
    setVideoSession(null);
    
    // Note: Output file will be set by the 'complete' event from SSE
  }, [videoSession]);

  // Download processed video
  const handleDownloadVideo = useCallback(() => {
    if (outputFile) {
      window.open(`${API_URL}/api/download-video/${outputFile}`, '_blank');
    }
  }, [outputFile]);

  // Clear output file (dismiss save option)
  const handleClearOutput = useCallback(async () => {
    if (outputFile) {
      try {
        await fetch(`${API_URL}/api/delete-video/${outputFile}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Error deleting video:', err);
      }
    }
    setOutputFile(null);
  }, [outputFile]);

  // Blacklist handlers
  const handleAddToBlacklist = useCallback((plate) => {
    if (socket && connected) {
      socket.emit('add_to_blacklist', { plate });
    }
  }, [socket, connected]);

  const handleRemoveFromBlacklist = useCallback((plate) => {
    if (socket && connected) {
      socket.emit('remove_from_blacklist', { plate });
    }
  }, [socket, connected]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>License Plate Recognition</h1>
        </div>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <ControlPanel
            connected={connected}
            processing={processing}
            onImageUpload={handleImageUpload}
            onVideoUpload={handleVideoUpload}
            onStopVideo={handleStopVideo}
            videoSession={videoSession}
            progress={progress}
            outputFile={outputFile}
            onDownloadVideo={handleDownloadVideo}
            onClearOutput={handleClearOutput}
          />
          <BlacklistPanel
            blacklist={blacklist}
            onAdd={handleAddToBlacklist}
            onRemove={handleRemoveFromBlacklist}
          />
        </div>

        <div className="center-panel">
          <VideoDisplay
            frame={currentFrame}
            processing={processing}
          />
          <SearchPanel
            minConfidence={minConfidence}
            onConfidenceChange={setMinConfidence}
          />
        </div>

        <div className="right-panel">
          <AlertsPanel
            alerts={alerts}
            onClear={() => setAlerts([])}
          />
          <ResultsPanel results={results} />
        </div>
      </main>
    </div>
  );
}

export default App;
