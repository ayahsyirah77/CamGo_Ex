import React, { useState, useRef, useEffect } from 'react';
import { LoungePost, Language } from '../types';
import { getTranslation } from '../services/i18n';
import { firebaseService, UserProfile } from '../services/firebase';
import {
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  Send,
  Plus,
  X,
  Sparkles,
  ExternalLink,
  Link2,
  ArrowUp,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface UserLoungeProps {
  posts: LoungePost[];
  language: Language;
  currentUser: UserProfile | null;
  onPostUpdate: () => void;
  onClose?: () => void;
}

/**
 * Parses plain text and renders detected URLs as safe, interactive clickable links
 */
const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-emerald-400 hover:text-emerald-300 underline font-medium inline-flex items-center gap-0.5 break-all hover:bg-emerald-950/40 px-1 py-0.5 rounded transition-colors"
        >
          <span>{part}</span>
          <ExternalLink className="w-3 h-3 inline-block shrink-0" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const UserLounge: React.FC<UserLoungeProps> = ({
  posts,
  language,
  currentUser,
  onPostUpdate,
  onClose,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [isPosting, setIsPosting] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postTag, setPostTag] = useState<LoungePost['tag']>('Traffic');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [guestName, setGuestName] = useState(() => {
    try {
      return localStorage.getItem('camgo_guest_name') || '';
    } catch {
      return '';
    }
  });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Quick bottom chat bar state
  const [quickMessage, setQuickMessage] = useState('');
  const [quickTag, setQuickTag] = useState<LoungePost['tag']>('Traffic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomChatInputRef = useRef<HTMLInputElement>(null);

  // Connection Status State
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const tags: Array<string> = ['all', 'Traffic', 'Weather', 'Tips', 'Food', 'Question'];

  const filteredPosts = posts.filter((p) => {
    if (filter === 'all') return true;
    return (p.tag || '').toLowerCase() === filter.toLowerCase();
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 240) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpvote = async (id: string) => {
    await firebaseService.upvoteLoungePost(id);
    onPostUpdate();
  };

  const handleDeletePost = async (id: string) => {
    const confirmMsg =
      language === 'bm'
        ? 'Adakah anda pasti ingin memadam siaran ini?'
        : 'Are you sure you want to delete this community post?';
    if (window.confirm(confirmMsg)) {
      await firebaseService.deleteLoungePost(id);
      onPostUpdate();
    }
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const cleanUrl = linkUrl.trim().startsWith('http') || linkUrl.trim().startsWith('www.')
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;
    setPostContent((prev) => (prev ? `${prev} ${cleanUrl} ` : `${cleanUrl} `));
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setIsSubmitting(true);
    const author =
      currentUser?.displayName ||
      currentUser?.fullName ||
      guestName.trim() ||
      (language === 'bm' ? 'Pengembara Tanah Tinggi' : 'Highland Explorer');

    if (guestName.trim()) {
      try {
        localStorage.setItem('camgo_guest_name', guestName.trim());
      } catch {
        // ignore storage error
      }
    }

    try {
      await firebaseService.addLoungePost({
        authorName: author,
        authorRole: currentUser?.role === 'admin' ? 'Admin' : 'Visitor',
        authorAvatar:
          currentUser?.photoURL ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(author)}`,
        content: postContent.trim(),
        tag: postTag,
        image: postImageUrl.trim() || undefined,
      });

      setPostContent('');
      setPostImageUrl('');
      setShowImageInput(false);
      setShowLinkInput(false);
      setIsPosting(false);
      onPostUpdate();
      setTimeout(() => {
        scrollToTop();
      }, 80);
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const author =
      currentUser?.displayName ||
      currentUser?.fullName ||
      guestName.trim() ||
      (language === 'bm' ? 'Pengembara Tanah Tinggi' : 'Highland Explorer');

    if (guestName.trim()) {
      try {
        localStorage.setItem('camgo_guest_name', guestName.trim());
      } catch {
        // ignore
      }
    }

    const assignedTag = filter !== 'all' ? (filter as LoungePost['tag']) : quickTag;

    try {
      await firebaseService.addLoungePost({
        authorName: author,
        authorRole: currentUser?.role === 'admin' ? 'Admin' : 'Visitor',
        authorAvatar:
          currentUser?.photoURL ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(author)}`,
        content: quickMessage.trim(),
        tag: assignedTag,
      });

      setQuickMessage('');
      onPostUpdate();
      setTimeout(() => {
        scrollToTop();
      }, 80);
    } catch (err) {
      console.error('Failed to send quick message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (postId: string) => {
    if (!replyText.trim()) return;

    const author =
      currentUser?.displayName ||
      currentUser?.fullName ||
      guestName.trim() ||
      (language === 'bm' ? 'Pengunjung Tanah Tinggi' : 'Highland Visitor');

    if (guestName.trim()) {
      try {
        localStorage.setItem('camgo_guest_name', guestName.trim());
      } catch {
        // ignore
      }
    }

    await firebaseService.addLoungeReply(
      postId,
      replyText.trim(),
      author
    );
    setReplyText('');
    setActiveReplyPostId(null);
    onPostUpdate();
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'ayahsyirah77@gmail.com';

  return (
    <div className="flex flex-col h-full max-h-[92vh] sm:max-h-[88vh] bg-stone-900 text-stone-100 overflow-hidden" id="chat-lounge">
      {/* 1. Sticky Header Section */}
      <div className="shrink-0 bg-stone-900/98 backdrop-blur-md border-b border-white/10 px-4 pt-4 pb-3 sm:px-6 z-20">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <MessageSquare className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  {language === 'bm' ? 'SEMBANG KOMUNITI' : 'HIGHLANDS LIVE LOUNGE'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                  isOnline 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  </span>
                  <span>{isOnline ? (language === 'bm' ? 'Sambungan Online' : 'Online Connected') : (language === 'bm' ? 'Menyambung Semula...' : 'Reconnecting...')}</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-heading font-extrabold text-stone-100 tracking-tight leading-tight">
                {getTranslation(language, 'lounge_title')}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPosting((prev) => !prev);
                if (!isPosting) {
                  setTimeout(() => scrollToTop(), 50);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 cursor-pointer shrink-0"
              title="Create new post"
            >
              {isPosting ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isPosting ? (language === 'bm' ? 'Tutup' : 'Close') : (language === 'bm' ? 'Kongsi Info' : 'New Post')}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                title="Close Lounge"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tag Filters Bar (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap capitalize transition-all cursor-pointer text-xs ${
                filter === t
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-stone-800/80 text-stone-400 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              {t === 'all' ? (language === 'bm' ? 'Semua' : 'All') : t}
            </button>
          ))}
          <span className="text-[10px] text-stone-500 font-mono ml-auto pl-2 shrink-0">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>
      </div>

      {/* 2. Scrollable Posts Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4 overscroll-contain [scrollbar-width:thin] [scrollbar-color:#059669_transparent]"
      >
        {/* Full Post Composer Drawer */}
        {isPosting && (
          <div className="glass-panel p-4 sm:p-5 rounded-3xl bg-stone-900/98 border border-emerald-500/40 shadow-2xl animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bm' ? 'Kongsi Keadaan Semasa' : 'Share Real-time Update'}</span>
              </h4>
              <button
                onClick={() => setIsPosting(false)}
                className="p-1 rounded-full text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              {!currentUser && (
                <div>
                  <label className="text-[11px] font-bold text-stone-300 block mb-1">
                    {language === 'bm' ? 'Nama / Gelaran Anda' : 'Your Nickname / Name'}
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. CameronTraveler99"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <textarea
                  required
                  rows={3}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder={getTranslation(language, 'lounge_post_placeholder')}
                  className="w-full p-3.5 rounded-2xl bg-stone-950 border border-white/10 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action toolbars: Link & Image */}
              <div className="space-y-2">
                {showLinkInput && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-emerald-500/30">
                    <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type="url"
                      placeholder="Paste URL (e.g. https://maps.google.com or article link)"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleInsertLink();
                        }
                      }}
                      className="flex-1 px-2 py-1 bg-transparent text-xs text-stone-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleInsertLink}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Insert
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkInput(false);
                        setLinkUrl('');
                      }}
                      className="p-1 text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {showImageInput && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-teal-500/30">
                    <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
                    <input
                      type="url"
                      placeholder="Image URL (e.g. https://images.unsplash.com/... or uploaded photo link)"
                      value={postImageUrl}
                      onChange={(e) => setPostImageUrl(e.target.value)}
                      className="flex-1 px-2 py-1 bg-transparent text-xs text-stone-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImageInput(false)}
                      className="p-1 text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs">
                  {!showLinkInput && (
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(true)}
                      className="inline-flex items-center gap-1.5 text-stone-400 hover:text-emerald-400 font-semibold cursor-pointer transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Attach Web Link / Map URL</span>
                    </button>
                  )}
                  {!showImageInput && (
                    <button
                      type="button"
                      onClick={() => setShowImageInput(true)}
                      className="inline-flex items-center gap-1.5 text-stone-400 hover:text-teal-400 font-semibold cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Attach Image URL</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tag selector & Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-stone-400 font-bold">Channel:</label>
                  <select
                    value={postTag}
                    onChange={(e) => setPostTag(e.target.value as LoungePost['tag'])}
                    className="px-2.5 py-1 rounded-xl bg-stone-950 border border-white/10 text-xs text-emerald-400 font-bold outline-none cursor-pointer"
                  >
                    <option value="Traffic">Traffic & Road</option>
                    <option value="Weather">Microclimate / Weather</option>
                    <option value="Food">Food & Steamboat</option>
                    <option value="Tips">Travel Tips</option>
                    <option value="Question">Question</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPosting(false)}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-xs cursor-pointer hover:bg-stone-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Posting...' : getTranslation(language, 'lounge_post_btn')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Posts Stream */}
        {filteredPosts.length === 0 ? (
          <div className="p-8 sm:p-10 text-center rounded-3xl bg-stone-900/60 border border-white/5 space-y-3">
            <MessageSquare className="w-10 h-10 text-emerald-500/40 mx-auto" />
            <h4 className="text-base font-bold text-stone-200">
              {language === 'bm' ? 'Tiada siaran dalam kategori ini' : 'No updates in this channel yet'}
            </h4>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              {language === 'bm'
                ? 'Jadilah yang pertama untuk berkongsi info jalan raya, tip cuaca atau restoran dengan komuniti pelancong!'
                : 'Be the first to share traffic conditions, weather tips, or restaurant recommendations with travelers!'}
            </p>
            <button
              onClick={() => setIsPosting(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {language === 'bm' ? 'Kongsi Info Sekarang' : 'Start Discussion'}
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 pb-2">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="glass-card-hover rounded-3xl p-4 sm:p-5 bg-stone-900/90 border border-white/10 space-y-3 shadow-sm hover:border-emerald-500/30 transition-all"
              >
                {/* Author row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-950/60 p-3 sm:p-3.5 rounded-2xl border border-white/5">
                  <div className="flex flex-col items-center justify-center text-center sm:flex-row sm:items-center sm:text-left gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* Circle Avatar Container */}
                    <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-500 shadow-md shrink-0 flex items-center justify-center overflow-hidden bg-stone-950">
                      <img
                        src={post.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                        alt={post.authorName}
                        className="w-full h-full rounded-full object-cover bg-stone-950 shrink-0"
                      />
                    </div>
                    {/* User's name & role */}
                    <div className="flex flex-col items-center sm:items-start min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                        <span className="text-sm font-bold text-stone-100">{post.authorName}</span>
                        {post.authorRole && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-emerald-400 font-semibold border border-emerald-500/20">
                            {post.authorRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono mt-0.5">{post.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center sm:justify-end gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      #{post.tag || 'General'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer"
                        title="Delete post (Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post content with clickable links */}
                <div className="text-xs sm:text-sm text-stone-200 leading-relaxed pl-2 sm:pl-12 whitespace-pre-wrap">
                  {renderTextWithLinks(post.content)}
                </div>

                {/* Attached Image preview if any */}
                {post.image && (
                  <div className="pl-2 sm:pl-12 pt-1">
                    <img
                      src={post.image}
                      alt="Attachment"
                      className="max-h-64 rounded-2xl object-cover border border-white/10 shadow-md"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Actions: Upvote & Reply */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 pl-2 sm:pl-12 text-xs text-stone-400">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleUpvote(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                        post.hasUpvoted ? 'text-emerald-400' : 'hover:text-white'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${post.hasUpvoted ? 'fill-emerald-400' : ''}`} />
                      <span>{post.upvotes || 0} {language === 'bm' ? 'Bermanfaat' : 'Helpful'}</span>
                    </button>

                    <button
                      onClick={() =>
                        setActiveReplyPostId(activeReplyPostId === post.id ? null : post.id)
                      }
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.repliesCount || post.replies?.length || 0} {language === 'bm' ? 'Balasan' : 'Replies'}</span>
                    </button>
                  </div>
                </div>

                {/* Existing replies (scrollable if many) */}
                {post.replies && post.replies.length > 0 && (
                  <div className="pl-2 sm:pl-12 space-y-2 pt-1 max-h-60 overflow-y-auto pr-1 overscroll-contain">
                    {post.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-3 rounded-2xl bg-stone-950/70 border border-white/5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-stone-400">
                          <span className="font-bold text-stone-200">{reply.authorName}</span>
                          <span className="text-[10px] font-mono">{reply.timestamp}</span>
                        </div>
                        <div className="text-stone-300 whitespace-pre-wrap">
                          {renderTextWithLinks(reply.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Box */}
                {activeReplyPostId === post.id && (
                  <div className="pl-2 sm:pl-12 pt-2 space-y-2">
                    {!currentUser && !guestName && (
                      <input
                        type="text"
                        placeholder="Your name / nickname..."
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full sm:w-60 px-3 py-1.5 rounded-xl bg-stone-950 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500"
                      />
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a helpful response (links work automatically)..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendReply(post.id);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleSendReply(post.id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shrink-0"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Bottom Quick Chat Bar (Instant Send) */}
      <div className="shrink-0 bg-stone-900/98 border-t border-white/10 px-3 py-2.5 sm:px-6 z-20 backdrop-blur-md">
        <form onSubmit={handleQuickSend} className="space-y-1.5">
          <div className="flex items-center gap-2">
            {!currentUser && !guestName && (
              <input
                type="text"
                placeholder="Nickname"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-24 sm:w-32 px-2.5 py-2 rounded-xl bg-stone-950 border border-white/10 text-xs text-stone-200 outline-none focus:border-emerald-500 shrink-0"
              />
            )}
            <div className="relative flex-1">
              <input
                ref={bottomChatInputRef}
                type="text"
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                placeholder={
                  filter !== 'all'
                    ? (language === 'bm' ? `Tulis mesej di #${filter}...` : `Message in #${filter}...`)
                    : (language === 'bm' ? 'Tulis mesej atau tanya keadaan semasa...' : 'Send message or ask live condition...')
                }
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-stone-950 border border-white/10 text-xs text-stone-100 placeholder:text-stone-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                disabled={!quickMessage.trim() || isSubmitting}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 disabled:hover:bg-emerald-600 cursor-pointer transition-colors"
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{language === 'bm' ? 'Disiarkan terus ke ruang sembang komuniti' : 'Broadcasting live across Cameron Highlands'}</span>
            </span>
            <span className="text-[10px] text-stone-500 font-mono">
              {currentUser?.displayName || guestName || 'Guest'}
            </span>
          </div>
        </form>
      </div>

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-20 right-5 z-30 p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl border border-emerald-400/30 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-in fade-in"
          title="Scroll to Top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
