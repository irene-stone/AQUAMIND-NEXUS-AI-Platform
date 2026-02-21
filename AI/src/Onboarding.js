import React, { useState } from 'react';
import bgImage from './Background/1.jpg'; 

const Onboarding = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [district, setDistrict] = useState('');
  const [accountType, setAccountType] = useState('Residential');

  const districts = [
    "Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Rubavu", "Gicumbi", 
    "Nyagatare", "Huye", "Muhanga", "Rusizi", "Rwamagana", "Kayonza"
  ];

  const handleFinish = () => {
    if (!district) return alert("Please select your District to join a community!");
    onComplete({ district, accountType });
  };

  const renderSplash = (title, text, icon) => (
    <div style={glassCard}>
      <div style={iconCircle}>{icon}</div>
      <h2 style={titleStyle}>{title}</h2>
      <p style={textStyle}>{text}</p>
      <button onClick={() => setStep(step + 1)} style={nextBtn}>Next →</button>
    </div>
  );

  return (
    <div style={{...overlay, backgroundImage: `linear-gradient(rgba(5, 10, 14, 0.7), rgba(5, 10, 14, 0.9)), url(${bgImage})`}}>
      {step === 1 && renderSplash("Water is Precious", "Knowledge is Power. Nexus AI helps you track every drop to build a sustainable future for Rwanda.", "🌊")}
      {step === 2 && renderSplash("Scan with Stone", "Our AI assistant, Stone, reads your meter instantly through your camera. No more manual logs.", "📸")}
      {step === 3 && renderSplash("Compete for your District", "Earn Eco-Points for your community. Will your district lead the national leaderboard?", "🏆")}

      {step === 4 && (
        <div style={glassCard}>
          <h2 style={titleStyle}>Final Step</h2>
          <p style={textStyle}>Welcome, <strong>{user.displayName}</strong>! Help us calculate your bills accurately.</p>
          
          <div style={inputGroup}>
            <label style={label}>District</label>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} style={select}>
              <option value="">Choose District...</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={inputGroup}>
            <label style={label}>Account Type (WASAC Tariff)</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} style={select}>
              <option value="Residential">Residential (Home)</option>
              <option value="Non-Residential">Non-Residential (Office/Shop)</option>
              <option value="Industrial">Industrial (Factory)</option>
            </select>
          </div>

          <button onClick={handleFinish} style={finishBtn}>Start Saving Water</button>
        </div>
      )}
    </div>
  );
};

const overlay = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundSize: 'cover', backgroundPosition: 'center', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center' };
const glassCard = { width:'420px', padding:'50px', background:'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', borderRadius:'40px', border:'1px solid rgba(0, 210, 190, 0.3)', textAlign:'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' };
const iconCircle = { fontSize: '60px', marginBottom: '25px' };
const titleStyle = { color:'#00d2be', fontSize:'26px', fontWeight: 'bold', marginBottom:'15px', letterSpacing: '1px' };
const textStyle = { color:'rgba(255,255,255,0.8)', fontSize:'15px', lineHeight:'1.6', marginBottom:'35px' };
const nextBtn = { padding:'14px 40px', borderRadius:'18px', background:'#00d2be', border:'none', color:'#000', fontWeight:'bold', cursor:'pointer', fontSize: '15px' };
const inputGroup = { textAlign:'left', marginBottom:'20px' };
const label = { display:'block', color:'#00d2be', fontSize:'13px', marginBottom:'10px', marginLeft:'5px', fontWeight: 'bold' };
const select = { width:'100%', padding:'14px', borderRadius:'15px', background:'rgba(255,255,255,0.05)', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', outline:'none', cursor: 'pointer' };
const finishBtn = { ...nextBtn, width:'100%', marginTop:'10px' };

export default Onboarding;