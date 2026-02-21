import React from 'react';

const Settings = ({ profile, onLogout, isDarkMode, setIsDarkMode }) => {

  const handleToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    // Save preference to local storage so it remembers next time
    localStorage.setItem('nexus_dark_mode', newMode);
  };

  return (
    <div style={settingsCard}>
      <h3 style={headerStyle}>👤 Account Settings</h3>

      {/* User Profile Section */}
      <div style={section}>
        <div style={row}>
          <span style={label}>Name:</span>
          <strong style={value}>{profile?.displayName}</strong>
        </div>
        <div style={row}>
          <span style={label}>District:</span>
          <strong style={value}>{profile?.district}</strong>
        </div>
        <div style={row}>
          <span style={label}>Account Type:</span>
          <strong style={value}>{profile?.accountType}</strong>
        </div>
      </div>

      <hr style={divider} />

      {/* Appearance Section */}
      <h4 style={subHeader}>🎨 Appearance</h4>
      <div style={toggleContainer}>
        <span style={label}>Dark Mode (Night View)</span>
        <button 
          onClick={handleToggle} 
          style={{
            ...toggleBtn, 
            background: isDarkMode ? '#00d2be' : 'rgba(255,255,255,0.1)'
          }}
        >
          <div style={{
            ...toggleCircle,
            transform: isDarkMode ? 'translateX(26px)' : 'translateX(0)',
            background: isDarkMode ? '#fff' : '#00d2be'
          }} />
        </button>
      </div>

      <hr style={divider} />

      {/* Actions */}
      <button onClick={onLogout} style={logoutBtn}>Sign Out</button>
    </div>
  );
};

// --- Styles ---
const settingsCard = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(15px)',
  borderRadius: '25px',
  padding: '30px',
  border: '1px solid rgba(255,255,255,0.1)',
  maxWidth: '500px',
  width: '100%',
  margin: '0 auto',
  color: '#fff'
};

const headerStyle = { color: '#00d2be', marginTop: 0, marginBottom: '20px' };
const subHeader = { fontSize: '14px', color: '#00d2be', opacity: 0.8, marginBottom: '15px' };
const section = { display: 'flex', flexDirection: 'column', gap: '12px' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const label = { fontSize: '14px', opacity: 0.7 };
const value = { fontSize: '15px' };

const divider = { 
  border: 'none', 
  height: '1px', 
  background: 'rgba(255,255,255,0.1)', 
  margin: '25px 0' 
};

// Toggle Switch Styles
const toggleContainer = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const toggleBtn = {
  width: '56px',
  height: '30px',
  borderRadius: '30px',
  border: 'none',
  position: 'relative',
  cursor: 'pointer',
  transition: '0.3s'
};
const toggleCircle = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  position: 'absolute',
  top: '3px',
  left: '3px',
  transition: '0.3s',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
};

const logoutBtn = {
  padding: '15px',
  borderRadius: '15px',
  background: 'linear-gradient(45deg, #ff416c, #ff4b2b)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
  width: '100%',
  marginTop: '10px',
  fontSize: '14px',
  letterSpacing: '1px',
  transition: '0.2s'
};

export default Settings;