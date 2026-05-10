import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#001428',
    primaryTextColor: '#00f2ff',
    primaryBorderColor: '#00f2ff',
    lineColor: '#00f2ff',
    secondaryColor: '#00f2ff',
    tertiaryColor: '#001428'
  }
});

const DiagramRenderer = ({ code, description }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current && code) {
      mermaid.render(`mermaid-${Math.floor(Math.random() * 1000)}`, code).then((res) => {
        chartRef.current.innerHTML = res.svg;
      });
    }
  }, [code]);

  const downloadPNG = () => {
    const svg = chartRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#001428';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `diagram-${description.substring(0, 20)}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div style={{ 
      background: 'rgba(0, 20, 40, 0.5)', 
      border: '1px solid #00f2ff', 
      borderRadius: '5px', 
      padding: '10px',
      margin: '10px 0',
      maxWidth: '100%',
      overflow: 'auto'
    }}>
      <div ref={chartRef} style={{ minHeight: '100px', display: 'flex', justifyContent: 'center' }}>
        {!code && <div style={{ color: '#00f2ff', fontSize: '12px' }}>Generating diagram...</div>}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
        <button 
          onClick={downloadPNG}
          style={{
            background: 'transparent',
            border: '1px solid #00f2ff',
            color: '#00f2ff',
            fontSize: '10px',
            padding: '2px 8px',
            cursor: 'pointer',
            borderRadius: '3px'
          }}
        >
          DOWNLOAD PNG
        </button>
      </div>
    </div>
  );
};

export default DiagramRenderer;
