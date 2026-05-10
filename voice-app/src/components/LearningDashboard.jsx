import React, { useState, useEffect } from 'react';

const LearningDashboard = () => {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tone, setTone] = useState('');
  const [length, setLength] = useState('');

  useEffect(() => {
    fetchMemory();
  }, []);

  const fetchMemory = async () => {
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/learning/memory/00000000-0000-0000-0000-000000000001`);
      const data = await res.json();
      setMemory(data);
      setTone(data?.preferredTone || 'Neutral');
      setLength(data?.responseLength || 'Medium');
    } catch (e) {
      console.error('Failed to fetch memory', e);
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = async () => {
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      await fetch(`${baseUrl}/api/learning/memory/00000000-0000-0000-0000-000000000001/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, length })
      });
      alert('Preferences saved!');
      fetchMemory();
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  if (loading) return <div>LOADING PERSONALITY PROFILE...</div>;

  return (
    <div style={{ padding: '20px', color: 'var(--hud-cyan)' }}>
      <div className="hud-panel" style={{ marginBottom: '20px' }}>
        <div className="hud-panel-label">[PERSONALITY PROFILE]</div>
        {memory?.personalityProfile ? (
          <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: 'var(--hud-orange)' }}>STYLE:</span> {memory.personalityProfile.style}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: 'var(--hud-orange)' }}>FOCUS:</span> {memory.personalityProfile.technicalFocus?.join(', ')}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: 'var(--hud-orange)' }}>TONE NOTES:</span> {memory.personalityProfile.toneNotes}
            </div>
            <div>
              <span style={{ color: 'var(--hud-orange)' }}>AVOID:</span> {memory.personalityProfile.avoid?.join(', ')}
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.5 }}>JARVIS is still learning your preferences. Interaction count: 0</div>
        )}
      </div>

      <div className="hud-panel">
        <div className="hud-panel-label">[MANUAL PREFERENCES]</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '9px', marginBottom: '5px' }}>PREFERRED TONE</label>
            <select 
              value={tone} 
              onChange={(e) => setTone(e.target.value)}
              style={{ background: 'var(--hud-bg)', border: '1px solid var(--hud-border)', color: 'var(--hud-cyan)', padding: '5px', width: '100%' }}
            >
              <option value="Neutral">Neutral</option>
              <option value="Formal">Formal</option>
              <option value="Casual">Casual / Bro</option>
              <option value="Socratic">Socratic / Questioning</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '9px', marginBottom: '5px' }}>RESPONSE LENGTH</label>
            <select 
              value={length} 
              onChange={(e) => setLength(e.target.value)}
              style={{ background: 'var(--hud-bg)', border: '1px solid var(--hud-border)', color: 'var(--hud-cyan)', padding: '5px', width: '100%' }}
            >
              <option value="Short">Short (1-2 sentences)</option>
              <option value="Medium">Medium (3-5 sentences)</option>
              <option value="Detailed">Detailed (Full explanation)</option>
            </select>
          </div>
          <button 
            onClick={savePrefs}
            style={{ 
              background: 'var(--hud-cyan)', 
              color: 'var(--hud-bg)', 
              border: 'none', 
              padding: '10px', 
              fontFamily: 'Orbitron', 
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            UPDATE CORE PREFERENCES
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearningDashboard;
