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
import { audioService } from './audioService';
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
  private isInitialFirestoreSnapshotDone = false;

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

    const STORAGE_SESSION_USER_KEY = 'camgo_chat_tab_session_user';

    // 1. First check tab-specific session storage to allow multi-tab testing without ID collision
    try {
      const sessionStored = sessionStorage.getItem(STORAGE_SESSION_USER_KEY);
      if (sessionStored) {
        return JSON.parse(sessionStored);
      }
    } catch {
      // ignore
    }

    // 2. Check persistent localStorage for customized profile name/avatar
    let baseName = 'Highland Traveler';
    let baseHandle = `@traveler_${Math.floor(100 + Math.random() * 900)}`;
    let baseAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

    try {
      const stored = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) baseName = parsed.name;
        if (parsed.avatar) baseAvatar = parsed.avatar;
      }
    } catch {
      // ignore
    }

    // 3. Generate distinct tab-session ID for non-logged-in guest
    const tabUniqueId = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const tabUser: ChatUser = {
      id: tabUniqueId,
      name: baseName,
      handle: baseHandle,
      avatar: baseAvatar,
      role: 'member',
      status: 'online',
      customStatus: 'Exploring Cameron Highlands ⛰️',
      bio: 'Visitor exploring the highland trails and tea plantations.',
    };

    try {
      sessionStorage.setItem(STORAGE_SESSION_USER_KEY, JSON.stringify(tabUser));
    } catch {
      // ignore
    }

    return tabUser;
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
      sessionStorage.setItem('camgo_chat_tab_session_user', JSON.stringify(this.currentChatUser));
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

                // 1. Ensure sender is registered in communityUsers
                if (data.senderId && data.senderName && !this.users.some((u) => u.id === data.senderId)) {
                  this.users.push({
                    id: data.senderId,
                    name: data.senderName,
                    handle: `@${data.senderName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
                    avatar: data.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
                    role: data.senderRole || 'member',
                    status: 'online',
                  });
                }

                // 2. Synchronize DM Thread for private messages
                if (data.dmThreadId) {
                  let dm = this.dmThreads.find(
                    (d) => d.id === data.dmThreadId || (data.senderId && d.otherUser.id === data.senderId)
                  );
                  if (!dm) {
                    const otherUser: ChatUser = {
                      id: data.senderId === this.currentChatUser.id ? 'other-user' : data.senderId,
                      name: data.senderName,
                      handle: `@${data.senderName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
                      avatar: data.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
                      role: data.senderRole || 'member',
                      status: 'online',
                    };
                    dm = {
                      id: data.dmThreadId,
                      otherUser,
                      unreadCount: data.senderId !== this.currentChatUser.id ? 1 : 0,
                      lastMessage: {
                        text: data.text || 'Shared an attachment',
                        timestamp: data.timestamp,
                        senderId: data.senderId,
                        isRead: data.senderId === this.currentChatUser.id,
                      },
                      updatedAt: new Date().toISOString(),
                    };
                    this.dmThreads.unshift(dm);
                  } else {
                    dm.lastMessage = {
                      text: data.text || 'Shared an attachment',
                      timestamp: data.timestamp,
                      senderId: data.senderId,
                      isRead: data.senderId === this.currentChatUser.id,
                    };
                    if (data.senderId !== this.currentChatUser.id) {
                      dm.unreadCount = (dm.unreadCount || 0) + 1;
                    }
                    dm.updatedAt = new Date().toISOString();
                  }
                } else if (data.channelId) {
                  // Synchronize channel unread & last message
                  const ch = this.channels.find((c) => c.id === data.channelId);
                  if (ch) {
                    ch.lastMessage = {
                      text: data.text || 'Shared an attachment',
                      senderName: data.senderName,
                      timestamp: data.timestamp,
                    };
                    if (data.senderId !== this.currentChatUser.id) {
                      ch.unreadCount = (ch.unreadCount || 0) + 1;
                    }
                  }
                }

                // 3. Trigger alert if this is a live incoming message, sent by another user, and intended for this user
                const isDmForMe = !data.dmThreadId || this.isUserInDmThread(data.dmThreadId, this.currentChatUser.id);
                const isLiveIncoming = this.isInitialFirestoreSnapshotDone || (data.createdAt || 0) >= (Date.now() - 15000);

                if (data.senderId !== this.currentChatUser.id && isDmForMe && isLiveIncoming) {
                  const ch = this.channels.find((c) => c.id === data.channelId);
                  const channelLabel = ch ? ch.label : 'Chat Lounge';
                  const notifTitle = data.dmThreadId
                    ? `${data.senderName} (Direct Message)`
                    : `${data.senderName} in ${channelLabel}`;

                  // Audio alert: Web Audio synthesized chime & HTML5 audio
                  audioService.playTestChime();
                  pushNotificationService.playChime('incoming');

                  // In-App Notification Center Banner Popup
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new CustomEvent('camgo-broadcast-event', {
                        detail: {
                          id: `msg-${data.id}`,
                          event: 'chat_message',
                          priority: 'normal',
                          payload: {
                            title: notifTitle,
                            message: data.text || 'Shared an attachment',
                            sender: data.senderName,
                            senderName: data.senderName,
                            senderId: data.senderId,
                            senderAvatar: data.senderAvatar,
                            channelId: data.channelId,
                            dmThreadId: data.dmThreadId,
                          },
                          timestamp: new Date().toISOString(),
                        },
                      })
                    );
                  }

                  // Background push notification
                  pushNotificationService.dispatchNotification({
                    title: notifTitle,
                    body: data.text || 'Shared an attachment',
                    icon: data.senderAvatar,
                    tag: data.dmThreadId ? `dm-${data.senderId}` : `channel-${data.channelId}`,
                    threadId: data.dmThreadId,
                    channelId: data.channelId,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    url: data.dmThreadId ? `/chat#dms` : `/chat`,
                  });
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

          this.isInitialFirestoreSnapshotDone = true;

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
      sessionStorage.setItem('camgo_chat_tab_session_user', JSON.stringify(this.currentChatUser));
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
    const targetPair = ChatLoungeService.parseDmUserIds(dmThreadId);
    return this.messages.filter((m) => {
      if (!m.dmThreadId) return false;
      if (m.dmThreadId === dmThreadId) return true;
      if (targetPair) {
        const msgPair = ChatLoungeService.parseDmUserIds(m.dmThreadId);
        if (msgPair) {
          return (
            (msgPair[0] === targetPair[0] && msgPair[1] === targetPair[1]) ||
            (msgPair[0] === targetPair[1] && msgPair[1] === targetPair[0])
          );
        }
      }
      return m.dmThreadId.includes(dmThreadId.replace(/^dm[-_]/, ''));
    });
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
      const dm = this.dmThreads.find(
        (d) =>
          d.id === params.dmThreadId ||
          (d.id.includes(this.currentChatUser.id) && params.dmThreadId && d.id.includes(params.dmThreadId.replace(/^dm[-_]/, '')))
      );
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

        // Also broadcast notification to Firestore so all clients get banner popup even when lounge is closed
        const ch = this.channels.find((c) => c.id === params.channelId);
        const channelLabel = ch ? ch.label : 'Chat Lounge';
        const notifTitle = params.dmThreadId
          ? `${this.currentChatUser.name} (Direct Message)`
          : `${this.currentChatUser.name} in ${channelLabel}`;

        setDoc(doc(db, 'broadcast_notifications', `msg_${newMsg.id}`), {
          id: `notif_${newMsg.id}`,
          event: 'chat_message',
          priority: 'normal',
          payload: {
            title: notifTitle,
            message: newMsg.text || 'Shared a photo/attachment',
            sender: this.currentChatUser.name,
            senderName: this.currentChatUser.name,
            senderId: this.currentChatUser.id,
            senderAvatar: this.currentChatUser.avatar,
            channelId: params.channelId || null,
            dmThreadId: params.dmThreadId || null,
          },
          createdAt: Date.now(),
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      } catch (err) {
        console.error('[ChatLoungeService] Firestore sendMessage error:', err);
      }
    }

    // Broadcast across tabs and server WebSocket
    this.broadcastMessage(newMsg);
    this.notifySubscribers();

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
   * Helper to generate a deterministic, bidirectional DM thread ID between two users
   */
  public static getCanonicalDmThreadId(userIdA: string, userIdB: string): string {
    const cleanA = String(userIdA || '').trim();
    const cleanB = String(userIdB || '').trim();
    const sorted = [cleanA, cleanB].sort();
    return `dm_${sorted[0]}__${sorted[1]}`;
  }

  public static parseDmUserIds(dmThreadId: string): [string, string] | null {
    if (!dmThreadId) return null;
    const clean = dmThreadId.replace(/^dm[-_]/, '');
    const parts = clean.split('__');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return [parts[0].trim(), parts[1].trim()];
    }
    return null;
  }

  public isUserInDmThread(dmThreadId: string, userId: string): boolean {
    if (!dmThreadId || !userId) return false;
    const parsed = ChatLoungeService.parseDmUserIds(dmThreadId);
    if (parsed) {
      return parsed[0] === userId || parsed[1] === userId;
    }
    return dmThreadId.includes(userId);
  }

  /**
   * Gets or creates a 1-on-1 DM thread with another user
   */
  public getOrCreateDmThread(user: ChatUser): DirectMessageThread {
    const canonicalId = ChatLoungeService.getCanonicalDmThreadId(this.currentChatUser.id, user.id);
    const existing = this.dmThreads.find(
      (dm) =>
        dm.id === canonicalId ||
        dm.otherUser.id === user.id ||
        (dm.id.includes(user.id) && dm.id.includes(this.currentChatUser.id))
    );

    if (existing) {
      existing.id = canonicalId;
      return existing;
    }

    const newThread: DirectMessageThread = {
      id: canonicalId,
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
      let dm = this.dmThreads.find((d) => d.id === msg.dmThreadId);
      if (!dm) {
        const otherUser: ChatUser = {
          id: msg.senderId === this.currentChatUser.id ? 'other-user' : msg.senderId,
          name: msg.senderName,
          handle: `@${msg.senderName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
          avatar: msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          role: msg.senderRole || 'member',
          status: 'online',
        };
        dm = {
          id: msg.dmThreadId,
          otherUser,
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
        };
        this.dmThreads.unshift(dm);
      }
      if (msg.senderId !== this.currentChatUser.id) {
        dm.unreadCount = (dm.unreadCount || 0) + 1;
        dm.lastMessage = {
          text: msg.text,
          timestamp: msg.timestamp,
          senderId: msg.senderId,
          isRead: false,
        };
      } else {
        dm.lastMessage = {
          text: msg.text,
          timestamp: msg.timestamp,
          senderId: msg.senderId,
          isRead: true,
        };
      }
      dm.updatedAt = new Date().toISOString();
    }

    this.saveState();
    this.notifySubscribers();

    // Trigger Push Notification and incoming chime whenever any message arrives from someone else
    const isDmForMe = !msg.dmThreadId || msg.dmThreadId.includes(this.currentChatUser.id);
    if (msg.senderId !== this.currentChatUser.id && isDmForMe) {
      const ch = this.channels.find((c) => c.id === msg.channelId);
      const channelLabel = ch ? ch.label : 'Chat Lounge';
      pushNotificationService.dispatchNotification({
        title: msg.dmThreadId ? `${msg.senderName} (Direct Message)` : `${msg.senderName} in ${channelLabel}`,
        body: msg.text || 'Shared an attachment',
        icon: msg.senderAvatar,
        tag: msg.dmThreadId ? `dm-${msg.senderId}` : `channel-${msg.channelId}`,
        threadId: msg.dmThreadId,
        channelId: msg.channelId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        url: msg.dmThreadId ? `/chat#dms` : `/chat`,
      });
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
