import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { geminiService } from '../services/gemini';
import { firebaseService } from '../services/firebase';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RefreshCw,
  Globe,
  Database,
  ExternalLink,
  Search,
  CloudSun,
  Newspaper,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  time: string;
  source?: string;
  webSearchUsed?: boolean;
  webQueries?: string[];
  groundingSources?: Array<{ title?: string; url?: string }>;
  toolsUsed?: string[];
  spatialIntent?: { category: string; attributes: string[]; spatial_anchor?: string };
}

export const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, language }) => {
  const defaultGreeting: Message = {
    sender: 'ai',
    text: `Hey there! I'm CamGo AI, your local buddy and guide for all things Cameron Highlands.

Whether you're trying to find nearby prayer times, grab tickets to places like Flora Park or the Mossy Forest, need emergency numbers, or want to check the latest weather and road conditions before heading out—I've got you covered.

What's on your mind for the trip?`,
    time: 'Just now',
    toolsUsed: ['firebase_directory', 'search_the_web'],
  };

  const [sessionId, setSessionId] = useState<string>(() => {
    const existing = localStorage.getItem('camgo_ai_chat_session_id');
    if (existing) return existing;
    const newId = 'chat-session-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    localStorage.setItem('camgo_ai_chat_session_id', newId);
    return newId;
  });

  const [messages, setMessages] = useState<Message[]>([defaultGreeting]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<'all' | 'directory' | 'web'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from Firestore (camgo-prod) on mount or session change
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      try {
        const history = await firebaseService.getAiChatHistory(sessionId);
        if (isMounted && history.length > 0) {
          setMessages(history);
        }
      } catch (err) {
        console.warn('[AiChatModal] Could not retrieve history from camgo-prod:', err);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleResetChat = () => {
    const newSessionId = 'chat-session-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    localStorage.setItem('camgo_ai_chat_session_id', newSessionId);
    setSessionId(newSessionId);
    setMessages([defaultGreeting]);
  };

  const suggestedPrompts =
    language === 'bm'
      ? [
          { text: 'Ramalan cuaca terkini Cameron Highlands?', type: 'web', icon: CloudSun },
          { text: 'Berita tempatan & status cerun/jalan JKR?', type: 'web', icon: Newspaper },
          { text: 'Masjid & Surau berdekatan?', type: 'dir', icon: Database },
          { text: 'Harga tiket Flora Park & Sheep Sanctuary?', type: 'dir', icon: Database },
          { text: 'Laluan Simpang Pulai vs Tapah hari ini?', type: 'all', icon: Globe },
        ]
      : [
          { text: 'Today\'s live weather forecast in Tanah Rata?', type: 'web', icon: CloudSun },
          { text: 'Latest Cameron Highlands news & road alerts?', type: 'web', icon: Newspaper },
          { text: 'Nearby Masjids & Surau prayer facilities?', type: 'dir', icon: Database },
          { text: 'Ticket prices for Flora Park & Sheep Sanctuary?', type: 'dir', icon: Database },
          { text: 'Is Simpang Pulai or Tapah route better today?', type: 'all', icon: Globe },
        ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string, forceWeb?: boolean) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      sender: 'user',
      text,
      time: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    // Save user message to Firestore camgo-prod
    firebaseService.saveAiChatMessage(sessionId, userMsg);

    try {
      const willUseWeb = forceWeb ?? (enableWebSearch && activeTool !== 'directory');
      const chatResult = await geminiService.askHighlandsAi(text, language, [...messages, userMsg], {
        enableWebSearch: willUseWeb,
        activeTool: forceWeb ? 'web' : activeTool,
      });

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMsg: Message = {
        sender: 'ai',
        text: chatResult.text,
        time: aiTime,
        source: chatResult.source,
        webSearchUsed: chatResult.webSearchUsed,
        webQueries: chatResult.webQueries,
        groundingSources: chatResult.groundingSources,
        toolsUsed: chatResult.toolsUsed,
      };

      // Extract Spatial Intent in background for metadata display
      geminiService.parseSpatialIntent(text).then(intent => {
        if (intent && intent.category) {
          aiMsg.spatialIntent = intent;
          setMessages(prev => prev.map((m, idx) => idx === prev.length - 1 ? { ...m, spatialIntent: intent } : m));
        }
      });

      setMessages((prev) => [...prev, aiMsg]);
      // Save AI reply to Firestore camgo-prod
      firebaseService.saveAiChatMessage(sessionId, aiMsg);
    } catch {
      const fallbackMsg: Message = {
        sender: 'ai',
        text:
          language === 'bm'
            ? 'Maaf, sambungan rangkaian terganggu. Sila cuba lagi sebentar lagi.'
            : 'Connection interrupted. Please verify your connection or try again.',
        time: 'Just now',
        toolsUsed: ['firebase_directory'],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
      <div className="glass-panel w-full max-w-2xl h-[92vh] sm:h-[660px] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-stone-900 flex flex-col">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-stone-950/95 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-5 h-5 animate-spin duration-3000" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-stone-100 text-sm sm:text-base">CamGo Highland AI</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Live Guide
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  camgo-prod
                </span>
              </div>
              <p className="text-[11px] text-stone-400 line-clamp-1">
                {language === 'bm'
                  ? 'Direktori Firebase & Carian Web Langsung Google'
                  : 'Firebase Directory & Live Google Web Search'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetChat}
              title={language === 'bm' ? 'Mulakan sembang baharu' : 'Start new chat session'}
              className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-emerald-400 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>



        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-stone-950/40">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 sm:gap-3 ${
                m.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-stone-800 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[85%] rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-md ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-stone-900 border border-white/10 text-stone-200 rounded-tl-none'
                }`}
              >
                {m.text}

                {/* AI Grounding / Tool Badges */}
                {m.sender === 'ai' && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                    {m.webSearchUsed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/30">
                        <Globe className="w-2.5 h-2.5 text-blue-400" />
                        Google Search Grounding
                      </span>
                    )}
                    {m.toolsUsed?.includes('firebase_directory') && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                        <Database className="w-2.5 h-2.5 text-emerald-400" />
                        CamGo Directory
                      </span>
                    )}
                    
                    {m.spatialIntent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30">
                        <MapPin className="w-2.5 h-2.5 text-amber-400" />
                        AI Spatial Intent: {m.spatialIntent.category}
                      </span>
                    )}

                    {/* Sources preview if returned from web grounding */}
                    {m.groundingSources && m.groundingSources.length > 0 && (
                      <div className="w-full mt-1.5 space-y-1">
                        <p className="text-[10px] text-stone-400 font-medium">
                          {language === 'bm' ? 'Sumber Web:' : 'Web Sources:'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {m.groundingSources.slice(0, 3).map((src, srcIdx) => (
                            <a
                              key={srcIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-blue-300 border border-white/5 transition-colors"
                            >
                              <span className="truncate max-w-[140px]">{src.title || src.url}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`text-[9px] font-mono mt-1 ${
                    m.sender === 'user' ? 'text-emerald-200 text-right' : 'text-stone-500'
                  }`}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-800 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-stone-900 border border-white/10 rounded-2xl p-3 text-xs text-stone-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {enableWebSearch && activeTool !== 'directory'
                    ? language === 'bm'
                      ? 'Menyemak direktori tempatan & mengimbas kemas kini langsung...'
                      : 'Checking local directories and scanning live updates...'
                    : language === 'bm'
                    ? 'Menyemak pangkalan data Cameron Highlands...'
                    : 'Querying Cameron Highlands directory database...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Pills */}
        <div className="p-2 bg-stone-900/95 border-t border-white/5 overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
          {suggestedPrompts.map((p, i) => {
            const Icon = p.icon;
            return (
              <button
                key={i}
                onClick={() => handleSend(p.text, p.type === 'web')}
                className="whitespace-nowrap px-2.5 py-1.5 rounded-full bg-stone-800/90 hover:bg-stone-700 text-[11px] text-stone-300 hover:text-emerald-300 border border-white/5 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Icon className={`w-3 h-3 ${p.type === 'web' ? 'text-blue-400' : 'text-emerald-400'}`} />
                <span>{p.text}</span>
              </button>
            );
          })}
        </div>

        {/* Input Bar with Search the Web Tool Trigger */}
        <div className="p-2.5 sm:p-3 bg-stone-950 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Quick Web Tool Toggle Button inside input bar */}
            <button
              type="button"
              onClick={() => setEnableWebSearch(!enableWebSearch)}
              title={
                enableWebSearch
                  ? 'Search the Web tool is enabled (Click to disable)'
                  : 'Click to enable Search the Web tool'
              }
              className={`p-2 sm:px-2.5 sm:py-2 rounded-2xl flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer border ${
                enableWebSearch
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-300'
              }`}
            >
              <Globe className={`w-4 h-4 ${enableWebSearch ? 'text-blue-400' : 'text-stone-500'}`} />
              <span className="hidden sm:inline">{enableWebSearch ? 'Web ON' : 'Web OFF'}</span>
            </button>

            <input
              type="text"
              placeholder={
                language === 'bm'
                  ? 'Tanya tentang cuaca, berita, masjid, tiket, atau jalan...'
                  : 'Ask about weather, breaking news, masjids, tickets, or roads...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-stone-900 border border-white/10 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 sm:p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white cursor-pointer transition-colors shrink-0"
              title={language === 'bm' ? 'Hantar mesej' : 'Send message'}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
