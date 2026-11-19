import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  MessageSquare,
  Hash,
  Clock,
  Search,
  Download,
  Trash2,
  RefreshCw,
  Calendar,
  Paperclip,
  Reply,
  Shield,
  ChevronRight,
  Lock,
  Check,
  X,
} from 'lucide-react';
import { ChatHistoryDateFolder, ArchivedChatMessage } from '../types/chatLounge';
import { chatLoungeService } from '../services/chatLoungeService';
import { safeSrc, DEFAULT_AVATAR_IMAGE } from '../utils/safeMedia';

interface AdminChatHistoryFoldersProps {
  addActivity?: (title: string) => void;
}

export const AdminChatHistoryFolders: React.FC<AdminChatHistoryFoldersProps> = ({
  addActivity,
}) => {
  const [folders, setFolders] = useState<ChatHistoryDateFolder[]>(() =>
    chatLoungeService.getChatHistoryFolders()
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(() => {
    const initial = chatLoungeService.getChatHistoryFolders();
    return initial.length > 0 ? initial[0].dateKey : null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'channels' | 'dms'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmDeleteDateKey, setConfirmDeleteDateKey] = useState<string | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  const syncFolders = () => {
    const next = chatLoungeService.getChatHistoryFolders();
    setFolders(next);
    setSelectedDateKey((prev) => {
      if (prev && next.some((f) => f.dateKey === prev)) return prev;
      return next.length > 0 ? next[0].dateKey : null;
    });
  };

  useEffect(() => {
    syncFolders();
    chatLoungeService.loadFirestoreArchive().then(syncFolders).catch(() => {});
    const unsubLocal = chatLoungeService.subscribe(syncFolders);
    const unsubFirestore = chatLoungeService.subscribeArchiveFirestore(syncFolders);
    return () => {
      unsubLocal();
      unsubFirestore();
    };
  }, []);

  const handleRefreshArchive = async () => {
    setIsRefreshing(true);
    try {
      await chatLoungeService.loadFirestoreArchive();
      syncFolders();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter folders when global search is active
  const visibleFolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((folder) => {
      if (
        folder.dateKey.toLowerCase().includes(q) ||
        folder.displayDate.toLowerCase().includes(q)
      ) {
        return true;
      }
      return folder.messages.some(
        (m) =>
          (m.text || '').toLowerCase().includes(q) ||
          (m.senderName || '').toLowerCase().includes(q) ||
          (m.channelLabel || '').toLowerCase().includes(q)
      );
    });
  }, [folders, searchQuery]);

  const activeFolder = useMemo(() => {
    if (!selectedDateKey) return visibleFolders[0] || null;
    return (
      visibleFolders.find((f) => f.dateKey === selectedDateKey) ||
      visibleFolders[0] ||
      null
    );
  }, [visibleFolders, selectedDateKey]);

  const channelOptions = useMemo(() => {
    if (!activeFolder) return [];
    const map = new Map<string, string>();
    activeFolder.messages.forEach((m) => {
      if (m.channelId) {
        map.set(m.channelId, m.channelLabel || `#${m.channelId}`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [activeFolder]);

  const filteredMessages: ArchivedChatMessage[] = useMemo(() => {
    if (!activeFolder) return [];
    const q = searchQuery.trim().toLowerCase();
    return activeFolder.messages.filter((m) => {
      if (scopeFilter === 'channels' && !m.channelId) return false;
      if (scopeFilter === 'dms' && !m.dmThreadId) return false;
      if (channelFilter !== 'all' && m.channelId !== channelFilter) return false;
      if (q) {
        const matchesFolderDate =
          activeFolder.dateKey.toLowerCase().includes(q) ||
          activeFolder.displayDate.toLowerCase().includes(q);
        const matchesMessage =
          (m.text || '').toLowerCase().includes(q) ||
          (m.senderName || '').toLowerCase().includes(q) ||
          (m.channelLabel || '').toLowerCase().includes(q);
        if (!matchesFolderDate && !matchesMessage) return false;
      }
      return true;
    });
  }, [activeFolder, scopeFilter, channelFilter, searchQuery]);

  const totalMessagesCount = useMemo(
    () => folders.reduce((sum, f) => sum + f.messages.length, 0),
    [folders]
  );
  const totalExpiredCount = useMemo(
    () => folders.reduce((sum, f) => sum + f.expiredCount, 0),
    [folders]
  );

  const handleExportFolderJson = (folder: ChatHistoryDateFolder) => {
    try {
      const payload = {
        dateKey: folder.dateKey,
        displayDate: folder.displayDate,
        exportedAt: new Date().toISOString(),
        totalMessages: folder.messages.length,
        messages: folder.messages,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camgo-chat-history-${folder.dateKey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addActivity?.(`Exported Chat History Folder (${folder.dateKey}) JSON`);
    } catch (err) {
      console.warn('Could not export chat folder JSON:', err);
    }
  };

  const handleDeleteFolder = async (dateKey: string) => {
    setIsDeletingFolder(true);
    try {
      await chatLoungeService.deleteChatHistoryFolder(dateKey);
      setConfirmDeleteDateKey(null);
      syncFolders();
      addActivity?.(`Deleted Chat History Archive Folder (${dateKey})`);
    } finally {
      setIsDeletingFolder(false);
    }
  };

  return (
    <div
      id="admin-chat-history-folders"
      className="p-5 sm:p-6 rounded-3xl bg-stone-900/90 border border-cyan-500/30 shadow-2xl space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-black text-white flex flex-wrap items-center gap-2 font-heading">
              <span>Chat History Archive (Folders by Date)</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                24h Auto-Clear for Users
              </span>
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              User chat messages automatically disappear after 24 hours, while every message is permanently preserved here for Admin in date-based folders.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-stone-950 border border-white/10 text-[11px] font-mono text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{folders.length} Date Folders</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-stone-950 border border-white/10 text-[11px] font-mono text-stone-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {totalMessagesCount} Logs ({totalExpiredCount} expired &gt;24h)
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefreshArchive}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Archive'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search date folders (e.g. 2026-11-19), sender name, channel (#general), or message text..."
          className="w-full pl-10 pr-20 py-2.5 rounded-2xl bg-stone-950/90 border border-white/10 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-cyan-500/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-stone-400 hover:text-white cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Two-Pane Folder Explorer */}
      {visibleFolders.length === 0 ? (
        <div className="p-8 rounded-2xl bg-stone-950/60 border border-white/5 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-white/10 flex items-center justify-center mx-auto text-stone-500">
            <Folder className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-bold text-stone-200">
            {folders.length === 0
              ? 'No Archived Chat Folders Yet'
              : 'No Chat Folders Match Your Search'}
          </h5>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            {folders.length === 0
              ? 'As community members send messages in Chat Lounge rooms or direct messages, date-organized folders will automatically appear here and remain saved even after the 24-hour user purge.'
              : 'Try adjusting your search query or clearing filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Pane: Date Folders List */}
          <div className="lg:col-span-4 space-y-2 max-h-[460px] overflow-y-auto pr-1 [scrollbar-width:thin]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1 mb-1">
              Archive Folders ({visibleFolders.length})
            </div>

            {visibleFolders.map((folder) => {
              const isSelected = activeFolder?.dateKey === folder.dateKey;
              return (
                <button
                  key={folder.dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(folder.dateKey);
                    setChannelFilter('all');
                    setConfirmDeleteDateKey(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                      : 'bg-stone-950/70 border-white/5 hover:border-cyan-500/30 hover:bg-stone-950'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {isSelected ? (
                        <FolderOpen className="w-5 h-5" />
                      ) : (
                        <Folder className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-white">
                          {folder.dateKey}
                        </span>
                        {folder.expiredCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase">
                            Archived
                          </span>
                        )}
                        {folder.activeCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold uppercase">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {folder.displayDate}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-stone-400">
                        <span>{folder.messages.length} msgs</span>
                        {folder.channelCount > 0 && <span>· {folder.channelCount} rooms</span>}
                        {folder.dmCount > 0 && <span>· {folder.dmCount} DMs</span>}
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-stone-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Pane: Selected Date Folder Contents */}
          <div className="lg:col-span-8 rounded-2xl bg-stone-950/80 border border-white/10 flex flex-col max-h-[460px] overflow-hidden">
            {activeFolder ? (
              <>
                {/* Folder Viewer Toolbar */}
                <div className="p-3.5 sm:p-4 border-b border-stone-800 bg-stone-950 space-y-3 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <h5 className="text-sm font-black text-white font-mono">
                          /{activeFolder.dateKey}
                        </h5>
                        <p className="text-[11px] text-stone-400">
                          {activeFolder.displayDate} · {filteredMessages.length} of{' '}
                          {activeFolder.messages.length} messages shown
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportFolderJson(activeFolder)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-bold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Download this date folder as JSON"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Export JSON</span>
                      </button>

                      {confirmDeleteDateKey === activeFolder.dateKey ? (
                        <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 rounded-xl p-1">
                          <button
                            type="button"
                            disabled={isDeletingFolder}
                            onClick={() => handleDeleteFolder(activeFolder.dateKey)}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isDeletingFolder ? 'Deleting...' : 'Confirm'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDateKey(null)}
                            className="p-1 rounded-lg text-stone-300 hover:text-white cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDateKey(activeFolder.dateKey)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Permanently delete this date folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Folder</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scope & Room Filter Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl bg-stone-900 border border-white/5 p-0.5 text-[11px]">
                      {(['all', 'channels', 'dms'] as const).map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => {
                            setScopeFilter(scope);
                            if (scope === 'dms') setChannelFilter('all');
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                            scopeFilter === scope
                              ? 'bg-cyan-600 text-white'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {scope === 'all' ? 'All Chats' : scope === 'channels' ? 'Rooms' : 'DMs'}
                        </button>
                      ))}
                    </div>

                    {scopeFilter !== 'dms' && channelOptions.length > 0 && (
                      <select
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-900 border border-white/10 text-[11px] text-stone-200 focus:outline-none"
                      >
                        <option value="all">All Rooms ({channelOptions.length})</option>
                        {channelOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Folder Message List */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 [scrollbar-width:thin]">
                  {filteredMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-500">
                      No messages match the selected room/filter in this date folder.
                    </div>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isExpiredForUsers = chatLoungeService.isMessageExpired(msg);
                      const exactTime = msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : msg.timestamp;

                      return (
                        <div
                          key={msg.id}
                          className="p-3 rounded-2xl bg-stone-900/90 border border-white/5 hover:border-white/10 transition-colors space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={safeSrc(msg.senderAvatar, DEFAULT_AVATAR_IMAGE)}
                                alt={msg.senderName}
                                className="w-6 h-6 rounded-full object-cover border border-white/15 shrink-0"
                              />
                              <span className="font-bold text-xs text-white truncate">
                                {msg.senderName}
                              </span>
                              {msg.senderRole && msg.senderRole !== 'member' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold uppercase inline-flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5" />
                                  {msg.senderRole}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono inline-flex items-center gap-1 ${
                                  msg.dmThreadId
                                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                {msg.dmThreadId ? (
                                  <Lock className="w-2.5 h-2.5" />
                                ) : (
                                  <Hash className="w-2.5 h-2.5" />
                                )}
                                <span>
                                  {msg.dmThreadId
                                    ? `DM (${msg.dmThreadId})`
                                    : msg.channelLabel || `#${msg.channelId || 'general'}`}
                                </span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span
                                className={`px-1.5 py-0.5 rounded border ${
                                  isExpiredForUsers
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}
                                title={
                                  isExpiredForUsers
                                    ? 'Expired (>24h): removed from user chat view, preserved for Admin'
                                    : 'Active (<24h): currently visible in user chat'
                                }
                              >
                                {isExpiredForUsers ? 'Cleared for Users (>24h)' : 'Live (<24h)'}
                              </span>
                              <span className="text-stone-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {exactTime}
                              </span>
                            </div>
                          </div>

                          {msg.replyTo && (
                            <div className="px-2.5 py-1 rounded-lg bg-stone-950/70 border border-white/5 text-[11px] text-stone-400 flex items-center gap-1.5">
                              <Reply className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="font-bold text-stone-300">
                                {msg.replyTo.senderName}:
                              </span>
                              <span className="truncate">{msg.replyTo.text}</span>
                            </div>
                          )}

                          {msg.text && (
                            <p className="text-xs text-stone-200 whitespace-pre-wrap break-words leading-relaxed pl-8">
                              {msg.text}
                            </p>
                          )}

                          {safeSrc(msg.imageUrl) && (
                            <div className="pl-8 pt-1">
                              <img
                                src={safeSrc(msg.imageUrl)}
                                alt="Archived chat attachment"
                                className="max-h-40 rounded-xl border border-white/10 object-cover"
                              />
                            </div>
                          )}

                          {msg.attachment && (
                            <div className="ml-8 p-2 rounded-xl bg-stone-950/70 border border-white/10 inline-flex items-center gap-2 text-[11px] text-stone-300">
                              <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="font-semibold">{msg.attachment.name}</span>
                              <span className="text-stone-500 font-mono">
                                ({msg.attachment.size})
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
