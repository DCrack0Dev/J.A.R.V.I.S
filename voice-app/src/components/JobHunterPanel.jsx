import { useState, useEffect } from 'react';

const JobHunterPanel = () => {
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Setup state
  const [roles, setRoles] = useState(['', '']);
  const [resumeText, setResumeText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Use the live Vercel URL if in production, otherwise localhost
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      
      const [jobsRes, profileRes] = await Promise.all([
        fetch(`${baseUrl}/api/jobs`),
        fetch(`${baseUrl}/api/jobs/profile`)
      ]);
      
      const jobsData = await jobsRes.json();
      const profileData = await profileRes.json();
      
      setJobs(jobsData);
      setProfile(profileData);
      
      if (!profileData || !profileData.targetRoles?.length) {
        setShowSetup(true);
      } else {
        setRoles(profileData.targetRoles);
        setResumeText(profileData.summary || '');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a valid PDF resume.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/jobs/resume/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile(updatedProfile);
        setRoles(updatedProfile.targetRoles || []);
        setResumeText(updatedProfile.summary || '');
        alert('Resume analyzed! I\'ve updated your profile and suggested roles.');
      } else {
        const errorData = await res.json();
        alert(`Analysis failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload failed', error);
      const isLocal = window.location.hostname === 'localhost';
      const errorMessage = isLocal 
        ? `Network error: ${error.message}. Is your backend running on port 3000?` 
        : `Cloud Network Error: ${error.message}. The Jarvis backend is temporarily unreachable on Vercel.`;
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSetup = async () => {
    try {
      const filteredRoles = roles.filter(r => r.trim() !== '');
      if (filteredRoles.length < 2) {
        alert('Please specify at least 2 job roles.');
        return;
      }

      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/jobs/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRoles: filteredRoles,
          summary: resumeText,
        })
      });

      if (res.ok) {
        setShowSetup(false);
        fetchInitialData();
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/jobs/scan`, { method: 'POST' });
      if (res.ok) {
        alert('Job scan initiated! Check back in a few minutes.');
      }
    } catch (e) {
      console.error('Scan failed', e);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const response = await fetch(`${baseUrl}/api/jobs`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    setApplyingId(jobId);
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const response = await fetch(`${baseUrl}/api/jobs/apply/${jobId}`, {
        method: 'POST',
      });
      if (response.ok) {
        alert('Application submitted successfully!');
        fetchJobs();
      }
    } catch (error) {
      console.error('Application failed:', error);
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) return <div style={{ color: 'var(--hud-cyan)', padding: '20px' }}>ACCESSING JOB DATABASE...</div>;

  if (showSetup) {
    return (
      <div className="job-setup-wizard" style={{ padding: '10px', width: '100%', color: 'var(--hud-cyan)' }}>
        <h2 style={{ fontSize: '16px', letterSpacing: '2px', marginBottom: '10px' }}>JOB HUNTER: INITIAL SETUP</h2>
        <p style={{ marginBottom: '15px', fontSize: '11px', opacity: 0.8 }}>Upload your resume (PDF) and I'll extract your skills and find matching roles for you.</p>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          border: '1px dashed var(--hud-border)', 
          textAlign: 'center', 
          borderRadius: '4px', 
          background: 'rgba(0, 207, 255, 0.05)' 
        }}>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <div style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '10px' }}>
              {isUploading ? '[JARVIS IS READING RESUME...]' : 'CLICK TO UPLOAD RESUME (PDF)'}
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              style={{ display: 'none' }} 
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '10px', color: 'var(--hud-orange)' }}>TARGET ROLES</label>
          {roles.map((role, idx) => (
            <input 
              key={idx}
              type="text" 
              value={role}
              onChange={(e) => {
                const newRoles = [...roles];
                newRoles[idx] = e.target.value;
                setRoles(newRoles);
              }}
              placeholder={`Role ${idx + 1} (e.g. Full Stack Developer)`}
              style={{ 
                width: '100%', 
                padding: '8px', 
                marginBottom: '8px', 
                background: 'rgba(0,0,0,0.4)', 
                border: '1px solid var(--hud-border)', 
                color: 'var(--hud-cyan)',
                fontSize: '12px'
              }}
            />
          ))}
          <button 
            onClick={() => setRoles([...roles, ''])} 
            style={{ 
              background: 'none', 
              border: '1px dashed var(--hud-border)', 
              color: 'var(--hud-cyan)', 
              padding: '4px 8px', 
              cursor: 'pointer',
              fontSize: '9px'
            }}
          >
            + ADD ROLE
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '10px', color: 'var(--hud-orange)' }}>PROFESSIONAL SUMMARY</label>
          <textarea 
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Jarvis will extract this from your resume..."
            style={{ 
              width: '100%', 
              height: '100px', 
              padding: '8px', 
              background: 'rgba(0,0,0,0.4)', 
              border: '1px solid var(--hud-border)', 
              color: 'var(--hud-cyan)',
              fontSize: '12px',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <button 
          onClick={handleSaveSetup}
          style={{ 
            width: '100%', 
            padding: '10px', 
            background: 'var(--hud-cyan)', 
            color: 'var(--hud-bg)', 
            border: 'none', 
            borderRadius: '2px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '11px',
            letterSpacing: '1px'
          }}
        >
          CONFIRM & START FINDING JOBS
        </button>
      </div>
    );
  }

  return (
    <div className="job-hunter-panel" style={{ width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h2 style={{ color: 'var(--hud-cyan)', margin: 0, fontSize: '14px', letterSpacing: '1px' }}>JOB HUNTER MODULE</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowSetup(true)}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '2px', 
              border: '1px solid var(--hud-border)', 
              background: 'none', 
              color: 'var(--hud-cyan)', 
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            ⚙️ SETUP
          </button>
          <button 
            onClick={handleRunScan}
            disabled={isScanning}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '2px', 
              background: 'var(--hud-cyan)', 
              color: 'var(--hud-bg)', 
              border: 'none', 
              cursor: isScanning ? 'wait' : 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            {isScanning ? 'SCANNING...' : '🚀 RUN SCAN'}
          </button>
        </div>
      </div>
      
      <div className="job-list">
        {jobs.length === 0 ? (
          <p style={{ fontSize: '11px', opacity: 0.6 }}>No jobs found. Run a scan to find opportunities.</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} style={{ 
              border: '1px solid var(--hud-border)', 
              borderRadius: '4px', 
              padding: '12px', 
              marginBottom: '10px',
              backgroundColor: 'rgba(0, 207, 255, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, color: 'var(--hud-cyan)', fontSize: '13px' }}>{job.title}</h3>
                  <p style={{ margin: '2px 0', fontWeight: 'bold', color: 'var(--hud-orange)', fontSize: '11px' }}>{job.company}</p>
                  <p style={{ margin: '2px 0', fontSize: '10px' }}>📍 {job.location} {job.isRemote && '(Remote)'}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: '60px' }}>
                  <span style={{ fontSize: '8px', color: 'rgba(0, 207, 255, 0.5)' }}>{job.source}</span>
                </div>
              </div>
              
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <a href={job.url} target="_blank" rel="noopener noreferrer" style={{
                  padding: '4px 8px',
                  borderRadius: '2px',
                  border: '1px solid var(--hud-border)',
                  textDecoration: 'none',
                  color: 'var(--hud-cyan)',
                  fontSize: '10px'
                }}>VIEW</a>
                
                <button 
                  onClick={() => handleApply(job.id)}
                  disabled={applyingId === job.id || job.applications?.length > 0}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '2px',
                    backgroundColor: job.applications?.length > 0 ? '#39ff6a' : 'var(--hud-cyan)',
                    color: 'var(--hud-bg)',
                    border: 'none',
                    cursor: applyingId === job.id ? 'wait' : (job.applications?.length > 0 ? 'default' : 'pointer'),
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {applyingId === job.id ? 'APPLYING...' : (job.applications?.length > 0 ? 'APPLIED' : 'APPLY W/ AI')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobHunterPanel;

export default JobHunterPanel;
