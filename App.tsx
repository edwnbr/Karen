
import React, { useState, useRef } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { Visualizer } from './components/Visualizer';

const App: React.FC = () => {
  const apiKey = process.env.API_KEY || '';
  const { 
    isConnected, isError, isReconnecting, volume, connect, disconnect,
    isRecording, startRecording, stopRecording, audioBlob,
    isVideoRecording, startVideoRecording, stopVideoRecording, videoBlob,
    sendTextMessage, sendImage, chatHistory,
    toggleVideo, isVideoActive, videoRef, switchCamera, facingMode
  } = useGeminiLive({ apiKey });

  const [inputText, setInputText] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (text) {
      sendTextMessage(text);
      setInputText('');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendImage(file);
  };

  const downloadRecording = (blob: Blob | null, type: 'audio' | 'video') => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `karen-${type}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!apiKey) return <div className="min-h-screen bg-[#000000] flex items-center justify-center text-neutral-500">API Key Missing</div>;

  return (
    <div className="relative min-h-screen bg-[#000000] text-white overflow-hidden font-sans flex flex-col items-center">
      
      {/* Background Text - Hide in full screen mode */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isFullScreen ? 'opacity-0' : 'opacity-100'}`}>
         <Visualizer volume={volume} />
      </div>

      {/* Video Preview / Full Screen Player */}
      <div 
        className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
           isFullScreen 
             ? 'fixed inset-0 w-full h-full z-10 bg-black' 
             : `absolute top-6 right-6 z-30 w-40 h-56 md:w-56 md:h-72 bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5 ${!isVideoActive ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`
        }`}
      >
        <div className="relative w-full h-full group">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-transform duration-500 ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
            />
            
            {/* Live Indicator */}
            <div className="absolute top-4 left-4 flex gap-2 items-center z-10">
               <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
               <span className="text-[10px] font-bold text-white/90 tracking-widest bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">LIVE</span>
            </div>

            {/* Rec Indicator */}
            {isVideoRecording && (
                <div className="absolute top-12 left-4 flex items-center gap-1 bg-red-600/90 px-2 py-1 rounded backdrop-blur-sm shadow-sm z-10">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-widest">REC</span>
                </div>
            )}
            
            {/* Controls Overlay (Top Right) */}
            <div className={`absolute top-4 right-4 flex gap-2 transition-opacity duration-300 ${isFullScreen ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                
                {/* Full Screen Toggle */}
                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md border border-white/10"
                  title={isFullScreen ? "Свернуть" : "На весь экран"}
                >
                   {isFullScreen ? (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-9 5.25 5.25" />
                     </svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                     </svg>
                   )}
                </button>

                {/* Switch Camera */}
                <button 
                  onClick={switchCamera}
                  className="p-2.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md border border-white/10"
                  title="Переключить камеру"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
            </div>
        </div>
      </div>

      {/* Main Controls Container */}
      <div className={`absolute bottom-0 w-full pb-10 px-6 max-w-3xl flex flex-col gap-6 ${isFullScreen ? 'z-50' : 'z-20'}`}>
        
        {isError && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
             <p className={`text-center text-xs font-medium px-6 py-2 rounded-full backdrop-blur-md shadow-xl border ${isReconnecting ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                {isError}
             </p>
             {!isConnected && !isReconnecting && (
               <button onClick={() => connect()} className="text-[10px] text-neutral-400 hover:text-white uppercase tracking-widest transition-all bg-black/20 px-3 py-1 rounded-full">
                 Вернуть Karen
               </button>
             )}
          </div>
        )}

        {/* Input Bar */}
        <div className={`flex items-center gap-3 bg-[#0a0a0a]/70 backdrop-blur-2xl border border-white/10 p-2 rounded-full transition-all duration-700 shadow-2xl ${isConnected ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-neutral-400 hover:text-rose-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
          <form onSubmit={handleSend} className="flex-1 flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Шепни ей что-нибудь..."
              className="bg-transparent border-none focus:ring-0 text-sm flex-1 placeholder:text-neutral-500 text-white"
            />
            <button type="submit" className={`p-2 rounded-full transition-all ${inputText ? 'text-rose-400' : 'text-neutral-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          
          {/* Downloads Group */}
          <div className="flex gap-2">
            {audioBlob && !isRecording && (
                <button 
                onClick={() => downloadRecording(audioBlob, 'audio')}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 backdrop-blur-md"
                title="Скачать аудио"
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
                </button>
            )}
            {videoBlob && !isVideoRecording && (
                <button 
                onClick={() => downloadRecording(videoBlob, 'video')}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 backdrop-blur-md"
                title="Скачать видео"
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909" />
                </svg>
                </button>
            )}
          </div>

          {/* Audio Recording Button */}
          {isConnected && (
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border backdrop-blur-md ${isRecording ? 'text-rose-500 animate-pulse bg-rose-500/10 border-rose-500/20' : 'text-neutral-400 hover:text-white bg-white/5 border-white/5'}`}
              title="Запись только звука"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>
          )}

          {/* Connect/Disconnect Button */}
          <button
            onClick={() => isConnected ? disconnect() : connect()}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-700 backdrop-blur-md ${isConnected ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'bg-white/5 text-neutral-400 hover:scale-105 hover:bg-white/10'}`}
          >
            {isConnected ? (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
               </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            )}
          </button>

          {/* Video Toggle & Rec Button Group */}
          <div className="flex flex-col gap-2 items-center">
             {isConnected && (
                <button 
                 onClick={toggleVideo}
                 className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border backdrop-blur-md ${isVideoActive ? 'text-white bg-white/20 border-white/30' : 'text-neutral-400 hover:text-white bg-white/5 border-white/5'}`}
                 title="Включить камеру"
                >
                   {isVideoActive ? (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                     </svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909" />
                     </svg>
                   )}
                </button>
             )}
             
             {/* Video Record Button */}
             {isVideoActive && (
                 <button
                    onClick={isVideoRecording ? stopVideoRecording : startVideoRecording}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border backdrop-blur-md ${isVideoRecording ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 border-white/5 text-neutral-500 hover:text-red-400'}`}
                    title="Запись видео (со звуком)"
                 >
                    <div className={`w-3 h-3 rounded-full ${isVideoRecording ? 'bg-white rounded-sm' : 'bg-current'}`} />
                 </button>
             )}
          </div>

        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .mask-fade-top { mask-image: linear-gradient(to bottom, transparent, black 10%); }
      `}</style>
    </div>
  );
};

export default App;
