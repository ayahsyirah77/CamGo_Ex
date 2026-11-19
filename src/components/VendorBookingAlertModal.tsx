import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BellRing,
  CheckCircle2,
  Phone,
  Mail,
  Calendar,
  FileCheck2,
  ExternalLink,
  Volume2,
  ShieldCheck,
  Store,
  Check,
  Clock,
  Smartphone,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { VendorBookingAlert } from '../types';
import { firebaseService, UserProfile } from '../services/firebase';
import { pushNotificationService } from '../services/pushNotificationService';
import { safeSrc } from '../utils/safeMedia';

interface VendorBookingAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: VendorBookingAlert[];
  currentUser: UserProfile | null;
  onOpenVendorDashboard?: () => void;
}

export const VendorBookingAlertModal: React.FC<VendorBookingAlertModalProps> = ({
  isOpen,
  onClose,
  alerts,
  currentUser,
  onOpenVendorDashboard,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [statusNote, setStatusNote] = useState<string | null>(null);

  if (!isOpen) return null;

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const displayedAlerts = filterMode === 'unread' ? alerts.filter((a) => !a.isRead) : alerts;

  const handleEnablePhoneAlerts = async () => {
    const res = await pushNotificationService.requestPermission();
    setPermissionState(res.permission);
    if (res.success) {
      setStatusNote('Phone push notifications & sound chimes are active.');
      await pushNotificationService.dispatchNotification({
        title: 'CamGo Vendor Alerts Active',
        body: 'You will now receive instant phone notifications whenever a guest pays a deposit.',
        tag: `vendor-test-${Date.now()}`,
        url: '/',
      });
    } else {
      setStatusNote(
        res.error ||
          'Browser notifications are blocked or unsupported. In-app banner & alert chimes remain active.'
      );
    }
    setTimeout(() => setStatusNote(null), 5000);
  };

  const handleMarkAllRead = async () => {
    await firebaseService.markAllVendorBookingAlertsRead(currentUser?.email, currentUser?.uid);
  };

  const handleStatusChange = async (id: string, status: VendorBookingAlert['status']) => {
    await firebaseService.updateVendorBookingAlertStatus(id, status);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-5 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-3xl bg-stone-950 border border-amber-500/40 shadow-2xl overflow-hidden text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-900/95 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
              <BellRing className={`w-5 h-5 sm:w-6 sm:h-6 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-heading font-black text-white truncate">
                  Vendor Payment &amp; Booking Alerts
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                Instant guest deposit alerts, full contact details &amp; payment proof
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close alerts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phone Push & Control Bar */}
        <div className="px-4 py-3 bg-stone-900/60 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleEnablePhoneAlerts}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                permissionState === 'granted'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400 shadow-md'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {permissionState === 'granted' ? 'Phone Alerts Active (Test)' : 'Enable Phone & Sound Alerts'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => pushNotificationService.playChime('incoming')}
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Play notification chime"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Chime</span>
            </button>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="inline-flex rounded-xl bg-stone-950 p-1 border border-stone-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  filterMode === 'all' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                All ({alerts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unread')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  filterMode === 'unread' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer border border-stone-700"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {statusNote && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusNote}</span>
          </div>
        )}

        {/* Scrollable Alerts Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
          {displayedAlerts.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3 rounded-2xl bg-stone-900/50 border border-stone-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <BellRing className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-white">
                  {filterMode === 'unread' ? 'No Unread Booking Alerts' : 'No Paid Bookings Received Yet'}
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Whenever a guest fills in details, selects payment, uploads proof of payment, and pays the deposit, their alert, contact details, and receipt appear here instantly with a phone notification.
                </p>
              </div>
            </div>
          ) : (
            displayedAlerts.map((alert) => {
              const cleanGuestWa = (alert.guestPhone || '').replace(/\D/g, '');
              const waMessage = `Hi ${alert.guestName}, we received your booking ${alert.bookingCode} (${alert.itemSummary}) and deposit of RM${alert.depositPaidRm} via CamGo. Looking forward to hosting you!`;
              const hasImageProof =
                Boolean(alert.paymentProofUrl) &&
                (alert.paymentProofUrl!.startsWith('data:image') ||
                  /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(alert.paymentProofUrl!) ||
                  alert.paymentProofUrl!.includes('firebasestorage'));

              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    if (!alert.isRead) {
                      firebaseService.markVendorBookingAlertRead(alert.id);
                    }
                  }}
                  className={`rounded-2xl p-4 border transition-all space-y-3 ${
                    !alert.isRead
                      ? 'bg-gradient-to-br from-amber-950/35 via-stone-900 to-stone-950 border-amber-500/50 shadow-lg shadow-amber-950/20'
                      : 'bg-stone-900/70 border-stone-800'
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!alert.isRead && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                            New Paid Alert
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                          {alert.bookingType === 'accommodation' ? 'Homestay RM30 Lock' : 'Motorbike Rental'}
                        </span>
                        <span className="font-mono text-xs font-black text-amber-300">{alert.bookingCode}</span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-white truncate">
                        {alert.vendorName} — {alert.itemSummary}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-emerald-400">
                        Paid RM {alert.depositPaidRm}
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Guest & Payment Details Grid */}
                  <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-stone-400 block">Guest Details</span>
                      <p className="font-bold text-white">{alert.guestName}</p>
                      <p className="text-emerald-300 font-mono flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span>{alert.guestPhone}</span>
                      </p>
                      {alert.guestEmail && (
                        <p className="text-stone-400 flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{alert.guestEmail}</span>
                        </p>
                      )}
                      <p className="text-stone-300 flex items-center gap-1.5 pt-0.5">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>
                          {alert.checkInOrStart} → {alert.checkOutOrEnd}
                        </span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-stone-400 block">
                        Payment &amp; Proof
                      </span>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Gateway:</span>
                        <span className="font-bold text-white uppercase">{alert.paymentGateway}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Total / Balance:</span>
                        <span className="font-bold text-amber-300">
                          RM {alert.totalAmountRm} (Due: RM {alert.balanceDueRm})
                        </span>
                      </div>
                      {alert.paymentReference && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">Ref ID:</span>
                          <span className="font-mono text-emerald-300 truncate max-w-[160px]">
                            {alert.paymentReference}
                          </span>
                        </div>
                      )}

                      {alert.paymentProofUrl ? (
                        <div className="pt-1 flex items-center gap-2">
                          {hasImageProof ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewProofUrl(alert.paymentProofUrl || null);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>View Payment Receipt</span>
                            </button>
                          ) : (
                            <a
                              href={alert.paymentProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>{alert.paymentProofName || 'Open Proof of Payment'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-400 italic">
                          {alert.paymentReference
                            ? 'Verified via transaction reference'
                            : 'Digital gateway confirmation logged'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                    <span className="text-[11px] font-mono uppercase text-stone-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Status: <strong className="text-white">{alert.status}</strong>
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {cleanGuestWa && (
                        <a
                          href={`https://wa.me/${cleanGuestWa}?text=${encodeURIComponent(waMessage)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp Guest</span>
                        </a>
                      )}

                      {alert.status !== 'confirmed' && alert.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(alert.id, 'confirmed');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Booking</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-800 bg-stone-900/95 flex items-center justify-between gap-3 shrink-0">
          {onOpenVendorDashboard ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVendorDashboard();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Open Vendor Dashboard</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Proof of Payment Lightbox */}
      {previewProofUrl && (
        <div
          className="fixed inset-0 z-[170] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setPreviewProofUrl(null)}
        >
          <div
            className="relative max-w-xl w-full bg-stone-900 border border-emerald-500/40 rounded-3xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase">Proof of Payment Receipt</span>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="p-1.5 rounded-full bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={safeSrc(previewProofUrl)}
              alt="Proof of Payment"
              className="w-full max-h-[70dvh] object-contain rounded-2xl bg-stone-950"
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
