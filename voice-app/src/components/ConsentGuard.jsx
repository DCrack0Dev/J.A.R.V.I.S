import React, { useState, useEffect } from 'react';
import { useVoiceStore } from '../store/voiceStore';

const ConsentGuard = () => {
  const { setWakeWordEnabled } = useVoiceStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('jarvis_consent');
    if (!consent) {
      setShow(true);
    } else {
      setWakeWordEnabled(true);
    }
  }, [setWakeWordEnabled]);

  const handleAccept = () => {
    localStorage.setItem('jarvis_consent', 'true');
    setWakeWordEnabled(true);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        background: '#000810',
        border: '1px solid var(--hud-cyan)',
        padding: '30px',
        borderRadius: '5px',
        color: 'var(--hud-cyan)',
        fontFamily: 'monospace'
      }}>
        <h2 style={{ letterSpacing: '2px', marginBottom: '20px' }}>PRIVACY & SAFETY PROTOCOL</h2>
        <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', opacity: 0.9 }}>
          JARVIS uses a two-tier listening system:
          <br /><br />
          1. <strong>Local Wake Word:</strong> A tiny on-device listener checks for "Jarvis". No audio is sent to any server during this state.
          <br /><br />
          2. <strong>Active Session:</strong> Only after the wake word is detected, the full microphone activates to process your commands.
          <br /><br />
          Do you consent to enabling the local wake word listener?
        </p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={handleAccept}
            style={{
              flex: 1,
              background: 'var(--hud-cyan)',
              color: '#000',
              border: 'none',
              padding: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ENABLE JARVIS
          </button>
          <button 
            onClick={() => setShow(false)}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: '1px solid #555',
              color: '#555',
              cursor: 'pointer'
            }}
          >
            NOT NOW
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentGuard;
