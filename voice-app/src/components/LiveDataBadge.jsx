import React, { useState } from 'react';

const LiveDataBadge = ({ intents, toolResults }) => {
  const [expanded, setExpanded] = useState(false);

  if (!intents || intents.length === 0) return null;

  const getIcon = (intent) => {
    switch (intent) {
      case 'crypto_price': return '🔴 Crypto';
      case 'cyber_threats': return '🛡️ Cyber';
      case 'trading_signals': return '📈 Signals';
      case 'news': return '📰 News';
      case 'weather': return '🌤️ Weather';
      default: return '🔌 Tool';
    }
  };

  return (
    <div style={{ marginTop: '8px', fontSize: '10px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#888', letterSpacing: '1px' }}>LIVE DATA USED:</span>
        {intents.map(intent => (
          <span key={intent} style={{ 
            background: 'rgba(0, 207, 255, 0.1)', 
            border: '1px solid var(--hud-cyan)', 
            color: 'var(--hud-cyan)', 
            padding: '2px 6px', 
            borderRadius: '3px' 
          }}>
            {getIcon(intent)}
          </span>
        ))}
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--hud-orange)', 
            cursor: 'pointer', 
            fontSize: '9px',
            textDecoration: 'underline'
          }}
        >
          {expanded ? '[HIDE RAW DATA]' : '[VIEW RAW DATA]'}
        </button>
      </div>

      {expanded && (
        <div style={{ 
          marginTop: '8px', 
          background: 'rgba(0, 0, 0, 0.4)', 
          border: '1px solid #333', 
          padding: '10px', 
          borderRadius: '5px',
          whiteSpace: 'pre-wrap',
          color: '#aaa',
          maxHeight: '200px',
          overflowY: 'auto',
          fontFamily: 'monospace'
        }}>
          {toolResults.join('\n\n')}
        </div>
      )}
    </div>
  );
};

export default LiveDataBadge;
