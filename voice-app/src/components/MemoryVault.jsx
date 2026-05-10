import React, { useState, useEffect } from 'react';

const MemoryVault = ({ userId }) => {
  const [memories, setMemories] = useState([]);
  const [stats, setStats] = useState({ totalFacts: 0, latestMemory: null, oldestMemory: null });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemories();
    fetchStats();
  }, [userId]);

  const fetchMemories = async () => {
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/memory/timeline/${userId}`);
      const data = await res.json();
      setMemories(data);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch memories', e);
    }
  };

  const fetchStats = async () => {
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/memory/stats/${userId}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  const handleSearch = async () => {
    if (!search) return fetchMemories();
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/memory/search/${userId}?q=${search}`);
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error('Search failed', e);
    }
  };

  const handleDelete = async (id) => {
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      await fetch(`${baseUrl}/api/memory/${id}`, { method: 'DELETE' });
      fetchMemories();
      fetchStats();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const handleForgetBefore = async (date) => {
    if (!window.confirm('Are you sure you want JARVIS to forget everything before this date?')) return;
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      await fetch(`${baseUrl}/api/memory/forget/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      fetchMemories();
      fetchStats();
    } catch (e) {
      console.error('Forget operation failed', e);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#000810', color: '#00f2ff', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1 style={{ borderBottom: '2px solid #00f2ff', paddingBottom: '10px' }}>JARVIS MEMORY VAULT</h1>
      
      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', margin: '20px 0' }}>
        <div style={{ border: '1px solid #00f2ff', padding: '15px', borderRadius: '5px' }}>
          <div style={{ fontSize: '10px', color: '#888' }}>TOTAL FACTS STORED</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalFacts}</div>
        </div>
        <div style={{ border: '1px solid #00f2ff', padding: '15px', borderRadius: '5px' }}>
          <div style={{ fontSize: '10px', color: '#888' }}>LATEST MEMORY</div>
          <div style={{ fontSize: '14px' }}>{stats.latestMemory ? new Date(stats.latestMemory).toLocaleDateString() : 'N/A'}</div>
        </div>
        <div style={{ border: '1px solid #00f2ff', padding: '15px', borderRadius: '5px' }}>
          <div style={{ fontSize: '10px', color: '#888' }}>OLDEST MEMORY</div>
          <div style={{ fontSize: '14px' }}>{stats.oldestMemory ? new Date(stats.oldestMemory).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories (e.g. 'crypto', 'trading')..."
          style={{ flex: 1, background: '#001428', border: '1px solid #00f2ff', color: '#00f2ff', padding: '10px' }}
        />
        <button onClick={handleSearch} style={{ background: '#00f2ff', color: '#000810', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>SEARCH</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button 
          onClick={() => handleForgetBefore(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())}
          style={{ background: 'transparent', border: '1px solid #ff3131', color: '#ff3131', padding: '5px 10px', cursor: 'pointer', fontSize: '10px' }}
        >
          FORGET EVERYTHING OLDER THAN 30 DAYS
        </button>
      </div>

      {/* TIMELINE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {loading ? 'Accessing encrypted storage...' : memories.map((m, i) => (
          <div key={m.id || i} style={{ 
            border: '1px solid rgba(0, 242, 255, 0.3)', 
            padding: '15px', 
            borderRadius: '5px',
            background: 'rgba(0, 242, 255, 0.05)',
            position: 'relative'
          }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>
              {new Date(m.timestamp || m.createdAt).toLocaleString()} | {m.role === 'assistant' ? 'JARVIS' : 'OWNER'}
            </div>
            <div style={{ fontSize: '14px' }}>{m.content || m.summary}</div>
            {m.tags && (
              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                {m.tags.map(t => <span key={t} style={{ fontSize: '9px', background: '#001428', border: '1px solid #00f2ff', padding: '2px 5px', borderRadius: '3px' }}>#{t}</span>)}
              </div>
            )}
            <button 
              onClick={() => handleDelete(m.id)}
              style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#ff3131', cursor: 'pointer', fontSize: '10px' }}
            >
              DELETE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryVault;
