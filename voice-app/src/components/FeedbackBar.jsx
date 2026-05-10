import React, { useState } from 'react';

const FeedbackBar = ({ messageId, topic }) => {
  const [submitted, setSubmitted] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const handleFeedback = async (rating) => {
    if (rating === 'negative' && !showComment) {
      setShowComment(true);
      return;
    }

    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      await fetch(`${baseUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          rating,
          comment: rating === 'negative' ? comment : '',
          topic
        })
      });
      setSubmitted(true);
      setShowComment(false);
    } catch (e) {
      console.error('Feedback failed', e);
    }
  };

  if (submitted) return <div style={{ fontSize: '8px', color: '#39ff6a', opacity: 0.7 }}>THANK YOU FOR THE FEEDBACK.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={() => handleFeedback('positive')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }}>👍</button>
        <button onClick={() => handleFeedback('negative')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }}>👎</button>
      </div>
      
      {showComment && (
        <div style={{ display: 'flex', gap: '5px' }}>
          <input 
            type="text" 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went wrong?"
            style={{ 
              background: 'var(--hud-bg)', 
              border: '1px solid var(--hud-border)', 
              color: 'var(--hud-cyan)', 
              fontSize: '8px',
              padding: '2px 5px',
              flex: 1
            }}
          />
          <button 
            onClick={() => handleFeedback('negative')}
            style={{ 
              background: 'var(--hud-orange)', 
              border: 'none', 
              color: 'var(--hud-bg)', 
              fontSize: '8px',
              padding: '2px 5px',
              cursor: 'pointer'
            }}
          >
            SEND
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackBar;
