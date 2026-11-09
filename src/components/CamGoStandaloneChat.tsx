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
  Wifi,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  ChatUser,
  ChatChannel,
  DirectMessageThread,
  ChatMessage,
} from '../types/chatLounge';
import { chatLoungeService } from '../services/chatLoungeService';
import { pushNotificationService } from '../services/pushNotificationService';
import { firebaseService, UserProfile } from '../services/firebase';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CamLogo } from './CamLogo';

interface CamGoStandaloneChatProps {
  currentUser?: UserProfile | null;
  onOpenPortalGuide?: () => void;
  onSwitchToWebsite?: () => void;
}

const POPULAR_EMOJIS = ['❤️', '👍', '🔥', '😂', '🚀', '🍓', '🍵', '⛰️', '🚙', '👏', '✨', '😋', '🎉', '☕', '🌧️', '☀️', '🌸', '🍰'];

export const CamGoStandaloneChat: React.FC<CamGoStandaloneChatProps> = ({
  currentUser = null,
  onOpenPortalGuide,
  onSwitchToWebsite,
}) => {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

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
  const [pushErrorMessage, setPushErrorMessage] = useState<string | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // PWA Add to Home Screen States & Hook
  const { isInstalled, installPWA, isStandalone, isInstallable } = usePWAInstall();
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  // Modals
  const [inspectingUser, setInspectingUser] = useState<ChatUser | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dismiss splash screen smoothly after 1.2s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

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
        setIsMobileSidebarOpen(true);
      } else if (window.location.hash === '#alerts') {
        setShowPushModal(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Active channel / DM definitions
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeDmThread = dmThreads.find((d) => d.id === activeDmThreadId);
  const currentConversationTitle = activeDmThread
    ? activeDmThread.otherUser.name
    : activeChannel?.label || '#general-lounge';

  const currentConversationSubtitle = activeDmThread
    ? `${activeDmThread.otherUser.handle} · ${
        activeDmThread.otherUser.status === 'online'
          ? 'Active Now'
          : activeDmThread.otherUser.lastSeen || 'Offline'
      }`
    : activeChannel?.description || 'Community discussion room';

  // Calculate unread count
  const totalDmUnread = dmThreads.reduce((sum, d) => sum + (d.unreadCount || 0), 0);
  const totalChannelsUnread = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // Typing users in current channel or DM
  const currentTypingUsers = chatLoungeService.getTypingUsers(
    activeDmThreadId || activeChannelId
  );

  // Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!inputText.trim() && !selectedImage && !attachedFile) return;

    const textToSend = inputText;
    const imgToSend = selectedImage;
    const fileToSend = attachedFile;
    const replyToSend = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
        }
      : undefined;

    // Reset composer state
    setInputText('');
    setSelectedImage(null);
    setAttachedFile(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    // Stop typing indicator
    chatLoungeService.setTyping(activeDmThreadId || activeChannelId, false);

    await chatLoungeService.sendMessage({
      channelId: activeDmThreadId ? undefined : activeChannelId,
      dmThreadId: activeDmThreadId || undefined,
      text: textToSend,
      imageUrl: imgToSend || undefined,
      attachment: fileToSend || undefined,
      replyTo: replyToSend,
    });
  };

  // Typing event handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    chatLoungeService.setTyping(activeDmThreadId || activeChannelId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      chatLoungeService.setTyping(activeDmThreadId || activeChannelId, false);
    }, 2000);
  };

  // Keyboard shortcut (Enter to send, Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Local image attachment handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // File attachment handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Request Native Push Notification Permission
  const handleEnablePushNotifications = async () => {
    setPushErrorMessage(null);
    const res = await pushNotificationService.requestPermission();
    setPushPermission(res.permission);
    if (res.success) {
      setPushTestNotice('Push notifications enabled! Lock your phone screen to test alerts below.');
      setTimeout(() => setPushTestNotice(null), 5000);
    } else {
      setPushErrorMessage(res.error || 'Permission was denied or not supported on this browser.');
    }
  };

  // Simulate Lockscreen Web Push with countdown
  const handleSimulateLockscreenPush = async () => {
    setPushErrorMessage(null);
    if (pushPermission !== 'granted') {
      const res = await pushNotificationService.requestPermission();
      setPushPermission(res.permission);
      if (!res.success) {
        setPushErrorMessage(res.error || 'Please allow notification permissions first.');
        return;
      }
    }

    setPushTestNotice('Lock your phone screen or switch browser tabs now! Alert arriving in 3 seconds...');
    setPushTestCountdown(3);

    await pushNotificationService.scheduleSimulatedPush(
      {
        title: 'Sarah Tan (CamGo Lounge)',
        body: 'Salam! Steamboat spots in Kea Farm are filling up quickly tonight. Check the live updates! 🍲',
        icon: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        url: '/#dms',
      },
      3,
      (count) => {
        setPushTestCountdown(count);
      }
    );

    setPushTestCountdown(null);
    setPushTestNotice('Lock-screen Push Alert triggered! Check your device lockscreen or notification center.');
    setTimeout(() => setPushTestNotice(null), 5000);
  };

  // Trigger PWA Install or show Safari instructions
  const handleInstallPwa = async () => {
    try {
      const res = await installPWA();
      if (!res.success || res.reason === 'no-prompt') {
        setShowInstallGuideModal(true);
      }
    } catch (err) {
      console.warn('[PWA INSTALL] Error calling prompt:', err);
      setShowInstallGuideModal(true);
    }
  };

  // Handle navigating back to the user's original website
  const handleGoToMainWebsite = () => {
    if (onSwitchToWebsite) {
      onSwitchToWebsite();
      return;
    }
    const savedUrl = localStorage.getItem('camgo_original_website_url');
    if (savedUrl) {
      window.location.href = savedUrl;
    } else {
      const url = prompt(
        'Enter your original website URL (e.g. https://yourwebsite.com):',
        'https://'
      );
      if (url && url.trim().length > 7) {
        localStorage.setItem('camgo_original_website_url', url.trim());
        window.location.href = url.trim();
      }
    }
  };

  // Start 1-on-1 DM with a user
  const handleStartDmWithUser = (user: ChatUser) => {
    const thread = chatLoungeService.getOrCreateDmThread(user);
    setActiveDmThreadId(thread.id);
    setActiveTab('dms');
    setIsMobileSidebarOpen(false);
    setInspectingUser(null);
  };

  // Create new channel
  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const channel = chatLoungeService.createChannel({
      name: newChannelName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      label: `#${newChannelName.trim()}`,
      category: 'community',
      description: newChannelDesc.trim() || 'Highland Community topic room',
      iconName: 'Hash',
    });

    setActiveChannelId(channel.id);
    setActiveDmThreadId(null);
    setShowNewChannelModal(false);
    setNewChannelName('');
    setNewChannelDesc('');
  };

  // Filter messages by search query
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.text.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : messages;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-stone-950 text-stone-100 font-sans select-none overflow-hidden relative">
      {/* 1. INITIAL SPLASH SCREEN (Featuring official CamGo logo) */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-stone-950 p-6"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center space-y-4"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-stone-900 border border-emerald-500/40 p-3 shadow-2xl flex items-center justify-center">
                <CamLogo size="lg" showTagline={false} />
              </div>
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
                  CamGo <span className="text-emerald-400">Chat</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-stone-400 font-mono tracking-widest uppercase mt-1">
                  Real-Time Highland Lounge &amp; DMs
                </p>
              </div>

              {/* Smooth loading bar */}
              <div className="w-48 h-1.5 rounded-full bg-stone-800 overflow-hidden mt-6">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  className="w-1/2 h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TOP HEADER BAR (Prominently features CamGo Logo) */}
      <header className="h-14 sm:h-16 px-3 sm:px-5 bg-stone-900/95 border-b border-stone-800 flex items-center justify-between shrink-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile Sliding Drawer Menu Toggle */}
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden p-2 rounded-xl bg-stone-950 text-stone-300 hover:text-white border border-stone-800 cursor-pointer active:scale-95 transition-transform shrink-0"
            title="Toggle Rooms & DMs"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* CamGo Logo & Brand Header */}
          <div className="flex items-center gap-2 min-w-0 cursor-pointer select-none">
            <CamLogo size="sm" showTagline={false} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-heading font-extrabold text-white tracking-wide truncate">
                  CamGo Chat
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Live Synced" />
              </div>
              <span className="text-[10px] sm:text-xs text-stone-400 font-mono truncate">
                {currentConversationTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Action Tools: Install PWA, Push Notifications, Search, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Add to Home Screen shortcut button if not installed */}
          {!isStandalone && (
            <button
              onClick={handleInstallPwa}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 active:scale-95 transition-transform cursor-pointer border border-emerald-400/40 animate-pulse"
              title="Install CamGo Chat app to your phone home screen"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install App</span>
            </button>
          )}

          {/* Web Push Notification Bell & Status Button */}
          <button
            onClick={() => setShowPushModal(true)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer relative ${
              pushPermission === 'granted'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-stone-800 text-amber-300 border border-amber-500/30 hover:bg-stone-700'
            }`}
            title="Push Notification Settings & Lockscreen Alert Tester"
          >
            {pushPermission === 'granted' ? (
              <BellRing className="w-4 h-4 text-emerald-400" />
            ) : (
              <Bell className="w-4 h-4 text-amber-400" />
            )}
            <span className="hidden md:inline">
              {pushPermission === 'granted' ? 'Push Alerts Active' : 'Enable Push'}
            </span>
            {pushPermission === 'granted' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSearching
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-800 text-stone-300 hover:text-white border border-stone-700'
            }`}
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Members Drawer Toggle (Desktop) */}
          <button
            onClick={() => setIsMembersDrawerOpen(!isMembersDrawerOpen)}
            className="hidden lg:flex p-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white border border-stone-700 cursor-pointer"
            title="Toggle Community Members"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Main Website Link */}
          <button
            onClick={handleGoToMainWebsite}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-semibold text-xs items-center gap-1.5 border border-stone-700 transition-colors cursor-pointer"
            title="Return to CamGo Main Tourism Website"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Main Website</span>
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={() => setInspectingUser(myChatUser)}
            className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full bg-stone-800 border border-stone-700 hover:border-emerald-500 transition-colors cursor-pointer"
            title="My Profile & Custom Status"
          >
            <img
              src={myChatUser.avatar}
              alt={myChatUser.name}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* 3. PUSH SIMULATION COUNTDOWN TOAST */}
      <AnimatePresence>
        {pushTestNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 max-w-sm border border-emerald-400"
          >
            <Smartphone className="w-4 h-4 animate-bounce shrink-0" />
            <div className="flex-1 min-w-0">
              {pushTestCountdown !== null ? `Alert in ${pushTestCountdown}s... ` : ''}
              {pushTestNotice}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MAIN BODY CONTAINER (SPLIT-PANEL LAYOUT) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR: TOPIC ROOMS & DMS */}
        <aside
          className={`fixed lg:static top-14 sm:top-16 bottom-14 sm:bottom-0 left-0 w-80 max-w-[85vw] bg-stone-900 border-r border-stone-800 z-40 flex flex-col transition-transform duration-200 ease-out shadow-2xl lg:shadow-none ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Tabs: Rooms vs Direct Messages */}
          <div className="p-3 border-b border-stone-800 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('channels')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'channels'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-stone-950 text-stone-400 hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Rooms</span>
              {totalChannelsUnread > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('dms')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer relative ${
                activeTab === 'dms'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-stone-950 text-stone-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Direct Messages</span>
              {totalDmUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-mono">
                  {totalDmUnread}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: CHANNELS LIST */}
          {activeTab === 'channels' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                <span>Public Topics</span>
                <button
                  onClick={() => setShowNewChannelModal(true)}
                  className="p-1 rounded-md hover:bg-stone-800 text-stone-300 hover:text-emerald-400 cursor-pointer"
                  title="Create New Topic Room"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {channels.map((channel) => {
                const isActive = activeChannelId === channel.id && !activeDmThreadId;
                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveChannelId(channel.id);
                      setActiveDmThreadId(null);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-2xl text-left flex items-start gap-2.5 transition-colors cursor-pointer group ${
                      isActive
                        ? 'bg-emerald-600/20 text-white border border-emerald-500/40'
                        : 'hover:bg-stone-800/80 text-stone-300'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-950 text-stone-400 group-hover:text-emerald-300'
                      }`}
                    >
                      <Hash className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate group-hover:text-white">
                          {channel.label}
                        </span>
                        {channel.unreadCount && channel.unreadCount > 0 ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500 text-black font-bold">
                            {channel.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {channel.lastMessage?.text || channel.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: DIRECT MESSAGES LIST */}
          {activeTab === 'dms' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1.5 text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Conversations</span>
                <span className="text-[10px] text-emerald-400">{dmThreads.length} active</span>
              </div>

              {dmThreads.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400 space-y-2">
                  <p>No direct messages yet.</p>
                  <p className="text-[11px] text-stone-500">
                    Click any member avatar in a topic room to start chatting privately!
                  </p>
                </div>
              ) : (
                dmThreads.map((thread) => {
                  const isActive = activeDmThreadId === thread.id;
                  return (
                    <button
                      key={thread.id}
                      onClick={() => {
                        setActiveDmThreadId(thread.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-2xl text-left flex items-center gap-2.5 transition-colors cursor-pointer group ${
                        isActive
                          ? 'bg-emerald-600/20 text-white border border-emerald-500/40'
                          : 'hover:bg-stone-800/80 text-stone-300'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={thread.otherUser.avatar}
                          alt={thread.otherUser.name}
                          className="w-10 h-10 rounded-full object-cover border border-stone-700"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-stone-900 ${
                            thread.otherUser.status === 'online'
                              ? 'bg-emerald-400'
                              : 'bg-stone-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate text-white">
                            {thread.otherUser.name}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {thread.lastMessage?.timestamp || ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[11px] text-stone-400 truncate flex-1 mr-2">
                            {thread.lastMessage?.text || 'No messages yet'}
                          </p>
                          {thread.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-rose-500 text-white font-bold shrink-0">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* PWA INSTALL PROMPT CARD (SIDEBAR) */}
          {!isStandalone && (
            <div className="p-3 bg-stone-950/80 border-t border-stone-800 shrink-0">
              <button
                onClick={handleInstallPwa}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-emerald-400/40"
              >
                <Smartphone className="w-4 h-4 animate-bounce" />
                <span>Install CamGo App</span>
              </button>
            </div>
          )}

          {/* SIDEBAR FOOTER: USER BADGE */}
          <div className="p-3 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between shrink-0">
            <div
              onClick={() => setInspectingUser(myChatUser)}
              className="flex items-center gap-2 cursor-pointer group min-w-0"
            >
              <div className="relative shrink-0">
                <img
                  src={myChatUser.avatar}
                  alt={myChatUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate group-hover:text-emerald-300">
                  {myChatUser.name}
                </span>
                <span className="text-[10px] text-stone-400 block truncate">
                  {myChatUser.customStatus || myChatUser.handle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleGoToMainWebsite}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
                title="Return to Main Website"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                onClick={() => setShowPushModal(true)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
                title="Notification Settings"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Backdrop Overlay */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
          />
        )}

        {/* MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col bg-stone-950 overflow-hidden relative">
          {/* SEARCH BAR (EXPANDABLE) */}
          {isSearching && (
            <div className="p-3 bg-stone-900 border-b border-stone-800 flex items-center gap-2 shrink-0 animate-in slide-in-from-top-2 duration-150">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words, places (e.g. strawberry, trail, steamboat)..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="p-1.5 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* MESSAGE FEED */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
            {/* Direct PWA Install Prompt Card */}
            {!isStandalone && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-stone-900 to-teal-950/90 border border-emerald-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-950 border border-emerald-500/40 p-1.5 flex items-center justify-center shrink-0 shadow-lg">
                    <CamLogo size="sm" showTagline={false} />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-xs sm:text-sm text-white">
                      📲 Install CamGo Chat App
                    </h4>
                    <p className="text-[11px] text-stone-300 mt-0.5">
                      Create a home screen shortcut complete with icon &amp; logo.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleInstallPwa}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-transform cursor-pointer border border-emerald-400/40 shrink-0"
                >
                  Install Shortcut Now
                </button>
              </div>
            )}

            {/* Conversation Introduction Header Banner */}
            <div className="text-center py-6 border-b border-stone-800/80 mb-4 max-w-md mx-auto space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
                {activeDmThread ? (
                  <img
                    src={activeDmThread.otherUser.avatar}
                    alt={activeDmThread.otherUser.name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <Hash className="w-6 h-6" />
                )}
              </div>
              <h3 className="font-heading font-black text-base sm:text-lg text-white">
                {currentConversationTitle}
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                {currentConversationSubtitle}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 mt-1">
                <Wifi className="w-3 h-3" />
                <span>Live Synced via Firebase Firestore &amp; WebSockets</span>
              </div>
            </div>

            {/* MESSAGES LIST */}
            {displayedMessages.map((msg) => {
              const isMe = msg.senderId === myChatUser.id;
              const senderUser = communityUsers.find((u) => u.id === msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 group ${
                    isMe ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Sender Avatar */}
                  <button
                    onClick={() => {
                      if (senderUser) setInspectingUser(senderUser);
                    }}
                    className="shrink-0 mt-0.5 cursor-pointer active:scale-95 transition-transform"
                    title={`View ${msg.senderName}'s profile`}
                  >
                    <img
                      src={msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                      alt={msg.senderName}
                      className="w-8 h-8 rounded-full object-cover border border-stone-700 shadow"
                    />
                  </button>

                  {/* Message Bubble & Content */}
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name & Role Label */}
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-stone-400 px-1">
                      <span className="font-bold text-stone-200">{msg.senderName}</span>
                      {msg.senderRole && msg.senderRole !== 'member' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-stone-800 text-emerald-400 border border-emerald-500/30">
                          {msg.senderRole}
                        </span>
                      )}
                      <span className="text-[10px] text-stone-500 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Quoted Message Preview if replying */}
                    {msg.replyTo && (
                      <div className="mb-1 p-2 rounded-xl bg-stone-900 border-l-2 border-emerald-400 text-[11px] text-stone-400 max-w-full truncate">
                        <span className="font-bold text-emerald-300 block">
                          Replying to {msg.replyTo.senderName}:
                        </span>
                        <span className="truncate">{msg.replyTo.text}</span>
                      </div>
                    )}

                    {/* Main Bubble */}
                    <div
                      className={`p-3 rounded-2xl relative break-words text-xs sm:text-sm leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-stone-800 text-stone-100 rounded-tl-xs border border-stone-700/60'
                      }`}
                    >
                      {/* Attached Image Preview */}
                      {msg.imageUrl && (
                        <div
                          onClick={() => setViewingImage(msg.imageUrl!)}
                          className="mb-2 rounded-xl overflow-hidden max-h-60 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={msg.imageUrl}
                            alt="Attachment"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* File Attachment Card */}
                      {msg.attachment && (
                        <div className="mb-2 p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2.5">
                          <Paperclip className="w-4 h-4 text-emerald-300 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-white block truncate">
                              {msg.attachment.name}
                            </span>
                            <span className="text-[10px] text-stone-300 font-mono">
                              {msg.attachment.size}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Text Content */}
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Hover / Long-Press Action Bar */}
                      <div
                        className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-full px-2 py-0.5 shadow-xl z-20 ${
                          isMe ? 'right-0' : 'left-0'
                        }`}
                      >
                        {['❤️', '👍', '🔥', '😂'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => chatLoungeService.toggleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 hover:text-emerald-400 text-stone-400 cursor-pointer ml-1"
                          title="Reply to message"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Emoji Reaction Badges */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 px-1">
                        {Object.entries(msg.reactions).map(([emoji, uids]) => {
                          const hasReacted = uids.includes(myChatUser.id);
                          return (
                            <button
                              key={emoji}
                              onClick={() => chatLoungeService.toggleReaction(msg.id, emoji)}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                                hasReacted
                                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-mono text-[10px]">{uids.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* LIVE TYPING INDICATOR BANNER */}
            {currentTypingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium px-2 py-1 animate-pulse">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-200" />
                </div>
                <span>
                  {currentTypingUsers.join(', ')}{' '}
                  {currentTypingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 5. BOTTOM MESSAGE COMPOSER */}
          <footer className="p-2 sm:p-3 bg-stone-900/95 border-t border-stone-800 shrink-0 relative">
            {/* Replying Banner Preview */}
            {replyingTo && (
              <div className="mb-2 p-2 rounded-xl bg-stone-950 border border-emerald-500/40 flex items-center justify-between text-xs text-stone-300">
                <div className="flex items-center gap-2 truncate">
                  <Reply className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white">Replying to {replyingTo.senderName}:</span>
                  <span className="truncate text-stone-400">{replyingTo.text}</span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Selected Image Preview Pill */}
            {selectedImage && (
              <div className="mb-2 relative inline-block">
                <img
                  src={selectedImage}
                  alt="Ready to send"
                  className="w-16 h-16 object-cover rounded-xl border-2 border-emerald-500 shadow-md"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Custom PWA Install Banner ("📲 Install CamGo Chat App") */}
            {!isStandalone && (
              <div className="mb-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/40 shadow-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate">📲 Install CamGo Chat App</h4>
                    <p className="text-[10px] text-stone-300 truncate">Get quick one-tap access from your home screen.</p>
                  </div>
                </div>
                <button
                  onClick={handleInstallPwa}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shrink-0 shadow-md active:scale-95 cursor-pointer border border-emerald-400/40"
                >
                  Install Now
                </button>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-4 mb-2 p-3 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl z-50 grid grid-cols-6 sm:grid-cols-9 gap-2">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-lg hover:scale-130 transition-transform p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Input Toolbar */}
            <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
              {/* Attach Photo Button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-2 sm:p-2.5 rounded-xl bg-stone-950 text-stone-400 hover:text-white border border-stone-800 cursor-pointer transition-colors"
                title="Send photo"
              >
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:flex p-2 sm:p-2.5 rounded-xl bg-stone-950 text-stone-400 hover:text-white border border-stone-800 cursor-pointer transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Emoji Picker Toggle Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 sm:p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  showEmojiPicker
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-stone-950 text-stone-400 hover:text-white border-stone-800'
                }`}
                title="Insert emoji"
              >
                <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Text Input Area */}
              <div className="flex-1 relative">
                <textarea
                  ref={textInputRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={`Message ${currentConversationTitle}...`}
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 resize-none max-h-24 leading-relaxed"
                />
              </div>

              {/* Send Message Button */}
              <button
                type="submit"
                disabled={!inputText.trim() && !selectedImage && !attachedFile}
                className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 cursor-pointer transition-all active:scale-95"
                title="Send"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </form>
          </footer>
        </main>

        {/* RIGHT SIDEBAR: COMMUNITY MEMBERS (DESKTOP) */}
        {isMembersDrawerOpen && (
          <aside className="hidden lg:flex w-64 bg-stone-900 border-l border-stone-800 flex-col p-3 space-y-3 shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <span className="font-heading font-black text-xs text-white">
                Online Members ({communityUsers.filter((u) => u.status === 'online').length})
              </span>
              <button
                onClick={() => setIsMembersDrawerOpen(false)}
                className="p-1 rounded text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 overflow-y-auto flex-1">
              {communityUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-2 rounded-xl hover:bg-stone-800 flex items-center justify-between group transition-colors"
                >
                  <div
                    onClick={() => setInspectingUser(user)}
                    className="flex items-center gap-2 cursor-pointer min-w-0"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-stone-900 ${
                          user.status === 'online' ? 'bg-emerald-400' : 'bg-stone-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate group-hover:text-emerald-300">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-stone-400 block truncate">
                        {user.customStatus || user.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartDmWithUser(user)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white cursor-pointer transition-all"
                    title={`Send 1-on-1 DM to ${user.name}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* 6. MOBILE BOTTOM NAVIGATION BAR (Messenger style touch tabs) */}
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
          onClick={() => setShowPushModal(true)}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
            pushPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts</span>
          {pushPermission === 'granted' && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
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

      {/* ======================================================== */}
      {/* 7. ALL MODALS (FIXED CENTERED + SCROLLABLE FOR MOBILE)  */}
      {/* ======================================================== */}

      {/* MODAL 1: PUSH NOTIFICATION SETTINGS & LOCKSCREEN ALERT TESTER */}
      <AnimatePresence>
        {showPushModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950/80">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white">
                      Mobile Push Notifications
                    </h3>
                    <p className="text-[10px] text-stone-400">Lock-screen alerts like WhatsApp</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPushModal(false)}
                  className="p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 text-xs text-stone-300">
                {/* Status Card */}
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Current Status</span>
                    <span className="text-[11px] text-stone-400">
                      {pushPermission === 'granted'
                        ? 'Active and receiving lockscreen push alerts'
                        : pushPermission === 'denied'
                        ? 'Blocked in browser site settings'
                        : 'Not yet granted'}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                      pushPermission === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : pushPermission === 'denied'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {pushPermission}
                  </span>
                </div>

                {/* Error Banner */}
                {pushErrorMessage && (
                  <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{pushErrorMessage}</span>
                  </div>
                )}

                {/* Enable Button */}
                {pushPermission !== 'granted' ? (
                  <button
                    onClick={handleEnablePushNotifications}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Allow &amp; Activate Push Notifications</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Service Worker registered and ready to fire lockscreen push banners!
                      </span>
                    </div>

                    <button
                      onClick={handleSimulateLockscreenPush}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Test Lock-Screen Push (3s Countdown)</span>
                    </button>
                  </div>
                )}

                {/* Step-by-step instructions */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800/80 space-y-1.5 text-[11px] text-stone-400">
                  <span className="font-bold text-stone-200 block text-xs">
                    How Lockscreen Push Works:
                  </span>
                  <p>1. Tap the "Test Lock-Screen Push" button above.</p>
                  <p>2. Immediately lock your phone screen or switch to another browser tab.</p>
                  <p>
                    3. Within 3 seconds, a native notification banner will wake your lockscreen with
                    chime and vibration!
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setShowPushModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: "ADD TO HOME SCREEN" PWA SHORTCUT GUIDE */}
      <AnimatePresence>
        {showInstallGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950/80">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white">
                      Add CamGo Chat to Home Screen
                    </h3>
                    <p className="text-[10px] text-stone-400">Run as a standalone app with no address bar</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstallGuideModal(false)}
                  className="p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 text-xs text-stone-300">
                <div className="text-center py-2">
                  <div className="w-16 h-16 rounded-2xl bg-stone-950 border border-emerald-500/40 p-2 mx-auto shadow-xl flex items-center justify-center">
                    <CamLogo size="sm" showTagline={false} />
                  </div>
                  <h4 className="font-bold text-white text-sm mt-2">CamGo Chat Standalone Shortcut</h4>
                  <p className="text-[11px] text-stone-400">
                    Saves directly to your phone screen like WhatsApp or Telegram.
                  </p>
                </div>

                {/* iPhone / iPad Safari Instructions */}
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                    <span>🍏</span>
                    <span>For iPhone &amp; iPad (Safari):</span>
                  </div>
                  <p>1. Tap the <strong className="text-white">Share</strong> icon (square with arrow pointing up) at the bottom of Safari.</p>
                  <p>2. Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong> (⊞).</p>
                  <p>3. Tap <strong className="text-emerald-400">Add</strong> at the top right. CamGo will launch full-screen from your home screen!</p>
                </div>

                {/* Android Chrome Instructions */}
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                  <div className="font-bold text-teal-400 flex items-center gap-1.5 text-xs">
                    <span>🤖</span>
                    <span>For Android (Chrome / Edge / Samsung Internet):</span>
                  </div>
                  <p>1. Tap the <strong className="text-white">three dots menu (⋮)</strong> at the top right.</p>
                  <p>2. Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.</p>
                </div>
              </div>

              <div className="p-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setShowInstallGuideModal(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: MEMBER PROFILE & STATUS MODAL */}
      <AnimatePresence>
        {inspectingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-3.5 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950/80">
                <span className="text-xs font-mono font-bold text-emerald-400">Member Profile</span>
                <button
                  onClick={() => setInspectingUser(null)}
                  className="p-1 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 text-center">
                <div className="relative inline-block mx-auto">
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

                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-stone-800 border border-stone-700 text-stone-300 inline-block">
                  {inspectingUser.role} · {inspectingUser.township || 'Cameron Highlands'}
                </span>

                {inspectingUser.customStatus && (
                  <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-xs text-stone-300 font-medium">
                    "{inspectingUser.customStatus}"
                  </div>
                )}

                {inspectingUser.bio && (
                  <p className="text-xs text-stone-400 leading-relaxed">
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
                  <div className="pt-2 border-t border-stone-800 space-y-2 text-left">
                    <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Update Your Status Message
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: IMAGE LIGHTBOX PREVIEW */}
      <AnimatePresence>
        {viewingImage && (
          <div
            onClick={() => setViewingImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md"
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
              <button
                onClick={() => setViewingImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={viewingImage}
                alt="Enlarged"
                className="w-full h-full object-contain max-h-[85vh] rounded-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: NEW TOPIC / ROOM CREATOR */}
      <AnimatePresence>
        {showNewChannelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-950/80">
                <span className="text-xs font-mono font-bold text-emerald-400">Create New Topic Room</span>
                <button
                  onClick={() => setShowNewChannelModal(false)}
                  className="p-1 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateChannel} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block font-bold text-stone-200">Room Name</label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. night-market-food"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-stone-200">Description</label>
                  <textarea
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    placeholder="What is this topic room for?"
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors"
                >
                  Create Room
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
