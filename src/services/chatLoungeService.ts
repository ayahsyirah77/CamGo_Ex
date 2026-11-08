/**
 * Real-Time Chat Lounge Service
 * Coordinates topic channels, direct messages (1-on-1 DMs), WebSocket sync,
 * persistence, user presence, and push notification triggers.
 */

import {
  ChatUser,
  ChatChannel,
  DirectMessageThread,
  ChatMessage,
  TypingIndicatorEvent,
} from '../types/chatLounge';
import { pushNotificationService } from './pushNotificationService';
import { UserProfile } from './firebase';
import { db } from '../lib/firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';

const STORAGE_CHANNELS_KEY = 'camgo_chat_channels_v2';
const STORAGE_MESSAGES_KEY = 'camgo_chat_messages_v2';
const STORAGE_DMS_KEY = 'camgo_chat_dms_v2';
const STORAGE_CURRENT_USER_KEY = 'camgo_chat_my_user_v2';

export const INITIAL_COMMUNITY_USERS: ChatUser[] = [];

export const INITIAL_CHANNELS: ChatChannel[] = [
  {
    id: 'general',
    name: 'general',
    label: '#general-lounge',
    category: 'community',
    description: 'Casual banter, hello world, and live vibes around Cameron Highlands.',
    iconName: 'MessageSquare',
    unreadCount: 0,
    isOfficial: true,
  },
  {
    id: 'traffic-roads',
    name: 'traffic-roads',
    label: '#traffic-road-updates',
    category: 'travel',
    description: 'Real-time Federal Route 59 & Tapah road reports, jams & roadworks.',
    iconName: 'Car',
    unreadCount: 0,
    isOfficial: true,
  },
  {
    id: 'travel-carpool',
    name: 'travel-carpool',
    label: '#travel-carpool',
    category: 'travel',
    description: 'Share rides, split taxi costs, and find hiking companions for trails.',
    iconName: 'Compass',
    unreadCount: 0,
  },
  {
    id: 'food-hunting',
    name: 'food-hunting',
    label: '#food-hunting',
    category: 'food',
    description: 'Steamboats, fresh strawberry waffles, halal cafes, and night markets.',
    iconName: 'Utensils',
    unreadCount: 0,
  },
  {
    id: 'announcements',
    name: 'announcements',
    label: '#official-announcements',
    category: 'announcements',
    description: 'Official weather advisories, flash notices, and highland festival events.',
    iconName: 'Megaphone',
    unreadCount: 0,
    isOfficial: true,
    isLocked: true,
  },
  {
    id: 'help-questions',
    name: 'help-questions',
    label: '#help-questions',
    category: 'support',
    description: 'Ask for directions, mechanics, clinic hours, lost & found, emergency tips.',
    iconName: 'HelpCircle',
    unreadCount: 0,
  },
];

export const INITIAL_MESSAGES: ChatMessage[] = [];

class ChatLoungeService {
  private channels: ChatChannel[] = [];
  private messages: ChatMessage[] = [];
  private dmThreads: DirectMessageThread[] = [];
  private users: ChatUser[] = [];
  private currentChatUser: ChatUser;
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private subscribers: Set<() => void> = new Set();
  private typingMap: Map<string, string[]> = new Map(); // id -> userNames[]

  constructor() {
    this.currentChatUser = this.loadCurrentUser();
    this.users = [...INITIAL_COMMUNITY_USERS];
    this.loadState();
    this.initBroadcastChannel();
    this.initWebSocket();
    this.initFirestore();
    this.initPresence();
    this.initTypingListener();
  }

  private loadCurrentUser(): ChatUser {
    if (typeof window === 'undefined') {
      return {
        id: 'user-guest',
        name: 'Highland Traveler',
        handle: '@traveler',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        role: 'member',
        status: 'online',
        customStatus: 'Exploring Cameron Highlands ⛰️',
        bio: 'Explorer discovering mossy forests and tea gardens.',
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }

    const fallback: ChatUser = {
      id: `user-${Date.now().toString(36)}`,
      name: 'Highland Traveler',
      handle: `@traveler_${Math.floor(100 + Math.random() * 900)}`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: 'member',
      status: 'online',
      customStatus: 'Exploring Cameron Highlands ⛰️',
      bio: 'Visitor exploring the highland trails and tea plantations.',
    };

    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(fallback));
    } catch {
      // ignore
    }

    return fallback;
  }

  /**
   * Syncs user with authenticated Firebase account
   */
  public syncWithFirebaseUser(user: UserProfile | null): void {
    if (!user) return;

    this.currentChatUser = {
      id: user.uid,
      name: user.displayName || user.email.split('@')[0],
      handle: `@${(user.displayName || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      avatar: user.photoURL || this.currentChatUser.avatar,
      role: user.role === 'admin' ? 'admin' : ((user as any).role === 'vendor' ? 'vendor' : 'member'),
      status: 'online',
      customStatus: this.currentChatUser.customStatus,
      bio: this.currentChatUser.bio,
      isVerified: user.role === 'admin' || (user as any).role === 'vendor',
    };

    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(this.currentChatUser));
    } catch {
      // ignore
    }

    this.initPresence();
    this.notifySubscribers();
  }

  private loadState(): void {
    if (typeof window === 'undefined') {
      this.channels = INITIAL_CHANNELS;
      this.messages = INITIAL_MESSAGES;
      this.dmThreads = [];
      return;
    }

    try {
      if (!localStorage.getItem('camgo_chat_cleared_v4')) {
        localStorage.removeItem(STORAGE_MESSAGES_KEY);
        localStorage.removeItem(STORAGE_DMS_KEY);
        localStorage.setItem('camgo_chat_cleared_v4', 'true');
      }

      const storedChannels = localStorage.getItem(STORAGE_CHANNELS_KEY);
      this.channels = storedChannels ? JSON.parse(storedChannels) : INITIAL_CHANNELS;

      const storedMessages = localStorage.getItem(STORAGE_MESSAGES_KEY);
      this.messages = storedMessages ? JSON.parse(storedMessages) : INITIAL_MESSAGES;

      const storedDms = localStorage.getItem(STORAGE_DMS_KEY);
      this.dmThreads = storedDms ? JSON.parse(storedDms) : [];
    } catch {
      this.channels = INITIAL_CHANNELS;
      this.messages = INITIAL_MESSAGES;
      this.dmThreads = [];
    }
  }

  private saveState(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_CHANNELS_KEY, JSON.stringify(this.channels));
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(this.messages));
      localStorage.setItem(STORAGE_DMS_KEY, JSON.stringify(this.dmThreads));
    } catch (err) {
      console.warn('[CHAT SERVICE] LocalStorage save warning:', err);
    }
  }

  private initBroadcastChannel(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      this.broadcastChannel = new BroadcastChannel('camgo_chat_lounge_sync');
      this.broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'NEW_MESSAGE') {
          this.handleIncomingMessage(payload, false);
        } else if (type === 'MESSAGE_REACTION') {
          this.handleIncomingReaction(payload, false);
        } else if (type === 'TYPING') {
          this.handleIncomingTyping(payload);
        }
      };
    } catch {
      // ignore
    }
  }

  private initWebSocket(): void {
    // Real-time synchronization is fully handled by Firebase Firestore onSnapshot listeners
    this.ws = null;
  }

  /**
   * Initializes real-time Firebase Firestore synchronization across all devices and sessions
   */
  private initFirestore(): void {
    if (typeof window === 'undefined' || !db) return;
    try {
      console.log('[ChatLoungeService] Initializing Firestore listener...');
      const msgsCol = collection(db, 'chat_lounge_messages');
      onSnapshot(
        msgsCol,
        (snapshot) => {
          console.log('[ChatLoungeService] Firestore messages snapshot received. Docs:', snapshot.size);
          let updated = false;
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data() as ChatMessage;
            if (!data || !data.id) return;
            console.log('[ChatLoungeService] Firestore message change:', change.type, 'Message ID:', data.id, 'Sender:', data.senderName);

            if (change.type === 'added') {
              const exists = this.messages.some((m) => m.id === data.id);
              if (!exists) {
                console.log('[ChatLoungeService] Adding new message:', data.id);
                this.messages.push(data);
                updated = true;
                // If sent by someone else, play incoming message chime
                if (data.senderId !== this.currentChatUser.id) {
                  pushNotificationService.playChime('incoming');
                }
              }
            } else if (change.type === 'modified') {
              const idx = this.messages.findIndex((m) => m.id === data.id);
              if (idx >= 0) {
                console.log('[ChatLoungeService] Updating message:', data.id);
                this.messages[idx] = { ...this.messages[idx], ...data };
                updated = true;
              }
            }
          });

          if (updated) {
            // Sort messages chronologically
            this.messages.sort((a, b) => a.createdAt - b.createdAt);
            this.saveState();
            this.notifySubscribers();
          }
        },
        (err) => {
          console.error('[FIRESTORE CHAT] Realtime listener error:', err);
        }
      );
    } catch (err) {
      console.error('[FIRESTORE CHAT] init error:', err);
    }
  }

  private initPresence(): void {
    if (typeof window === 'undefined' || !db) return;
    try {
      const presenceRef = doc(db, 'chat_lounge_presence', this.currentChatUser.id);
      setDoc(presenceRef, {
        ...this.currentChatUser,
        lastSeen: Date.now(),
      }, { merge: true }).catch(() => {});

      const presenceCol = collection(db, 'chat_lounge_presence');
      onSnapshot(presenceCol, (snapshot) => {
        const firestoreUsers: ChatUser[] = [];
        snapshot.forEach((docSnap) => {
          const userData = docSnap.data() as ChatUser;
          if (userData && userData.id) {
            firestoreUsers.push(userData);
          }
        });

        this.users = firestoreUsers;
        this.notifySubscribers();
      }, () => {});
    } catch {
      // ignore
    }
  }

  private initTypingListener(): void {
    if (typeof window === 'undefined' || !db) return;
    try {
      const typingCol = collection(db, 'chat_lounge_typing');
      onSnapshot(
        typingCol,
        (snapshot) => {
          const newTypingMap = new Map<string, string[]>();
          const now = Date.now();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              data &&
              data.threadOrChannelId &&
              data.userId &&
              data.userName &&
              data.isTyping &&
              data.userId !== this.currentChatUser.id &&
              now - (data.updatedAt || 0) < 5000
            ) {
              const current = newTypingMap.get(data.threadOrChannelId) || [];
              if (!current.includes(data.userName)) {
                newTypingMap.set(data.threadOrChannelId, [...current, data.userName]);
              }
            }
          });

          this.typingMap = newTypingMap;
          this.notifySubscribers();
        },
        () => {}
      );
    } catch {
      // ignore
    }
  }

  private sanitizeObject(obj: any): any {
    const cleaned: any = {};
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          cleaned[key] = this.sanitizeObject(obj[key]);
        } else {
          cleaned[key] = obj[key];
        }
      }
    });
    return cleaned;
  }

  // --- Public Getters ---

  public getCurrentUser(): ChatUser {
    return this.currentChatUser;
  }

  public updateProfile(updates: Partial<ChatUser>): void {
    this.currentChatUser = { ...this.currentChatUser, ...updates };
    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(this.currentChatUser));
    } catch {
      // ignore
    }
    this.notifySubscribers();
  }

  public getChannels(): ChatChannel[] {
    return this.channels;
  }

  public createChannel(params: {
    name: string;
    label: string;
    category?: 'community' | 'travel' | 'food' | 'support' | 'announcements';
    description: string;
    iconName?: string;
  }): ChatChannel {
    const newChan: ChatChannel = {
      id: `chan-${params.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
      name: params.name,
      label: params.label.startsWith('#') ? params.label : `#${params.label}`,
      category: params.category || 'community',
      description: params.description,
      iconName: params.iconName || 'Hash',
      unreadCount: 0,
      isOfficial: false,
    };

    this.channels.push(newChan);
    this.saveState();
    this.notifySubscribers();

    if (db) {
      try {
        setDoc(doc(db, 'chat_lounge_channels', newChan.id), this.sanitizeObject(newChan)).catch(() => {});
      } catch {
        // ignore
      }
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'CHANNEL_CREATED', payload: newChan });
    }

    return newChan;
  }

  public getDirectMessageThreads(): DirectMessageThread[] {
    return this.dmThreads;
  }

  public getCommunityUsers(): ChatUser[] {
    return this.users;
  }

  public getMessagesForChannel(channelId: string): ChatMessage[] {
    return this.messages.filter((m) => m.channelId === channelId);
  }

  public getMessagesForDm(dmThreadId: string): ChatMessage[] {
    return this.messages.filter((m) => m.dmThreadId === dmThreadId);
  }

  public getTypingUsers(threadOrChannelId: string): string[] {
    return this.typingMap.get(threadOrChannelId) || [];
  }

  // --- Actions ---

  /**
   * Sends a message into a channel or private DM thread
   */
  public async sendMessage(params: {
    channelId?: string;
    dmThreadId?: string;
    text: string;
    imageUrl?: string;
    attachment?: ChatMessage['attachment'];
    replyTo?: ChatMessage['replyTo'];
  }): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channelId: params.channelId,
      dmThreadId: params.dmThreadId,
      senderId: this.currentChatUser.id,
      senderName: this.currentChatUser.name,
      senderAvatar: this.currentChatUser.avatar,
      senderRole: this.currentChatUser.role,
      text: params.text.trim(),
      imageUrl: params.imageUrl,
      attachment: params.attachment,
      replyTo: params.replyTo,
      reactions: {},
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    };

    this.messages.push(newMsg);

    // Update last message in channel or DM
    if (params.channelId) {
      const ch = this.channels.find((c) => c.id === params.channelId);
      if (ch) {
        ch.lastMessage = {
          text: newMsg.text || 'Shared an attachment',
          senderName: newMsg.senderName,
          timestamp: newMsg.timestamp,
        };
      }
    } else if (params.dmThreadId) {
      const dm = this.dmThreads.find((d) => d.id === params.dmThreadId);
      if (dm) {
        dm.lastMessage = {
          text: newMsg.text || 'Shared an attachment',
          timestamp: newMsg.timestamp,
          senderId: this.currentChatUser.id,
          isRead: true,
        };
        dm.updatedAt = new Date().toISOString();
      }
    }

    this.saveState();
    pushNotificationService.playChime('sent');

    // Persist to Cloud Firestore for real-time multi-device sync
    if (db) {
      try {
        const sanitized = this.sanitizeObject(newMsg);
        console.log('[ChatLoungeService] Persisting message to Firestore:', newMsg.id, sanitized);
        setDoc(doc(db, 'chat_lounge_messages', newMsg.id), sanitized);
      } catch (err) {
        console.error('[ChatLoungeService] Firestore sendMessage error:', err);
      }
    }

    // Broadcast across tabs and server WebSocket
    this.broadcastMessage(newMsg);
    this.notifySubscribers();

    // Trigger smart simulated replies for lively community feel if sending to general or a DM
    this.triggerSimulatedCompanionReply(newMsg);

    return newMsg;
  }

  /**
   * Toggles an emoji reaction on a message
   */
  public toggleReaction(messageId: string, emoji: string): void {
    const msg = this.messages.find((m) => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};
    const uids = msg.reactions[emoji] || [];
    const myId = this.currentChatUser.id;

    if (uids.includes(myId)) {
      msg.reactions[emoji] = uids.filter((id) => id !== myId);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji] = [...uids, myId];
    }

    this.saveState();
    this.notifySubscribers();

    if (db) {
      try {
        setDoc(doc(db, 'chat_lounge_messages', messageId), this.sanitizeObject({ reactions: msg.reactions }), { merge: true }).catch(() => {});
      } catch {
        // ignore
      }
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'MESSAGE_REACTION',
        payload: { messageId, emoji, reactions: msg.reactions },
      });
    }
  }

  /**
   * Broadcasts typing event across BroadcastChannel and Cloud Firestore
   */
  public setTyping(threadOrChannelId: string, isTyping: boolean): void {
    if (!threadOrChannelId) return;

    const payload: TypingIndicatorEvent = {
      threadOrChannelId,
      userId: this.currentChatUser.id,
      userName: this.currentChatUser.name,
      isTyping,
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'TYPING', payload });
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'chat_typing', payload }));
    }

    if (db) {
      try {
        const typingDocId = `${threadOrChannelId}_${this.currentChatUser.id}`;
        const docRef = doc(db, 'chat_lounge_typing', typingDocId);
        setDoc(
          docRef,
          this.sanitizeObject({
            threadOrChannelId,
            userId: this.currentChatUser.id,
            userName: this.currentChatUser.name,
            isTyping,
            updatedAt: Date.now(),
          }),
          { merge: true }
        ).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  /**
   * Gets or creates a 1-on-1 DM thread with another user
   */
  public getOrCreateDmThread(user: ChatUser): DirectMessageThread {
    const existing = this.dmThreads.find(
      (dm) => dm.otherUser.id === user.id || dm.id.includes(user.id)
    );

    if (existing) {
      return existing;
    }

    const newThread: DirectMessageThread = {
      id: `dm-${this.currentChatUser.id}-${user.id}`,
      otherUser: user,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };

    this.dmThreads.unshift(newThread);
    this.saveState();
    this.notifySubscribers();
    return newThread;
  }

  /**
   * Marks a DM thread or channel as read
   */
  public markAsRead(id: string, isChannel: boolean): void {
    if (isChannel) {
      const ch = this.channels.find((c) => c.id === id);
      if (ch && ch.unreadCount > 0) {
        ch.unreadCount = 0;
        this.saveState();
        this.notifySubscribers();
      }
    } else {
      const dm = this.dmThreads.find((d) => d.id === id);
      if (dm && dm.unreadCount > 0) {
        dm.unreadCount = 0;
        if (dm.lastMessage) dm.lastMessage.isRead = true;
        this.saveState();
        this.notifySubscribers();
      }
    }
  }

  // --- Internal Event Handlers ---

  private broadcastMessage(message: ChatMessage): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', payload: message });
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'chat_message',
        priority: 'normal',
        payload: {
          ...message,
          sender: message.senderName,
          senderName: message.senderName,
          message: message.text,
          text: message.text,
        }
      }));
    }
  }

  private handleIncomingMessage(msg: ChatMessage, isBroadcast: boolean): void {
    // Avoid duplicates
    if (this.messages.some((m) => m.id === msg.id)) return;

    this.messages.push(msg);

    // Update unread badges
    if (msg.channelId) {
      const ch = this.channels.find((c) => c.id === msg.channelId);
      if (ch) {
        ch.unreadCount = (ch.unreadCount || 0) + 1;
        ch.lastMessage = {
          text: msg.text,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
        };
      }
    } else if (msg.dmThreadId) {
      const dm = this.dmThreads.find((d) => d.id === msg.dmThreadId);
      if (dm) {
        dm.unreadCount = (dm.unreadCount || 0) + 1;
        dm.lastMessage = {
          text: msg.text,
          timestamp: msg.timestamp,
          senderId: msg.senderId,
          isRead: false,
        };
        dm.updatedAt = new Date().toISOString();
      }
    }

    this.saveState();
    this.notifySubscribers();

    // Trigger Push Notification if document is hidden or message is a DM
    if (typeof document !== 'undefined' && (document.visibilityState === 'hidden' || msg.dmThreadId)) {
      pushNotificationService.dispatchNotification({
        title: msg.dmThreadId ? `${msg.senderName} (Direct Message)` : `${msg.senderName} in Lounge`,
        body: msg.text || 'Sent an attachment',
        icon: msg.senderAvatar,
        tag: msg.dmThreadId ? `dm-${msg.senderId}` : `channel-${msg.channelId}`,
        threadId: msg.dmThreadId,
        channelId: msg.channelId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        url: msg.dmThreadId ? `/chat#dms` : `/chat`,
      });
    } else {
      pushNotificationService.playChime('incoming');
    }
  }

  private handleIncomingReaction(payload: { messageId: string; reactions: Record<string, string[]> }, isBroadcast: boolean): void {
    const msg = this.messages.find((m) => m.id === payload.messageId);
    if (!msg) return;
    msg.reactions = payload.reactions;
    this.saveState();
    this.notifySubscribers();
  }

  private handleIncomingTyping(payload: TypingIndicatorEvent): void {
    if (payload.userId === this.currentChatUser.id) return;
    const current = this.typingMap.get(payload.threadOrChannelId) || [];

    if (payload.isTyping) {
      if (!current.includes(payload.userName)) {
        this.typingMap.set(payload.threadOrChannelId, [...current, payload.userName]);
      }
    } else {
      this.typingMap.set(
        payload.threadOrChannelId,
        current.filter((n) => n !== payload.userName)
      );
    }

    this.notifySubscribers();
  }

  /**
   * Simulates realistic community banter & instant DM responses
   * Keeps the lounge exciting and interactive when testing
   */
  private triggerSimulatedCompanionReply(userMsg: ChatMessage): void {
    if (userMsg.senderId !== this.currentChatUser.id) return;

    // Direct Message simulation
    if (userMsg.dmThreadId) {
      const dm = this.dmThreads.find((d) => d.id === userMsg.dmThreadId);
      if (!dm) return;
      const targetUser = dm.otherUser;

      // Show typing indicator after 1.5s
      setTimeout(() => {
        this.handleIncomingTyping({
          threadOrChannelId: dm.id,
          userId: targetUser.id,
          userName: targetUser.name,
          isTyping: true,
        });

        // Deliver simulated response after 3.5s
        setTimeout(() => {
          this.handleIncomingTyping({
            threadOrChannelId: dm.id,
            userId: targetUser.id,
            userName: targetUser.name,
            isTyping: false,
          });

          const replies = [
            `Got your message! Let me check the schedule for you right away. 😊`,
            `Sounds great! I'm around Tanah Rata right now. Let me know if you need any directions or spots!`,
            `Thanks for reaching out! The view up here at the viewpoint is stunning today.`,
            `Yes absolutely! I can help you arrange that or guide you along the trail.`,
          ];

          const responseText = replies[Math.floor(Math.random() * replies.length)];
          const replyMsg: ChatMessage = {
            id: `msg-sim-${Date.now()}`,
            dmThreadId: dm.id,
            senderId: targetUser.id,
            senderName: targetUser.name,
            senderAvatar: targetUser.avatar,
            senderRole: targetUser.role,
            text: responseText,
            status: 'delivered',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: Date.now(),
            reactions: {},
          };

          this.handleIncomingMessage(replyMsg, true);
        }, 2200);
      }, 1200);
    }
  }

  // --- Subscriptions ---

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => cb());
  }
}

export const chatLoungeService = new ChatLoungeService();
