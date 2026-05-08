import { useState, useEffect } from 'react';

const GitHubPanel = () => {
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingRepo, setEditingRepo] = useState(null);
  const [draftReadme, setDraftReadme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        fetch('http://localhost:3000/github/profile'),
        fetch('http://localhost:3000/github/repos')
      ]);
      setProfile(await pRes.json());
      setRepos(await rRes.json());
    } catch (e) {
      console.error('Failed to fetch GitHub data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('http://localhost:3000/github/sync', { method: 'POST' });
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateReadme = async (repoFullName) => {
    setEditingRepo(repoFullName);
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:3000/github/readme/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName })
      });
      const markdown = await res.text();
      setDraftReadme(markdown);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScoreHealth = async (repoFullName) => {
    try {
      const [owner, repo] = repoFullName.split('/');
      const res = await fetch(`http://localhost:3000/github/health/score/${owner}/${repo}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Failed to score health', e);
    }
  };

  const handleSyncRepo = async (repoFullName) => {
    try {
      const [owner, repo] = repoFullName.split('/');
      const res = await fetch(`http://localhost:3000/github/sync/${owner}/${repo}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Failed to sync repo', e);
    }
  };

  const handleApplyReadme = async () => {
    if (!editingRepo) return;
    try {
      const res = await fetch('http://localhost:3000/github/readme/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: editingRepo, content: draftReadme })
      });
      if (res.ok) {
        alert('README pushed to GitHub successfully!');
        setEditingRepo(null);
        setDraftReadme('');
        fetchData();
      }
    } catch (e) {
      alert('Failed to apply README');
    }
  };

  if (loading) return <div style={{ color: 'var(--hud-cyan)' }}>[INITIALIZING GITHUB MODULE...]</div>;

  return (
    <div className="github-intelligence">
      {/* PROFILE CARD */}
      {profile && (
        <div className="hud-panel" style={{ marginBottom: '20px' }}>
          <div className="hud-panel-label">[GITHUB PROFILE]</div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <img src={profile.avatarUrl} alt="Avatar" style={{ width: '60px', borderRadius: '50%', border: '2px solid var(--hud-cyan)' }} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', color: 'var(--hud-cyan)' }}>{profile.displayName} (@{profile.username})</h2>
              <p style={{ fontSize: '11px', opacity: 0.8 }}>{profile.bio}</p>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '10px' }}>
                <span>STARS: {profile.totalStars}</span>
                <span>REPOS: {profile.publicRepos}</span>
                <span>FOLLOWERS: {profile.followers}</span>
                <span>STREAK: {profile.contributionStreak || 0}d</span>
              </div>
            </div>
            <button 
              onClick={handleSync} 
              disabled={syncing}
              style={{
                background: 'transparent',
                border: '1px solid var(--hud-orange)',
                color: 'var(--hud-orange)',
                padding: '6px 12px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              {syncing ? 'SYNCING...' : 'SYNC DATA'}
            </button>
          </div>
        </div>
      )}

      {/* REPO GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {repos.map(repo => (
          <div key={repo.id} className="hud-panel" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--hud-cyan)', fontWeight: 'bold', fontSize: '12px' }}>{repo.name}</span>
              {repo.aiHealthScore && (
                <span style={{ 
                  color: repo.aiHealthScore > 80 ? '#39ff6a' : repo.aiHealthScore > 50 ? '#f0a500' : '#ff4757',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  SCORE: {repo.aiHealthScore}
                </span>
              )}
            </div>
            <p style={{ fontSize: '10px', opacity: 0.7, margin: '8px 0', minHeight: '30px' }}>{repo.description || 'No description'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '9px', color: 'var(--hud-orange)' }}>{repo.language || 'Mixed'}</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => handleSyncRepo(repo.fullName)}
                  style={{
                    fontSize: '8px',
                    padding: '3px 6px',
                    background: 'transparent',
                    color: 'var(--hud-cyan)',
                    border: '1px solid var(--hud-border)',
                    cursor: 'pointer'
                  }}
                >
                  SYNC
                </button>
                <button 
                  onClick={() => handleScoreHealth(repo.fullName)}
                  style={{
                    fontSize: '8px',
                    padding: '3px 6px',
                    background: 'transparent',
                    color: '#f0a500',
                    border: '1px solid #f0a500',
                    cursor: 'pointer'
                  }}
                >
                  SCORE
                </button>
                <button 
                  onClick={() => handleGenerateReadme(repo.fullName)}
                  style={{
                    fontSize: '8px',
                    padding: '3px 6px',
                    background: 'var(--hud-cyan)',
                    color: 'var(--hud-bg)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  README
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* README EDITOR MODAL */}
      {editingRepo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 2000,
          padding: '40px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--hud-cyan)' }}>README EDITOR: {editingRepo}</h2>
            <button onClick={() => setEditingRepo(null)} style={{ background: 'transparent', color: 'white', border: '1px solid white' }}>CLOSE</button>
          </div>
          
          {isGenerating ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--hud-cyan)' }}>
              [JARVIS IS ANALYZING REPOSITORY AND GENERATING README...]
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', gap: '20px' }}>
              <textarea 
                value={draftReadme}
                onChange={(e) => setDraftReadme(e.target.value)}
                style={{
                  flex: 1,
                  background: '#111',
                  color: 'var(--hud-cyan)',
                  fontFamily: 'monospace',
                  padding: '20px',
                  border: '1px solid var(--hud-border)'
                }}
              />
              <div style={{
                flex: 1,
                background: 'white',
                color: 'black',
                padding: '20px',
                overflowY: 'auto',
                borderRadius: '4px'
              }}>
                {/* Simplified markdown preview */}
                <pre style={{ whiteSpace: 'pre-wrap' }}>{draftReadme}</pre>
              </div>
            </div>
          )}
          
          {!isGenerating && (
            <button 
              onClick={handleApplyReadme}
              style={{
                marginTop: '20px',
                padding: '12px',
                background: 'var(--hud-cyan)',
                color: 'var(--hud-bg)',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              APPLY TO GITHUB
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default GitHubPanel;
