import React from 'react';

const ContextBar = ({ context }) => {
  if (!context) return null;

  const getSentimentEmoji = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'calm': return '🧘';
      case 'curious': return '🤔';
      case 'urgent': return '⚡';
      case 'frustrated': return '😤';
      case 'happy': return '😊';
      default: return '😐';
    }
  };

  return (
    <div className="hud-panel" style={{ 
      padding: '8px 15px', 
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '10px',
      letterSpacing: '1px'
    }}>
      <div className="hud-panel-label">[CONTEXT ENGINE]</div>
      
      <div style={{ display: 'flex', gap: '15px' }}>
        <div>
          <span style={{ color: 'var(--hud-orange)', marginRight: '5px' }}>INTENT:</span>
          {context.intentLabel?.toUpperCase() || 'IDLE'}
        </div>
        <div>
          <span style={{ color: 'var(--hud-orange)', marginRight: '5px' }}>TOPIC:</span>
          {context.entities?.[0]?.toUpperCase() || 'GENERAL'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--hud-orange)' }}>STATE:</span>
        <span title={context.sentiment}>{getSentimentEmoji(context.sentiment)}</span>
        <span style={{ fontSize: '8px', opacity: 0.7 }}>{context.sentiment?.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default ContextBar;
