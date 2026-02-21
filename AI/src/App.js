import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserProfile, createUserProfile, updateUserProfile, calculateWASACBill } from './database';
import { collection, getDocs, query, orderBy } from "firebase/firestore";

import Auth from './Auth';
import Onboarding from './Onboarding';
import Home from './Home';
import Leaderboard from './Leaderboard';
import Education from './Education';
import Service from './Service';
import History from './History';
import Assistant from './Assistant';
import Settings from './Settings';

import bgLight from './Background/5.jpg';
import bgDark from './Background/1.jpg';

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [isBotOpen, setIsBotOpen] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem('nexus_dark_mode') === 'true'
  );

  /* ================= EMAILJS INIT (CORRECTED) ================= */
  useEffect(() => {
    // Check if window.emailjs exists before initializing
    if (window.emailjs) {
        window.emailjs.init("oDeqeJk-Tzo7tTaeS");
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  /* ================= AUTH ================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const cloudProfile = await getUserProfile(currentUser.uid);

        if (cloudProfile) {
          setProfile(cloudProfile);
          setShowOnboarding(false);
          await fetchLeaderboard();
        } else {
          setShowOnboarding(true);
        }

        setUser(currentUser);
      } else {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* ================= PROFILE ================= */

  const refreshProfile = async () => {
    if (!user) return;
    const updated = await getUserProfile(user.uid);
    setProfile(updated);
    await fetchLeaderboard();
  };

  const handleOnboardingComplete = async (selection) => {
    const newProfile = {
      email: user.email,
      displayName: user.displayName,
      district: selection.district,
      accountType: selection.accountType,
      ecoPoints: 0,
      waterGoal: 150,
      monthlyBudget: 5000,
      history: [],
      lastMeterReading: 0,
      createdAt: new Date().toISOString()
    };

    await createUserProfile(user.uid, newProfile);
    await refreshProfile();
    setShowOnboarding(false);
  };

  const handleLogout = () => signOut(auth);

  /* ================= GOAL & BUDGET ================= */

  const handleGoalChange = async (value) => {
    await updateUserProfile(user.uid, { waterGoal: Number(value) });
    await refreshProfile();
  };

  const handleBudgetChange = async (value) => {
    await updateUserProfile(user.uid, { monthlyBudget: Number(value) });
    await refreshProfile();
  };

  /* ================= BILLING & DATES ================= */
  
  const getStandardDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`; 
  };
/* ================= EMAIL NOTIFICATION ================= */
  
  const sendAlertEmail = (currentUsage, goal) => {
    // 1. Define the email parameters (these must match your EmailJS template variables)
    const templateParams = {
      to_name: profile.displayName,
      to_email: profile.email,
      current_usage: currentUsage,
      water_goal: goal,
      message: `Warning! You have used ${currentUsage} Liters. You are close to your limit of ${goal} Liters.`
    };

    // 2. Send the email
    // REPLACE 'YOUR_SERVICE_ID' and 'YOUR_TEMPLATE_ID' with actual IDs from EmailJS
    window.emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
      .then((response) => {
         console.log('SUCCESS!', response.status, response.text);
         alert("📧 An email alert has been sent to " + profile.email);
      }, (err) => {
         console.log('FAILED...', err);
      });
  };

/* ================= NEW READING (FIXED LOGIC) ================= */

  const handleNewReading = async (reading, type) => {
    if (!profile) return;

    const numericReading = Number(reading);
    
    // FIX: Find the last reading specifically for THIS meter type
    const typeHistory = (profile.history || []).filter(h => h.type === type);
    const lastRecord = typeHistory[typeHistory.length - 1];
    const lastReading = lastRecord ? lastRecord.reading : 0;
    
    let consumptionInLiters = 0;

    // SCENARIO 1: First time ever for THIS specific meter (Baseline)
    if (!lastRecord) {
      alert(`✅ Initial Baseline Set at ${numericReading} m³ for ${type} meter! Your next scan will calculate usage.`);
      consumptionInLiters = 0;
    } 
    // SCENARIO 2: Regular update (Calculate Difference)
    else {
      // Logic: New Reading - Old Reading = Usage
      const diffInM3 = numericReading - lastReading;
      
      if (diffInM3 < 0) {
        alert(`⚠️ Error: New reading (${numericReading}) cannot be lower than previous (${lastReading})`);
        return;
      }
      
      consumptionInLiters = diffInM3 * 1000; 

      // Check if usage exceeds 80% of goal
      if (consumptionInLiters >= (profile.waterGoal * 0.8)) {
        sendAlertEmail(consumptionInLiters, profile.waterGoal);
      }
    }

    const newRecord = {
      id: Date.now(),
      type,
      reading: numericReading,
      consumption: consumptionInLiters,
      date: getStandardDate(), 
      time: new Date().toLocaleTimeString()
    };

    const updatedHistory = [...(profile.history || []), newRecord];
    
    // Points Logic
    const bonusPoints = consumptionInLiters > 0 && consumptionInLiters <= (profile.waterGoal || 1500) ? 20 : 5;

    await updateUserProfile(user.uid, {
      history: updatedHistory,
      lastMeterReading: numericReading, // We keep this just in case, but rely on history now
      ecoPoints: (profile.ecoPoints || 0) + (consumptionInLiters > 0 ? bonusPoints : 0)
    });

    if (consumptionInLiters > 0) {
      const billEstimate = calculateWASACBill(consumptionInLiters, profile.accountType);
      alert(`💧 Consumption: ${consumptionInLiters}L (${consumptionInLiters/1000} m³)\n💰 Est. Cost: ${billEstimate.toLocaleString()} RWF`);
    }
    
    await refreshProfile();
  };

  /* ================= LEADERBOARD ================= */

  const fetchLeaderboard = async () => {
    const q = query(collection(db, "users"), orderBy("ecoPoints", "desc"));
    const snapshot = await getDocs(q);

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().displayName,
      district: doc.data().district,
      pts: doc.data().ecoPoints || 0
    }));

    setAllUsers(users);
  };

  /* ================= RENDER ================= */

  if (loading) return <div style={loadingScreen}>Nexus AI is waking up...</div>;
  if (!user) return <Auth />;
  if (showOnboarding) return <Onboarding user={user} onComplete={handleOnboardingComplete} />;

  // handling the background image switch
  const currentBg = isDarkMode ? bgDark : bgLight;

  return (
    <div style={{ ...appContainer, backgroundImage: `linear-gradient(rgba(5,10,14,0.7), rgba(5,10,14,0.7)), url(${currentBg})` }}>
      
      <nav style={sidebarStyle}>
        <div style={logoArea}>
          <div style={profileCircle}>🌊</div>
          <h4 style={userName}>{profile?.displayName || user.displayName}</h4>
          <div style={pointsBadge}>⭐ {profile?.ecoPoints || 0} pts</div>
          <p style={districtLabel}>📍 {profile?.district}</p>
        </div>

        <div style={navGroup}>
          <button onClick={() => setActiveTab('home')} style={activeTab === 'home' ? activeNav : navItem}>Dashboard</button>
          <button onClick={() => setActiveTab('leaderboard')} style={activeTab === 'leaderboard' ? activeNav : navItem}>Leaderboard</button>
          <button onClick={() => setActiveTab('service')} style={activeTab === 'service' ? activeNav : navItem}>Services</button>
          <button onClick={() => setActiveTab('education')} style={activeTab === 'education' ? activeNav : navItem}>Academy</button>
          <button onClick={() => setActiveTab('history')} style={activeTab === 'history' ? activeNav : navItem}>History</button>
        </div>

        <div style={bottomNav}>
          <button onClick={() => setActiveTab('settings')} style={activeTab === 'settings' ? activeNav : navItem}>⚙️ Settings</button>
        </div>
      </nav>

      <main style={mainContent}>
        <header style={topHeader}>
          <h2 style={{ margin: 0, letterSpacing: '2px' }}>NEXUS AI</h2>
          <div style={statCapsule}>{profile?.accountType} Account</div>
        </header>

        {activeTab === 'home' &&
          <Home
            history={profile?.history || []}
            waterGoal={profile?.waterGoal}
            monthlyBudget={profile?.monthlyBudget}
            profile={profile}
          />
        }

        {activeTab === 'leaderboard' &&
          <Leaderboard
            ecoPoints={profile?.ecoPoints}
            waterGoal={profile?.waterGoal}
            monthlyBudget={profile?.monthlyBudget}
            onGoalChange={handleGoalChange}
            onBudgetChange={handleBudgetChange}
            userName={profile?.displayName}
            userDistrict={profile?.district}
            allUsers={allUsers}
            userId={user.uid}
          />
        }

        {activeTab === 'service' &&
          <Service onNewReading={handleNewReading} history={profile?.history || []} />
        }

        {activeTab === 'education' &&
          <Education ecoPoints={profile?.ecoPoints} refreshProfile={refreshProfile} />
        }

        {activeTab === 'history' &&
          <History 
            history={profile?.history || []} 
            onDelete={async (id) => {
                const newHistory = profile.history.filter(h => h.id !== id);
                await updateUserProfile(user.uid, { history: newHistory });
                await refreshProfile();
            }}
          />
        }

        {activeTab === 'settings' &&
          <Settings 
            profile={profile}
            onLogout={handleLogout}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode} 
          />
        }

        <button style={botToggle} onClick={() => setIsBotOpen(!isBotOpen)}>🤖</button>

        {isBotOpen &&
          <Assistant
            onClose={() => setIsBotOpen(false)}
            history={profile?.history || []}
            ecoPoints={profile?.ecoPoints}
            activeTab={activeTab}
            isDarkMode={isDarkMode}
          />
        }
      </main>
    </div>
  );
}

const appContainer = { display:'flex', minHeight:'100vh', backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed', color:'#fff', transition:'0.5s', fontFamily:'sans-serif' };
const sidebarStyle = { width:'220px', backgroundColor:'rgba(11,20,26,0.1)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', padding:'30px 15px', borderRight:'1px solid rgba(255,255,255,0.1)', position:'fixed', height:'95vh', zIndex:10 };
const logoArea = { textAlign:'center', marginBottom:'40px' };
const userName = { margin:'15px 0 5px 0', fontSize:'15px', fontWeight:'bold' };
const districtLabel = { fontSize:'11px', color:'#00d2be', opacity:0.8, marginTop:'5px' };
const navGroup = { display:'flex', flexDirection:'column', gap:'10px', flex:1 };
const bottomNav = { borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'20px' };
const navItem = { background:'none', border:'none', padding:'14px 18px', borderRadius:'12px', cursor:'pointer', color:'#fff', opacity:0.6, textAlign:'left', width:'100%' };
const activeNav = { ...navItem, background:'rgba(0,210,190,0.15)', color:'#00d2be', opacity:1 };
const mainContent = { flex:1, padding:'40px', marginLeft:'240px', position:'relative' };
const topHeader = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px' };
const profileCircle = { width:'60px', height:'60px', borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', fontSize:'24px', border:'1px solid rgba(255,255,255,0.2)' };
const pointsBadge = { background:'rgba(0,210,190,0.15)', color:'#00d2be', padding:'5px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold', display:'inline-block' };
const statCapsule = { background:'rgba(255,255,255,0.05)', backdropFilter:'blur(10px)', padding:'10px 20px', borderRadius:'25px', fontSize:'12px', color:'#00d2be', border:'1px solid rgba(255,255,255,0.1)' };
const botToggle = { position:'fixed', bottom:'30px', right:'30px', width:'60px', height:'60px', borderRadius:'50%', background:'#00d2be', border:'none', fontSize:'24px', cursor:'pointer', zIndex:100 };
const loadingScreen = { height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#050a0e', color:'#00d2be', fontWeight:'bold' };

export default App;