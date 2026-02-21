import React from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import bgImage from './Background/1.jpg'; 

const Auth = () => {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error.message);
      alert("Failed to sign in. Please check your connection.");
    }
  };

  
  const handleAboutRedirect = () => {
    window.open('https://learnnexus.lovable.app', '_blank');
  };

  return (
    <div style={{...overlay, backgroundImage: `linear-gradient(rgba(5, 10, 14, 0.7), rgba(5, 10, 14, 0.9)), url(${bgImage})`}}>
      <div style={glassCard}>
        <div style={logoCircle}>🌊</div>
        <h1 style={title}>NEXUS AI</h1>
        <p style={subtitle}>Sustainable Water Intelligence</p>
        
        <div style={buttonGroup}>
          <button onClick={handleGoogleLogin} style={googleBtn}>
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQitAfXpzxbOu0uJFMSdIeJsnZNxp_F56C7Eg&s" alt="G" style={gIcon}/>
            Continue with Google
          </button>

          <button onClick={handleAboutRedirect} style={aboutBtn}>
             Learn About Nexus
          </button>
        </div>

        <p style={footerText}>Secure login powered by Firebase Authentication</p>
      </div>
    </div>
  );
};

// --- STYLES ---
const overlay = { 
  height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
  backgroundSize: 'cover', backgroundPosition: 'center' 
};

const glassCard = { 
  width: '380px', padding: '60px 40px', 
  background: 'rgba(255, 255, 255, 0.05)', 
  backdropFilter: 'blur(25px)', 
  borderRadius: '40px', 
  border: '1px solid rgba(0, 210, 190, 0.3)', 
  textAlign: 'center',
  boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
};

const logoCircle = { 
  width: '80px', height: '80px', borderRadius: '50%', 
  background: 'rgba(0, 210, 190, 0.1)', margin: '0 auto 20px', 
  display: 'flex', alignItems: 'center', justifyContent: 'center', 
  fontSize: '40px', border: '1px solid rgba(0, 210, 190, 0.3)' 
};

const title = { margin: 0, color: '#fff', letterSpacing: '4px', fontSize: '28px', fontWeight: '900' };
const subtitle = { color: '#00d2be', fontSize: '14px', marginBottom: '40px', opacity: 0.8, letterSpacing: '1px' };

const buttonGroup = { display: 'flex', flexDirection: 'column', gap: '15px' };

const googleBtn = { 
  width: '100%', padding: '16px', borderRadius: '18px', border: 'none', 
  background: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer', 
  display: 'flex', alignItems: 'center', justifyContent: 'center', 
  gap: '12px', fontSize: '15px', transition: '0.3s' 
};

const aboutBtn = {
  width: '100%', padding: '14px', borderRadius: '18px', 
  background: 'rgba(255, 255, 255, 0.1)', color: '#fff', 
  border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', 
  cursor: 'pointer', fontSize: '14px', transition: '0.3s'
};

const gIcon = { width: '20px' };
const footerText = { marginTop: '30px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' };

export default Auth;