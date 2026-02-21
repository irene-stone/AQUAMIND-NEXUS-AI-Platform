import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeMeterPhoto } from './Assistant';

const Service = ({ onNewReading, history }) => {
  const [activeSubTab, setActiveSubTab] = useState('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [meterType, setMeterType] = useState(null); 
  

  // EmailJS & Form States
  const [isSending, setIsSending] = useState(false);
  const [imageString, setImageString] = useState('');
  const [desc, setDesc] = useState('');
  const [loc, setLoc] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); 
const [selectedFile, setSelectedFile] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Logic Preserved: Helper to get last scan info
  const getLastScan = (type) => {
    const filtered = history.filter(h => h.type === type);
    const last = filtered[filtered.length - 1];
    return last ? `${last.date} at ${last.time}` : 'Never';
  };

  // --- LOGIC PRESERVED: METER SCANNING ---
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // setStream(mediaStream); <--- DELETE THIS LINE
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      setScanMessage("Camera access denied");
    }
  };

// 1. Your stopCamera is now independent of the 'stream' state
const stopCamera = useCallback(() => {
  if (videoRef.current && videoRef.current.srcObject) {
    const currentStream = videoRef.current.srcObject;
    currentStream.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
  }
}, []); // Empty dependency array is fine now

// 2. Your useEffect for cleanup is simplified
useEffect(() => {
  return () => stopCamera();
}, [stopCamera]);

  const startScanner = async (type) => {
    setMeterType(type);
    setIsScanning(true);
    setScanMessage(`NEXUS Ai scanning ${type} meter...`);
    await startCamera();

    setTimeout(async () => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg').split(',')[1];
        
        try {
          const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
          const reading = await analyzeMeterPhoto(imageData, apiKey, type);
          if (reading && !isNaN(reading)) {
            onNewReading(parseFloat(reading), type);
            setScanMessage("Scanning done!");
          } else {
            setScanMessage("No meter detected. Try again.");
          }
        } catch (e) {
          setScanMessage("Scanning failed. Check connection.");
        } finally {
          setTimeout(() => { stopCamera(); setIsScanning(false); }, 2000);
        }
      }
    }, 4000);
  };

  // --- (SEND EMAIL VIA EMAILJS) ---

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  
  setSelectedFile(file); 


  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    setImageString(event.target.result); 
  };
};

  // ---  DISPATCH LOGIC ---
 

const handleReportSubmit = async () => {
  // Check if selectedFile exists
  if (!desc || !loc || !name || !email || !selectedFile) {
    return alert("Please fill all fields and attach a photo.");
  }
  
  setIsSending(true);

  try {
    // 1. Preparing the image for ImgBB
    const formData = new FormData();
    formData.append("image", selectedFile); // Using the state we just defined

    // 2. Upload to ImgBB
    const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=58870e7798018865dde1a0c6706b2fe1`, {
      method: "POST",
      body: formData,
    });
    
    const imgData = await imgbbResponse.json();
    
    if (!imgData.success) throw new Error("ImgBB Upload Failed");

    const imageUrl = imgData.data.url;

    // 3. Send to EmailJS
    const templateParams = {
      name,
      email,
      location: loc,
      message: desc,
      my_file: imageUrl // Sending a tiny URL instead of a huge string!
    };

    await window.emailjs.send('service_21fa6y3', 'template_26vx85x', templateParams);
    
    alert("Success! Report sent with high-quality photo.");
    
    // Reset everything
    setDesc(''); setLoc(''); setName(''); setEmail(''); 
    setSelectedFile(null); setImageString('');
    
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong. Please try again.");
  } finally {
    setIsSending(false);
  }
};
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div style={tabWrapper}>
      <div style={glassSubNav}>
        <button onClick={() => setActiveSubTab('scanner')} style={activeSubTab === 'scanner' ? activeSubBtn : subBtn}>Meter Scanner</button>
        <button onClick={() => setActiveSubTab('report')} style={activeSubTab === 'report' ? activeSubBtn : subBtn}>Report Issue</button>
      </div>

      {activeSubTab === 'scanner' ? (
        <div style={contentFade}>
          <p style={instructionText}>Select meter type and point your camera at the digital display.</p>
          <div style={cardGrid}>
            <div style={glassMeterCard} onClick={() => !isScanning && startScanner('tap')}>
              <div style={{...iconCircle, color: '#00d2be'}}>🚰</div>
              <h3 style={cardTitle}>Tap Water Meter</h3>
              <p style={cardSub}>Scan primary WASAC meter</p>
              <div style={timestampLabel}>Last: {getLastScan('tap')}</div>
              <button style={scanActionBtn}>Open Camera</button>
            </div>

            <div style={glassMeterCard} onClick={() => !isScanning && startScanner('recycled')}>
              <div style={{...iconCircle, color: '#2ecc71'}}>♻️</div>
              <h3 style={cardTitle}>Recycled Meter</h3>
              <p style={cardSub}>Scan greywater system</p>
              <div style={timestampLabel}>Last: {getLastScan('recycled')}</div>
              <button style={{...scanActionBtn, borderColor: '#2ecc71', color: '#2ecc71'}}>Open Camera</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={contentFade}>
          <div style={glassReportForm}>
            <h3 style={{marginTop: 0, color: '#00d2be', fontSize: '18px'}}>Lodge a Service Report</h3>
            <div style={{...glassUploadBox, borderColor: imageString ? '#00d2be' : 'rgba(255,255,255,0.1)'}}>
              <input type="file" accept="image/*" onChange={handleFileChange} style={fileInput} />
              <span style={{fontSize: '24px', display: 'block'}}>{imageString ? '✅' : '📷'}</span>
              <span style={{fontSize: '16px', opacity: 0.9}}>
                {imageString ? 'Photo Attached' : 'Upload photo of leakage'}
              </span>
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the issue..." style={glassTextArea}></textarea>
            <div style={{display:'flex', gap:'15px', flexDirection: 'column'}}>
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Location" style={glassInputField} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Full Name" style={glassInputField} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your Email Address" style={glassInputField} />
            </div>
            <button onClick={handleReportSubmit} disabled={isSending} style={{...glassSubmitBtn, opacity: isSending ? 0.5 : 1}}>
              {isSending ? "Dispatching Report..." : "Send to Support"}
            </button>
          </div>
        </div>
      )}

      {isScanning && (
        <div style={scanOverlay}>
          <div style={viewfinder}>
            <video ref={videoRef} autoPlay playsInline style={videoStream} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={scanningLine}></div>
            <div style={glassScanStatus}>
              <div style={{color: '#00d2be', fontSize: '10px', textTransform: 'uppercase', marginBottom: '5px'}}>
                NEXUS AI: {meterType} Meter
              </div>
              {scanMessage}
            </div>
          </div>
          <button style={cancelBtn} onClick={() => {stopCamera(); setIsScanning(false);}}>
            Cancel Scan
          </button>
        </div>
      )}
    </div>
  );
};

// --- STYLES  ---
const tabWrapper = { padding: '20px', background: 'transparent', animation: 'fadeIn 0.5s ease' };
const glassSubNav = { display: 'flex', gap: '10px', marginBottom: '30px', background: 'rgba(255, 255, 255, 0.1)', padding: '6px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' };
const subBtn = { flex: 1, padding: '12px', background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.4)', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' };
const activeSubBtn = { ...subBtn, background: 'rgba(0, 210, 190, 0.3)', color: '#ffffffff' };
const contentFade = { animation: 'fadeIn 0.4s ease' };
const instructionText = { fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginBottom: '25px', textAlign: 'center', letterSpacing: '0.5px' };
const cardGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const glassMeterCard = { background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '25px', padding: '25px', textAlign: 'center', cursor: 'pointer', transition: '0.3s transform ease', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)' };
const iconCircle = { fontSize: '32px', marginBottom: '12px' };
const cardTitle = { margin: '0 0 5px 0', fontSize: '15px', fontWeight: 'bold', color: '#fff' };
const cardSub = { fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' };
const timestampLabel = { fontSize: '9px', color: '#00d2be', background: 'rgba(0, 210, 190, 0.05)', padding: '6px 12px', borderRadius: '10px', display: 'inline-block', marginBottom: '15px', border: '1px solid rgba(0, 210, 190, 0.2)', fontWeight: 'bold' };
const scanActionBtn = { background: 'transparent', border: '1px solid #00d2be', color: '#00d2be', padding: '8px 18px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', width: '100%' };
const scanOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,10,15,0.95)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const viewfinder = { width: '300px', height: '450px', border: '2px solid rgba(0, 210, 190, 0.5)', borderRadius: '30px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 40px rgba(0, 210, 190, 0.2)' };
const videoStream = { width: '100%', height: '100%', objectFit: 'cover' };
const scanningLine = { position: 'absolute', width: '100%', height: '2px', background: '#00d2be', boxShadow: '0 0 15px #00d2be', zIndex: 10, animation: 'scanMove 3s linear infinite' };
const glassScanStatus = { position: 'absolute', bottom: '30px', width: '80%', left: '10%', textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px', background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '15px', backdropFilter: 'blur(5px)', border: '1px solid rgba(0, 210, 190, 0.3)' };
const cancelBtn = { marginTop: '25px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 40px', borderRadius: '20px', fontWeight: 'bold' };
const glassReportForm = { ...glassMeterCard, display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' };
const glassUploadBox = { border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '15px', padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', position: 'relative' };
const fileInput = { position: 'absolute', opacity: 0, cursor: 'pointer', width: '100%', height: '100%', top:0, left:0 };
const glassTextArea = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', padding: '15px', minHeight: '100px', outline: 'none', fontSize: '14px' };
const glassInputField = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', padding: '12px', flex: 1, outline: 'none', fontSize: '14px' };
const glassSubmitBtn = { background: '#00d2be', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: 'bold', color: '#000', fontSize: '14px', cursor: 'pointer', transition: '0.2s' };

export default Service;