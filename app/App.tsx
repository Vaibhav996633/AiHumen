
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Camera as CameraIcon, CameraOff, 
  Bot, Settings, History, X, Cpu, User, UserCheck,
  Activity, Zap, Shield, Radar, Globe, Terminal, Eye, Coffee, ZapOff,
  LayoutDashboard, MessageSquare, ChevronRight
} from 'lucide-react';
import { Avatar3D } from '../components/avatar/Avatar3D.tsx';
import { AssistantState, UserSettings } from '../types.ts';
import { useNeuralLink } from '../hooks/useNeuralLink.ts';

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Bhava',
  preferredLanguage: 'Informal Marathi',
  voiceName: 'Zephyr',
  gender: 'FEMALE'
};

const App: React.FC = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('aira_core_v13');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [mobileView, setMobileView] = useState<'AVATAR' | 'HISTORY' | 'CAMERA'>('AVATAR');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const neural = useNeuralLink(settings);

  useEffect(() => {
    localStorage.setItem('aira_core_v13', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [neural.transcriptions]);

  const startFrameStream = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = window.setInterval(() => {
      if (canvasRef.current && videoRef.current && videoRef.current.readyState >= 2 && neural.isActive && neural.sessionRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = 320; 
          canvasRef.current.height = 240;
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          const b64 = canvasRef.current.toDataURL('image/jpeg', 0.4).split(',')[1];
          neural.sessionRef.current.sendRealtimeInput({ 
            media: { data: b64, mimeType: 'image/jpeg' } 
          });
        }
      }
    }, 1200);
  };

  useEffect(() => {
    if (cameraActive && neural.isActive) {
      startFrameStream();
    } else {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    }
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
  }, [cameraActive, neural.isActive]);

  const toggleCamera = async () => {
    if (!cameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        if (videoRef.current) { 
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play failed", e));
          setCameraActive(true);
        }
      } catch (err) { 
        neural.setError('Vision system access denied.'); 
      }
    } else {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    }
  };

  const switchPersona = () => {
    const newGender = settings.gender === 'FEMALE' ? 'MALE' : 'FEMALE';
    const newVoice = newGender === 'FEMALE' ? 'Zephyr' : 'Puck';
    setSettings({...settings, gender: newGender, voiceName: newVoice});
    if (neural.isActive) neural.stop();
  };

  // Static Tailwind color mappings to avoid dynamic class failures
  const themePrimary = settings.gender === 'FEMALE' ? 'pink-500' : 'cyan-500';
  const themeActiveBg = settings.gender === 'FEMALE' ? 'bg-pink-500/20' : 'bg-cyan-500/20';
  const themeText = settings.gender === 'FEMALE' ? 'text-pink-500' : 'text-cyan-500';
  const themeBorder = settings.gender === 'FEMALE' ? 'border-pink-500/20' : 'border-cyan-500/20';

  return (
    <div className="flex h-[100dvh] w-screen bg-[#010206] text-slate-100 overflow-hidden font-sans relative">
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.04]">
        <div className={`w-full h-[1px] absolute animate-[scan_12s_linear_infinite] ${settings.gender === 'FEMALE' ? 'bg-pink-500' : 'bg-cyan-500'}`} />
      </div>

      <div className="relative z-10 flex flex-col w-full h-full p-3 sm:p-4 lg:p-8 lg:flex-row gap-4 lg:gap-8 overflow-hidden">
        {/* Mobile Navigation */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm flex justify-around p-3 bg-black/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 z-[60] shadow-2xl">
          <button onClick={() => setMobileView('AVATAR')} className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${mobileView === 'AVATAR' ? `${themeActiveBg} text-white scale-110` : 'text-slate-500'}`}>
            <Bot className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Core</span>
          </button>
          <button onClick={() => setMobileView('HISTORY')} className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${mobileView === 'HISTORY' ? `${themeActiveBg} text-white scale-110` : 'text-slate-500'}`}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Log</span>
          </button>
          <button onClick={() => setMobileView('CAMERA')} className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${mobileView === 'CAMERA' ? `${themeActiveBg} text-white scale-110` : 'text-slate-500'}`}>
            <CameraIcon className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Visor</span>
          </button>
        </div>

        {/* Neural Log Side Panel */}
        <aside className={`${mobileView === 'HISTORY' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-72 xl:w-80 gap-6 h-full pb-24 lg:pb-0`}>
           <div className="flex-1 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/5 p-6 flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className={`w-4 h-4 ${themeText}`} />
                <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Neural Log</h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                {neural.transcriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-10 text-center gap-4">
                    <History className="w-12 h-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest uppercase">System Ready<br/>Establish Sync</p>
                  </div>
                ) : (
                  <>
                    {neural.transcriptions.map((t, i) => (
                      <div key={i} className={`flex flex-col ${t.type === 'input' ? 'items-end' : 'items-start'} gap-1.5`}>
                        <span className="text-[7px] font-black uppercase text-slate-600 tracking-widest">{t.type === 'input' ? settings.userName : 'Assistant'}</span>
                        <div className={`max-w-[90%] px-4 py-3 rounded-[1.5rem] text-[11px] leading-relaxed border shadow-lg ${
                          t.type === 'input' 
                            ? `${settings.gender === 'FEMALE' ? 'bg-pink-500/10 text-pink-200 border-pink-500/20' : 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20'}` 
                            : 'bg-white/5 text-slate-300 border-white/5'
                        }`}>
                          {t.text}
                        </div>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </>
                )}
              </div>
           </div>
        </aside>

        {/* Central Assistant Display */}
        <section className={`${mobileView === 'AVATAR' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col gap-4 lg:gap-8 relative h-full pb-28 lg:pb-0`}>
           <div className="flex-1 rounded-[3.5rem] lg:rounded-[5.5rem] bg-black border border-white/5 relative overflow-hidden shadow-2xl ring-1 ring-white/5">
              <Avatar3D 
                state={neural.state} 
                emotion={neural.emotion} 
                volume={neural.volume} 
                cameraActive={cameraActive} 
                gender={settings.gender} 
              />
              
              <div className="absolute top-6 left-6 sm:top-10 sm:left-10 lg:top-12 lg:left-12 flex items-center gap-4 lg:gap-6 z-20">
                <div className={`w-14 h-14 lg:w-22 lg:h-22 rounded-3xl p-[2px] transition-all bg-gradient-to-tr ${settings.gender === 'FEMALE' ? 'from-pink-600 to-rose-800' : 'from-cyan-600 to-blue-800'} shadow-2xl cursor-pointer`} onClick={switchPersona}>
                  <div className="w-full h-full bg-[#02030a] rounded-3xl flex items-center justify-center border border-white/10">
                    {settings.gender === 'FEMALE' ? <UserCheck className="w-8 h-8 lg:w-12 lg:h-12 text-pink-500" /> : <Bot className="w-8 h-8 lg:w-12 lg:h-12 text-cyan-500" />}
                  </div>
                </div>
                <div>
                   <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tighter uppercase text-white leading-none">
                      {settings.gender === 'FEMALE' ? 'AIRA ' : 'ARYAN '}
                      <span className={themeText}>{settings.gender === 'FEMALE' ? 'CORE' : 'MOD'}</span>
                   </h1>
                </div>
              </div>

              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-[300px] lg:max-w-md px-6 z-20 pointer-events-none">
                 <div className="flex items-end justify-center gap-1.5 h-16 lg:h-24">
                   {[...Array(20)].map((_, i) => (
                      <div key={i} className={`flex-1 rounded-t-full transition-all duration-150 ${
                        neural.isActive 
                          ? `${settings.gender === 'FEMALE' ? 'bg-pink-500' : 'bg-cyan-500'} opacity-80` 
                          : 'bg-white/5 opacity-30'
                      }`} style={{ height: neural.state === AssistantState.SPEAKING ? `${25 + Math.random() * 75}%` : '10%' }} />
                    ))}
                 </div>
              </div>
           </div>

           <div className="h-32 flex items-center justify-center gap-5 sm:gap-10 lg:gap-16">
              <button 
                onClick={neural.isActive ? neural.stop : neural.start}
                className={`flex-1 lg:flex-none relative flex items-center justify-center gap-6 px-12 lg:px-40 py-8 lg:py-10 rounded-full transition-all border-2 shadow-2xl ${
                  neural.isActive 
                    ? 'bg-red-500/10 border-red-500/40 text-red-400' 
                    : `${settings.gender === 'FEMALE' ? 'bg-pink-500/10 border-pink-500/50 text-pink-500' : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-500'}`
                }`}
              >
                {neural.isActive ? <MicOff className="w-8 h-8 lg:w-10 lg:h-10" /> : <Mic className="w-8 h-8 lg:w-10 lg:h-10" />}
                <span className="text-xl lg:text-3xl font-black uppercase tracking-tighter">
                  {neural.isActive ? 'Sever Link' : 'Init Sync'}
                </span>
              </button>

              <button onClick={() => setShowSettings(true)} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 shadow-xl">
                <Settings className={`w-8 h-8 text-slate-500`} />
              </button>
           </div>
        </section>

        {/* Neural Visor Side Panel */}
        <aside className={`${mobileView === 'CAMERA' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-72 xl:w-80 gap-6 h-full pb-24 lg:pb-0`}>
           <div className="h-2/3 lg:h-80 rounded-[3rem] bg-black/60 backdrop-blur-3xl border border-white/10 relative overflow-hidden group shadow-2xl">
             <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'}`} 
             />
             <canvas ref={canvasRef} className="hidden" />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 pointer-events-none" />
             
             <div className="absolute top-6 left-6 flex items-center gap-3">
                <Radar className={`w-4 h-4 ${cameraActive ? `${themeText} animate-pulse` : 'text-slate-600'}`} />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Optic Visor</span>
             </div>

             {!cameraActive && (
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                 <Eye className="w-12 h-12 text-slate-800" />
                 <p className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-700 text-center">Shield On</p>
               </div>
             )}

             <button onClick={toggleCamera} className={`absolute bottom-8 right-8 p-6 rounded-[2rem] backdrop-blur-3xl border z-20 ${cameraActive ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-black/60 border-white/10 text-white/40'}`}>
               {cameraActive ? <ZapOff className="w-6 h-6" /> : <CameraIcon className="w-6 h-6" />}
             </button>
           </div>
        </aside>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-4xl">
           <div className="w-full max-w-2xl bg-[#0a0c16] border border-white/10 rounded-[4rem] p-10 lg:p-20 shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="flex items-center justify-between mb-16">
               <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-[0.4em] text-white">Config</h2>
               <button onClick={() => setShowSettings(false)}><X className="w-10 h-10 text-slate-600" /></button>
             </div>
             <div className="space-y-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 ml-4">User Identity</label>
                  <input type="text" value={settings.userName} onChange={e => setSettings({...settings, userName: e.target.value})} className={`w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-8 py-6 font-black text-2xl outline-none focus:border-${themePrimary} text-white`} />
                </div>
                <button onClick={() => setShowSettings(false)} className={`w-full py-8 rounded-full font-black uppercase text-2xl text-white ${settings.gender === 'FEMALE' ? 'bg-pink-600' : 'bg-cyan-600'}`}>Commit</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
