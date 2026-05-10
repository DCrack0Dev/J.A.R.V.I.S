import React, { useState, useEffect } from 'react';
import { useVoiceStore } from '../store/voiceStore';

const PrivacyIndicator = () => {
  const { state, isPanicMute, setPanicMute } = useVoiceStore();
  const [log, setLog] = useState([]);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [{ state, timestamp }, ...prev].slice(0, 5));
  }, [state]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 10, 20, 0.8)',
      border: '1px solid var(--hud-border)',
      padding: '10px',
      borderRadius: '5px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '10px',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: state === 'ACTIVE' ? '#ff3131' : '#555',
          boxShadow: state === 'ACTIVE' ? '0 0 10px #ff3131' : 'none'
        }} />
        <span style={{ letterSpacing: '1px' }}>
          {state === 'ACTIVE' ? 'MIC ACTIVE' : 'MIC DORMANT'}
        </span>
        <button 
          onClick={() => setPanicMute(!isPanicMute)}
          style={{
            background: isPanicMute ? '#ff3131' : 'transparent',
            border: '1px solid #ff3131',
            color: isPanicMute ? 'white' : '#ff3131',
            fontSize: '8px',
            padding: '2px 5px',
            cursor: 'pointer',
            marginLeft: 'auto'
          }}
        >
          {isPanicMute ? 'UNMUTE ALL' : 'PANIC MUTE'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid #333', paddingTop: '5px' }}>
        <div style={{ color: '#888', marginBottom: '5px' }}>TRANSITION LOG:</div>
        {log.map((entry, i) => (
          <div key={i} style={{ opacity: 0.7 }}>
            [{entry.timestamp}] {entry.state}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivacyIndicator;
