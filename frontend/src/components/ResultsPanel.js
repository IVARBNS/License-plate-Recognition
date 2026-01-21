import React from 'react';
import './ResultsPanel.css';

function ResultsPanel({ results }) {
  // Get unique results by license plate (show latest)
  const uniqueResults = results.reduce((acc, result) => {
    acc[result.license_plate_text] = result;
    return acc;
  }, {});

  const displayResults = Object.values(uniqueResults).slice(0, 30);

  return (
    <div className="panel results-panel">
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Detection Results
        </h2>
        <span className="result-count">{displayResults.length}</span>
      </div>
      <div className="results-list">
        {displayResults.length === 0 ? (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="15"></line>
              <line x1="15" y1="9" x2="9" y2="15"></line>
            </svg>
            <p>No detections yet</p>
          </div>
        ) : (
          displayResults.map((result, idx) => (
            <div
              key={`${result.license_plate_text}-${idx}`}
              className={`result-item ${result.is_blacklisted ? 'alert' : ''}`}
            >
              <div className="result-header">
                <span className="plate-number mono">{result.license_plate_text}</span>
                {result.is_blacklisted && (
                  <span className="badge badge-danger">Blacklisted</span>
                )}
              </div>
              <div className="result-details">
                <div className="detail-row">
                  <span className="detail-label">Vehicle</span>
                  <span className="detail-value">{result.vehicle_type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Confidence</span>
                  <span className="detail-value">{(result.license_plate_confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Time</span>
                  <span className="detail-value mono">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ResultsPanel;
