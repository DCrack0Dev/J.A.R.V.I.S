import React, { useState, useEffect } from 'react';

const LiveIntelligencePanel = () => {
  const [data, setData] = useState({
    crypto: null,
    cyber: null,
    trading: null,
    news: null
  });
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1200);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200) setCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
        const response = await fetch(`${baseUrl}/api/intelligence/latest`);
        const json = await response.json();
        setData(json);
      } catch (e) {
        console.error('Failed to fetch intelligence data', e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (collapsed) {
    return (
      <div 
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(0, 20, 40, 0.8)',
          border: '1px solid #00f2ff',
          color: '#00f2ff',
          padding: '10px',
          cursor: 'pointer',
          borderRadius: '5px',
          writingMode: 'vertical-rl',
          fontSize: '10px',
          letterSpacing: '2px'
        }}
      >
        LIVE INTELLIGENCE
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      right: '10px',
      top: '70px',
      width: window.innerWidth < 480 ? 'calc(100% - 20px)' : '250px',
      background: 'rgba(0, 10, 20, 0.9)',
      border: '1px solid #00f2ff',
      color: '#00f2ff',
      padding: '15px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      zIndex: 100,
      boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #00f2ff', paddingBottom: '5px' }}>
        <span style={{ fontWeight: 'bold' }}>SYSTEM INTELLIGENCE</span>
        <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', color: '#00f2ff', cursor: 'pointer' }}>_</button>
      </div>

      {/* CRYPTO */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>MARKETS</div>
        {data.crypto ? (
          <div style={{ fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>BTC:</span>
              <span>${data.crypto.bitcoin.usd.toLocaleString()}</span>
              <span style={{ color: data.crypto.bitcoin.usd_24h_change > 0 ? '#39ff6a' : '#ff3131' }}>
                {data.crypto.bitcoin.usd_24h_change.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ETH:</span>
              <span>${data.crypto.ethereum.usd.toLocaleString()}</span>
              <span style={{ color: data.crypto.ethereum.usd_24h_change > 0 ? '#39ff6a' : '#ff3131' }}>
                {data.crypto.ethereum.usd_24h_change.toFixed(1)}%
              </span>
            </div>
          </div>
        ) : 'Loading...'}
      </div>

      {/* TRADING */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>TRADING SIGNALS</div>
        {data.trading ? (
          <div style={{ fontSize: '11px', background: 'rgba(0, 242, 255, 0.1)', padding: '5px', borderRadius: '3px' }}>
            <div>BTC RSI (4h): {data.trading.rsi}</div>
            <div style={{ 
              color: data.trading.signal === 'Oversold' ? '#39ff6a' : data.trading.signal === 'Overbought' ? '#ff3131' : '#00f2ff',
              fontWeight: 'bold'
            }}>
              SIGNAL: {data.trading.signal}
            </div>
          </div>
        ) : 'Loading...'}
      </div>

      {/* CYBER */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>CYBER THREATS</div>
        {data.cyber && data.cyber[0] ? (
          <div style={{ fontSize: '10px', borderLeft: '2px solid #ff3131', paddingLeft: '5px' }}>
            <div style={{ color: '#ff3131', fontWeight: 'bold' }}>CRITICAL: {data.cyber[0].cveID}</div>
            <div style={{ fontSize: '9px', opacity: 0.8 }}>{data.cyber[0].vulnerabilityName.substring(0, 50)}...</div>
          </div>
        ) : 'No threats detected.'}
      </div>

      {/* NEWS */}
      <div>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>LATEST TECH NEWS</div>
        {data.news ? data.news.slice(0, 3).map((n, i) => (
          <div key={i} style={{ fontSize: '9px', marginBottom: '5px', opacity: 0.9 }}>
            • {n.title.substring(0, 60)}...
          </div>
        )) : 'Loading...'}
      </div>
    </div>
  );
};

export default LiveIntelligencePanel;
