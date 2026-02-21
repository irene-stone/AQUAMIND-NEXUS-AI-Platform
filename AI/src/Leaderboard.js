import React, { useState, useMemo, useEffect } from 'react';

// Added 'userId' to props so we can filter the user out of the database list
const Leaderboard = ({ 
  ecoPoints, 
  waterGoal, 
  onGoalChange, 
  monthlyBudget, 
  onBudgetChange,
  allUsers = [], 
  userName,
  userDistrict,
  userId // <--- NEW PROP: The unique ID from Firebase
}) => {
  const [subTab, setSubTab] = useState('rankings'); 
  const [rankView, setRankView] = useState('individual'); 

  // --- 1. LOCAL STATE ---
  const [localGoal, setLocalGoal] = useState(() => {
    return localStorage.getItem('nexus_waterGoal') || waterGoal || '';
  });

  const [localBudget, setLocalBudget] = useState(() => {
    return localStorage.getItem('nexus_monthlyBudget') || monthlyBudget || '';
  });

  // --- 2. SYNC FROM FIREBASE ---
  useEffect(() => {
    if (waterGoal) {
      setLocalGoal(waterGoal);
      localStorage.setItem('nexus_waterGoal', waterGoal);
    }
  }, [waterGoal]);

  useEffect(() => {
    if (monthlyBudget) {
      setLocalBudget(monthlyBudget);
      localStorage.setItem('nexus_monthlyBudget', monthlyBudget);
    }
  }, [monthlyBudget]);

  // --- 3. HANDLERS ---
  const handleGoalInput = (e) => {
    const val = e.target.value;
    setLocalGoal(val);
    localStorage.setItem('nexus_waterGoal', val);
    if (onGoalChange) onGoalChange(val);
  };

  const handleBudgetInput = (e) => {
    const val = e.target.value;
    setLocalBudget(val);
    localStorage.setItem('nexus_monthlyBudget', val);
    if (onBudgetChange) onBudgetChange(val);
  };

  // --- 4. DYNAMIC DATA PROCESSING ---
  const sortedIndividuals = useMemo(() => {
    const displayName = userName ? `${userName} (You)` : "You (Nexus)";

    // The "You" Object
    const currentUserObj = { 
      id: userId, // Use the real ID here too
      name: displayName, 
      district: userDistrict || "Kigali", 
      pts: ecoPoints || 0, 
      status: 'online', 
      isUser: true, 
      badge: '🛡️ Rising Star' 
    };

    // FILTER FIX: Remove the user from the list if their ID matches the logged-in userId
    const externalUsers = allUsers.filter(u => u.id !== userId); 
    
    return [...externalUsers, currentUserObj].sort((a, b) => b.pts - a.pts);
  }, [allUsers, ecoPoints, userName, userDistrict, userId]);

  const sortedDistricts = useMemo(() => {
    const districtMap = {};
    sortedIndividuals.forEach(user => {
      const dName = user.district || "Unknown";
      if (!districtMap[dName]) {
        districtMap[dName] = { name: dName, totalPts: 0, members: 0, status: 'steady' };
      }
      districtMap[dName].totalPts += (user.pts || 0);
      districtMap[dName].members += 1;
    });
    return Object.values(districtMap).sort((a, b) => b.totalPts - a.totalPts);
  }, [sortedIndividuals]);

  // --- 5. BADGE DATA ---
  const personalBadges = [
    { id: 1, title: "Water Saver", icon: "💧", req: 50, desc: "First 50L Saved" },
    { id: 2, title: "AI Precision", icon: "🌿", req: 200, desc: "High Accuracy Scans" },
    { id: 3, title: "Nexus Legend", icon: "👑", req: 3000, desc: "Top Tier Status" }
  ];

  const communityBadges = [
    { id: 101, title: "Hive Mind", icon: "🔗", reqPts: 5000, desc: "District crossed 5k pts" },
    { id: 102, title: "Ocean Flow", icon: "🌊", reqPts: 10000, desc: "District crossed 10k pts" },
    { id: 103, title: "Green City", icon: "🏙️", reqPts: 20000, desc: "District crossed 20k pts" }
  ];

  const myDistrictStats = sortedDistricts.find(d => d.name === "Kigali") || { totalPts: 0 };

  return (
    <div style={tabWrapper}>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        .online-pulse { animation: pulse 2s infinite; background: #2ecc71; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 8px; }
      `}</style>

      {/* NAV */}
      <div style={tabNav}>
        <button onClick={() => setSubTab('rankings')} style={{...tabBtn, color: subTab === 'rankings' ? '#00d2be' : 'rgba(255,255,255,0.4)', borderBottom: subTab === 'rankings' ? '2px solid #00d2be' : 'none'}}>🏆 Rankings</button>
        <button onClick={() => setSubTab('goals')} style={{...tabBtn, color: subTab === 'goals' ? '#00d2be' : 'rgba(255,255,255,0.4)', borderBottom: subTab === 'goals' ? '2px solid #00d2be' : 'none'}}>🎯 Goals</button>
      </div>

      {subTab === 'rankings' ? (
        <div style={{display:'flex', flexDirection:'column', gap:'25px'}}>
          
          <div style={glassCard}>
            <div style={headerRow}>
              <h4 style={cardTitle}>LIVE NEXUS RANKINGS</h4>
              <div style={toggleContainer}>
                <span onClick={()=>setRankView('individual')} style={{...toggleBtn, opacity: rankView==='individual'?1:0.4}}>User</span>
                <span style={{opacity:0.2}}>|</span>
                <span onClick={()=>setRankView('community')} style={{...toggleBtn, opacity: rankView==='community'?1:0.4}}>District</span>
              </div>
            </div>

            <div style={listContainer}>
              {rankView === 'individual' ? (
                sortedIndividuals.slice(0, 10).map((user, index) => (
                  <div key={user.id || index} style={user.isUser ? userRankRow : rankRow}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <span style={rankNumber}>#{index + 1}</span>
                      <div style={{display:'flex', flexDirection:'column'}}>
                        <div style={{display:'flex', alignItems:'center'}}>
                           <span className="online-pulse" />
                           <span style={{fontWeight:'bold'}}>{user.name}</span>
                        </div>
                        <span style={{fontSize:'10px', opacity:0.6}}>{user.district}</span>
                      </div>
                    </div>
                    <strong style={{color: user.isUser ? '#000' : '#00d2be'}}>{user.pts.toLocaleString()} pts</strong>
                  </div>
                ))
              ) : (
                 sortedDistricts.map((dist, index) => (
                  <div key={index} style={rankRow}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <span style={rankNumber}>#{index + 1}</span>
                      <div style={{display:'flex', flexDirection:'column'}}>
                        <span style={{fontWeight:'bold'}}>{dist.name} District</span>
                        <span style={{fontSize:'10px', opacity:0.6}}>{dist.members} Contributors</span>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <strong style={{color: '#00d2be', display:'block'}}>{dist.totalPts.toLocaleString()}</strong>
                      <span style={{fontSize:'9px', color: '#f1c40f'}}>Total Points</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={glassCard}>
            <h4 style={{...cardTitle, fontSize:'14px', marginBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'5px'}}>👤 Personal Achievements</h4>
            <div style={{...badgeGrid, marginBottom:'25px'}}>
              {personalBadges.map(badge => {
                const isUnlocked = (ecoPoints || 0) >= badge.req;
                return (
                  <div key={badge.id} style={{...badgeCard, opacity: isUnlocked ? 1 : 0.4, filter: isUnlocked ? 'none' : 'grayscale(100%)', border: isUnlocked ? '1px solid rgba(0, 210, 190, 0.4)' : '1px solid rgba(255,255,255,0.1)', background: isUnlocked ? 'rgba(0, 210, 190, 0.05)' : 'rgba(255,255,255,0.02)'}}>
                    <div style={badgeIcon}>{badge.icon}</div>
                    <div style={badgeName}>{badge.title}</div>
                    <div style={badgeDesc}>{badge.desc}</div>
                    {!isUnlocked && <div style={lockTag}>🔒 {badge.req} pts</div>}
                  </div>
                );
              })}
            </div>

            <h4 style={{...cardTitle, fontSize:'14px', marginBottom:'15px', color:'#f1c40f', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'5px'}}>🌍 Community Milestones</h4>
            <div style={badgeGrid}>
              {communityBadges.map(badge => {
                const isUnlocked = myDistrictStats.totalPts >= badge.reqPts;
                return (
                  <div key={badge.id} style={{...badgeCard, opacity: isUnlocked ? 1 : 0.4, filter: isUnlocked ? 'none' : 'grayscale(100%)', border: isUnlocked ? '1px solid rgba(241, 196, 15, 0.4)' : '1px solid rgba(255,255,255,0.1)', background: isUnlocked ? 'rgba(241, 196, 15, 0.05)' : 'rgba(255,255,255,0.02)'}}>
                    <div style={badgeIcon}>{badge.icon}</div>
                    <div style={{...badgeName, color:'#f1c40f'}}>{badge.title}</div>
                    <div style={badgeDesc}>{badge.desc}</div>
                    {!isUnlocked && <div style={lockTag}>🔒 {badge.reqPts / 1000}k pts</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
          <div style={glassCard}>
            <p style={inputLabel}>Daily Water Goal (Liters)</p>
            <input 
              type="number" 
              value={localGoal} 
              onChange={handleGoalInput} 
              style={largeGlassInput} 
              placeholder="0"
            />
          </div>
          <div style={{...glassCard, border: '1px solid rgba(241, 196, 15, 0.3)'}}>
            <p style={{...inputLabel, color:'#f1c40f'}}>Monthly Bill Budget (RWF)</p>
            <input 
              type="number" 
              value={localBudget} 
              onChange={handleBudgetInput} 
              style={{...largeGlassInput, color:'#f1c40f'}} 
              placeholder="0"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES  ---
const tabWrapper = { padding: '20px', background: 'transparent' };
const tabNav = { display:'flex', gap:'30px', marginBottom:'25px' };
const tabBtn = { background:'none', border:'none', padding:'10px 5px', cursor:'pointer', fontWeight:'bold', fontSize:'14px' };
const glassCard = { background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '25px', padding: '25px' };
const headerRow = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px' };
const cardTitle = { margin: 0, fontSize: '16px', color: '#00d2be', fontWeight: 'bold', textTransform:'uppercase', letterSpacing:'1px' };
const toggleContainer = { display:'flex', gap:'10px', fontSize:'12px', fontWeight:'bold', cursor:'pointer' };
const toggleBtn = { transition: '0.3s' };
const listContainer = { display: 'flex', flexDirection: 'column', gap: '10px' };
const rankRow = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', borderRadius:'15px', background:'rgba(255,255,255,0.03)', fontSize:'14px', border: '1px solid rgba(255,255,255,0.05)' };
const userRankRow = { ...rankRow, background: '#00d2be', color: '#000', border: 'none', fontWeight: 'bold' };
const rankNumber = { fontSize:'14px', fontWeight:'bold', opacity: 0.5, minWidth:'25px' };
const badgeGrid = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:'10px' };
const badgeCard = { textAlign:'center', padding:'15px 5px', borderRadius:'15px' };
const badgeIcon = { fontSize:'24px', marginBottom:'8px' };
const badgeName = { fontSize:'11px', fontWeight:'bold', color:'#00d2be', marginBottom:'5px' };
const badgeDesc = { fontSize:'9px', color: 'rgba(255,255,255,0.5)', lineHeight:'1.3' };
const lockTag = { fontSize:'9px', color:'#f1c40f', marginTop:'8px', fontWeight:'bold' };
const inputLabel = { fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom: '10px' };
const largeGlassInput = { background:'transparent', border:'none', color:'#00d2be', fontSize:'42px', fontWeight:'bold', width:'100%', outline:'none' };

export default Leaderboard;