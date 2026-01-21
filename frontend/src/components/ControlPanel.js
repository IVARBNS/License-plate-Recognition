import React, { useState } from 'react';
import './ControlPanel.css';

function ControlPanel({ 
  connected, 
  processing, 
  onImageUpload, 
  onVideoUpload, 
  onStopVideo,
  videoSession,
  progress,
  outputFile,
  onDownloadVideo,
  onClearOutput
}) {
  const [activeTab, setActiveTab] = useState('image');

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'image') {
      onImageUpload(file);
    } else {
      onVideoUpload(file);
    }
    e.target.value = '';
  };

  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className="panel control-panel">
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Input Source
        </h2>
      </div>
      <div className="panel-content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
            disabled={processing}
          >
            Image
          </button>
          <button
            className={`tab ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
            disabled={processing}
          >
            Video
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'image' && (
            <div className="upload-section">
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'image')}
                  disabled={!connected || processing}
                />
                <div className={`file-input-label ${processing ? 'disabled' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  {processing ? 'Processing...' : 'Upload Image'}
                </div>
              </div>
              <p className="hint">JPG, PNG, WebP supported</p>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="upload-section">
              {/* Show save option if output file is available */}
              {outputFile && !videoSession && !processing && (
                <div className="save-video-section">
                  <div className="save-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>Video processed!</span>
                  </div>
                  <div className="save-buttons">
                    <button className="btn btn-primary save-btn" onClick={onDownloadVideo}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Save Video
                    </button>
                    <button className="btn btn-secondary dismiss-btn" onClick={onClearOutput}>
                      Dismiss
                    </button>
                  </div>
                  <p className="save-hint">{outputFile}</p>
                </div>
              )}

              {/* Show upload or progress */}
              {!outputFile && !videoSession && !processing && (
                <>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileChange(e, 'video')}
                      disabled={!connected || processing}
                    />
                    <div className={`file-input-label ${processing ? 'disabled' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      Upload Video
                    </div>
                  </div>
                  <p className="hint">MP4, AVI, MOV supported</p>
                </>
              )}

              {/* Show progress during processing */}
              {(videoSession || processing) && (
                <div className="video-progress">
                  <div className="progress-header">
                    <span className="progress-label">Processing Video</span>
                    <span className="progress-percent">{progressPercent}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="progress-info">
                    Frame {progress.current} of {progress.total}
                  </div>
                  <button 
                    className="btn btn-danger stop-btn"
                    onClick={onStopVideo}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12"></rect>
                    </svg>
                    Stop Processing
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
