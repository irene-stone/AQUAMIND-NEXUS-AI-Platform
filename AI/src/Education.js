import React, { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { updateUserProfile } from './database';

const Education = ({ ecoPoints, refreshProfile }) => {

  const [subTab, setSubTab] = useState('videos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quizInput, setQuizInput] = useState('');
  
const addEcoPointsToDatabase = async (pointsToAdd) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const newTotal = (ecoPoints || 0) + pointsToAdd;

    await updateUserProfile(user.uid, {
      ecoPoints: newTotal
    });

    await refreshProfile();

    alert(`🌟 +${pointsToAdd} Eco-Points added!`);
  } catch (error) {
    console.error("EcoPoints update failed:", error);
  }
};


  // Persistence
  const [watchedVideos, setWatchedVideos] = useState(() => {
    const saved = localStorage.getItem('nexus_watched_videos');
    return saved ? JSON.parse(saved) : [];
  });
  const [completedVideos, setCompletedVideos] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState(() => {
    const saved = localStorage.getItem('nexus_enrolled_courses');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeCourseFile, setActiveCourseFile] = useState(null);
  const [canFinishModule, setCanFinishModule] = useState(false);
  const [courseTimer, setCourseTimer] = useState(0); 
  const [aiFact, setAiFact] = useState("Initializing Nexus Intelligence...");
  
  const [resumeData, setResumeData] = useState(() => {
    const saved = localStorage.getItem('nexus_resume_course');
    return saved ? JSON.parse(saved) : null;
  });

  const [quizMessages, setQuizMessages] = useState([
    { role: 'ai', text: "Welcome to the Nexus AI Lab. I am your sustainability proctor. If you are ready to begin your 10-question certification, just say 'Ready'." }
  ]);

  const maxTimeRef = useRef(0);

  // Sync LocalStorage
  useEffect(() => {
    localStorage.setItem('nexus_watched_videos', JSON.stringify(watchedVideos));
  }, [watchedVideos]);

  useEffect(() => {
    localStorage.setItem('nexus_enrolled_courses', JSON.stringify(enrolledCourses));
  }, [enrolledCourses]);

  useEffect(() => {
    localStorage.setItem('nexus_resume_course', JSON.stringify(resumeData));
  }, [resumeData]);

  // --- AI FACT GENERATOR ---
  const fetchAIFact = async () => {
    const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: "Give me one short, mind-blowing sustainability or water conservation fact (max 20 words). No introduction, just the fact." }]
        })
      });
      const data = await response.json();
      setAiFact(data.choices[0].message.content);
    } catch (e) {
      setAiFact("Did you know? Saving 1 drop of water per second saves 3,000 gallons per year.");
    }
  };

  // --- COURSE TIMER & FACT ROTATION LOGIC ---
  useEffect(() => {
    let interval = null;
    if (activeCourseFile && courseTimer > 0) {
      // Initial fact load
      if (courseTimer === 600) fetchAIFact();

      interval = setInterval(() => {
        setCourseTimer((prev) => {
          // Fetch new fact every 60 seconds (when timer is 540, 480, 420, etc.)
          if (prev > 0 && prev % 60 === 0 && prev !== 600) {
            fetchAIFact();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (courseTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeCourseFile, courseTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- 1. LOCAL VIDEO LOGIC (ANTI-SKIP PRESERVED) ---
  const [localVideos] = useState([
    { id: 'vid1', title: "Gukoresha amazi neza", path: "/videos/Gukoresha amazi neza.mp4", duration: "5:00", points: 50 },
    { id: 'vid2', title: "AMAZI AMENEKA", path: "/videos/AMAZI AMENEKA.mp4", duration: "3:30", points: 80 },
   
  
    { id: 'vid7', title: "WASAC PAYMENT OPTIONS", path: "/videos/WASAC PAYMENT OPTIONS.mp4", duration: "5:00", points: 50 },
    { id: 'vid8', title: "WASAC Vision and Mission", path: "/videos/WASAC Vision and Mission.mp4", duration: "5:00", points: 50 },
    
  ]);

  const filteredVideos = localVideos.filter(v => 
    !watchedVideos.includes(v.id) && 
    (v.title.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === '')
  );

  const handleVideoTimeUpdate = (e) => {
    const video = e.target;
    if (video.currentTime > maxTimeRef.current + 2) {
      video.currentTime = maxTimeRef.current;
    } else {
      maxTimeRef.current = Math.max(maxTimeRef.current, video.currentTime);
    }
  };

  const handleVideoEnd = (id) => {
    setCompletedVideos(prev => [...prev, id]);
    maxTimeRef.current = 0;
  };

  const handleClaimPoints = (id, amount) => {
    addEcoPointsToDatabase(amount);
    setWatchedVideos(prev => [...prev, id]);
    alert(`🌟 Success! ${amount} Eco-Points added.`);
  };

  // --- 2. DYNAMIC SCORING AI QUIZ LOGIC (PRESERVED) ---
  const getAIResponse = async (messages) => {
    const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
    const systemPrompt = {
      role: "system",
      content: `You are the Nexus AI Water Proctor. Use A, B, C, D for options. On final message, MUST provide: "QUIZ_COMPLETE | SCORE: X/10"`
    };
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [systemPrompt, ...messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))]
        })
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) { return "Nexus Link Error."; }
  };

  const handleQuizSend = async () => {
    if (!quizInput || isTyping) return;
    const updated = [...quizMessages, { role: 'user', text: quizInput }];
    setQuizMessages(updated);
    setQuizInput('');
    setIsTyping(true);
    const aiText = await getAIResponse(updated);
    setIsTyping(false);
    setQuizMessages([...updated, { role: 'ai', text: aiText }]);

    if (aiText.includes("QUIZ_COMPLETE")) {
      const scoreMatch = aiText.match(/SCORE:\s*(\d+)\/10/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[1]);
        addEcoPointsToDatabase(score * 10);
        alert(`🏆 Quiz Finished! Score: ${score}/10.`);
      }
    }
  };

  const formatAiText = (text) => {
    return text.split('\n').map((line, i) => {
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/^\*\s/g, '• ');
      return <div key={i} dangerouslySetInnerHTML={{ __html: processed }} style={{ marginBottom: '5px' }} />;
    });
  };

  // --- 3. LOCAL COURSE & STUDY LOCK LOGIC ---
  const [localCourses] = useState([
    { id: 'c1', title: 'Splash Course', modules: 3, points: 250, fileName: 'Splash Course.txt' },
    { id: 'c2', title: 'Module 2', modules: 5, points: 400, fileName: 'Module 2.txt' },
    { id: 'c3', title: 'Module 3', modules: 5, points: 400, fileName: 'Module 3.txt' }
  ]);

  const handleCourseStudy = async (course) => {
    try {
      const response = await fetch(`/courses/${course.fileName}`);
      const text = await response.text();
      const courseData = { title: course.title, content: text, id: course.id, mods: course.modules };
      setActiveCourseFile(courseData);
      setResumeData(courseData);
      setCanFinishModule(false);
      setCourseTimer(600); // 10 minutes
    } catch (err) {
      alert("Error: Course file not found.");
    }
  };

  const handleCourseScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setCanFinishModule(true);
    }
  };

  const completeModule = (id, mods) => {
    if (!canFinishModule || courseTimer > 0) {
      alert(`Please read carefully. Study time remaining: ${formatTime(courseTimer)}`);
      return;
    }
    const curr = enrolledCourses[id] || 0;
    const next = curr + Math.round(100 / mods) > 95 ? 100 : curr + Math.round(100 / mods);
    setEnrolledCourses(prev => ({ ...prev, [id]: next }));
    if (next === 100) {
      const points = localCourses.find(c => c.id === id).points;
      addEcoPointsToDatabase(points);
      alert(`🎓 Course Mastered! +${points} Eco-Points.`);
    }
    setActiveCourseFile(null);
    setResumeData(null);
  };

  return (
    <div style={tabWrapper}>
      <div style={glassSubNav}>
        <button onClick={() => setSubTab('videos')} style={subTab === 'videos' ? activeSub : inactiveSub}> Videos</button>
        <button onClick={() => setSubTab('courses')} style={subTab === 'courses' ? activeSub : inactiveSub}> Courses</button>
        <button onClick={() => setSubTab('quiz')} style={subTab === 'quiz' ? activeSub : inactiveSub}> AI Quiz</button>
      </div>

      {/* 1. VIDEOS SUB-TAB */}
      {subTab === 'videos' && (
        <div style={contentFade}>
          <div style={searchContainer}>
            <input style={glassSearchInput} placeholder="🔍 Search Local Nexus Library..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div style={contentGrid}>
            {filteredVideos.map(v => (
              <div key={v.id} style={glassCard}>
                <div style={videoContainer}>
                  <video width="100%" height="100%" controls onTimeUpdate={handleVideoTimeUpdate} onEnded={() => handleVideoEnd(v.id)} style={{ borderRadius: '15px', background: '#000' }}>
                    <source src={v.path} type="video/mp4" />
                  </video>
                </div>
                <h4 style={cardTitle}>{v.title}</h4>
                <p style={cardSub}>{v.duration} • Reward: {v.points} pts</p>
                {completedVideos.includes(v.id) ? (
                  <button onClick={() => handleClaimPoints(v.id, v.points)} style={glassClaimBtn}>Claim Points</button>
                ) : (
                  <button style={lockedBtn} disabled>Watch fully to unlock</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. COURSES SUB-TAB (WITH 10-MIN TIMER + AI FACTS) */}
      {subTab === 'courses' && (
        <div style={contentGrid}>
          {activeCourseFile ? (
            <div style={{...glassCard, gridColumn: '1/-1'}}>
              <div style={courseHeader}>
                <h3 style={cardTitle}>{activeCourseFile.title}</h3>
                <div style={timerBadge}>⏳ {formatTime(courseTimer)} remaining</div>
              </div>
              
              <div onScroll={handleCourseScroll} style={courseFileContent}>{activeCourseFile.content}</div>
              
              {/* AI FACT BOX */}
              <div style={aiFactContainer}>
                <div style={aiFactLabel}>NEXUS INTELLIGENCE BRIEF</div>
                <p style={aiFactText}>{aiFact}</p>
              </div>

              <div style={{display:'flex', gap:'10px', alignItems:'center', marginTop: '20px'}}>
                {(canFinishModule && courseTimer === 0) ? (
                  <button onClick={() => completeModule(activeCourseFile.id, activeCourseFile.mods)} style={glassClaimBtn}>Finish Module</button>
                ) : (
                  <button style={lockedBtn} disabled>
                    {!canFinishModule ? "Scroll to Bottom" : `Wait ${formatTime(courseTimer)}`}
                  </button>
                )}
                <button onClick={() => setActiveCourseFile(null)} style={cancelBtn}>Close</button>
              </div>
            </div>
          ) : (
            <>
              {resumeData && (
                <div style={resumeBanner} onClick={() => setActiveCourseFile(resumeData)}>
                   <span>📂 Resume lesson: <strong>{resumeData.title}</strong></span>
                   <button style={resumeInlineBtn}>Continue Reading</button>
                </div>
              )}
              {localCourses.map(c => {
                const progress = enrolledCourses[c.id] || 0;
                return (
                  <div key={c.id} style={{...glassCard, borderLeft: progress === 100 ? '4px solid #2ecc71' : '4px solid #9b59b6'}}>
                    <h4 style={cardTitle}>{c.title}</h4>
                    <div style={progressTrack}><div style={{...progressFill, width: `${progress}%`}}></div></div>
                    <button onClick={() => handleCourseStudy(c)} style={progress === 100 ? completedBtn : courseBtn}>
                      {progress === 100 ? "Mastered" : "Study Module"}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* 3. AI QUIZ SUB-TAB */}
      {subTab === 'quiz' && (
        <div style={glassQuizContainer}>
          <div style={quizMessageArea}>
            {quizMessages.map((m, i) => (
              <div key={i} style={{...msgBubble, alignSelf: m.role==='ai'?'flex-start':'flex-end', background: m.role==='ai'?'rgba(255,255,255,0.05)':'#00d2be', color: m.role==='ai'?'#fff':'#000'}}>
                {m.role === 'ai' ? formatAiText(m.text) : m.text}
              </div>
            ))}
            {isTyping && <div style={typingIndicator}>Nexus AI Proctor...</div>}
          </div>
          <div style={glassQuizInputBar}>
            <input value={quizInput} onChange={(e)=>setQuizInput(e.target.value)} placeholder="Answer..." style={glassInputField} onKeyDown={(e)=>e.key==='Enter'&&handleQuizSend()}/>
            <button onClick={handleQuizSend} style={glassSendBtn}>Submit</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLING (UNCHANGED + AI FACT STYLES) ---
const tabWrapper = { padding: '20px' };
const contentFade = { animation: 'fadeIn 0.4s ease' };
const glassSubNav = { display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' };
const inactiveSub = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' };
const activeSub = { ...inactiveSub, color: 'wheat', fontSize: '20px', borderBottom: '2px solid #00d2be' };
const searchContainer = { marginBottom: '25px' };
const glassSearchInput = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px 20px', borderRadius: '15px', color: '#fff' };
const contentGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' };
const glassCard = { background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '25px', padding: '20px' };
const videoContainer = { height: '170px', borderRadius: '15px', overflow: 'hidden', marginBottom: '15px', background: '#000' };
const cardTitle = { margin: '0', color: '#fff', fontSize: '15px', fontWeight: 'bold' };
const cardSub = { fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' };
const glassClaimBtn = { width: '100%', padding: '12px', background: '#00d2be', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#000' };
const lockedBtn = { ...glassClaimBtn, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed', fontSize: '11px' };
const progressTrack = { height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', margin: '15px 0 10px 0' };
const progressFill = { height: '100%', background: '#00d2be', borderRadius: '10px' };
const courseBtn = { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #9b59b6', color: '#9b59b6', borderRadius: '10px', fontWeight: 'bold' };
const completedBtn = { ...courseBtn, borderColor: '#2ecc71', color: '#2ecc71' };
const cancelBtn = { padding: '12px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '12px', cursor: 'pointer' };
const resumeBanner = { gridColumn: '1/-1', background: 'rgba(0,210,190,0.1)', border: '1px dashed #00d2be', padding: '15px 20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#fff', marginBottom: '10px' };
const resumeInlineBtn = { background: '#00d2be', border: 'none', padding: '5px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' };
const courseHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' };
const timerBadge = { background: 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', color: '#00d2be', border: '1px solid rgba(0,210,190,0.3)' };
const courseFileContent = { background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', color: 'rgba(255,255,255,0.8)', marginBottom: '10px', whiteSpace: 'pre-wrap', maxHeight: '250px', overflowY: 'auto' };
const aiFactContainer = { background: 'linear-gradient(90deg, rgba(0,210,190,0.05), transparent)', borderLeft: '2px solid #00d2be', padding: '15px', borderRadius: '10px' };
const aiFactLabel = { fontSize: '10px', fontWeight: 'bold', color: '#00d2be', marginBottom: '5px', letterSpacing: '1px' };
const aiFactText = { fontSize: '13px', color: '#fff', margin: 0, fontStyle: 'italic', lineHeight: '1.4' };
const glassQuizContainer = { height: '550px', ...glassCard, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' };
const quizMessageArea = { flex: 1, padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' };
const msgBubble = { padding: '14px 20px', borderRadius: '18px', maxWidth: '85%', fontSize: '14px' };
const typingIndicator = { fontSize: '11px', color: '#00d2be', marginLeft: '25px' };
const glassQuizInputBar = { padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' };
const glassInputField = { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '15px' };
const glassSendBtn = { background: '#00d2be', border: 'none', padding: '0 25px', borderRadius: '15px', fontWeight: 'bold' };

export default Education;