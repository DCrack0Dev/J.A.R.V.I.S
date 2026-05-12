import { useState, useEffect, useRef, useCallback } from "react";
import JobHunterPanel from './components/JobHunterPanel';
import GitHubPanel from './components/GitHubPanel';
import ContextBar from './components/ContextBar';

// ── Constants & Helpers (Define before component to avoid TDZ) ────────────────
const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const SESSION_ID = (typeof crypto !== 'undefined' && crypto.randomUUID) 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2);

function toMin(t) { 
  if (!t) return 0;
  const [h,m] = t.split(":").map(Number); 
  return h*60+m; 
}

function pad(n) { return String(n).padStart(2,"0"); }

function getNow() {
  const d = new Date();
  const dayIndex = d.getDay();
  return {
    day: DAYS[dayIndex] || "mon", 
    dayName: DAY_NAMES[dayIndex] || "Monday",
    totalMinutes: d.getHours()*60+d.getMinutes(),
    h: d.getHours(), 
    m: d.getMinutes(), 
    s: d.getSeconds(),
  };
}

const SCHEDULE = {
  mon: {
    theme: "Networking & Market Structure",
    blocks: [
      { start: "05:30", end: "06:00", icon: "🌅", label: "Morning Activation", detail: "Wake, hydrate, cold shower, stretch, bodyweight workout" },
      { start: "06:00", end: "06:05", icon: "⚡", label: "Transition", detail: "Quick reset and intention setting" },
      { start: "06:05", end: "07:00", icon: "📊", label: "Trading (Morning Session)", detail: "Support/resistance, liquidity zones, trend direction — Gold and BTC" },
      { start: "07:00", end: "07:05", icon: "⚡", label: "Transition", detail: "Prepare for IT session" },
      { start: "07:05", end: "08:30", icon: "🖥️", label: "Higher Cert IT — Part 1", detail: "Hardware, software, OS, components, input/output devices" },
      { start: "08:30", end: "10:00", icon: "🧹", label: "House Cleaning", detail: "Active reset, mental clarity, physical movement" },
      { start: "10:00", end: "10:05", icon: "⚡", label: "Transition", detail: "Back to focus mode" },
      { start: "10:05", end: "11:30", icon: "🖥️", label: "Higher Cert IT — Part 2", detail: "Continue session — review, practice questions, summarize notes" },
      { start: "11:30", end: "11:35", icon: "⚡", label: "Transition", detail: "Switch to Cyber track" },
      { start: "11:35", end: "13:00", icon: "🌐", label: "Cyber Networking", detail: "IP, subnetting, DNS, DHCP, routers, switches, TCP vs UDP" },
      { start: "13:00", end: "13:30", icon: "🍱", label: "Lunch", detail: "Fuel and hydration" },
      { start: "13:30", end: "15:00", icon: "💼", label: "Career Focus", detail: "Apply to roles, tailor CV, or freelance outreach" },
      { start: "15:00", end: "15:05", icon: "⚡", label: "Transition", detail: "Prepare for Dev session" },
      { start: "15:05", end: "17:00", icon: "💻", label: "Dev: Project Build", detail: "Build portfolio components — commit and push to GitHub" },
      { start: "17:00", end: "18:00", icon: "🏋️", label: "Workout", detail: "Physical training — push hard" },
      { start: "18:00", end: "19:00", icon: "🎮", label: "Leisure", detail: "Rest, games, music — disconnect fully" },
      { start: "19:00", end: "19:05", icon: "⚡", label: "Transition", detail: "Evening market prep" },
      { start: "19:05", end: "21:00", icon: "📝", label: "Trading Evening", detail: "Journaling, backtesting, and weekly chart breakdowns" },
    ],
  },
  tue: {
    theme: "Linux and Trading Psychology",
    blocks: [
      { start: "05:30", end: "06:00", icon: "🌅", label: "Morning Activation", detail: "Wake, hydrate, cold shower, stretch" },
      { start: "06:00", end: "06:05", icon: "⚡", label: "Transition", detail: "Intention setting" },
      { start: "06:05", end: "07:00", icon: "🧠", label: "Trading Psychology", detail: "Mindset drills, journaling, and risk management study" },
      { start: "07:00", end: "07:05", icon: "⚡", label: "Transition", detail: "IT prep" },
      { start: "07:05", end: "08:30", icon: "🖥️", label: "IT Cert Part 1", detail: "Networking fundamentals, OSI model, protocols" },
      { start: "08:30", end: "10:00", icon: "🧹", label: "House Cleaning", detail: "Active reset protocol" },
      { start: "10:00", end: "10:05", icon: "⚡", label: "Transition", detail: "Focus reset" },
      { start: "10:05", end: "11:30", icon: "🖥️", label: "IT Cert Part 2", detail: "Continue session — practice questions" },
      { start: "11:30", end: "11:35", icon: "⚡", label: "Transition", detail: "Linux prep" },
      { start: "11:35", end: "13:00", icon: "🐧", label: "Linux Deep Dive", detail: "File system, permissions, user management, bash basics" },
      { start: "13:00", end: "13:30", icon: "🍱", label: "Lunch", detail: "Fuel" },
      { start: "13:30", end: "15:00", icon: "💼", label: "Career / Job Hunt", detail: "LinkedIn networking and role applications" },
      { start: "15:00", end: "15:05", icon: "⚡", label: "Transition", detail: "Dev prep" },
      { start: "15:05", end: "17:00", icon: "💻", label: "Dev: JavaScript", detail: "Functions, arrays, DOM manipulation — build something" },
      { start: "17:00", end: "18:00", icon: "🏋️", label: "Workout", detail: "Physical training" },
      { start: "18:00", end: "19:00", icon: "🎮", label: "Leisure", detail: "Rest and recharge" },
      { start: "19:00", end: "19:05", icon: "⚡", label: "Transition", detail: "Market review prep" },
      { start: "19:05", end: "21:00", icon: "📝", label: "Trading Evening", detail: "Review trades, mark up charts, journal psychology" },
    ],
  },
  wed: {
    theme: "Web Security and React",
    blocks: [
      { start: "05:30", end: "06:00", icon: "🌅", label: "Morning Activation", detail: "Wake, hydrate, cold shower, stretch" },
      { start: "06:00", end: "06:05", icon: "⚡", label: "Transition", detail: "Intention setting" },
      { start: "06:05", end: "07:00", icon: "📊", label: "Trading: Live Market Analysis", detail: "Pre-market prep, identify setups for the day" },
      { start: "07:00", end: "07:05", icon: "⚡", label: "Transition", detail: "IT prep" },
      { start: "07:05", end: "08:30", icon: "🖥️", label: "IT Cert Part 1", detail: "Security fundamentals, threats, vulnerabilities" },
      { start: "08:30", end: "10:00", icon: "🧹", label: "House Cleaning", detail: "Active reset protocol" },
      { start: "10:00", end: "10:05", icon: "⚡", label: "Transition", detail: "Focus reset" },
      { start: "10:05", end: "11:30", icon: "🖥️", label: "IT Cert Part 2", detail: "Continue session — review notes" },
      { start: "11:30", end: "11:35", icon: "⚡", label: "Transition", detail: "Security prep" },
      { start: "11:35", end: "13:00", icon: "🔐", label: "Web Security", detail: "OWASP Top 10, XSS, SQL injection, CSRF" },
      { start: "13:00", end: "13:30", icon: "🍱", label: "Lunch", detail: "Fuel" },
      { start: "13:30", end: "15:00", icon: "💼", label: "Career Focus", detail: "Applications and portfolio refinement" },
      { start: "15:00", end: "15:05", icon: "⚡", label: "Transition", detail: "React prep" },
      { start: "15:05", end: "17:00", icon: "⚛️", label: "Dev: React", detail: "Components, state, props, hooks — build a mini-app" },
      { start: "17:00", end: "18:00", icon: "🏋️", label: "Workout", detail: "Physical training" },
      { start: "18:00", end: "19:00", icon: "🎮", label: "Leisure", detail: "Rest and recharge" },
      { start: "19:00", end: "19:05", icon: "⚡", label: "Transition", detail: "Midpoint review prep" },
      { start: "19:05", end: "21:00", icon: "📝", label: "Trading Evening", detail: "Midpoint performance review and journaling" },
    ],
  },
  thu: {
    theme: "Ethical Hacking and Backend",
    blocks: [
      { start: "05:30", end: "06:00", icon: "🌅", label: "Morning Activation", detail: "Wake, hydrate, cold shower, stretch" },
      { start: "06:00", end: "06:05", icon: "⚡", label: "Transition", detail: "Intention setting" },
      { start: "06:05", end: "07:00", icon: "📰", label: "News Trading Prep", detail: "Check economic calendar, high-impact news analysis" },
      { start: "07:00", end: "07:05", icon: "⚡", label: "Transition", detail: "IT prep" },
      { start: "07:05", end: "08:30", icon: "🖥️", label: "IT Cert Part 1", detail: "Virtualization, cloud, troubleshooting" },
      { start: "08:30", end: "10:00", icon: "🧹", label: "House Cleaning", detail: "Active reset protocol" },
      { start: "10:00", end: "10:05", icon: "⚡", label: "Transition", detail: "Focus reset" },
      { start: "10:05", end: "11:30", icon: "🖥️", label: "IT Cert Part 2", detail: "Continue session" },
      { start: "11:30", end: "11:35", icon: "⚡", label: "Transition", detail: "Hacking prep" },
      { start: "11:35", end: "13:00", icon: "🎩", label: "Ethical Hacking", detail: "Recon, scanning, enumeration — TryHackMe labs" },
      { start: "13:00", end: "13:30", icon: "🍱", label: "Lunch", detail: "Fuel" },
      { start: "13:30", end: "15:00", icon: "💼", label: "Career: Interview Prep", detail: "Mock technical questions and STAR responses" },
      { start: "15:00", end: "15:05", icon: "⚡", label: "Transition", detail: "Backend prep" },
      { start: "15:05", end: "17:00", icon: "💻", label: "Dev: Node.js / Backend", detail: "REST APIs, Express.js, request handling" },
      { start: "17:00", end: "18:00", icon: "🏋️", label: "Workout", detail: "Physical training" },
      { start: "18:00", end: "19:00", icon: "🎮", label: "Leisure", detail: "Rest and recharge" },
      { start: "19:00", end: "19:05", icon: "⚡", label: "Transition", detail: "Evening prep" },
      { start: "19:05", end: "21:00", icon: "📝", label: "Trading Evening", detail: "Document news trading lessons and review charts" },
    ],
  },
  fri: {
    theme: "Python, Automation and Labs",
    blocks: [
      { start: "05:30", end: "06:00", icon: "🌅", label: "Morning Activation", detail: "Wake, hydrate, cold shower, stretch" },
      { start: "06:00", end: "06:05", icon: "⚡", label: "Transition", detail: "Intention setting" },
      { start: "06:05", end: "07:00", icon: "📊", label: "Weekly Market Recap", detail: "Analyze weekly setups and document lessons" },
      { start: "07:00", end: "07:05", icon: "⚡", label: "Transition", detail: "IT prep" },
      { start: "07:05", end: "08:30", icon: "🖥️", label: "IT Cert — Mock Exam", detail: "Full mock exam — simulate test conditions" },
      { start: "08:30", end: "10:00", icon: "🧹", label: "House Cleaning", detail: "Active reset protocol" },
      { start: "10:00", end: "10:05", icon: "⚡", label: "Transition", detail: "Focus reset" },
      { start: "10:05", end: "11:30", icon: "🖥️", label: "IT Cert — Review", detail: "Review wrong answers and missed concepts" },
      { start: "11:30", end: "11:35", icon: "⚡", label: "Transition", detail: "Python prep" },
      { start: "11:35", end: "13:00", icon: "🐍", label: "Python for Cybersecurity", detail: "Scripting, automation, network scanning" },
      { start: "13:00", end: "13:30", icon: "🍱", label: "Lunch", detail: "Fuel" },
      { start: "13:30", end: "15:00", icon: "🔬", label: "Cyber Labs", detail: "Complete TryHackMe beginner rooms" },
      { start: "15:00", end: "15:05", icon: "⚡", label: "Transition", detail: "Dev/Reflection prep" },
      { start: "15:05", end: "17:00", icon: "✅", label: "Weekly Reflection", detail: "Wins, improvements, and rating the week" },
      { start: "17:00", end: "18:00", icon: "🏋️", label: "Workout", detail: "Physical training" },
      { start: "18:00", end: "19:00", icon: "🎮", label: "Leisure", detail: "Rest and recharge" },
      { start: "19:00", end: "19:05", icon: "⚡", label: "Transition", detail: "Evening prep" },
      { start: "19:05", end: "21:00", icon: "📝", label: "Trading Evening", detail: "Final weekly journaling and stat calculation" },
    ],
  },
  sat: {
    theme: "Build and Execute",
    blocks: [
      { start: "06:00", end: "07:00", icon: "🌅", label: "Exercise and Routine", detail: "Physical activation" },
      { start: "07:00", end: "08:00", icon: "🍳", label: "Project Planning", detail: "Write scope and goals on paper" },
      { start: "08:00", end: "08:30", icon: "⚡", label: "Transition", detail: "Prepare for cleaning/build gap" },
      { start: "08:30", end: "10:00", icon: "🧹", label: "House Cleaning", detail: "Active reset protocol" },
      { start: "10:00", end: "12:00", icon: "🚀", label: "Deep Build Session", detail: "Ship something real — at least 1 commit" },
      { start: "12:00", end: "13:00", icon: "🍱", label: "Lunch", detail: "Fuel" },
      { start: "13:00", end: "15:00", icon: "📊", label: "Trading Practice", detail: "Setup practice and chart review" },
      { start: "15:00", end: "17:00", icon: "📣", label: "Content & Freelance", detail: "LinkedIn post and client outreach" },
      { start: "17:00", end: "20:00", icon: "👨‍👩‍👧", label: "Rest & Social", detail: "Fully offline" },
    ],
  },
  sun: {
    theme: "Recovery and Deep Review",
    blocks: [
      { start: "07:00", end: "08:00", icon: "☕", label: "Slow Morning", detail: "Breakfast, journal, no screens" },
      { start: "08:00", end: "10:00", icon: "📚", label: "Weekly Review", detail: "Review all 5 tracks — flashcards/notes" },
      { start: "10:00", end: "12:00", icon: "🔧", label: "Fix Weak Spots", detail: "Master the hardest concept of the week" },
      { start: "13:00", end: "15:00", icon: "🗓️", label: "Next Week Planning", detail: "Goal setting and schedule adjustments" },
      { start: "15:00", end: "16:00", icon: "📸", label: "Journal Cleanup", detail: "Organize screenshots and stats" },
      { start: "16:00", end: "17:00", icon: "🚶", label: "Light Walk", detail: "Active recovery" },
      { start: "17:00", end: "20:00", icon: "🎵", label: "Full Mental Reset", detail: "Disconnect and reset" },
    ],
  },
};

const hasSpeechRecog = typeof window !== "undefined" && (window.webkitSpeechRecognition || window.SpeechRecognition);
const hasSpeechSynth = typeof window !== "undefined" && window.speechSynthesis;

// ── Styles ────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --hud-cyan: #00cfff;
  --hud-orange: #ff6a00;
  --hud-bg: #000000;
  --hud-surface: rgba(0, 207, 255, 0.05);
  --hud-border: rgba(0, 207, 255, 0.3);
  --hud-glow: 0 0 15px rgba(0, 207, 255, 0.4);
}

* { margin: 0; padding: 0; box-sizing: border-box; cursor: crosshair; }

body {
  background: var(--hud-bg);
  color: var(--hud-cyan);
  font-family: 'DM Mono', monospace;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

/* HEX GRID BACKGROUND */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-opacity='0.03' fill='%2300cfff' fill-rule='evenodd'/%3E%3C/svg%3E");
  z-index: -1;
}

/* SCANLINE OVERLAY */
.scanlines {
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    rgba(0, 0, 0, 0) 0px,
    rgba(0, 0, 0, 0.05) 1px,
    rgba(0, 0, 0, 0.1) 2px
  );
  pointer-events: none;
  z-index: 1000;
  animation: flicker 0.15s infinite;
}

@keyframes flicker {
  0% { opacity: 0.9; }
  50% { opacity: 1; }
  100% { opacity: 0.9; }
}

.shell {
  width: 100%;
  max-width: 1100px;
  height: 100vh;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 15px;
  transition: opacity 0.5s;
}

.shell.sleeping {
  opacity: 0.4;
}

/* HEADER HUD */
.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--hud-border);
  padding-bottom: 10px;
  flex-shrink: 0;
}

.hud-title-wrap h1 {
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  letter-spacing: 4px;
  color: var(--hud-cyan);
  text-shadow: var(--hud-glow);
}

.hud-subtitle {
  font-size: 8px;
  letter-spacing: 1px;
  color: var(--hud-orange);
  margin-top: 2px;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  letter-spacing: 1px;
}

.status-dot {
  width: 5px;
  height: 5px;
  background: #39ff6a;
  border-radius: 50%;
  box-shadow: 0 0 10px #39ff6a;
  animation: blink 1s infinite;
}

.status-dot.offline {
  background: #ff3939;
  box-shadow: 0 0 10px #ff3939;
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ARC REACTOR / ORB */
.arc-reactor {
  width: 50px;
  height: 50px;
  position: relative;
  cursor: pointer;
  transition: all 0.4s;
}

.arc-reactor.sleeping {
  opacity: 0.2;
  animation: breathe 2s ease-in-out infinite;
}

.arc-reactor.wake-flash {
  animation: wake-flash-anim 0.4s ease-out;
}

@keyframes breathe {
  0%, 100% { opacity: 0.2; transform: scale(0.95); }
  50% { opacity: 0.4; transform: scale(1); }
}

@keyframes wake-flash-anim {
  0% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.3); filter: brightness(2); }
  100% { transform: scale(1); filter: brightness(1); }
}

.arc-ring {
  position: absolute;
  inset: 0;
  border: 1px dashed var(--hud-border);
  border-radius: 50%;
  animation: spin 10s linear infinite;
}

.arc-ring-inner {
  position: absolute;
  inset: 8px;
  border: 1px solid var(--hud-cyan);
  border-radius: 50%;
  box-shadow: inset 0 0 10px var(--hud-cyan), 0 0 10px var(--hud-cyan);
  animation: spin 5s linear infinite reverse;
}

.arc-reactor.sleeping .arc-ring-inner {
  border-color: #550000;
  box-shadow: inset 0 0 10px #550000, 0 0 10px #550000;
}

.arc-core {
  position: absolute;
  inset: 18px;
  background: var(--hud-cyan);
  border-radius: 50%;
  box-shadow: 0 0 15px var(--hud-cyan);
}

.arc-reactor.sleeping .arc-core {
  background: #330000;
  box-shadow: 0 0 15px #330000;
}

.arc-reactor.alert-pulse .arc-core {
  animation: alert-pulse-anim 1s infinite;
}

@keyframes alert-pulse-anim {
  0%, 100% { background: #ffaa00; box-shadow: 0 0 15px #ffaa00; }
  50% { background: #ff6a00; box-shadow: 0 0 30px #ff6a00; }
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* DAY TABS HUD */
.hud-tabs {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--hud-border);
  padding-bottom: 10px;
}

.hud-tab {
  padding: 6px 12px;
  border: 1px solid var(--hud-border);
  background: transparent;
  color: var(--hud-cyan);
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: all 0.3s;
  cursor: pointer;
}

.hud-tab.active {
  background: var(--hud-cyan);
  color: var(--hud-bg);
  box-shadow: var(--hud-glow);
}

/* PANELS */
.hud-panel {
  background: var(--hud-surface);
  border: 1px solid var(--hud-border);
  padding: 15px;
  position: relative;
  transition: all 0.3s;
}

.hud-panel.scrollable {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.hud-scroll-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
}

.hud-scroll-content::-webkit-scrollbar {
  width: 4px;
}
.hud-scroll-content::-webkit-scrollbar-track {
  background: transparent;
}
.hud-scroll-content::-webkit-scrollbar-thumb {
  background: var(--hud-border);
  border-radius: 2px;
}

.hud-panel:hover {
  border-color: var(--hud-cyan);
}

.hud-panel-label {
  position: absolute;
  top: -8px;
  left: 10px;
  background: var(--hud-bg);
  padding: 0 6px;
  font-size: 8px;
  letter-spacing: 2px;
  color: var(--hud-orange);
  z-index: 5;
}

/* CLOCK HUD */
.hud-clock-wrap {
  text-align: center;
  flex-shrink: 0;
}

.hud-clock {
  font-family: 'Orbitron', sans-serif;
  font-size: 42px;
  letter-spacing: 6px;
  line-height: 1;
}

/* ORB HUD */
.hud-orb-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 10px;
}

.hud-offline-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  letter-spacing: 4px;
  color: #ff3939;
  text-shadow: 0 0 10px #ff3939;
  animation: blink 2s infinite;
}

.hud-orb {
  width: 80px;
  height: 80px;
  border: 2px solid var(--hud-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.4s;
  cursor: pointer;
}

.hud-orb.sleeping { opacity: 0.2; border-color: #550000; }
.hud-orb.listening { border-color: var(--hud-cyan); box-shadow: var(--hud-glow); }
.hud-orb.speaking { border-color: var(--hud-orange); box-shadow: 0 0 20px var(--hud-orange); }
.hud-orb.thinking { border-color: #9b6dff; box-shadow: 0 0 20px #9b6dff; animation: thinking-pulse 1.5s infinite; }

@keyframes thinking-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.7; } }

/* SCHEDULE BLOCKS */
.hud-block {
  display: grid;
  grid-template-columns: 90px 1fr;
  border: 1px solid var(--hud-border);
  margin-bottom: 4px;
  background: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.hud-block-time {
  padding: 8px;
  border-right: 1px solid var(--hud-border);
  font-size: 9px;
  color: rgba(0, 207, 255, 0.6);
  display: flex;
  align-items: center;
}

.hud-block-content {
  padding: 8px 12px;
  border-left: 3px solid var(--hud-cyan);
}

.hud-block-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.hud-block-detail {
  font-size: 9px;
  opacity: 0.7;
  line-height: 1.3;
}

.hud-block.active {
  border-color: var(--hud-cyan);
  box-shadow: var(--hud-glow);
  background: rgba(0, 207, 255, 0.15);
}

.hud-block.active .hud-block-label {
  animation: text-pulse 2s infinite;
}

@keyframes text-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

/* TICKER */
.hud-ticker {
  background: #000;
  border-top: 1px solid var(--hud-border);
  padding: 6px 20px;
  font-size: 9px;
  letter-spacing: 2px;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
  margin: 0 -20px -20px -20px;
}

.ticker-scroll {
  display: inline-block;
  animation: scroll 30s linear infinite;
}

@keyframes scroll { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }

/* BADGES */
.hud-badge {
  font-size: 7px;
  padding: 1px 4px;
  border: 1px solid currentColor;
  margin-left: 6px;
  text-transform: uppercase;
}
`;

export default function App() {
  const [schedule, setSchedule] = useState(null);
  const [orbState, setOrbState] = useState("idle");
  const [started, setStarted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [context, setContext] = useState(null);
  const [history, setHistory] = useState([]);
  const [tick, setTick] = useState(0);
  const [view, setView] = useState(() => getNow().day); 
  const [isRedesigning, setIsRedesigning] = useState(false);

  // NEW FEATURE 1 & 2 STATE
  const [isAwake, setIsAwake] = useState(true);
  const [sleepReason, setSleepReason] = useState(null);
  const [lastAcknowledgedBlock, setLastAcknowledgedBlock] = useState(null);
  const [alertCount, setAlertCount] = useState({});
  const [wakeFlash, setWakeFlash] = useState(false);

  const recognitionRef = useRef(null);
  const activeBlockRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const orbStateRef = useRef("idle");
  const startedRef = useRef(false);
  const isAwakeRef = useRef(true);

  // Use refs for callbacks to break circular dependencies
  const handleSpeechRef = useRef(null);
  const startListeningRef = useRef(null);

  // Sync state to refs for immediate access in callbacks
  useEffect(() => { orbStateRef.current = orbState; }, [orbState]);
  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { isAwakeRef.current = isAwake; }, [isAwake]);

  // Fetch schedule and seed if necessary
  useEffect(() => {
    const initSchedule = async () => {
      try {
        const baseUrl = 'https://j-a-r-v-i-s-liard.vercel.app';
        const checkRes = await fetch(`${baseUrl}/api/schedule`);
        if (!checkRes.ok) throw new Error('Fetch failed');
        const existingData = await checkRes.json();
        
        if (!existingData || Object.keys(existingData).length === 0) {
          console.log("Database schedule empty. Seeding initial data...");
          await fetch(`${baseUrl}/api/schedule/seed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(SCHEDULE)
          });
          const freshRes = await fetch(`${baseUrl}/api/schedule`);
          const freshData = await freshRes.json();
          setSchedule(freshData);
        } else {
          setSchedule(existingData);
        }
      } catch (e) {
        console.error("Failed to sync schedule with backend", e);
        setSchedule(SCHEDULE); // Fallback to hardcoded
      }
    };
    initSchedule();
  }, []);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Speech synthesis ──────────────────────────────────────
  const speak = useCallback((text, onDone) => {
    if (!hasSpeechSynth) return;
    window.speechSynthesis.cancel();
    
    speakingRef.current = true;
    orbStateRef.current = "speaking";
    
    setOrbState("speaking");
    setResponse(text);
    setCurrentWordIndex(-1);

    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1.0; u.volume = 1.0;
    
    u.onboundary = (event) => {
      if (event.name === 'word') {
        const spokenPart = text.substring(0, event.charIndex);
        const words = spokenPart.trim().split(/\s+/);
        setCurrentWordIndex(spokenPart.trim() === "" ? 0 : words.length);
      }
    };

    u.onstart = () => {
      speakingRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (_) {}
      }
      listeningRef.current = false;
    };
    u.onend = () => {
      speakingRef.current = false;
      if (isAwakeRef.current) {
        orbStateRef.current = "listening";
        setOrbState("listening");
        setTimeout(() => {
          if (startedRef.current && !speakingRef.current && isAwakeRef.current) {
            startListeningRef.current && startListeningRef.current();
          }
        }, 200);
      } else {
        setOrbState("idle");
      }
      onDone && onDone();
    };
    u.onerror = () => {
      speakingRef.current = false;
      if (isAwakeRef.current) {
        orbStateRef.current = "listening";
        setOrbState("listening");
        setTimeout(() => {
          if (startedRef.current && !speakingRef.current && isAwakeRef.current) {
            startListeningRef.current && startListeningRef.current();
          }
        }, 200);
      } else {
        setOrbState("idle");
      }
      onDone && onDone();
    };
    window.speechSynthesis.speak(u);
  }, []);

  // ── FEATURE 2: SMART SELF-WAKE SYSTEM ───────────────────────
  useEffect(() => {
    const checkScheduleAlerts = () => {
      if (!schedule) return;
      const n = getNow();
      const todayBlocks = schedule[n.day]?.blocks || [];
      if (todayBlocks.length === 0) return;

      const firstBlock = todayBlocks[0];
      const nextUpcoming = todayBlocks.find(b => toMin(b.start) > n.totalMinutes);
      
      const minsUntilFirst = toMin(firstBlock.start) - n.totalMinutes;
      const minsUntilNext = nextUpcoming ? toMin(nextUpcoming.start) - n.totalMinutes : Infinity;

      let triggerWake = false;
      let alertMsg = "";
      let blockId = "";

      // Scenarios
      if (minsUntilFirst === 60) {
        triggerWake = true;
        blockId = `pre-day-${firstBlock.label}`;
        alertMsg = `Good morning Boss. Your day starts in one hour with ${firstBlock.label} at ${firstBlock.start}. Time to get up.`;
      } else if (minsUntilFirst === 0) {
        triggerWake = true;
        blockId = `start-day-${firstBlock.label}`;
        alertMsg = `Boss, ${firstBlock.label} is starting now. Let's go.`;
      } else if (nextUpcoming && minsUntilNext <= 10 && minsUntilNext > 0) {
        triggerWake = true;
        blockId = `soon-${nextUpcoming.label}`;
        alertMsg = `Heads up Boss — ${nextUpcoming.label} starts in ${minsUntilNext} minutes. ${nextUpcoming.label} block: ${nextUpcoming.start} to ${nextUpcoming.end}.`;
      } else if (nextUpcoming && minsUntilNext === 0) {
        triggerWake = true;
        blockId = `start-${nextUpcoming.label}`;
        alertMsg = `Boss, ${nextUpcoming.label} is starting now. Let's go.`;
      }

      if (triggerWake && lastAcknowledgedBlock !== blockId) {
        const currentCount = alertCount[blockId] || 0;
        if (currentCount < 3) {
          if (!isAwakeRef.current) {
            setIsAwake(true);
            setSleepReason("block_alert");
            setWakeFlash(true);
            setTimeout(() => setWakeFlash(false), 400);
          }
          speak(alertMsg, startListeningRef.current);
          setAlertCount(prev => ({ ...prev, [blockId]: currentCount + 1 }));
        }
      }
    };

    const interval = setInterval(checkScheduleAlerts, 60000);
    return () => clearInterval(interval);
  }, [schedule, lastAcknowledgedBlock, alertCount, speak]);

  // ── Schedule helpers ──────────────────────────────────────
  const now = getNow();
  const getTodayData = () => {
    if (schedule && schedule[now.day] && schedule[now.day].theme && schedule[now.day].blocks?.length > 0) {
      return schedule[now.day];
    }
    return SCHEDULE[now.day] || { theme: "Elite Operations", blocks: [] };
  };

  const todayData = getTodayData();
  const blocks = todayData.blocks || [];

  let currentBlock = null;
  if (schedule) {
    for (const b of blocks) {
      if (now.totalMinutes >= toMin(b.start) && now.totalMinutes < toMin(b.end)) { currentBlock = b; break; }
    }
  }
  
  let nextBlock = null;
  if (schedule) {
    for (const b of blocks) {
      if (toMin(b.start) > now.totalMinutes) { nextBlock = b; break; }
    }
  }

  let progress = 0, remaining = 0;
  if (currentBlock) {
    const s = toMin(currentBlock.start), e = toMin(currentBlock.end);
    remaining = e - now.totalMinutes;
    progress = Math.min(100, Math.max(0, ((now.totalMinutes - s) / (e - s)) * 100));
  }

  // ── FEATURE 1: SLEEP/WAKE TOGGLE ────────────────────────────
  const toggleSleep = useCallback((forceState = null) => {
    const newState = forceState !== null ? forceState : !isAwakeRef.current;
    
    if (newState === isAwakeRef.current) return;

    if (!newState) {
      // Going to Sleep
      setIsAwake(false);
      setSleepReason(null);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      window.speechSynthesis.cancel();
      speak("Going offline, Boss. I'll wake you when it matters.", () => {
        setOrbState("idle");
        listeningRef.current = false;
        speakingRef.current = false;
      });
    } else {
      // Waking Up
      setIsAwake(true);
      setWakeFlash(true);
      setTimeout(() => setWakeFlash(false), 400);
      speak("Systems online. What do you need, Boss?", startListeningRef.current);
    }
  }, [speak]);

  // ── Morning Briefing ──────────────────────────────────────
  const morningBriefing = useCallback(async () => {
    const n = getNow();
    const firstThree = blocks.slice(0, 3).map(b => `${b.label} at ${b.start}`).join(', ');
    
    let briefing = `Good morning Boss. Today is ${n.dayName}, theme is ${todayData.theme}. It's ${pad(n.h)}:${pad(n.m)}. `;
    briefing += `Your first three blocks are: ${firstThree}. `;
    briefing += `I'm monitoring your career and github status. `;
    briefing += `One more thing: The fact that you're up means you're already ahead. Let's win the day.`;

    if (!isAwakeRef.current) {
      setIsAwake(true);
      setWakeFlash(true);
      setTimeout(() => setWakeFlash(false), 400);
    }
    speak(briefing, startListeningRef.current);
  }, [blocks, todayData, speak]);

  const askModel = useCallback(async (said) => {
    try {
      const baseUrl = 'https://j-a-r-v-i-s-liard.vercel.app';
      const res = await fetch(`${baseUrl}/api/jarvis/query/${SESSION_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: said,
          userId: '00000000-0000-0000-0000-000000000001'
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const reply = data.reply;
      
      if (reply) {
        setHistory(prev => [...prev, { role: "user", content: said }, { role: "assistant", content: reply }]);
      }
      return reply;
    } catch (_) {
      return null;
    }
  }, []);

  // ── FEATURE 3: LIVE SCHEDULE RESTRUCTURING ──────────────────
  const handleScheduleEdit = useCallback(async (command) => {
    setIsRedesigning(true);
    setOrbState("thinking");
    setResponse("RESTRUCTURING YOUR SCHEDULE...");
    
    try {
      const baseUrl = 'https://j-a-r-v-i-s-liard.vercel.app';
      const res = await fetch(`${baseUrl}/api/schedule/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command, 
          currentSchedule: schedule?.[now.day] || SCHEDULE[now.day], 
          targetDay: now.day 
        })
      });
      if (!res.ok) throw new Error('Edit failed');
      const data = await res.json();
      setSchedule(prev => ({ ...prev, [now.day]: data.updatedSchedule }));
      speak(`Done Boss. I've updated your ${now.dayName} schedule. ${data.summary}`, startListeningRef.current);
    } catch (e) {
      speak("I encountered an error while trying to edit your schedule.", startListeningRef.current);
    } finally {
      setIsRedesigning(false);
    }
  }, [schedule, now, speak]);

  // ── Speech recognition ────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isAwakeRef.current) return;
    if (listeningRef.current || speakingRef.current || orbStateRef.current === "speaking" || orbStateRef.current === "thinking") return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch(_) {}
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;
    listeningRef.current = true;
    setOrbState("listening");

    rec.onresult = (e) => {
      if (speakingRef.current) return;

      let said = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) {
          said += ` ${e.results[i][0].transcript}`;
        } else {
          setTranscript(e.results[i][0].transcript.toLowerCase().trim());
        }
      }
      said = said.toLowerCase().trim();
      if (!said || said.length < 2) return;

      setTranscript(said);
      try { rec.onend = null; rec.stop(); } catch (_) {}
      listeningRef.current = false;
      if (handleSpeechRef.current) handleSpeechRef.current(said);
    };

    rec.onerror = (event) => {
      listeningRef.current = false;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') return;
      if (!speakingRef.current && startedRef.current && isAwakeRef.current) {
        setTimeout(() => startListeningRef.current && startListeningRef.current(), 1000);
      }
    };

    rec.onend = () => {
      listeningRef.current = false;
      recognitionRef.current = null;
      if (!speakingRef.current && orbStateRef.current !== "thinking" && startedRef.current && isAwakeRef.current) {
        setTimeout(() => {
          if (!speakingRef.current && startedRef.current && isAwakeRef.current) {
            startListeningRef.current && startListeningRef.current();
          }
        }, 300);
      }
    };

    try { rec.start(); } catch (e) { }
  }, []);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // ── Intent handler ────────────────────────────────────────
  const handleSpeech = useCallback(async (said) => {
    if (currentBlock && said.length > 3) {
      setLastAcknowledgedBlock(currentBlock.label);
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(_) {}
      listeningRef.current = false;
    }

    const sleepIntent = /jarvis sleep|go to sleep|offline/i.test(said);
    const wakeIntent = /jarvis wake|wake up|online/i.test(said);
    const morningIntent = /good morning jarvis/i.test(said);

    if (sleepIntent) { toggleSleep(false); return; }
    if (wakeIntent) { toggleSleep(true); return; }
    if (morningIntent) { morningBriefing(); return; }

    const restructureIntent = /move .* to .*|change .* to .*|swap .* and .*|remove .*|add .* at .*|push everything back|redesign today|restructure my schedule|rebuild my week|i need more time for/i.test(said);
    if (restructureIntent) { handleScheduleEdit(said); return; }

    const timeQ = /what time|time is it/i.test(said);
    const currentQ = /what am i doing|what am i supposed to do|what am i on|current block|right now|now/i.test(said);
    const nextQ = /what.*next|next block|coming up|after this|up next/i.test(said);

    if (timeQ) { speak(`It is ${pad(now.h)}:${pad(now.m)}.`, startListeningRef.current); return; }
    if (currentQ) {
      let msg = `Today is ${now.dayName}, theme is ${todayData.theme}. `;
      if (currentBlock) {
        msg += `You are currently in your ${currentBlock.label} block, which runs until ${currentBlock.end}. ${currentBlock.detail}. You have ${remaining} minutes left.`;
      } else {
        msg += `You are between blocks right now.`;
      }
      speak(msg, startListeningRef.current);
      return;
    }
    if (nextQ) {
      const msg = nextBlock
        ? `Up next is ${nextBlock.label} at ${nextBlock.start}. ${nextBlock.detail}.`
        : `No more planned blocks today. Close out with review and recovery.`;
      speak(msg, startListeningRef.current);
      return;
    }

    orbStateRef.current = "thinking";
    setOrbState("thinking");
    setResponse("THINKING...");
    window.speechSynthesis.cancel();
    
    try {
      const modelText = await askModel(said);
      if (modelText) { speak(modelText, startListeningRef.current); return; }
      throw new Error("Model returned no text");
    } catch (err) {
      speak("My intelligence core is offline, but I'm still monitoring your schedule.", startListeningRef.current);
    }
  }, [now, todayData, currentBlock, nextBlock, remaining, speak, askModel, toggleSleep, morningBriefing, handleScheduleEdit]);

  useEffect(() => {
    handleSpeechRef.current = handleSpeech;
  }, [handleSpeech]);

  const startSession = useCallback(() => {
    setStarted(true);
    setIsAwake(true);
    const n = getNow();
    let currentTheme = (schedule?.[n.day]?.theme) || (SCHEDULE[n.day]?.theme) || "Elite Operations";
    let welcome = `Hey Tebogo. Systems online. Theme is ${currentTheme}. I'm listening.`;
    speak(welcome, startListeningRef.current);
  }, [schedule, speak]);

  useEffect(() => {
    if (activeBlockRef.current) {
      activeBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [view, started]);

  const orbIcon = !isAwake ? "💤"
    : orbState === "idle" ? "🎙️"
    : orbState === "listening" ? "👂"
    : orbState === "thinking" ? "🧠"
    : "🔊";

  return (
    <>
      <style>{css}</style>
      <div className="scanlines" />
      <div className={`shell ${!isAwake ? 'sleeping' : ''}`}>
        <header className="hud-header">
          <div className="hud-title-wrap">
            <h1>JARVIS</h1>
            <div className="hud-subtitle">// STARK INDUSTRIES — PERSONAL OPERATIONS INTERFACE</div>
          </div>
          <div className="system-status">
            <div className={`status-dot ${!isAwake ? 'offline' : ''}`} />
            <span>{isAwake ? 'SYSTEM ONLINE' : 'STANDBY MODE'}</span>
          </div>
          <div 
            className={`arc-reactor ${!isAwake ? 'sleeping' : ''} ${wakeFlash ? 'wake-flash' : ''} ${sleepReason === 'block_alert' ? 'alert-pulse' : ''}`}
            onClick={() => toggleSleep()}
            title={isAwake ? "Put JARVIS to sleep" : "Wake JARVIS"}
          >
            <div className="arc-ring" />
            <div className="arc-ring-inner" />
            <div className="arc-core" />
          </div>
        </header>

        <div className="hud-clock-wrap">
          <ContextBar context={context} />
          <div className="hud-clock">{pad(now.h)}:{pad(now.m)}:{pad(now.s)}</div>
          <div style={{ fontSize: '10px', letterSpacing: '4px', marginTop: '10px' }}>
            {now.dayName.toUpperCase()} // {todayData.theme.toUpperCase()}
          </div>
        </div>

        <div className="hud-panel">
          <div className="hud-panel-label">[SYSTEM DIRECTIVES]</div>
          <div style={{ fontSize: '11px', lineHeight: '1.8' }}>
            <div>[01] HYDRATE + COLD SHOWER ACTIVATION</div>
            <div>[02] WRITE 1 GOAL PER SKILL TRACK</div>
            <div>[03] NO PHONE SCROLLING DURING TRANSITIONS</div>
            <div>[04] 5-MINUTE REFLECTION POST-BLOCK</div>
          </div>
        </div>

        <div className="hud-orb-wrap">
          <div 
            className={`hud-orb ${!isAwake ? 'sleeping' : orbState}`} 
            onClick={!started ? startSession : () => toggleSleep()}
            title={isAwake ? "Put JARVIS to sleep" : "Wake JARVIS"}
          >
            <div style={{ fontSize: '30px' }}>{orbIcon}</div>
          </div>
          {!isAwake && <div className="hud-offline-text">JARVIS OFFLINE</div>}
        </div>

        {started && isAwake && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setView(now.day)} style={{ background: 'transparent', border: '1px solid var(--hud-cyan)', color: 'var(--hud-cyan)', fontSize: '8px', padding: '4px 10px', cursor: 'pointer' }}>TODAY</button>
            <button onClick={() => morningBriefing()} style={{ background: 'transparent', border: '1px solid #39ff6a', color: '#39ff6a', fontSize: '8px', padding: '4px 10px', cursor: 'pointer' }}>BRIEFING</button>
            <button onClick={() => handleScheduleEdit("redesign today")} style={{ background: 'transparent', border: '1px solid var(--hud-orange)', color: 'var(--hud-orange)', fontSize: '8px', padding: '4px 10px', cursor: 'pointer' }}>RESTRUCTURE</button>
          </div>
        )}

        {started && isAwake && (
          <div className="hud-panel" style={{ textAlign: 'center', minHeight: '80px' }}>
            <div className="hud-panel-label">[COMMS LINK]</div>
            {transcript && <div style={{ opacity: 0.5, fontSize: '10px', marginBottom: '5px' }}>USER: {transcript.toUpperCase()}</div>}
            {response && (
              <div style={{ color: orbState === "thinking" ? "#9b6dff" : 'var(--hud-orange)', lineHeight: '1.4' }}>
                JARVIS: {response.split(/\s+/).map((word, idx) => (
                  <span key={idx} style={{ backgroundColor: idx === currentWordIndex ? 'var(--hud-orange)' : 'transparent', color: idx === currentWordIndex ? 'var(--hud-bg)' : 'inherit', padding: '0 2px' }}>
                     {word.toUpperCase()}{' '}
                   </span>
                 ))}
               </div>
             )}
            {!transcript && !response && <div style={{ opacity: 0.4 }}>AWAITING INPUT...</div>}
          </div>
        )}

        <div className="hud-tabs">
          {DAYS.map((d) => (
            <button key={d} className={`hud-tab ${view === d ? 'active' : ''}`} onClick={() => setView(d)}>{d}</button>
          ))}
          <button className={`hud-tab ${view === 'jobs' ? 'active' : ''}`} onClick={() => setView('jobs')}>JOBS</button>
          <button className={`hud-tab ${view === 'github' ? 'active' : ''}`} onClick={() => setView('github')}>GITHUB</button>
        </div>

        <div className="hud-panel scrollable" ref={scrollContainerRef}>
          <div className="hud-panel-label">[{view === 'jobs' ? 'JOB HUNTER' : view === 'github' ? 'GITHUB' : 'OPERATIONS LOG'}]</div>
          <div className="hud-scroll-content">
            {view === 'jobs' ? <JobHunterPanel /> : view === 'github' ? <GitHubPanel /> : (schedule?.[view]?.blocks || []).map((b, i) => {
              const isCurrent = view === now.day && now.totalMinutes >= toMin(b.start) && now.totalMinutes < toMin(b.end);
              return (
                <div key={i} ref={isCurrent ? activeBlockRef : null} className={`hud-block ${isCurrent ? 'active' : ''}`}>
                  <div className="hud-block-time">{b.start} - {b.end}</div>
                  <div className="hud-block-content" style={{ borderLeftColor: b.label.includes('Cleaning') ? 'var(--hud-orange)' : 'var(--hud-cyan)' }}>
                    <div className="hud-block-label">{b.icon} {b.label.toUpperCase()} {isCurrent && <span className="hud-badge" style={{ color: 'var(--hud-orange)' }}>[ACTIVE]</span>}</div>
                    <div className="hud-block-detail">{b.detail.toUpperCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!started && (
          <div className="hud-panel" style={{ textAlign: 'center', padding: '40px' }}>
            <button className="hud-tab active" onClick={startSession} style={{ fontSize: '18px', padding: '15px 30px' }}>INITIALIZE JARVIS</button>
          </div>
        )}

        <div className="hud-ticker">
          <div className="ticker-scroll">
            JARVIS v3.8 | {isAwake ? 'SYSTEMS NOMINAL' : 'STANDBY MODE'} | MONITORING: TEBOGO'S GROWTH PROTOCOL | 
            STATUS: {isAwake ? 'OPERATIONAL' : 'OFFLINE'} | CURRENT THEME: {todayData.theme.toUpperCase()} | 
            {currentBlock ? ` ACTIVE BLOCK: ${currentBlock.label.toUpperCase()} ` : ' STANDBY MODE '} | 
            {nextBlock ? ` NEXT: ${nextBlock.label.toUpperCase()} AT ${nextBlock.start} ` : ' END OF OPERATIONS '}
          </div>
        </div>
      </div>
    </>
  );
}
