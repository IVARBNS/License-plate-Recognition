import React, { useState } from 'react';
import './BlacklistPanel.css';

function BlacklistPanel({ blacklist, onAdd, onRemove }) {
  const [newPlate, setNewPlate] = useState('');

  const handleAdd = () => {
    if (newPlate.trim()) {
      onAdd(newPlate.trim().toUpperCase());
      setNewPlate('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="panel blacklist-panel">
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          Blacklist
        </h2>
        <span className="count-badge">{blacklist.length}</span>
      </div>
      <div className="panel-content">
        <div className="add-plate">
          <input
            type="text"
            className="input"
            placeholder="Enter plate number"
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            maxLength={10}
          />
          <button className="btn btn-primary" onClick={handleAdd} disabled={!newPlate.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add
          </button>
        </div>

        <div className="blacklist-items">
          {blacklist.length === 0 ? (
            <div className="empty-blacklist">
              <p>No plates blacklisted</p>
            </div>
          ) : (
            blacklist.map((plate, idx) => (
              <div key={`${plate}-${idx}`} className="blacklist-item">
                <span className="plate-text mono">{plate}</span>
                <button
                  className="remove-btn"
                  onClick={() => onRemove(plate)}
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BlacklistPanel;
