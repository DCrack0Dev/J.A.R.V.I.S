import React, { useState, useEffect } from 'react';

const DataSourceStatus = () => {
  const [status, setStatus] = useState([]);

  const fetchStatus = async () => {
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      const res = await fetch(`${baseUrl}/api/intelligence/status`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Failed to fetch tool status', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  const getToolLabel = (name) => {
    switch (name) {
      case 'crypto_price': return 'CoinGecko';
      case 'cyber_threats': return 'CISA KEV';
      case 'trading_signals': return 'Binance';
      case 'news': return 'GNews';
      case 'weather': return 'OpenWeather';
      default: return name;
    }
  };

  return (
    <div style={{
      marginTop: '20px',
      padding: '15px',
      background: 'rgba(0, 207, 255, 0.05)',
      border: '1px solid var(--hud-border)',
      borderRadius: '5px'
    }}>
      <div style={{ fontSize: '10px', color: 'var(--hud-orange)', letterSpacing: '2px', marginBottom: '10px' }}>
        [DATA SOURCE STATUS]
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {status.map(tool => (
          <div key={tool.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span>
              {tool.status === 'SUCCESS' ? '✅' : tool.status === 'FAILED' ? '❌' : '⚪'} {getToolLabel(tool.name)}
            </span>
            <span style={{ opacity: 0.6 }}>
              {formatTimeAgo(tool.lastFetched)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataSourceStatus;
