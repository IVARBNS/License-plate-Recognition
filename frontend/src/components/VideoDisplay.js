import React from 'react';
import './VideoDisplay.css';

function VideoDisplay({ frame, processing }) {
  return (
    <div className="panel video-display">
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Live Feed
        </h2>
        {processing && (
          <span className="processing-badge">
            <span className="processing-dot"></span>
            Processing
          </span>
        )}
      </div>
      <div className="video-container">
        {frame ? (
          <img src={frame} alt="Processed frame" className="video-frame" />
        ) : (
          <div className="video-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <p>Upload an image or video to begin</p>
            <span>Supported: Images, Videos, RTSP Streams</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoDisplay;
