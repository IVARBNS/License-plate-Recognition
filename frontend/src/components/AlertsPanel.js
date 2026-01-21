import React from 'react';
import './AlertsPanel.css';

function AlertsPanel({ alerts, onClear }) {
  return (
    <div className="panel alerts-panel">
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Alerts
          {alerts.length > 0 && (
            <span className="alert-count">{alerts.length}</span>
          )}
        </h2>
        {alerts.length > 0 && (
          <button className="btn btn-small btn-danger" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>No alerts</p>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div key={`${alert.license_plate_text}-${idx}-${alert.timestamp}`} className="alert-item">
              <div className="alert-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
              </div>
              <div className="alert-content">
                <div className="alert-title">Blacklisted Vehicle Detected</div>
                <div className="alert-plate mono">{alert.license_plate_text}</div>
                <div className="alert-meta">
                  <span>{alert.vehicle_type}</span>
                  <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AlertsPanel;
