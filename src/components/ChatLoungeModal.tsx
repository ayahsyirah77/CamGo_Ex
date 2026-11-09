import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Hash,
  Send,
  Image as ImageIcon,
  Smile,
  X,
  Bell,
  BellRing,
  Search,
  Plus,
  Paperclip,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  Users,
  Compass,
  Utensils,
  Car,
  Megaphone,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Shield,
  Clock,
  Download,
  Share2,
  Volume2,
  VolumeX,
  Smartphone,
  Eye,
  Reply,
  MoreVertical,
  Circle,
} from 'lucide-react';
import {
  ChatUser,
  ChatChannel,
  DirectMessageThread,
  ChatMessage,
} from '../types/chatLounge';
import { chatLoungeService } from '../services/chatLoungeService';
import { pushNotificationService } from '../services/pushNotificationService';
import { UserProfile } from '../services/firebase';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CamLogo } from './CamLogo';
import { AudioUnlockSettings } from './AudioUnlockSettings';

interface ChatLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  initialDmUserId?: string | null;
  initialChannelId?: string | null;
}

const POPULAR_EMOJIS = ['❤️', '👍', '🔥', '😂', '🚀', '🍓', '🍵', '⛰️', '🚙', '👏', '✨', '😋'];

export const ChatLoungeModal: React.FC<ChatLoungeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialDmUserId,
  initialChannelId,
}) => {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'channels' | 'dms' | 'alerts' | 'profile'>('channels');
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [activeDmThreadId, setActiveDmThreadId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);

  // Data States
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [dmThreads, setDmThreads] = useState<DirectMessageThread[]>([]);
  const [communityUsers, setCommunityUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myChatUser, setMyChatUser] = useState<ChatUser>(chatLoungeService.getCurrentUser());

  // Input & Messaging States
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<ChatMessage['attachment'] | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Push Notification States
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushTestCountdown, setPushTestCountdown] = useState<number | null>(null);
  const [pushTestNotice, setPushTestNotice] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);

  // Member Profile Inspect Modal
  const [inspectingUser, setInspectingUser] = useState<ChatUser | null>(null);

  // PWA Install States & Hook
  const { isInstalled, installPWA, hasPrompt } = usePWAInstall();
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        (window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(isStandaloneMode);
    }
  }, []);

  const handleInstallPwa = async () => {
    if (!hasPrompt) {
      setShowInstallGuideModal(true);
      return;
    }
    const res = await installPWA();
    if (!res.success && res.reason !== 'opened-top-level') {
      setShowInstallGuideModal(true);
    }
  };

  // New Channel Modal
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with Firebase user on mount / change
  useEffect(() => {
    if (currentUser) {
      chatLoungeService.syncWithFirebaseUser(currentUser);
      setMyChatUser(chatLoungeService.getCurrentUser());
    }
  }, [currentUser]);

  // Load chat lounge data & subscribe to real-time changes
  useEffect(() => {
    const updateData = () => {
      setChannels([...chatLoungeService.getChannels()]);
      setDmThreads([...chatLoungeService.getDirectMessageThreads()]);
      setCommunityUsers([...chatLoungeService.getCommunityUsers()]);
      setMyChatUser({ ...chatLoungeService.getCurrentUser() });

      if (activeDmThreadId) {
        setMessages([...chatLoungeService.getMessagesForDm(activeDmThreadId)]);
      } else {
        setMessages([...chatLoungeService.getMessagesForChannel(activeChannelId)]);
      }
    };

    updateData();
    const unsubscribe = chatLoungeService.subscribe(updateData);

    if (pushNotificationService.isSupported()) {
      setPushPermission(pushNotificationService.getPermission());
    }

    return () => unsubscribe();
  }, [activeChannelId, activeDmThreadId]);

  // Handle Initial DM or Channel triggers
  useEffect(() => {
    if (initialDmUserId) {
      const user = communityUsers.find((u) => u.id === initialDmUserId);
      if (user) {
        const thread = chatLoungeService.getOrCreateDmThread(user);
        setActiveDmThreadId(thread.id);
        setActiveTab('dms');
      }
    } else if (initialChannelId) {
      setActiveChannelId(initialChannelId);
      setActiveDmThreadId(null);
      setActiveTab('channels');
    }
  }, [initialDmUserId, initialChannelId, communityUsers]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark active view as read
  useEffect(() => {
    if (activeDmThreadId) {
      chatLoungeService.markAsRead(activeDmThreadId, false);
    } else if (activeChannelId) {
      chatLoungeService.markAsRead(activeChannelId, true);
    }
  }, [activeChannelId, activeDmThreadId, messages.length]);

  // Handle URL hash changes (#chat, #dms)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#dms') {
        setActiveTab('dms');
      } else if (window.location.hash === '#chat') {
        setActiveTab('channels');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (!isOpen) return null;

  // Active channel / DM definitions
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeDmThread = dmThreads.find((d) => d.id === activeDmThreadId);
  const currentConversationTitle = activeDmThread
    ? activeDmThread.otherUser.name
    : activeChannel?.label || '#general-lounge';

  const currentConversationSubtitle = activeDmThread
    ? `${activeDmThread.otherUser.handle} · ${activeDmThread.otherUser.status === 'online' ? 'Active Now' : activeDmThread.otherUser.lastSeen || 'Offline'}`
    : activeChannel?.description || 'Community discussion room';

  // Typing indicator
  const activeThreadId = activeDmThreadId || activeChannelId;
  const typingUsers = chatLoungeService.getTypingUsers(activeThreadId);

  // Filter messages by search query if search is active
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Total unread counter across all DMs and channels
  const totalDmUnread = dmThreads.reduce((sum, dm) => sum + (dm.unreadCount || 0), 0);
  const totalChannelsUnread = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);

  // Icon selector helper
  const getChannelIcon = (iconName: string) => {
    switch (iconName) {
      case 'Car':
        return Car;
      case 'Utensils':
        return Utensils;
      case 'Compass':
        return Compass;
      case 'Megaphone':
        return Megaphone;
      case 'HelpCircle':
        return HelpCircle;
      default:
        return MessageSquare;
    }
  };

  // Typing detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    chatLoungeService.setTyping(activeThreadId, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      chatLoungeService.setTyping(activeThreadId, false);
    }, 2000);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage && !attachedFile) return;

    await chatLoungeService.sendMessage({
      channelId: activeDmThreadId ? undefined : activeChannelId,
      dmThreadId: activeDmThreadId || undefined,
      text: inputText,
      imageUrl: selectedImage || undefined,
      attachment: attachedFile || undefined,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text.substring(0, 80),
          }
        : undefined,
    });

    setInputText('');
    setSelectedImage(null);
    setAttachedFile(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    chatLoungeService.setTyping(activeThreadId, false);
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Image Upload Handler (reads local photo)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      if (result) {
        setSelectedImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Document File Attachment Handler
  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      if (result) {
        setAttachedFile({
          name: file.name,
          url: result,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type.includes('image') ? 'image' : 'document',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Request Native Push Notification Permission
  const handleEnablePushNotifications = async () => {
    const granted = await pushNotificationService.requestPermission();
    if (granted) {
      setPushPermission('granted');
      setPushTestNotice('Push notifications enabled! You can test lock-screen alerts below.');
      setTimeout(() => setPushTestNotice(null), 4000);
    } else {
      setPushPermission('denied');
    }
  };

  // Simulate Lockscreen WhatsApp-style Notification
  const handleSimulateLockscreenPush = async () => {
    if (pushPermission !== 'granted') {
      const ok = await pushNotificationService.requestPermission();
      if (!ok) return;
      setPushPermission('granted');
    }

    setPushTestNotice('Lock your phone screen or switch browser tabs now! Alert arriving in 3 seconds...');
    setPushTestCountdown(3);

    await pushNotificationService.scheduleSimulatedPush(
      {
        title: 'Sarah Tan (Direct Message)',
        body: 'Salam! Are you heading to the Kea Farm strawberry market today? 🍓',
        icon: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        url: '/#dms',
        senderName: 'Sarah Tan',
      },
      3,
      (count) => {
        setPushTestCountdown(count);
      }
    );

    setPushTestCountdown(null);
    setPushTestNotice('Lock-screen Push Alert triggered! Check your device notification tray.');
    setTimeout(() => setPushTestNotice(null), 5000);
  };

  // Start 1-on-1 DM with a user
  const handleStartDmWithUser = (user: ChatUser) => {
    const thread = chatLoungeService.getOrCreateDmThread(user);
    setActiveDmThreadId(thread.id);
    setActiveTab('dms');
    setIsMobileSidebarOpen(false);
    setInspectingUser(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-3 md:p-6 bg-stone-950/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-6xl h-full sm:h-[94vh] max-h-[950px] bg-stone-900 border-0 sm:border border-emerald-500/30 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
      >
        {/* TOP MESSENGER NAVIGATION BAR */}
        <header className="h-12 sm:h-16 px-1.5 sm:px-5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between shrink-0 z-30 gap-1 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
            {/* Mobile Drawer Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-1 sm:p-2 rounded-lg bg-stone-900 text-stone-300 hover:text-white border border-stone-800 cursor-pointer shrink-0"
              title="Toggle Channels"
            >
              <Menu className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </button>

            {/* App Branding / Current View */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div className="min-w-0 flex-1 flex items-center gap-1">
                <h2 className="font-heading font-black text-[8px] xs:text-[9px] sm:text-xs text-white tracking-tight truncate">
                  {currentConversationTitle}
                </h2>
                {activeDmThread?.otherUser.isVerified && (
                  <span className="px-1 py-0.2 rounded text-[7px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    VERIFIED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Tools: Push Bell, Search, Info Drawer, Close */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Search Button */}
            <button
              onClick={() => setIsSearching(!isSearching)}
              className={`p-1 sm:p-2 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isSearching
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-900 text-stone-300 hover:text-white border border-stone-800'
              }`}
              title="Search conversation"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Push Notification Toggle Button */}
            <button
              onClick={
                pushPermission === 'granted'
                  ? handleSimulateLockscreenPush
                  : handleEnablePushNotifications
              }
              className={`p-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                pushPermission === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title={
                pushPermission === 'granted'
                  ? 'Push alerts active (Click to test lockscreen push)'
                  : 'Enable lockscreen Web Push notifications'
              }
            >
              {pushPermission === 'granted' ? (
                <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              ) : (
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-bounce" />
              )}
              <span className="hidden md:inline">
                {pushPermission === 'granted' ? 'Push Alert Active' : 'Enable Push'}
              </span>
            </button>

            {/* Add App to Home Screen Shortcut Button (Hidden on Mobile Header) */}
            {!isStandalone && !isInstalled && (
              <button
                onClick={handleInstallPwa}
                className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs items-center gap-1.5 shadow-md active:scale-95 transition-transform cursor-pointer border border-emerald-400/40 shrink-0"
                title="Install CamGo Chat app shortcut to home screen"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[11px]">Install App</span>
              </button>
            )}

            {/* Members Drawer Toggle */}
            <button
              onClick={() => setIsMembersDrawerOpen(!isMembersDrawerOpen)}
              className={`hidden sm:flex p-2 rounded-xl text-xs font-semibold items-center transition-colors cursor-pointer ${
                isMembersDrawerOpen
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
              title="View Highland Members"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Close Lounge Modal */}
            <button
              onClick={onClose}
              className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800 cursor-pointer transition-colors"
              title="Close Chat Lounge"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </header>

        {/* IN-CONVERSATION SEARCH BAR POPDOWN */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-stone-950 border-b border-stone-800 px-4 py-2 flex items-center gap-2 shrink-0 z-20"
            >
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, recommendations, names..."
                className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-stone-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded text-stone-400 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PUSH SIMULATION COUNTDOWN TOAST */}
        <AnimatePresence>
          {pushTestNotice && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400"
            >
              <Smartphone className="w-4 h-4 animate-pulse" />
              <span>
                {pushTestCountdown !== null ? `Alert in ${pushTestCountdown}s... ` : ''}
                {pushTestNotice}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN BODY: SPLIT VIEW LAYOUT */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* LEFT SIDEBAR: TOPIC CHANNELS & DMS */}
          <aside
            className={`
              absolute lg:static top-0 bottom-0 left-0 z-40
              w-72 sm:w-80 bg-stone-950/95 border-r border-stone-800 flex flex-col
              transition-transform duration-300 ease-in-out shrink-0
              ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            {/* Sidebar View Switcher Tabs (Channels / DMs / Members) */}
            <div className="p-3 border-b border-stone-800 flex items-center gap-1.5 shrink-0 bg-stone-950">
              <button
                onClick={() => setActiveTab('channels')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'channels'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-stone-900 text-stone-400 hover:text-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Rooms</span>
                {totalChannelsUnread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-mono">
                    {totalChannelsUnread}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('dms')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'dms'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-stone-900 text-stone-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>DMs</span>
                {totalDmUnread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-mono animate-pulse">
                    {totalDmUnread}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'alerts'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-stone-900 text-stone-400 hover:text-white'
                }`}
                title="Web Push Lockscreen Alerts"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* TAB CONTENT: CHANNELS LIST */}
            {activeTab === 'channels' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400">
                  <span>Public Topic Channels</span>
                  <span className="text-[10px] text-emerald-400">{channels.length} Rooms</span>
                </div>

                {channels.map((ch) => {
                  const Icon = getChannelIcon(ch.iconName);
                  const isSelected = !activeDmThreadId && activeChannelId === ch.id;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        setActiveDmThreadId(null);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/25 border border-emerald-500/40 text-white'
                          : 'hover:bg-stone-900 text-stone-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-900 text-stone-400 border border-stone-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs block truncate">{ch.label}</span>
                        </div>
                      </div>

                      {ch.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold font-mono shrink-0">
                          {ch.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: DIRECT MESSAGES (DMs) */}
            {activeTab === 'dms' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400">
                  <span>1-on-1 Direct Messages</span>
                  <span className="text-[10px] text-emerald-400">{dmThreads.length} Chats</span>
                </div>

                {dmThreads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-400">
                    <p>No direct messages yet.</p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Click any user in the lounge to send a private message!
                    </p>
                  </div>
                ) : (
                  dmThreads.map((dm) => {
                    const isSelected = activeDmThreadId === dm.id;
                    return (
                      <button
                        key={dm.id}
                        onClick={() => {
                          setActiveDmThreadId(dm.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/25 border border-emerald-500/40 text-white'
                            : 'hover:bg-stone-900 text-stone-300 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={dm.otherUser.avatar}
                              alt={dm.otherUser.name}
                              className="w-9 h-9 rounded-full object-cover border border-stone-700"
                            />
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-stone-950 ${
                                dm.otherUser.status === 'online'
                                  ? 'bg-emerald-400'
                                  : 'bg-stone-500'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-xs text-white truncate">
                                {dm.otherUser.name}
                              </span>
                              {dm.otherUser.isVerified && (
                                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-stone-400 block">
                            {dm.lastMessage?.timestamp}
                          </span>
                          {dm.unreadCount > 0 && (
                            <span className="mt-0.5 inline-block px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono">
                              {dm.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}

                {/* Direct Message New Contact Launcher */}
                <div className="pt-3 border-t border-stone-800">
                  <span className="px-3 text-[10px] font-mono font-bold uppercase text-stone-400 block mb-1">
                    Start Chat with Highland Locals
                  </span>
                  {communityUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleStartDmWithUser(u)}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left hover:bg-stone-900 text-xs text-stone-300 hover:text-white cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 truncate">
                          <span className="font-bold block truncate">{u.name}</span>
                          <span className="text-[10px] text-stone-400 truncate">{u.role}</span>
                        </div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: WEB PUSH NOTIFICATION SETTINGS */}
            {activeTab === 'alerts' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Mobile Push Notifications
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Receive WhatsApp-style lock-screen banner alerts when you receive DMs or mentions while away from the app.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-300">Push Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        pushPermission === 'granted'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {pushPermission}
                    </span>
                  </div>

                  {pushPermission !== 'granted' ? (
                    <button
                      onClick={handleEnablePushNotifications}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Allow Push Notifications</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSimulateLockscreenPush}
                      className="w-full py-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Test Lock-Screen Push (3s Delay)</span>
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-2 text-xs text-stone-400">
                  <span className="font-bold text-white block">How it works:</span>
                  <p>1. Tap "Test Lock-Screen Push".</p>
                  <p>2. Immediately lock your phone or switch browser tabs.</p>
                  <p>3. In 3 seconds, a native push alert vibrates your device with sound, just like WhatsApp!</p>
                </div>
              </div>
            )}

            {/* SIDEBAR FOOTER: USER PROFILE CARD */}
            <div className="p-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between shrink-0">
              <div
                onClick={() => setInspectingUser(myChatUser)}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80"
              >
                <div className="relative shrink-0">
                  <img
                    src={myChatUser.avatar}
                    alt={myChatUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-stone-950" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-white block truncate">
                    {myChatUser.name}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono block truncate">
                    {myChatUser.handle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsAudioSettingsOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="Configure Audio Chimes & Push Notifications"
                >
                  <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audio &amp; Push</span>
                </button>
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white bg-stone-900 cursor-pointer"
                  title={isAudioMuted ? 'Unmute sounds' : 'Mute chat sounds'}
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </aside>

          {/* BACKDROP FOR MOBILE SIDEBAR */}
          {isMobileSidebarOpen && (
            <div
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            />
          )}

          {/* CENTER: MAIN CONVERSATION WINDOW */}
          <main className="flex-1 flex flex-col bg-stone-900/60 overflow-hidden relative">
            {/* Top Right Corner Install Shortcut Pill (Clean & Non-blocking) */}
            {!isStandalone && !isInstalled && (
              <div className="flex justify-end px-3 pt-1.5 pb-0 shrink-0 z-10">
                <button
                  onClick={handleInstallPwa}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[9px] sm:text-[10px] shadow-sm active:scale-95 transition-transform cursor-pointer border border-emerald-400/40 flex items-center gap-1 shrink-0"
                  title="Install CamGo Chat App shortcut to Home Screen"
                >
                  <Smartphone className="w-3 h-3 text-emerald-200" />
                  <span>Install Shortcut Now</span>
                </button>
              </div>
            )}

            {/* MESSAGES FEED */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">

              {displayedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 text-stone-400">
                  <div className="w-12 h-12 rounded-2xl bg-stone-800 flex items-center justify-center text-stone-600">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">No messages here yet</h4>
                    <p className="text-xs text-stone-400 max-w-xs mt-1">
                      Be the first to say hello or ask a question in {currentConversationTitle}!
                    </p>
                  </div>
                </div>
              ) : (
                displayedMessages.map((msg, index) => {
                  const isMine = msg.senderId === myChatUser.id;
                  const senderUser = communityUsers.find((u) => u.id === msg.senderId);

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 group ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar (Left side if not mine) */}
                      {!isMine && (
                        <button
                          onClick={() =>
                            setInspectingUser(
                              senderUser || {
                                id: msg.senderId,
                                name: msg.senderName,
                                handle: `@${msg.senderName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                                avatar: msg.senderAvatar,
                                role: msg.senderRole || 'member',
                                status: 'online',
                              }
                            )
                          }
                          className="shrink-0 self-end mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                          title={`View ${msg.senderName}'s profile`}
                        >
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName}
                            className="w-8 h-8 rounded-full object-cover border border-stone-800 shadow-sm"
                          />
                        </button>
                      )}

                      {/* Message Bubble Column */}
                      <div className={`max-w-[85%] sm:max-w-[70%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                        {/* Sender header line */}
                        {!isMine && (
                          <div className="flex items-center gap-1.5 px-1 text-[11px]">
                            <button
                              onClick={() =>
                                setInspectingUser(
                                  senderUser || {
                                    id: msg.senderId,
                                    name: msg.senderName,
                                    handle: `@${msg.senderName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                                    avatar: msg.senderAvatar,
                                    role: msg.senderRole || 'member',
                                    status: 'online',
                                  }
                                )
                              }
                              className="font-bold text-stone-300 hover:text-emerald-400 hover:underline cursor-pointer"
                            >
                              {msg.senderName}
                            </button>
                            {msg.senderRole && msg.senderRole !== 'member' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-stone-800 text-emerald-400 border border-stone-700">
                                {msg.senderRole}
                              </span>
                            )}
                            <span className="text-[10px] text-stone-400">{msg.timestamp}</span>
                          </div>
                        )}

                        {/* Reply-To Preview Banner */}
                        {msg.replyTo && (
                          <div className="text-[10px] px-3 py-1 rounded-t-xl bg-stone-950/60 border border-b-0 border-white/5 text-stone-400 flex items-center gap-1.5">
                            <Reply className="w-3 h-3 text-emerald-400" />
                            <span className="font-bold text-stone-300">{msg.replyTo.senderName}:</span>
                            <span className="truncate">{msg.replyTo.text}</span>
                          </div>
                        )}

                        {/* Actual Message Bubble */}
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed shadow-md relative break-words ${
                            isMine
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-br-none'
                              : 'bg-stone-800/90 border border-stone-700 text-stone-100 rounded-bl-none'
                          }`}
                        >
                          {/* Attached Image if present */}
                          {msg.imageUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-h-72">
                              <img
                                src={msg.imageUrl}
                                alt="Attachment"
                                className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                                onClick={() => window.open(msg.imageUrl, '_blank')}
                              />
                            </div>
                          )}

                          {/* File Attachment card if present */}
                          {msg.attachment && (
                            <div className="mb-2 p-2.5 rounded-xl bg-stone-950/60 border border-white/10 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-bold block truncate">{msg.attachment.name}</span>
                                  <span className="text-[10px] text-stone-400 font-mono">{msg.attachment.size}</span>
                                </div>
                              </div>
                              <a
                                href={msg.attachment.url}
                                download={msg.attachment.name}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white"
                                title="Download attachment"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}

                          {/* Text Content */}
                          <p className="whitespace-pre-wrap">{msg.text}</p>

                          {/* Timestamp & Read Receipt (for my messages) */}
                          {isMine && (
                            <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-emerald-100/70 font-mono">
                              <span>{msg.timestamp}</span>
                              <CheckCheck className="w-3 h-3 text-emerald-200" />
                            </div>
                          )}
                        </div>

                        {/* Reaction Pill Counters */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(msg.reactions).map(([emoji, uids]) => {
                              const hasReacted = uids.includes(myChatUser.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => chatLoungeService.toggleReaction(msg.id, emoji)}
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                                    hasReacted
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold">{uids.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Quick Message Actions (Hover on Desktop) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-stone-400 pt-0.5">
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            {POPULAR_EMOJIS.slice(0, 4).map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => chatLoungeService.toggleReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Avatar (Right side if mine) */}
                      {isMine && (
                        <div className="shrink-0 self-end mb-1">
                          <img
                            src={myChatUser.avatar}
                            alt="Me"
                            className="w-8 h-8 rounded-full object-cover border border-emerald-500/50 shadow-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing indicator bubble */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-stone-400 italic py-1 px-2">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                  </span>
                  <span>{typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* MESSAGE INPUT DOCK */}
            <footer className="p-2.5 sm:p-3 bg-stone-950/90 border-t border-stone-800 shrink-0 space-y-2">
              {/* Replying-To Indicator */}
              {replyingTo && (
                <div className="px-3 py-1.5 rounded-xl bg-stone-900 border border-emerald-500/30 flex items-center justify-between text-xs text-stone-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Replying to <strong className="text-white">{replyingTo.senderName}</strong>: {replyingTo.text}
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-stone-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Attachment Preview (Image or File) */}
              {(selectedImage || attachedFile) && (
                <div className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                  {selectedImage ? (
                    <div className="flex items-center gap-2">
                      <img src={selectedImage} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                      <span className="text-emerald-400 font-bold text-xs">Photo attached</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-emerald-400" />
                      <span className="text-stone-200 font-bold truncate">{attachedFile?.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setAttachedFile(null);
                    }}
                    className="p-1 text-stone-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Main Input Control Bar */}
              <div className="flex items-end gap-2">
                {/* Hidden File / Image Inputs */}
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDocFileChange}
                  className="hidden"
                />

                {/* Left Attachment Buttons */}
                <div className="flex items-center gap-1 shrink-0 pb-1">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2 rounded-xl bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800 cursor-pointer transition-colors"
                    title="Upload Photo from Device"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800 cursor-pointer transition-colors"
                    title="Attach File or Doc"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showEmojiPicker
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800'
                    }`}
                    title="Pick Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textInputRef}
                    value={inputText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={`Message in ${currentConversationTitle}... (Shift+Enter for newline)`}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-900 border border-stone-800 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 resize-none max-h-32 placeholder-stone-500"
                  />

                  {/* Emoji Quick Picker Floating Drawer */}
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-12 left-0 z-50 p-2.5 rounded-2xl bg-stone-950 border border-stone-800 shadow-2xl grid grid-cols-6 gap-1 text-lg"
                      >
                        {POPULAR_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setInputText((prev) => prev + emoji);
                              setShowEmojiPicker(false);
                              textInputRef.current?.focus();
                            }}
                            className="p-1.5 rounded-lg hover:bg-stone-800 text-center cursor-pointer transition-transform hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() && !selectedImage && !attachedFile}
                  className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 cursor-pointer shrink-0 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </footer>
          </main>

          {/* RIGHT DRAWER: HIGHLAND COMMUNITY MEMBERS LIST (DESKTOP) */}
          {isMembersDrawerOpen && (
            <aside className="hidden sm:flex w-64 bg-stone-950 border-l border-stone-800 flex-col shrink-0">
              <div className="p-3 border-b border-stone-800 flex items-center justify-between">
                <span className="font-heading font-bold text-xs text-white uppercase tracking-wider">
                  Community Members ({communityUsers.length})
                </span>
                <button
                  onClick={() => setIsMembersDrawerOpen(false)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {communityUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-2 rounded-xl hover:bg-stone-900 flex items-center justify-between text-xs group"
                  >
                    <div
                      onClick={() => setInspectingUser(user)}
                      className="flex items-center gap-2 min-w-0 cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-stone-950 ${
                            user.status === 'online' ? 'bg-emerald-400' : 'bg-stone-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{user.name}</span>
                        <span className="text-[9px] text-stone-400 block truncate">
                          {user.customStatus || user.role}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartDmWithUser(user)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 cursor-pointer"
                      title={`Send 1-on-1 DM to ${user.name}`}
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        {/* BOTTOM MOBILE NAVIGATION BAR (Messenger style touch tabs) */}
        <nav className="sm:hidden h-14 bg-stone-950 border-t border-stone-800 flex items-center justify-around shrink-0 z-30 px-2 pb-safe">
          <button
            onClick={() => {
              setActiveTab('channels');
              setIsMobileSidebarOpen(true);
            }}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              activeTab === 'channels' ? 'text-emerald-400' : 'text-stone-400'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Rooms</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('dms');
              setIsMobileSidebarOpen(true);
            }}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              activeTab === 'dms' ? 'text-emerald-400' : 'text-stone-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>DMs</span>
            {totalDmUnread > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('alerts');
              setIsMobileSidebarOpen(true);
            }}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              activeTab === 'alerts' ? 'text-emerald-400' : 'text-stone-400'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
          </button>

          <button
            onClick={() => setInspectingUser(myChatUser)}
            className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-stone-400 hover:text-white"
          >
            <img
              src={myChatUser.avatar}
              alt="Profile"
              className="w-4 h-4 rounded-full object-cover border border-emerald-500/50"
            />
            <span>Me</span>
          </button>
        </nav>

        {/* MEMBER PROFILE INSPECTION MODAL */}
        <AnimatePresence>
          {inspectingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-stone-900 border border-emerald-500/30 rounded-3xl p-6 text-stone-100 shadow-2xl relative space-y-4"
              >
                <button
                  onClick={() => setInspectingUser(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-white bg-stone-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="relative">
                    <img
                      src={inspectingUser.avatar}
                      alt={inspectingUser.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-xl"
                    />
                    <span
                      className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-stone-900 ${
                        inspectingUser.status === 'online' ? 'bg-emerald-400' : 'bg-stone-500'
                      }`}
                    />
                  </div>

                  <div>
                    <h3 className="font-heading font-black text-lg text-white flex items-center justify-center gap-1.5">
                      <span>{inspectingUser.name}</span>
                      {inspectingUser.isVerified && (
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </h3>
                    <p className="text-xs text-emerald-400 font-mono">{inspectingUser.handle}</p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-stone-800 border border-stone-700 text-stone-300">
                    {inspectingUser.role} · {inspectingUser.township || 'Cameron Highlands'}
                  </span>
                </div>

                {inspectingUser.customStatus && (
                  <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-xs text-stone-300 text-center font-medium">
                    "{inspectingUser.customStatus}"
                  </div>
                )}

                {inspectingUser.bio && (
                  <p className="text-xs text-stone-400 text-center leading-relaxed">
                    {inspectingUser.bio}
                  </p>
                )}

                {inspectingUser.id !== myChatUser.id ? (
                  <button
                    onClick={() => handleStartDmWithUser(inspectingUser)}
                    className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Private 1-on-1 DM</span>
                  </button>
                ) : (
                  <div className="pt-2 border-t border-stone-800 space-y-2">
                    <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Edit Your Status
                    </label>
                    <input
                      type="text"
                      value={myChatUser.customStatus || ''}
                      onChange={(e) =>
                        chatLoungeService.updateProfile({ customStatus: e.target.value })
                      }
                      placeholder="e.g. Exploring Kea Farm strawberry market 🍓"
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* PWA INSTALL GUIDE MODAL FOR IOS SAFARI & FALLBACK */}
        <AnimatePresence>
          {showInstallGuideModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-sm bg-stone-900 border border-emerald-500/40 rounded-3xl p-6 text-stone-100 shadow-2xl space-y-4"
              >
                <button
                  onClick={() => setShowInstallGuideModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-white bg-stone-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center space-y-2 pt-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-3 flex items-center justify-center text-white shadow-xl shrink-0">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-white">
                      Install CamGo Chat App
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Add 1-tap shortcut to your phone home screen
                    </p>
                  </div>
                </div>

                {/* Primary Automated Android Install Trigger */}
                <button
                  onClick={async () => {
                    const res = await installPWA();
                    if (res.success || res.reason === 'opened-top-level') {
                      setShowInstallGuideModal(false);
                    }
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40 active:scale-95 transition-transform"
                >
                  <Smartphone className="w-4 h-4 text-emerald-200 animate-pulse" />
                  <span>📲 Install Android Shortcut Now</span>
                </button>

                {/* Android Chrome Browser Guidance */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5 text-[11px] text-stone-300 text-left">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                    <span>🤖</span>
                    <span>For Android (Chrome / Edge):</span>
                  </div>
                  <p className="text-stone-400">
                    If prompt does not appear, tap Chrome menu <strong>(⋮ 3 dots)</strong> at top right and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                  </p>
                </div>

                {/* iOS Safari Guidance */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5 text-[11px] text-stone-300 text-left">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                    <span>🍎</span>
                    <span>For iPhone / iPad (Safari):</span>
                  </div>
                  <p className="text-stone-400 leading-snug">
                    1. Tap the <strong>Share</strong> button (box with up arrow) in Safari toolbar.<br />
                    2. Scroll down and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>

                {/* Open Standalone Chat Lounge Direct App Link */}
                <button
                  onClick={() => {
                    window.location.href = '/chat';
                    setShowInstallGuideModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-stone-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Launch Standalone Chat App Window</span>
                </button>

                <button
                  onClick={() => setShowInstallGuideModal(false)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Got It
                </button>
              </motion.div>
            </div>
          )}

          {/* Audio & Push Settings Modal Popup */}
          {isAudioSettingsOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setIsAudioSettingsOpen(false)}>
              <div className="w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsAudioSettingsOpen(false)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-stone-900 text-stone-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <AudioUnlockSettings onStatusChange={() => {}} />
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
