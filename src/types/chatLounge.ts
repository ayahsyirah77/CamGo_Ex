/**
 * Chat Lounge & Messenger Types
 * Defines data structures for topic channels, direct messages (DMs),
 * real-time messages, reactions, user presence, and push notifications.
 */

export type UserRole = 'admin' | 'moderator' | 'host' | 'vendor' | 'member';
export type UserStatus = 'online' | 'idle' | 'offline';

export interface ChatUser {
  id: string;
  name: string;
  handle: string; // e.g. @sarah_tea
  avatar: string;
  role: UserRole;
  status: UserStatus;
  lastSeen?: string;
  customStatus?: string; // e.g. "Hiking Trail 10 🥾"
  bio?: string;
  township?: string;
  isVerified?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  label: string; // e.g. "#general-lounge"
  category: 'community' | 'travel' | 'food' | 'support' | 'announcements';
  description: string;
  iconName: string;
  isOfficial?: boolean;
  isLocked?: boolean;
  unreadCount: number;
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: string;
  };
}

export interface DirectMessageThread {
  id: string; // e.g. "dm-user1-user2"
  otherUser: ChatUser;
  unreadCount: number;
  lastMessage?: {
    text: string;
    timestamp: string;
    senderId: string;
    isRead?: boolean;
  };
  updatedAt: string;
}

export interface ChatAttachment {
  name: string;
  url: string;
  size: string;
  type: 'image' | 'document' | 'audio';
}

export interface ChatMessage {
  id: string;
  channelId?: string; // present if in a public room
  dmThreadId?: string; // present if in a 1-on-1 direct message
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: UserRole;
  text: string;
  imageUrl?: string;
  attachment?: ChatAttachment;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions: Record<string, string[]>; // e.g. { '❤️': ['uid1', 'uid2'], '🔥': ['uid3'] }
  mentions?: string[]; // user handles or IDs
  status: 'sending' | 'sent' | 'delivered' | 'read';
  timestamp: string;
  createdAt: number;
}

export interface TypingIndicatorEvent {
  threadOrChannelId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  threadId?: string;
  channelId?: string;
  senderId?: string;
  senderName?: string;
}
