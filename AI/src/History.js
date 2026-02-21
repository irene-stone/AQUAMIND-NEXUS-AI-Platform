import React, { useState } from 'react';

const History = ({ history = [], onDelete }) => { // Default history to empty array to prevent crashes
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  // --- LOGIC UPDATED TO HANDLE BOTH 'consumption' AND 'amount' ---
const calculateRowCost = (liters, type) => {
  const val = liters || 0;
  if (type === 'recycled') return `+${val * 2} Pts`;
  
  const m3 = val / 1000;
  let cost = 0;

  // Official WASAC Graduated Tiers (VAT Inclusive)
  if (m3 <= 5) {
    cost = m3 * 402;
  } else if (m3 <= 20) {
    cost = (5 * 402) + ((m3 - 5) * 852);
  } else if (m3 <= 50) {
    cost = (5 * 402) + (15 * 852) + ((m3 - 20) * 999.635);
  } else {
    cost = (5 * 402) + (15 * 852) + (30 * 999.635) + ((m3 - 50) * 1037.491);
  }
  
  return `-${Math.round(cost).toLocaleString()} RWF`;
};

  // Safe summation logic
  const totalLiters = history
    .filter(h => h.type === 'tap' || !h.type)
    .reduce((sum, h) => sum + (h.consumption || h.amount || 0), 0);

  const totalRecycled = history
    .filter(h => h.type === 'recycled')
    .reduce((sum, h) => sum + (h.consumption || h.amount || 0), 0);

  const handleSearch = () => {
    setActiveQuery(searchTerm.toLowerCase());
  };

  const downloadCSV = () => {
    if (history.length === 0) return alert("No data to export.");
    const headers = "Date,Time,Source,Amount(L),Raw_Meter\n";
    const rows = history.map(h => 
      `${h.date},${h.time || 'N/A'},${h.type},${h.consumption || h.amount || 0},${h.reading || h.rawReading || 0}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nexus_Usage_Report.csv`;
    a.click();
  };

  return (
    <div style={tabWrapper}>
      {/* 1. SUMMARY BAR */}
      <div style={summaryGlassBar}>
        <div style={statBox}>
          <span style={statLabel}>TOTAL CONSUMPTION</span>
          <span style={statValue}>{(totalLiters || 0).toLocaleString()} L</span>
        </div>
        <div style={{...statBox, borderLeft: '1px solid rgba(255,255,255,0.1)'}}>
          <span style={statLabel}>TOTAL RECYCLED</span>
          <span style={{...statValue, color: '#2ecc71'}}>{(totalRecycled || 0).toLocaleString()} L</span>
        </div>
        <div style={{...statBox, borderLeft: '1px solid rgba(255,255,255,0.1)'}}>
          <span style={statLabel}>AVG. DAILY USE</span>
          <span style={statValue}>{history.length > 0 ? Math.round(totalLiters / 7).toLocaleString() : 0} L</span>
        </div>
      </div>

      {/* 2. SEARCH & EXPORT */}
      <div style={headerRow}>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <div style={searchGroup}>
            <input 
              type="text" 
              placeholder="Search date..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={searchField}
            />
            <button onClick={handleSearch} style={searchBtn}>🔍</button>
          </div>
          {activeQuery && (
            <button onClick={() => {setSearchTerm(''); setActiveQuery('');}} style={clearBtn}>Reset</button>
          )}
        </div>
        <button onClick={downloadCSV} style={exportBtn}>📊 Export CSV</button>
      </div>

      {/* 3. USAGE LOGS */}
      <div style={historyList}>
        {history.length === 0 ? (
          <div style={glassCard}>
            <p style={{ opacity: 0.5, textAlign: 'center', margin: 0 }}>No records found.</p>
          </div>
        ) : (
          history.slice().reverse().map((h, idx) => { // slice().reverse() shows newest first
            const displayAmount = h.consumption || h.amount || 0;
            const displayReading = h.reading || h.rawReading || 0;
            const itemType = h.type || 'tap';

            const isMatch = activeQuery !== '' && (
              h.date.toLowerCase().includes(activeQuery) || 
              itemType.toLowerCase().includes(activeQuery)
            );

            if (activeQuery !== '' && !isMatch) return null;

            return (
              <div key={h.id || idx} style={{
                ...historyItem,
                borderLeft: isMatch ? '5px solid #00d2be' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isMatch ? 'rgba(0, 210, 190, 0.1)' : 'rgba(255, 255, 255, 0.03)'
              }}>
                <div style={typeIndicator(itemType)}>
                  {itemType === 'tap' ? '💧' : '♻️'}
                </div>
                <div style={itemDetails}>
                  <span style={itemDate}>{h.date} | {h.time}</span>
                  <h3 style={itemAmount}>
                    {displayAmount.toLocaleString()} L 
                    <span style={{...itemTypeLabel, color: itemType === 'tap' ? '#00d2be' : '#2ecc71'}}>
                        ({itemType.toUpperCase()})
                    </span>
                  </h3>
                  <span style={rawReadingText}>Meter: {displayReading} m³</span>
                </div>

                <div style={impactSection}>
                    <span style={{...impactValue, color: itemType === 'tap' ? '#ff4d4d' : '#2ecc71'}}>
                        {calculateRowCost(displayAmount, itemType)}
                    </span>
                    <button onClick={() => onDelete && onDelete(h.id)} style={deleteBtn}>🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- STYLES (Keep exactly as you had them) ---
const tabWrapper = { padding: '20px', background: 'transparent' };
const summaryGlassBar = { display: 'flex', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(15px)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '30px', padding: '20px 0' };
const statBox = { flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '5px' };
const statLabel = { fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', letterSpacing: '1px' };
const statValue = { fontSize: '20px', fontWeight: 'bold', color: '#fff' };
const headerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const searchGroup = { display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' };
const searchField = { background: 'transparent', border: 'none', color: '#fff', padding: '10px 15px', fontSize: '14px', outline: 'none', width: '200px' };
const searchBtn = { background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#00d2be', padding: '0 15px', cursor: 'pointer' };
const clearBtn = { background: 'none', border: 'none', color: '#00d2be', fontSize: '12px', cursor: 'pointer', opacity: 0.7 };
const exportBtn = { background: 'transparent', border: '1px solid #00d2be', color: '#00d2be', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const historyList = { display: 'flex', flexDirection: 'column', gap: '15px' };
const glassCard = { background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '25px', padding: '25px' };
const historyItem = { ...glassCard, display: 'flex', alignItems: 'center', padding: '18px 25px', transition: '0.3s all ease' };
const typeIndicator = (type) => ({ width: '45px', height: '45px', borderRadius: '12px', background: type === 'tap' ? 'rgba(0, 210, 190, 0.1)' : 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '20px', border: '1px solid rgba(255,255,255,0.05)' });
const itemDetails = { flex: 1 };
const itemDate = { fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '4px' };
const itemAmount = { margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#fff' };
const itemTypeLabel = { fontSize: '10px', marginLeft: '10px', opacity: 0.5, letterSpacing: '1px' };
const rawReadingText = { fontSize: '11px', opacity: 0.4, marginTop: '4px', display: 'block' };
const impactSection = { display: 'flex', alignItems: 'center', gap: '20px' };
const impactValue = { fontSize: '14px', fontWeight: 'bold', minWidth: '80px', textAlign: 'right' };
const deleteBtn = { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.3, transition: '0.3s' };

export default History;