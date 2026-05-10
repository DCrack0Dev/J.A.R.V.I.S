import React, { useState, useEffect } from 'react';

const SessionResumeToast = ({ message, duration = 5000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 207, 255, 0.9)',
      color: '#000',
      padding: '10px 20px',
      borderRadius: '5px',
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '12px',
      letterSpacing: '1px',
      boxShadow: '0 0 20px rgba(0, 207, 255, 0.5)',
      zIndex: 10000,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      {message}
    </div>
  );
};

export default SessionResumeToast;
