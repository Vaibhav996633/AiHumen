
import { useState, useRef, useEffect, useCallback } from 'react';
import { AssistantState, Emotion, TranscriptionItem, UserSettings } from '../types.ts';
import { createAIInstance, getSystemInstruction } from '../services/aiService.ts';
import { decodeBase64, decodeAudioData, createPcmBlob } from '../utils/audioUtils.ts';
import { Modality, LiveServerMessage } from '@google/genai';
import { logConversation, syncProfile, getRecentMemories } from '../services/supabaseService.ts';

export const useNeuralLink = (settings: UserSettings) => {
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<AssistantState>(AssistantState.IDLE);
  const [emotion, setEmotion] = useState<Emotion>('NEUTRAL');
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const proactiveTimerRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7));

  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = audioContextRef.current.createGain();
      outputNodeRef.current.connect(audioContextRef.current.destination);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      outputNodeRef.current.connect(analyserRef.current);
    }
  }, []);

  const analyzeEmotion = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.match(/naadach khula|विषय hard|kadak|shabash|mazza|zakkas|laugh|smile|mast|bhari/)) return 'HAPPY';
    if (lower.match(/tension|trass|boring|kantala|off|sorry|sad|dukh/)) return 'SAD';
    if (lower.match(/aai shapath|vishesh|arre vedya|shock|surprised|kay|wow/)) return 'SURPRISED';
    if (lower.match(/kide|gapp|angry|frustrated|irritated|bol ki|काहीतरी बोल|मूर्ख|येड्या/)) return 'ANGRY';
    return 'NEUTRAL';
  };

  const stop = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsActive(false); 
    setState(AssistantState.IDLE);
    setVolume(0);
    setEmotion('NEUTRAL');
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      initAudio();
      if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

      const memories = await getRecentMemories(10);
      const memoryString = memories.length > 0 
        ? memories.map(m => `${m.type === 'input' ? 'User' : 'AI'}: ${m.text}`).join('\n')
        : "No previous records found.";

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = createAIInstance();
      silenceStartRef.current = Date.now();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setState(AssistantState.LISTENING);
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(2048, 1, 1);
            proc.onaudioprocess = (e) => {
              const data = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: createPcmBlob(data), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(proc);
            proc.connect(inputCtx.destination);
            syncProfile('default-user', settings);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTransRef.current += message.serverContent.outputTranscription.text;
              setState(AssistantState.SPEAKING);
              setEmotion(analyzeEmotion(currentOutputTransRef.current));
              silenceStartRef.current = Date.now();
            } else if (message.serverContent?.inputTranscription) {
              currentInputTransRef.current += message.serverContent.inputTranscription.text;
              setState(AssistantState.THINKING);
              silenceStartRef.current = Date.now();
              if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.turnComplete) {
              const newItems: TranscriptionItem[] = [
                { text: currentInputTransRef.current || "...", type: 'input' }, 
                { text: currentOutputTransRef.current || "...", type: 'output' }
              ];
              setTranscriptions(prev => [...prev, ...newItems].slice(-15));
              logConversation(sessionIdRef.current, newItems);
              currentInputTransRef.current = '';
              currentOutputTransRef.current = '';
              setState(AssistantState.LISTENING);
              silenceStartRef.current = Date.now();
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current && outputNodeRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => {
            console.error('Neural Link Error:', e);
            setError('Connection unstable.');
            stop();
          },
          onclose: () => setIsActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(settings, memoryString),
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceName } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) { 
      setError('Connection failed.'); 
    }
  }, [settings, initAudio, stop]);

  useEffect(() => {
    let animationFrame: number;
    const updateVolume = () => {
      if (analyserRef.current && (state === AssistantState.SPEAKING || state === AssistantState.THINKING)) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(Math.min(1, avg / 120)); 
      } else {
        setVolume(0);
      }
      animationFrame = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrame);
  }, [state]);

  return { isActive, state, emotion, transcriptions, volume, error, start, stop, setError, sessionRef };
};
