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

  if (loading) return <div>Loading jobs...</div>;

  if (showSetup) {
    return (
      <div className="job-setup-wizard" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'var(--text-h)' }}>
        <h2>Job Hunter: Initial Setup</h2>
        <p style={{ marginBottom: '20px', fontSize: '14px' }}>Upload your resume (PDF) and I'll extract your skills and find matching roles for you.</p>
        
        <div style={{ marginBottom: '30px', padding: '20px', border: '2px dashed var(--border)', textAlign: 'center', borderRadius: '8px', background: 'var(--social-bg)' }}>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <div style={{ marginTop: '10px', fontWeight: 'bold' }}>{isUploading ? '[JARVIS IS READING RESUME...]' : 'CLICK TO UPLOAD RESUME (PDF)'}</div>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              style={{ display: 'none' }} 
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Target Roles (Extracted or Manual)</label>
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
              style={{ width: '100%', padding: '10px', marginBottom: '10px', background: 'var(--social-bg)', border: '1px solid var(--border)', color: 'var(--text-h)' }}
            />
          ))}
          <button onClick={() => setRoles([...roles, ''])} style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--text)', padding: '5px 10px', cursor: 'pointer' }}>+ Add Role</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Professional Summary (Extracted)</label>
          <textarea 
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Jarvis will extract this from your resume, or you can paste it manually..."
            style={{ width: '100%', height: '120px', padding: '10px', background: 'var(--social-bg)', border: '1px solid var(--border)', color: 'var(--text-h)' }}
          />
        </div>

        <button 
          onClick={handleSaveSetup}
          style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          CONFIRM & START FINDING JOBS
        </button>
      </div>
    );
  }

  return (
    <div className="job-hunter-panel" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-h)', margin: 0 }}>Job Hunter Module</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowSetup(true)}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-h)', cursor: 'pointer' }}
          >
            ⚙️ Setup
          </button>
          <button 
            onClick={handleRunScan}
            disabled={isScanning}
            style={{ padding: '8px 16px', borderRadius: '4px', background: 'var(--accent)', color: 'white', border: 'none', cursor: isScanning ? 'wait' : 'pointer' }}
          >
            {isScanning ? 'Scanning...' : '🚀 Run Scan'}
          </button>
        </div>
      </div>
      
      <div className="job-list">
        {jobs.length === 0 ? (
          <p>No jobs found. Run a scan to find opportunities.</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} style={{ 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '16px',
              backgroundColor: 'var(--social-bg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-h)' }}>{job.title}</h3>
                  <p style={{ margin: '4px 0', fontWeight: 'bold', color: 'var(--accent)' }}>{job.company}</p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>📍 {job.location} {job.isRemote && '(Remote)'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-mid)' }}>Source: {job.source}</span>
                </div>
              </div>
              
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                <a href={job.url} target="_blank" rel="noopener noreferrer" style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--border)',
                  textDecoration: 'none',
                  color: 'var(--text-h)',
                  fontSize: '14px'
                }}>View Original</a>
                
                <button 
                  onClick={() => handleApply(job.id)}
                  disabled={applyingId === job.id || job.applications?.length > 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: job.applications?.length > 0 ? '#10b981' : 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    cursor: applyingId === job.id ? 'wait' : (job.applications?.length > 0 ? 'default' : 'pointer'),
                    fontSize: '14px'
                  }}
                >
                  {applyingId === job.id ? 'Applying...' : (job.applications?.length > 0 ? 'Applied' : 'Apply with AI')}
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
