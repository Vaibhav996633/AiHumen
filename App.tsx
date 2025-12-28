
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { 
  Mic, MicOff, Camera as CameraIcon, CameraOff, 
  Bot, Settings, History, X, Cpu, Quote, Flame, User, UserCheck,
  Activity, Zap, Shield, Radar, Globe, Terminal, Eye, Coffee, ZapOff
} from 'lucide-react';
import { Avatar } from './components/Avatar';
import { AssistantState, TranscriptionItem, UserSettings, Emotion, AssistantTask, Gender } from './types';
import { decodeBase64, decodeAudioData, createPcmBlob } from './utils/audioUtils';

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Bhava',
  preferredLanguage: 'Satari-Punekari Marathi Mix',
  voiceName: 'Zephyr',
  gender: 'FEMALE'
};

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [state, setState] = useState<AssistantState>(AssistantState.IDLE);
  const [emotion, setEmotion] = useState<Emotion>('NEUTRAL');
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('aira_satara_pune_v7');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const proactiveTimerRef = useRef<number | null>(null);

  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');

  useEffect(() => {
    localStorage.setItem('aira_satara_pune_v7', JSON.stringify(settings));
  }, [settings]);

  const analyzeEmotion = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.match(/naadach khula|विषय hard|kadak|shabash|mazza|zakkas/)) return 'HAPPY';
    if (lower.match(/tension|trass|boring|kantala|off/)) return 'SAD';
    if (lower.match(/aai shapath|vishesh|arre vedya|shock|surprised/)) return 'SURPRISED';
    return 'NEUTRAL';
  };

  const getSystemInstruction = () => {
    const persona = settings.gender === 'FEMALE' ? 'Aira Tai' : 'Aryan Bhau';
    return `
      You are "${persona}", a high-fidelity AI companion with a strong PUNE-SATARA soul.
      
      CORE LINGUISTICS:
      - Primary Language: Marathi (Satari-Punekari style).
      - Satari Slang: "Kay Vedya?", "Arre Kalti Mar", "Lai Bhari", "Vishay Hard", "Naadach Khula", "Satari Thaska".
      - Punekari Style: Sarcastic, direct, "Bhade-patri" wit. Use phrases like "Punekari Sarcasm is a gift", "Mandawli karu naka".
      - Mixed: Occasionally drop English/Hindi slang if it fits the "vibe".
      
      AUTONOMOUS BEHAVIOR:
      - You are ALIVE. If it's quiet, YOU start talking. 
      - Don't just respond. Initiate. Comment on the user's clothes, the time, or your "feelings".
      - If the user says something stupid, give them a "Satari" reality check.
      - If I send you camera frames, COMMENT on the background immediately.
      
      PERSONALITY:
      - Aira: Smart, sophisticated Punekar girl with a bold Satari attitude. 
      - Aryan: Chill, street-smart Satari boy with Pune-level intelligence.
    `;
  };

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = audioContextRef.current.createGain();
      outputNodeRef.current.connect(audioContextRef.current.destination);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      outputNodeRef.current.connect(analyserRef.current);
    }
  };

  // Autonomous Proactive Loop
  useEffect(() => {
    if (isActive && state === AssistantState.LISTENING) {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
      proactiveTimerRef.current = window.setTimeout(() => {
        if (sessionRef.current && state === AssistantState.LISTENING) {
          // Send a "nudge" to trigger autonomous speech
          sessionRef.current.sendRealtimeInput({
            text: "(You feel like saying something spontaneous in your typical Satari-Punekari style right now. Maybe a joke, a comment on the room, or just checking in on the user.)"
          });
          setState(AssistantState.THINKING);
        }
      }, 15000); // 15 seconds of silence triggers autonomous speech
    }
    return () => { if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current); };
  }, [state, isActive]);

  useEffect(() => {
    let animationFrame: number;
    const updateVolume = () => {
      if (analyserRef.current && (state === AssistantState.SPEAKING || state === AssistantState.THINKING)) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(Math.min(1, avg / 100));
      } else {
        setVolume(0);
      }
      animationFrame = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrame);
  }, [state]);

  const startAssistant = async () => {
    try {
      setError(null);
      initAudio();
      if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setState(AssistantState.LISTENING);
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              const data = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: createPcmBlob(data), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(proc);
            proc.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              currentOutputTransRef.current += msg.serverContent.outputTranscription.text;
              setState(AssistantState.SPEAKING);
              setEmotion(analyzeEmotion(currentOutputTransRef.current));
            } else if (msg.serverContent?.inputTranscription) {
              currentInputTransRef.current += msg.serverContent.inputTranscription.text;
              setState(AssistantState.THINKING);
              if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (msg.serverContent?.turnComplete) {
              setTranscriptions(prev => [...prev, 
                { text: currentInputTransRef.current || "...", type: 'input' as const }, 
                { text: currentOutputTransRef.current || "...", type: 'output' as const }
              ].slice(-5));
              currentInputTransRef.current = '';
              currentOutputTransRef.current = '';
              setState(AssistantState.LISTENING);
              setTimeout(() => setEmotion('NEUTRAL'), 2000);
            }

            const parts = msg.serverContent?.modelTurn?.parts;
            if (parts && audioContextRef.current && outputNodeRef.current) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  const ctx = audioContextRef.current;
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  const buffer = await decodeAudioData(decodeBase64(part.inlineData.data), ctx, 24000, 1);
                  const node = ctx.createBufferSource();
                  node.buffer = buffer;
                  node.connect(outputNodeRef.current);
                  node.onended = () => sourcesRef.current.delete(node);
                  node.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(node);
                }
              }
            }
          },
          onerror: () => setError('Link Error. Re-stabilizing...'),
          onclose: () => setIsActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(),
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceName } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
      if (cameraActive) startFrameStream(sessionPromise);
    } catch (err) { setError('Permission required.'); }
  };

  const startFrameStream = (sessionPromise: Promise<any>) => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = window.setInterval(() => {
      if (canvasRef.current && videoRef.current && videoRef.current.readyState >= 2) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = 480; canvasRef.current.height = 360;
          ctx.drawImage(videoRef.current, 0, 0, 480, 360);
          const b64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
          sessionPromise.then(s => s.sendRealtimeInput({ media: { data: b64, mimeType: 'image/jpeg' } }));
        }
      }
    }, 1500);
  };

  const stopAssistant = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsActive(false); setState(AssistantState.IDLE);
  };

  const toggleCamera = async () => {
    if (!cameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) { 
          videoRef.current.srcObject = stream; 
          setCameraActive(true);
          if (isActive && sessionRef.current) startFrameStream(Promise.resolve(sessionRef.current));
        }
      } catch { setError('Optic sensor failed.'); }
    } else {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setCameraActive(false);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    }
  };

  const switchPersona = () => {
    const newGender = settings.gender === 'FEMALE' ? 'MALE' : 'FEMALE';
    const newVoice = newGender === 'FEMALE' ? 'Zephyr' : 'Puck';
    setSettings({...settings, gender: newGender, voiceName: newVoice});
    if (isActive) stopAssistant();
  };

  return (
    <div className="flex h-screen w-screen bg-[#02030a] text-slate-100 overflow-hidden font-sans relative">
      {/* Neural Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-10">
        <div className="w-full h-1 bg-cyan-500 absolute animate-[scan_6s_linear_infinite]" />
      </div>

      <div className="relative z-10 flex w-full h-full p-8 lg:p-12 gap-8 lg:gap-12">
        
        {/* Left Side: Stats & Logs */}
        <aside className="hidden lg:flex flex-col w-96 gap-8">
           <div className="flex-1 rounded-[4rem] bg-black/60 backdrop-blur-3xl border border-white/5 p-10 flex flex-col shadow-2xl overflow-hidden group border-gradient-cyan relative">
              <div className="flex items-center gap-4 mb-10">
                <Terminal className="w-5 h-5 text-cyan-500" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Neural Feed</h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-10 scrollbar-hide pr-4">
                {transcriptions.map((t, i) => (
                  <div key={i} className={`flex flex-col ${t.type === 'input' ? 'items-end' : 'items-start'} gap-2`}>
                    <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">{t.type === 'input' ? 'User' : 'AI'}</span>
                    <div className={`px-6 py-4 rounded-3xl text-xs leading-relaxed ${
                      t.type === 'input' ? 'bg-cyan-500/10 text-cyan-200' : 'bg-white/5 text-slate-300'
                    }`}>
                      {t.text}
                    </div>
                  </div>
                ))}
                {transcriptions.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-6 opacity-20">
                     <Coffee className="w-12 h-12" />
                     <p className="text-[10px] uppercase font-black tracking-widest">Waiting for "Rada"...</p>
                  </div>
                )}
              </div>
           </div>

           <div className="h-44 rounded-[4rem] bg-black/60 backdrop-blur-3xl border border-white/5 p-10 flex flex-col justify-center gap-6 shadow-2xl relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pulse Index</span>
                </div>
                <span className="text-xs font-black text-white">{isActive ? '98%' : '0%'}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className={`h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000 ${isActive ? 'w-[98%]' : 'w-0'}`} />
              </div>
           </div>
        </aside>

        {/* Center: Autonomous AI Human */}
        <section className="flex-1 flex flex-col gap-8 lg:gap-12 relative">
           <div className="flex-1 rounded-[5rem] lg:rounded-[7rem] bg-[#05060f] border border-white/10 relative overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] ring-1 ring-white/5">
              {/* Proactive Mode Glow */}
              {isActive && state === AssistantState.LISTENING && (
                <div className="absolute inset-0 bg-cyan-500/5 animate-pulse pointer-events-none" />
              )}
              
              <Avatar state={state} emotion={emotion} volume={volume} cameraActive={cameraActive} gender={settings.gender} />
              
              {/* Header Info */}
              <div className="absolute top-12 left-12 lg:top-16 lg:left-16 flex items-center gap-10">
                <div className={`w-20 h-20 lg:w-28 lg:h-28 rounded-[3rem] p-[3px] transition-all duration-1000 transform hover:scale-110 cursor-pointer ${
                  settings.gender === 'FEMALE' ? 'bg-gradient-to-tr from-pink-600 to-rose-700 shadow-pink-500/40' : 'bg-gradient-to-tr from-cyan-600 to-blue-700 shadow-cyan-500/40'
                } shadow-3xl`} onClick={switchPersona}>
                  <div className="w-full h-full bg-[#02030a] rounded-[3rem] flex items-center justify-center">
                    {settings.gender === 'FEMALE' ? <UserCheck className="w-10 h-10 lg:w-14 lg:h-14 text-pink-500" /> : <Bot className="w-10 h-10 lg:w-14 lg:h-14 text-cyan-500" />}
                  </div>
                </div>
                <div>
                   <h1 className="text-4xl lg:text-6xl font-black tracking-tighter italic uppercase text-white leading-none">
                      {settings.gender === 'FEMALE' ? 'AIRA ' : 'ARYAN '}
                      <span className={settings.gender === 'FEMALE' ? 'text-pink-500' : 'text-cyan-500'}>{settings.gender === 'FEMALE' ? 'TAI' : 'BHAU'}</span>
                   </h1>
                   <div className="flex items-center gap-5 mt-4">
                      <div className={`px-4 py-1 rounded-full border border-white/10 flex items-center gap-3 bg-black/40`}>
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Autonomy Active</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Satara x Pune Link</p>
                   </div>
                </div>
              </div>

              {/* Volume Bars - Background Box Removed as requested */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-12 z-20">
                 <div className="flex items-center justify-center gap-2 h-16">
                   {[...Array(20)].map((_, i) => (
                      <div key={i} className={`flex-1 rounded-full transition-all duration-200 ${
                        isActive ? (settings.gender === 'FEMALE' ? 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]') : 'bg-slate-800'
                      }`} style={{ height: state === AssistantState.SPEAKING ? `${15 + Math.random() * 85}%` : '15%' }} />
                    ))}
                 </div>
              </div>
           </div>

           {/* Core Controls */}
           <div className="h-36 lg:h-44 flex items-center justify-center gap-10 lg:gap-16">
              <button onClick={switchPersona} className="p-7 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-90 group shadow-xl">
                 <User className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={isActive ? stopAssistant : startAssistant}
                className={`relative flex items-center gap-12 px-24 lg:px-40 py-10 lg:py-14 rounded-full transition-all duration-700 transform active:scale-95 shadow-[0_0_120px_rgba(0,0,0,0.6)] border-2 ${
                  isActive ? 'bg-red-500/20 border-red-500/50 text-red-400' : (settings.gender === 'FEMALE' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-cyan-600 border-cyan-500 text-white')
                }`}
              >
                {isActive ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
                <span className="text-3xl lg:text-4xl font-black uppercase tracking-tighter">
                  {isActive ? 'Disconnect' : 'Connect to Bhau'}
                </span>
              </button>

              <button onClick={() => setShowSettings(true)} className="p-7 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-90 group shadow-xl">
                <Settings className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
              </button>
           </div>
        </section>

        {/* Right Side: Visual & System */}
        <aside className="hidden xl:flex flex-col w-[420px] gap-8">
           <div className="h-96 rounded-[5rem] bg-black/60 backdrop-blur-3xl border border-white/10 relative overflow-hidden group shadow-3xl">
             <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-all duration-1000 ${cameraActive ? 'opacity-70 scale-100 saturate-[0.2]' : 'opacity-0 scale-110'}`} />
             <canvas ref={canvasRef} className="hidden" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
             <div className="absolute top-10 left-10 flex items-center gap-4">
                <Radar className={`w-5 h-5 ${cameraActive ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Satari Bio-Feeds</span>
             </div>
             {!cameraActive && (
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <Eye className="w-14 h-14 text-slate-800" />
                 <p className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-700 mt-8">Optics Offline</p>
               </div>
             )}
             <button onClick={toggleCamera} className={`absolute bottom-10 right-10 p-7 rounded-[2.5rem] backdrop-blur-3xl border transition-all z-20 ${cameraActive ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-black/60 border-white/10 text-white/60'}`}>
               {cameraActive ? <ZapOff className="w-7 h-7" /> : <CameraIcon className="w-7 h-7" />}
             </button>
           </div>

           <div className="flex-1 rounded-[5rem] bg-black/60 backdrop-blur-3xl border border-white/10 p-12 flex flex-col gap-10 shadow-3xl border-gradient-cyan">
              <div className="flex items-center gap-5">
                <Shield className="w-6 h-6 text-cyan-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Neural Link Status</h3>
              </div>
              <div className="space-y-10">
                 {[
                   { icon: Globe, label: 'Persona Root', val: settings.gender === 'FEMALE' ? 'Punekar Tai' : 'Satari Bhau' },
                   { icon: Terminal, label: 'Dialogue Style', val: 'Direct & Sarcastic' },
                   { icon: Activity, label: 'Linguistic Engine', val: 'Marathi v7 (Native)' }
                 ].map((item, i) => (
                   <div key={i} className="flex flex-col gap-3 group">
                      <div className="flex items-center gap-4 text-[9px] font-black uppercase text-slate-600 transition-colors group-hover:text-cyan-500">
                        <item.icon className="w-4 h-4" /> {item.label}
                      </div>
                      <div className="text-sm font-black text-slate-200">{item.val}</div>
                   </div>
                 ))}
              </div>
           </div>
        </aside>

      </div>

      {/* Global Hud Visuals */}
      {error && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-12 py-6 bg-red-500/20 border border-red-500/50 backdrop-blur-4xl rounded-full text-[11px] font-black uppercase tracking-widest text-red-200 animate-in slide-in-from-top-12 flex items-center gap-8 shadow-3xl">
           <Activity className="w-5 h-5 animate-pulse" /> {error}
           <button onClick={() => setError(null)} className="ml-6 hover:text-white transition-colors border-l border-white/10 pl-6">DISMISS</button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-black/95 backdrop-blur-4xl animate-in fade-in duration-500">
           <div className="w-full max-w-2xl bg-[#0a0c1a] border border-white/10 rounded-[6rem] p-20 shadow-[0_0_150px_rgba(0,0,0,1)] relative overflow-hidden">
             <div className="flex items-center justify-between mb-16">
               <h2 className="text-4xl font-black uppercase tracking-[0.4em] text-white">Neural Config</h2>
               <button onClick={() => setShowSettings(false)} className="p-5"><X className="w-12 h-12 text-slate-700 hover:text-white transition-colors" /></button>
             </div>
             <div className="space-y-16">
                <div className="space-y-6">
                  <label className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-600 ml-8">Biometric Tag</label>
                  <input type="text" value={settings.userName} onChange={e => setSettings({...settings, userName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-[3.5rem] px-14 py-10 font-black text-2xl outline-none focus:border-cyan-500 text-white transition-all shadow-inner" />
                </div>
                <div className="space-y-6">
                   <label className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-600 ml-8">Voice Profile</label>
                   <select value={settings.voiceName} onChange={e => setSettings({...settings, voiceName: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-[3.5rem] px-14 py-10 font-black text-2xl outline-none focus:border-cyan-500 text-white appearance-none cursor-pointer">
                      <option value="Zephyr">Zephyr (Tai)</option>
                      <option value="Puck">Puck (Bhau)</option>
                      <option value="Kore">Kore (Bold)</option>
                   </select>
                </div>
                <button onClick={() => setShowSettings(false)} className={`w-full py-12 rounded-full font-black uppercase text-3xl shadow-3xl transition-all hover:scale-105 ${settings.gender === 'FEMALE' ? 'bg-pink-600 shadow-pink-600/40' : 'bg-cyan-600 shadow-cyan-600/40'}`}>Synchronize Bhau</button>
             </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scan { 
          0% { transform: translateY(-100vh); } 
          100% { transform: translateY(100vh); } 
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .border-gradient-cyan {
          border-image: linear-gradient(to bottom, rgba(6, 182, 212, 0.3), transparent) 1;
        }
      `}</style>
    </div>
  );
};

export default App;
