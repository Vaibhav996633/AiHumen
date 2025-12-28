
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Camera as CameraIcon, CameraOff, 
  Bot, Settings, History, X, Cpu, User, UserCheck,
  Activity, Zap, Shield, Radar, Globe, Terminal, Eye, Coffee, ZapOff,
  LayoutDashboard, MessageSquare, ChevronRight
} from 'lucide-react';
import { Avatar3D } from '../components/avatar/Avatar3D';
import { AssistantState, UserSettings, Gender } from '../types';
import { useNeuralLink } from '../hooks/useNeuralLink';

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Bhava',
  preferredLanguage: 'Informal Marathi',
  voiceName: 'Zephyr',
  gender: 'FEMALE'
};

const App: React.FC = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('aira_core_v13');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
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

  // Auto-scroll log
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) { 
          videoRef.current.srcObject = stream; 
          setCameraActive(true);
        }
      } catch (err) { 
        neural.setError('Vision system access denied.'); 
      }
    } else {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setCameraActive(false);
    }
  };

  const switchPersona = () => {
    const newGender = settings.gender === 'FEMALE' ? 'MALE' : 'FEMALE';
    const newVoice = newGender === 'FEMALE' ? 'Zephyr' : 'Puck';
    setSettings({...settings, gender: newGender, voiceName: newVoice});
    if (neural.isActive) neural.stop();
  };

  const themeColorClass = settings.gender === 'FEMALE' ? 'pink-500' : 'cyan-500';
  const themeBgClass = settings.gender === 'FEMALE' ? 'pink-500/10' : 'cyan-500/10';
  const themeBorderClass = settings.gender === 'FEMALE' ? 'pink-500/20' : 'cyan-500/20';

  return (
    <div className="flex h-[100dvh] w-screen bg-[#010206] text-slate-100 overflow-hidden font-sans relative">
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.04]">
        <div className={`w-full h-[1px] absolute animate-[scan_12s_linear_infinite] ${settings.gender === 'FEMALE' ? 'bg-pink-500' : 'bg-cyan-500'}`} />
      </div>

      <div className="relative z-10 flex flex-col w-full h-full p-3 sm:p-4 lg:p-8 lg:flex-row gap-4 lg:gap-8 overflow-hidden">
        
        {/* Mobile Navigation */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm flex justify-around p-3 bg-black/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 z-[60] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button onClick={() => setMobileView('AVATAR')} className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${mobileView === 'AVATAR' ? `bg-${themeColorClass}/20 text-white scale-110` : 'text-slate-500'}`}>
            <Bot className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Core</span>
          </button>
          <button onClick={() => setMobileView('HISTORY')} className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${mobileView === 'HISTORY' ? `bg-${themeColorClass}/20 text-white scale-110` : 'text-slate-500'}`}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Log</span>
          </button>
          <button onClick={() => setMobileView('CAMERA')} className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${mobileView === 'CAMERA' ? `bg-${themeColorClass}/20 text-white scale-110` : 'text-slate-500'}`}>
            <CameraIcon className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase">Visor</span>
          </button>
        </div>

        {/* Neural Log Side Panel */}
        <aside className={`${mobileView === 'HISTORY' ? 'flex animate-in slide-in-from-left duration-300' : 'hidden'} lg:flex flex-col w-full lg:w-72 xl:w-80 gap-6 h-full pb-24 lg:pb-0`}>
           <div className="flex-1 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/5 p-6 lg:p-8 flex flex-col shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <div className="flex items-center gap-3">
                  <Terminal className={`w-4 h-4 text-${themeColorClass}`} />
                  <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Neural Log</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 lg:space-y-6 scrollbar-hide pr-2">
                {neural.transcriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-10 text-center gap-4">
                    <History className="w-12 h-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">System Ready<br/>Establish Sync</p>
                  </div>
                ) : (
                  <>
                    {neural.transcriptions.map((t, i) => (
                      <div key={i} className={`flex flex-col ${t.type === 'input' ? 'items-end' : 'items-start'} gap-1.5 animate-in fade-in slide-in-from-bottom-2`}>
                        <span className="text-[7px] font-black uppercase text-slate-600 tracking-widest">{t.type === 'input' ? settings.userName : 'Assistant'}</span>
                        <div className={`max-w-[90%] px-4 py-3 rounded-[1.5rem] text-[11px] lg:text-[12px] leading-relaxed border shadow-lg transition-all ${
                          t.type === 'input' 
                            ? `bg-${themeBgClass} text-${settings.gender === 'FEMALE' ? 'pink-200' : 'cyan-200'} border-${themeBorderClass}` 
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
        <section className={`${mobileView === 'AVATAR' ? 'flex animate-in zoom-in duration-300' : 'hidden'} lg:flex flex-1 flex-col gap-4 lg:gap-8 relative h-full pb-28 lg:pb-0`}>
           <div className="flex-1 rounded-[3.5rem] lg:rounded-[5.5rem] bg-black border border-white/5 relative overflow-hidden shadow-[inset_0_0_120px_rgba(0,0,0,1)] ring-1 ring-white/5">
              <Avatar3D 
                state={neural.state} 
                emotion={neural.emotion} 
                volume={neural.volume} 
                cameraActive={cameraActive} 
                gender={settings.gender} 
              />
              
              {/* Profile Card */}
              <div className="absolute top-6 left-6 sm:top-10 sm:left-10 lg:top-12 lg:left-12 flex items-center gap-4 lg:gap-6 z-20">
                <div className={`w-14 h-14 lg:w-22 lg:h-22 rounded-3xl p-[2px] transition-all duration-700 transform hover:scale-105 cursor-pointer bg-gradient-to-tr ${settings.gender === 'FEMALE' ? 'from-pink-600 to-rose-800' : 'from-cyan-600 to-blue-800'} shadow-2xl`} onClick={switchPersona}>
                  <div className="w-full h-full bg-[#02030a] rounded-3xl flex items-center justify-center border border-white/10">
                    {settings.gender === 'FEMALE' ? <UserCheck className="w-8 h-8 lg:w-12 lg:h-12 text-pink-500" /> : <Bot className="w-8 h-8 lg:w-12 lg:h-12 text-cyan-500" />}
                  </div>
                </div>
                <div>
                   <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tighter uppercase text-white leading-none">
                      {settings.gender === 'FEMALE' ? 'AIRA ' : 'ARYAN '}
                      <span className={`text-${themeColorClass}`}>{settings.gender === 'FEMALE' ? 'CORE' : 'MOD'}</span>
                   </h1>
                   <div className="flex items-center gap-2 mt-2">
                      <div className={`px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 bg-black/40 backdrop-blur-md`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${neural.isActive ? `bg-${themeColorClass} animate-pulse shadow-[0_0_10px_${themeColorClass}]` : 'bg-slate-700'}`} />
                        <span className={`text-[8px] font-black uppercase tracking-widest text-slate-400`}>Biometric Link</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Status Pill (Mobile Hide) */}
              <div className="absolute top-8 right-8 z-20 hidden sm:flex">
                 <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-2xl">
                    <Activity className={`w-4 h-4 text-${themeColorClass}`} />
                    <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">{neural.state}</span>
                 </div>
              </div>

              {/* Responsive Audio Spectrum */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-[300px] lg:max-w-md px-6 z-20 pointer-events-none">
                 <div className="flex items-end justify-center gap-1.5 lg:gap-2.5 h-16 lg:h-24">
                   {[...Array(20)].map((_, i) => (
                      <div key={i} className={`flex-1 rounded-t-full transition-all duration-150 ${
                        neural.isActive 
                          ? `bg-gradient-to-t from-${themeColorClass} to-transparent opacity-80` 
                          : 'bg-white/5 opacity-30'
                      }`} style={{ height: neural.state === AssistantState.SPEAKING ? `${25 + Math.random() * 75}%` : '10%' }} />
                    ))}
                 </div>
              </div>
           </div>

           {/* Interaction UI */}
           <div className="h-32 sm:h-36 lg:h-44 flex items-center justify-center gap-5 sm:gap-10 lg:gap-16">
              <button onClick={switchPersona} className="hidden sm:flex p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-90 group shadow-xl">
                 <User className={`w-8 h-8 text-slate-500 group-hover:text-${themeColorClass}`} />
              </button>

              <button 
                onClick={neural.isActive ? neural.stop : neural.start}
                className={`flex-1 lg:flex-none relative flex items-center justify-center gap-6 px-12 lg:px-40 py-8 lg:py-14 rounded-full transition-all duration-700 transform active:scale-95 border-2 shadow-2xl ${
                  neural.isActive 
                    ? 'bg-red-500/10 border-red-500/40 text-red-400' 
                    : `bg-${themeColorClass}/10 border-${themeColorClass}/50 text-${themeColorClass}`
                }`}
              >
                {neural.isActive ? (
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping bg-red-500/30 rounded-full" />
                    <MicOff className="w-9 h-9 lg:w-14 lg:h-14" />
                  </div>
                ) : <Mic className="w-9 h-9 lg:w-14 lg:h-14" />}
                <span className="text-xl lg:text-4xl font-black uppercase tracking-tighter whitespace-nowrap">
                  {neural.isActive ? 'Sever Link' : `Init ${settings.gender === 'FEMALE' ? 'Core' : 'Mod'}`}
                </span>
              </button>

              <button onClick={() => setShowSettings(true)} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-90 group shadow-xl">
                <Settings className={`w-8 h-8 text-slate-500 group-hover:text-${themeColorClass}`} />
              </button>
           </div>
        </section>

        {/* Neural Visor Side Panel */}
        <aside className={`${mobileView === 'CAMERA' ? 'flex animate-in slide-in-from-right duration-300' : 'hidden'} lg:flex flex-col w-full lg:w-72 xl:w-80 gap-6 h-full pb-24 lg:pb-0`}>
           <div className="h-2/3 lg:h-80 rounded-[3rem] bg-black/60 backdrop-blur-3xl border border-white/10 relative overflow-hidden group shadow-2xl">
             <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-all duration-1000 ${cameraActive ? 'opacity-80 saturate-0' : 'opacity-0 scale-125'}`} />
             <canvas ref={canvasRef} className="hidden" />
             
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 pointer-events-none" />
             
             <div className="absolute top-6 left-6 flex items-center gap-3">
                <Radar className={`w-4 h-4 ${cameraActive ? `text-${themeColorClass} animate-pulse` : 'text-slate-600'}`} />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Optic Visor</span>
             </div>

             {!cameraActive && (
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                 <div className="p-8 rounded-full bg-white/5 border border-white/5 animate-pulse">
                  <Eye className="w-12 h-12 text-slate-800" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-700 text-center">Optic Shield<br/>Engaged</p>
               </div>
             )}

             <button onClick={toggleCamera} className={`absolute bottom-8 right-8 p-6 rounded-[2rem] backdrop-blur-3xl border transition-all z-20 ${cameraActive ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-black/60 border-white/10 text-white/40 shadow-xl'}`}>
               {cameraActive ? <ZapOff className="w-6 h-6" /> : <CameraIcon className="w-6 h-6" />}
             </button>
           </div>

           <div className="flex-1 rounded-[3rem] bg-black/40 backdrop-blur-3xl border border-white/5 p-8 lg:p-10 flex flex-col gap-8 shadow-2xl">
              <div className="flex items-center gap-3">
                <Shield className={`w-4 h-4 text-${themeColorClass}`} />
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Environment</h3>
              </div>
              <div className="space-y-8 flex-1 overflow-y-auto scrollbar-hide">
                 {[
                   { icon: Globe, label: 'Neural Path', val: 'Native Hybrid' },
                   { icon: Terminal, label: 'Dialogue Flow', val: 'Bold v13' },
                   { icon: Activity, label: 'Visor State', val: cameraActive ? 'Processing Frames' : 'Optics Offline' }
                 ].map((item, i) => (
                   <div key={i} className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-3 text-[9px] font-black uppercase text-slate-600 tracking-widest">
                        <item.icon className="w-4 h-4" /> {item.label}
                      </div>
                      <div className={`text-[13px] font-black text-slate-300 italic uppercase truncate pl-7 opacity-90`}>{item.val}</div>
                   </div>
                 ))}
              </div>
              <div className="pt-6 border-t border-white/10 flex items-center justify-center opacity-10">
                <Cpu className="w-6 h-6" />
              </div>
           </div>
        </aside>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-black/98 backdrop-blur-4xl animate-in fade-in duration-300">
           <div className="w-full max-w-2xl bg-[#0a0c16] border border-white/10 rounded-[4rem] lg:rounded-[6rem] p-10 lg:p-20 shadow-[0_0_150px_rgba(0,0,0,1)] relative max-h-[95vh] overflow-y-auto scrollbar-hide">
             <div className="flex items-center justify-between mb-16 lg:mb-20">
               <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-[0.4em] text-white">Neural Hub</h2>
               <button onClick={() => setShowSettings(false)} className="p-4"><X className="w-12 h-12 text-slate-600 hover:text-white transition-colors" /></button>
             </div>
             <div className="space-y-12 lg:space-y-20">
                <div className="space-y-6">
                  <label className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-600 ml-8">Biometric ID</label>
                  <input type="text" placeholder="Identity Tag" value={settings.userName} onChange={e => setSettings({...settings, userName: e.target.value})} className={`w-full bg-white/5 border border-white/10 rounded-[2.5rem] lg:rounded-[4rem] px-12 lg:px-16 py-8 lg:py-12 font-black text-2xl lg:text-4xl outline-none focus:border-${themeColorClass}/60 text-white transition-all shadow-inner`} />
                </div>
                <div className="space-y-6">
                   <label className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-600 ml-8">Vocal Signature</label>
                   <div className="relative">
                    <select value={settings.voiceName} onChange={e => setSettings({...settings, voiceName: e.target.value as any})} className={`w-full bg-white/5 border border-white/10 rounded-[2.5rem] lg:rounded-[4rem] px-12 lg:px-16 py-8 lg:py-12 font-black text-2xl lg:text-4xl outline-none focus:border-${themeColorClass}/60 text-white appearance-none cursor-pointer`}>
                        <option value="Zephyr">Zephyr (Default)</option>
                        <option value="Puck">Puck (Resonant)</option>
                        <option value="Kore">Kore (Sharp)</option>
                    </select>
                    <ChevronRight className="absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 text-white/20 pointer-events-none rotate-90" />
                   </div>
                </div>
                <button onClick={() => setShowSettings(false)} className={`w-full py-10 lg:py-14 rounded-full font-black uppercase text-2xl lg:text-4xl text-white shadow-3xl transition-all hover:scale-[1.03] active:scale-95 bg-${themeColorClass} shadow-${themeColorClass}/30`}>Commit Sync</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
