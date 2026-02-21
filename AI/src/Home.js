import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateWASACBill } from './database';

const Home = ({ history, waterGoal, monthlyBudget, profile }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const userDistrict = profile?.district?.trim().replace(" District", "");
  const weatherKey = "ac557469586743758ce162615261602";

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const fetchWeather = async () => {
      if (!profile || !profile.district) return;
      try {
        // Fetching 7 days to cover the full week forecast
        const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherKey}&q=${userDistrict},Rwanda&days=7&aqi=no&alerts=yes`);
        const data = await res.json();
        if (data && !data.error) setWeatherData(data);
      } catch (err) { console.error("Weather fetch failed:", err); }
    };
    fetchWeather();
    return () => clearInterval(timer);
  }, [userDistrict, profile]);

  // --- RESILIENT HELPERS ---
  const getTodayStr = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${now.getFullYear()}`;
  };

  const parseDBDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const [d, m, y] = dateStr.split('/');
    return new Date(y, m - 1, d);
  };

  const getAmount = (item) => parseFloat(item.consumption || 0);

  // --- CORE CALCULATIONS ---
  const todayStr = getTodayStr();
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const todayLiters = history
    .filter(h => h.date === todayStr && h.type === 'tap')
    .reduce((sum, h) => sum + getAmount(h), 0);

  const todayCost = todayLiters > 0 ? calculateWASACBill(todayLiters, profile?.accountType) : 0;

  const monthlyEntries = history.filter(h => {
    const d = parseDBDate(h.date);
    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });

  const monthlyTotalLiters = monthlyEntries
    .filter(h => h.type === 'tap')
    .reduce((sum, h) => sum + getAmount(h), 0);

  const estimatedMonthlyBill = monthlyTotalLiters > 0 ? calculateWASACBill(monthlyTotalLiters, profile?.accountType) : 0;

  const recycledLiters = monthlyEntries
    .filter(h => h.type === 'recycled')
    .reduce((sum, h) => sum + getAmount(h), 0);

  const totalSavingsRWF = Math.round(recycledLiters * 0.34);

  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const searchStr = `${day}/${month}/${d.getFullYear()}`;

    const dayEntries = history.filter(h => h.date === searchStr);
    return {
      name: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      tap: dayEntries.filter(h => h.type === 'tap').reduce((s, h) => s + getAmount(h), 0),
      recycled: dayEntries.filter(h => h.type === 'recycled').reduce((s, h) => s + getAmount(h), 0),
    };
  }).reverse();

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyGridData = monthNames.map((name, idx) => {
    const mEntries = history.filter(h => {
      const d = parseDBDate(h.date);
      return d.getMonth() === idx && d.getFullYear() === currentYear;
    });
    const tLiters = mEntries.filter(e => e.type === 'tap').reduce((s, e) => s + getAmount(e), 0);
    return {
      name,
      totalLiters: tLiters,
      cost: tLiters > 0 ? calculateWASACBill(tLiters, profile?.accountType) : 0
    };
  });

  const usagePercent = waterGoal > 0 ? Math.min((todayLiters / waterGoal) * 100, 100) : 0;
  const isOverLimit = todayLiters > waterGoal;
  const dashArray = 251.2;
  const dashOffset = dashArray - (dashArray * usagePercent) / 100;

  // --- WEATHER & ADVICE ---
  const currentDay = weatherData?.forecast?.forecastday[0]?.day;
  const tomorrowDay = weatherData?.forecast?.forecastday[1]?.day;
  const rainChanceToday = currentDay?.daily_chance_of_rain || 0;
  const rainChanceTmrw = tomorrowDay?.daily_chance_of_rain || 0;
  const humidity = weatherData?.current?.humidity || 0;

  // --- UPDATED DYNAMIC STRATEGIC ADVICE ---
  const getStrategicAdvice = () => {
    let advice = [];

    // 1. WEATHER ADVICE (Rain Harvesting)
    if (rainChanceToday > 60 || rainChanceTmrw > 60) {
      advice.push({ 
        title: "⛈️ Rain Harvesting Alert", 
        text: `High rain probability (${Math.max(rainChanceToday, rainChanceTmrw)}%). Deploy your collection tanks now to reduce tap reliance.` 
      });
    } else if (humidity < 30) {
      advice.push({ 
        title: "☀️ Evaporation Warning", 
        text: "Low humidity detected. Water your garden after sunset to prevent rapid evaporation and waste." 
      });
    } else {
      advice.push({
        title: "🌦️ Weather Insight",
        text: "Clear skies ahead. A great time to check for external pipe leaks or solar water heater maintenance."
      });
    }

    // 2. CONSUMPTION VS GOAL ADVICE
    if (isOverLimit) {
      advice.push({ 
        title: "⚠️ Goal Breach", 
        text: `You've exceeded your daily limit by ${todayLiters - waterGoal}L. Consider skipping non-essential water tasks today.` 
      });
    } else if (usagePercent > 80) {
      advice.push({ 
        title: "🟡 Near Capacity", 
        text: "You have used 80% of your daily goal. Tighten usage for the remaining hours to stay green." 
      });
    } else {
      advice.push({ 
        title: "✅ Efficiency Leader", 
        text: "Excellent pacing! You are currently on track to stay well within your daily sustainability goal." 
      });
    }

    // 3. FINANCIAL / BUDGET ADVICE
 
    const remainingBudget = monthlyBudget - estimatedMonthlyBill;
    const daysRemaining = new Date(currentYear, currentMonthIdx + 1, 0).getDate() - new Date().getDate();
    const dailyBudgetRemaining = daysRemaining > 0 ? (remainingBudget / daysRemaining) : remainingBudget;

    if (estimatedMonthlyBill > monthlyBudget) {
      advice.push({ 
        title: "💸 Budget Overrun", 
        text: `Your bill is ${Math.abs(remainingBudget).toLocaleString()} RWF over budget. Use more recycled water to pivot and avoid higher WASAC tiers.` 
      });
    } else {
      advice.push({ 
        title: "💰 Cost Savings", 
        text: `You have ${remainingBudget.toLocaleString()} RWF left. To stay under budget, try to keep your daily water cost below ${Math.max(0, Math.round(dailyBudgetRemaining)).toLocaleString()} RWF.` 
      });
    }

    // 4. RECYCLED WATER TIP (Personalized)
    const recycledRatio = (recycledLiters / (monthlyTotalLiters + recycledLiters)) * 100;
    if (recycledRatio < 20) {
      advice.push({ 
        title: "♻️ Recycling Potential", 
        text: "Your recycled water usage is low. Start collecting gray water from your laundry to boost your Eco-Points." 
      });
    } else {
      advice.push({ 
        title: "🌿 Eco-Warrior Status", 
        text: `Impressive! ${recycledRatio.toFixed(1)}% of your usage is recycled water. This significantly lowers your carbon footprint.` 
      });
    }

    // 5. GENERAL PRESERVATION TIP (Cyclic)
    const tips = [
      "Check your toilet flappers; a small leak can waste up to 700 liters of water a month.",
      "Shortening your shower by just 2 minutes can save up to 1,500 liters per month.",
      "Use a bowl to wash vegetables instead of a running tap; use the leftover water for plants.",
      "Ensure your washing machine is always on a full load to maximize water-to-cloth efficiency."
    ];
    const dailyTip = tips[new Date().getDate() % tips.length];
    advice.push({ title: "💡 Pro-Tip", text: dailyTip });

    return advice;
  };

  return (
    <div style={waterWrapper}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 2px #ff4d4d); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 15px #ff4d4d); }
          100% { transform: scale(1); filter: drop-shadow(0 0 2px #ff4d4d); }
        }
        .gauge-pulse { animation: pulse 1.5s infinite ease-in-out; }
      `}</style>

      <div style={container}>
        <div style={topFlexGrid}>
          {/* CHART */}
          <div style={{ ...glassCardFull, flex: 1.5 }}>
            <div style={cardHeader}>
              <span style={cardIcon}>📊</span>
              <div><h4 style={cardTitle}>7-DAY CONSUMPTION PULSE</h4><p style={cardSubtitle}>Tap vs. Recycled Comparison</p></div>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#fff" fontSize={10} />
                  <YAxis stroke="#fff" fontSize={10} unit="L" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="tap" name="Tap" fill="#00d2be" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recycled" name="Recycled" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* WEATHER SECTION */}
          <div style={{ ...glassCardFull, flex: 1.2 }}>
            <div style={cardHeader}>
              <span style={cardIcon}>🌦️</span>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={cardTitle}>DISTRICT WEATHER</h4>
                  <span style={liveTime}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p style={cardSubtitle}>{weatherData?.location.name || userDistrict} • {currentTime.toLocaleDateString()}</p>
              </div>
            </div>

            <div style={weatherMain}>
              <div>
                <h2 style={tempStyle}>{weatherData?.current?.temp_c || '--'}°C</h2>
                <p style={conditionText}>{weatherData?.current?.condition?.text || 'Loading...'}</p>
              </div>
              {weatherData?.current?.condition?.icon && <img src={weatherData.current.condition.icon} alt="weather" style={{ width: '64px' }} />}
            </div>

            <div style={weatherDetailsGrid}>
              <div style={detailBox}><span style={detailLabel}>💧 Humidity</span><span style={detailValue}>{humidity}%</span></div>
              <div style={detailBox}><span style={detailLabel}>🌬️ Wind</span><span style={detailValue}>{weatherData?.current?.wind_kph || 0} kph</span></div>
              <div style={detailBox}><span style={detailLabel}>☔ Rain Today</span><span style={detailValue}>{rainChanceToday}%</span></div>
              <div style={detailBox}><span style={detailLabel}>🌧️ Rain Tmrw</span><span style={detailValue}>{rainChanceTmrw}%</span></div>
            </div>

            {/* 7-DAY FORECAST TIMELINE */}
            <h5 style={timelineTitle}>7-Day Forecast</h5>
            <div style={weatherTimeline}>
              {weatherData?.forecast?.forecastday.map((day, index) => (
                <div key={index} style={miniWeatherCard}>
                  <p style={{ fontSize: '9px', margin: '0 0 4px 0', opacity: 0.8 }}>
                    {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <img src={day.day.condition.icon} alt="icon" style={{ width: '24px' }} />
                  <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{Math.round(day.day.maxtemp_c)}°</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ADVICE & GAUGE */}
        <div style={middleGrid}>
          <div style={glassCard}>
            <div style={cardHeader}><div style={aiBrainIcon}>🧠</div><h4 style={cardTitle}>NEXUS STRATEGIC ADVICE</h4></div>
            <div style={adviceBox}>
              {getStrategicAdvice().map((adv, i) => (
                <div key={i} style={adviceItem}>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>{adv.title}</strong>
                  <p style={adviceText}>{adv.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...glassCard, alignItems: 'center', textAlign: 'center', maxWidth: '300px' }}>
            <h4 style={cardTitle}>WATER HEALTH</h4>
            <div style={{ position: 'relative', width: '130px', height: '130px', marginTop: '15px' }} className={isOverLimit ? 'gauge-pulse' : ''}>
              <svg width="130" height="130" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="40" stroke={isOverLimit ? "#ff4d4d" : "#00d2be"} strokeWidth="8" fill="none"
                  strokeDasharray={dashArray} strokeDashoffset={dashOffset} strokeLinecap="round" />
              </svg>
              <div style={gaugeText}>
                <span style={{ fontSize: '22px', fontWeight: 'bold' }}>{Math.round(usagePercent)}%</span>
                <span style={{ fontSize: '9px', opacity: 0.6 }}>OF LIMIT</span>
              </div>
            </div>
            <p style={{ fontSize: '10px', color: isOverLimit ? '#ff4d4d' : '#00d2be', marginTop: '15px', fontWeight: 'bold' }}>
              {isOverLimit ? "CRITICAL: LIMIT EXCEEDED" : "STATUS: SUSTAINABLE"}
            </p>
          </div>
        </div>

        {/* FINANCIALS */}
        <div style={bottomStatsGrid}>
          <div style={smallStatCard}>
            <span style={statLabel}>TODAY'S TAP COST</span>
            <h3 style={statValue}>{todayCost} RWF</h3>
            <span style={statSub}>Real-time estimate</span>
          </div>
          <div style={smallStatCard}>
            <span style={statLabel}>MONTHLY BILL</span>
            <h3 style={statValue}>{estimatedMonthlyBill} RWF</h3>
            <span style={{ ...statSub, color: estimatedMonthlyBill > monthlyBudget ? '#ff4d4d' : '#00d2be' }}>
              {estimatedMonthlyBill > monthlyBudget ? 'Over Budget' : 'Within Budget'}
            </span>
          </div>
          <div style={{ ...smallStatCard, borderColor: 'rgba(46, 204, 113, 0.3)' }}>
            <span style={statLabel}>RECYCLED SAVINGS</span>
            <h3 style={{ ...statValue, color: '#2ecc71' }}>{totalSavingsRWF} RWF</h3>
            <span style={statSub}>Money saved this month</span>
          </div>
        </div>

        {/* YEARLY GRID */}
        <h4 style={{ color: '#00d2be', marginBottom: '5px', fontSize: '12px', marginTop: '10px' }}>YEARLY SNAPSHOT ({currentYear})</h4>
        <div style={historyGrid}>
          {monthlyGridData.map((m, i) => (
            <div key={i} style={{ ...monthBadge, opacity: i > currentMonthIdx ? 0.3 : 1, border: i === currentMonthIdx ? '1px solid #00d2be' : '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{m.name}</span>
              <div style={{ fontSize: '13px', margin: '4px 0' }}>{(m.totalLiters / 1000).toFixed(1)} m³</div>
              <div style={{ fontSize: '9px', opacity: 0.6 }}>{m.cost} RWF</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const waterWrapper = { padding: '10px' };
const container = { display: 'flex', flexDirection: 'column', gap: '20px' };
const topFlexGrid = { display: 'flex', gap: '20px', flexWrap: 'wrap' };
const glassCardFull = { background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '25px', padding: '20px' };
const glassCard = { ...glassCardFull, flex: 1, display: 'flex', flexDirection: 'column' };
const middleGrid = { display: 'flex', gap: '20px', flexWrap: 'wrap' };
const cardHeader = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' };
const cardIcon = { fontSize: '20px' };
const cardTitle = { margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#00d2be', letterSpacing: '1px' };
const cardSubtitle = { margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.4)' };
const liveTime = { fontSize: '12px', fontWeight: 'bold', color: '#fff' };
const weatherMain = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' };
const tempStyle = { fontSize: '42px', margin: 0, fontWeight: 'bold' };
const conditionText = { fontSize: '12px', opacity: 0.7, margin: 0 };
const weatherDetailsGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' };
const detailBox = { background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px', display: 'flex', flexDirection: 'column' };
const detailLabel = { fontSize: '9px', opacity: 0.6 };
const detailValue = { fontSize: '12px', fontWeight: 'bold' };
const timelineTitle = { fontSize: '10px', color: '#00d2be', marginBottom: '8px', textTransform: 'uppercase' };
const weatherTimeline = { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' };
const miniWeatherCard = { textAlign: 'center', minWidth: '45px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' };
const aiBrainIcon = { width: '30px', height: '30px', background: '#00d2be', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' };
const adviceBox = { display: 'flex', flexDirection: 'column', gap: '10px' };
const adviceItem = { padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', borderLeft: '3px solid #00d2be' };
const adviceText = { fontSize: '11px', margin: '4px 0 0 0', opacity: 0.8, lineHeight: '1.4' };
const gaugeText = { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const bottomStatsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' };
const smallStatCard = { ...glassCardFull, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
const statLabel = { fontSize: '9px', fontWeight: 'bold', opacity: 0.5, letterSpacing: '1px' };
const statValue = { fontSize: '24px', margin: '5px 0', fontWeight: 'bold' };
const statSub = { fontSize: '10px', color: '#00d2be' };
const historyGrid = { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' };
const monthBadge = { background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', textAlign: 'center' };
const tooltipStyle = { backgroundColor: '#0b141a', border: '1px solid #00d2be', color: '#fff' };

export default Home;