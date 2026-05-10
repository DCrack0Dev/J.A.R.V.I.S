import { create } from 'zustand';

export const useVoiceStore = create((set) => ({
  state: 'DORMANT', // DORMANT | ACTIVE | SPEAKING
  history: [],
  context: {},
  lastTopic: null,
  isPanicMute: false,
  isWakeWordEnabled: false,
  
  setState: (state) => set({ state }),
  
  wake: (socket, userId, sessionId) => {
    set({ state: 'ACTIVE' });
    if (socket) {
      socket.emit('jarvis:wake', { userId, sessionId });
    }
  },
  
  sleep: (socket, userId, sessionId, history, context) => {
    set({ state: 'DORMANT' });
    if (socket) {
      socket.emit('jarvis:sleep', { userId, sessionId, history, context });
    }
  },
  
  setSpeaking: () => set({ state: 'SPEAKING' }),
  setDoneSpeaking: () => set({ state: 'ACTIVE' }),
  
  setPanicMute: (isPanicMute) => set({ isPanicMute }),
  setWakeWordEnabled: (isWakeWordEnabled) => set({ isWakeWordEnabled }),
  
  setSessionData: (data) => set({ 
    history: data.history || [], 
    context: data.context || {} 
  }),
}));
