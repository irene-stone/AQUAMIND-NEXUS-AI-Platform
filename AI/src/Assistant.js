import React, { useState } from 'react';



// --- BOT BACKGROUND ASSETS ---

import botBgDark from './Background/E.jpg';  

import botBgLight from './Background/A.jpg';



export const getWebsiteContext = (history, ecoPoints, activeTab) => {

  const uiMap = {

    home: "Viewing Dashboard.",

    leaderboard: "Viewing Rankings.",

    service: "Viewing Meter Scanner.",

    education: "Viewing Academy.",

    history: "Viewing Logs."

  };



  return `

    You are NEXUS AI (aka stone).

    You are to answer questions about only waater related questions and also tell weather forecast basing on the user's district.

    CONTEXT:

    - Tab: ${activeTab.toUpperCase()} (${uiMap[activeTab]})

    - User Stats: ${ecoPoints} Eco-Points.

    - History: ${JSON.stringify(history.slice(0, 3))}

   

    Style: Witty, technical, and helpful.

  `;

};



// Named export for the AI Vision logic used in Service.js

export const analyzeMeterPhoto = async (base64Image, apiKey, type) => {

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {

        method: "POST",

        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },

        body: JSON.stringify({

            model: "google/gemini-2.0-flash-001",

            messages: [{

                role: "user",

                content: [

                    { type: "text", text: `Extract numeric reading from ${type} meter.` },

                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }

                ]

            }]

        })

    });

    const data = await response.json();

    return data.choices[0].message.content.replace(/[^\d.]/g, '');

};



const Assistant = ({ onClose, history, ecoPoints, activeTab, isDarkMode }) => {

  const [input, setInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState([

    { role: 'bot', text: "Hello! I'm stone. I'm here to help you master your water usage. What's on your mind?" }

  ]);



  const activeBotBg = isDarkMode ? botBgDark : botBgLight;



  const handleSend = async () => {

    if (!input || isLoading) return;

    const newMessages = [...messages, { role: 'user', text: input }];

    setMessages(newMessages);

    setInput('');

    setIsLoading(true);



    try {

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {

        method: "POST",

        headers: {

          "Authorization": `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,

          "Content-Type": "application/json"

        },

        body: JSON.stringify({

          model: "google/gemini-2.0-flash-001",

          messages: [

            { role: "system", content: getWebsiteContext(history, ecoPoints, activeTab) },

            ...newMessages.map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))

          ]

        })

      });

      const data = await response.json();

      setMessages([...newMessages, { role: 'bot', text: data.choices[0].message.content }]);

    } catch (error) {

      setMessages([...newMessages, { role: 'bot', text: "Connection error. Please check your setup!" }]);

    } finally {

      setIsLoading(false);

    }

  };



  return (

    <div style={{...botContainer, backgroundImage: `linear-gradient(rgba(11, 20, 26, 0.85), rgba(11, 20, 26, 0.95)), url(${activeBotBg})`}}>

      <div style={botHeader}>

        <span>Nexus Intelligence</span>

        <button onClick={onClose} style={closeBtn}>×</button>

      </div>

      <div style={chatBox}>

        {messages.map((m, i) => (

          <div key={i} style={{...msgBubble, alignSelf: m.role === 'bot' ? 'flex-start' : 'flex-end', background: m.role === 'bot' ? 'rgba(28, 44, 53, 0.9)' : '#00d2be', color: m.role === 'bot' ? '#fff' : '#000'}}>

            {m.text}

          </div>

        ))}

      </div>

      <div style={inputArea}>

        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask stone..." style={botInput} />

        <button onClick={handleSend} style={sendBtn}>{isLoading ? '...' : '🚀'}</button>

      </div>

    </div>

  );

};



// Styles preserved

const botContainer = { position:'fixed', bottom:'100px', right:'30px', width:'350px', height:'450px', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius:'20px', border:'1px solid #00d2be', display:'flex', flexDirection:'column', zIndex:1000, boxShadow:'0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden', transition: 'background-image 0.4s ease' };

const botHeader = { padding:'15px', background: 'rgba(0,0,0,0.2)', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', fontWeight:'bold', color:'#00d2be' };

const chatBox = { flex:1, padding:'15px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px' };

const msgBubble = { padding:'10px 15px', borderRadius:'15px', maxWidth:'80%', fontSize:'13px', backdropFilter: 'blur(5px)' };

const inputArea = { padding:'15px', display:'flex', gap:'10px', background: 'rgba(0,0,0,0.3)' };

const botInput = { flex:1, background:'rgba(5, 10, 14, 0.8)', border:'1px solid rgba(0, 210, 190, 0.3)', color:'#fff', padding:'10px', borderRadius:'10px', outline:'none' };

const sendBtn = { background:'#00d2be', border:'none', borderRadius:'10px', padding:'0 15px', cursor:'pointer' };

const closeBtn = { background:'none', border:'none', color:'#fff', fontSize:'20px', cursor:'pointer' };



export default Assistant;