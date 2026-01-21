import React from 'react';
import './SearchPanel.css';

function SearchPanel({ minConfidence, onConfidenceChange }) {
  return (
    <div className="panel search-panel">
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filter
        </h2>
      </div>
      <div className="panel-content filter-content">
        <div className="filter-field">
          <label>
            Min Confidence: <span className="confidence-value">{(minConfidence * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            className="range-input"
            min="0"
            max="1"
            step="0.05"
            value={minConfidence}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

export default SearchPanel;
