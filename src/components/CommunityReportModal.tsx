/**
 * Community Report Submission Modal / Drawer
 * Enhanced with Live GPS Coordinates capture, manual lat/lng inputs,
 * multimedia image attachment (with compression), and detailed incident info.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  X,
  Send,
  Loader2,
  CheckCircle2,
  MapPin,
  Camera,
  Navigation,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { Language, CamgoHazard, CamgoHazardType } from '../types';
import { camgoHazardsService } from '../services/camgoHazardsService';
import { firebaseService } from '../services/firebase';

interface CommunityReportModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const compressImageFile = (
  file: File,
  maxWidth = 800,
  quality = 0.65
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(src);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });

const CAMERON_GPS_HUBS = [
  { name: 'Tanah Rata', lat: 4.4715, lng: 101.3805 },
  { name: 'Brinchang', lat: 4.4905, lng: 101.3892 },
  { name: 'Kea Farm', lat: 4.5078, lng: 101.4088 },
  { name: 'Ringlet', lat: 4.4128, lng: 101.3812 },
  { name: 'Habu', lat: 4.4472, lng: 101.3838 },
  { name: 'Tringkap', lat: 4.5122, lng: 101.4215 },
  { name: 'Kuala Terla', lat: 4.5422, lng: 101.4182 },
  { name: 'Kampung Raja', lat: 4.5668, lng: 101.4112 },
  { name: 'Bertam Valley', lat: 4.4178, lng: 101.3985 },
  { name: 'Blue Valley', lat: 4.5888, lng: 101.4215 },
];

const resolveNearestCameronArea = (latitude: number, longitude: number): string => {
  let nearest = CAMERON_GPS_HUBS[0].name;
  let minSqDist = Infinity;
  for (const hub of CAMERON_GPS_HUBS) {
    const dLat = latitude - hub.lat;
    const dLng = longitude - hub.lng;
    const sqDist = dLat * dLat + dLng * dLng;
    if (sqDist < minSqDist) {
      minSqDist = sqDist;
      nearest = hub.name;
    }
  }
  return minSqDist < 0.04 ? `Near ${nearest}` : 'Cameron Highlands';
};

export const CommunityReportModal: React.FC<CommunityReportModalProps> = ({
  language,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [hazardType, setHazardType] = useState<CamgoHazardType>('landslide');
  const [severity, setSeverity] = useState<'low' | 'moderate' | 'high' | 'critical'>('high');
  const [titleInput, setTitleInput] = useState<string>('');

  // Precise Location Sharing (Get Current GPS)
  const [lat, setLat] = useState<number>(4.4734);
  const [lng, setLng] = useState<number>(101.3787);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Multimedia Support (Image Attachment)
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageUploading, setImageUploading] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  if (!isOpen) return null;

  const handleCaptureGps = () => {
    setIsLocating(true);
    setGpsStatus(null);
    if (!('geolocation' in navigator)) {
      setGpsStatus({
        type: 'error',
        text:
          language === 'bm'
            ? 'Geolocation tidak disokong oleh pelayar anda.'
            : 'Geolocation not supported by browser.',
      });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);
        setIsLocating(false);
        const area = resolveNearestCameronArea(nextLat, nextLng);
        setGpsStatus({
          type: 'success',
          text:
            language === 'bm'
              ? `GPS dikesan: ${area} (${nextLat.toFixed(5)}, ${nextLng.toFixed(5)})`
              : `GPS locked: ${area} (${nextLat.toFixed(5)}, ${nextLng.toFixed(5)})`,
        });
      },
      (err) => {
        console.warn('Geolocation capture warning:', err);
        setIsLocating(false);
        setGpsStatus({
          type: 'error',
          text:
            language === 'bm'
              ? 'Gagal mendapatkan GPS semasa. Menggunakan koordinat lalai Cameron Highlands.'
              : 'Failed to capture GPS. Using default Cameron Highlands coordinates.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
    } catch (err) {
      console.warn('Image compression warning:', err);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = titleInput.trim();
    if (!finalTitle) return;

    setIsSubmitting(true);
    try {
      const currentUser = firebaseService.getCurrentUser();
      const author = currentUser?.displayName || currentUser?.email || 'CamGo Community Driver';
      const hazardId = 'comm-rep-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const nowIso = new Date().toISOString();
      const areaLabel = resolveNearestCameronArea(lat, lng);
      const gpsLocation = `${areaLabel} (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      const autoSummary = `${finalTitle} • ${gpsLocation}`;

      const newHazard: CamgoHazard & { imageUrl?: string; status: 'active' } = {
        id: hazardId,
        title: finalTitle,
        titleBm: finalTitle,
        description: autoSummary,
        descriptionBm: autoSummary,
        type: hazardType,
        severity,
        location: gpsLocation,
        corridor: 'central_highlands',
        milestoneKm: null,
        lat,
        lng,
        source: `Community Report • ${author}`,
        status: 'active',
        stillThereVotes: 1,
        clearedVotes: 0,
        isProvisional: false,
        extractionMethod: 'deterministic_nlp_fallback',
        timestamp: nowIso,
        updatedAt: nowIso,
        imageUrl: imageUrl || undefined,
      };

      await camgoHazardsService.upsertActiveHazard(newHazard as CamgoHazard);

      setIsSubmitting(false);
      setSuccessMessage(true);
      setTitleInput('');
      setImageUrl('');
      setGpsStatus(null);

      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMessage(false);
        onClose();
      }, 2200);
    } catch (err) {
      console.error('[CommunityReportModal] Submission error:', err);
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-stone-900 border-2 border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-stone-100 relative overflow-hidden backdrop-blur-xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-stone-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base sm:text-lg text-white">
                {language === 'bm' ? 'Laporan Komuniti / Insiden' : 'Enhanced Community Incident Report'}
              </h3>
              <p className="text-[11px] text-stone-400">
                {language === 'bm'
                  ? 'Kongsi status trafik, koordinat GPS tepat & bukti foto'
                  : 'Share real-time traffic, precise GPS coordinates & photo evidence'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {successMessage ? (
            <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-white text-base">
                {language === 'bm' ? 'Laporan Disiarkan Secara Langsung!' : 'Incident Posted Live!'}
              </h4>
              <p className="text-xs text-stone-300">
                {language === 'bm'
                  ? 'Laporan insiden anda kini disiarkan terus ke peta & penanda trafik CamGo.'
                  : 'Your incident report is now live on the Cameron Highlands map and community ticker.'}
              </p>
            </div>
          ) : (
            <>
              {/* Incident Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">
                  {language === 'bm' ? 'Jenis Insiden / Kategori' : 'Incident Category'}
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      { id: 'landslide', label: language === 'bm' ? 'Tanah Runtuh' : 'Landslide' },
                      { id: 'accident', label: language === 'bm' ? 'Kemalangan' : 'Accident' },
                      { id: 'fallen_tree', label: language === 'bm' ? 'Pokok Tumbang' : 'Fallen Tree' },
                      { id: 'roadblock', label: language === 'bm' ? 'Sekatan Trafik' : 'Roadblock' },
                      { id: 'flood', label: language === 'bm' ? 'Takungan Air' : 'Flood / Water' },
                      { id: 'sudden_congestion', label: language === 'bm' ? 'Kesesakan / Lain' : 'Congestion / Other' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHazardType(item.id as CamgoHazardType)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer truncate ${
                        hazardType === item.id
                          ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-sm'
                          : 'bg-stone-950/60 border-white/10 text-stone-400 hover:border-white/20'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">
                    {language === 'bm' ? 'Tajuk Ringkas' : 'Incident Title'}
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder={language === 'bm' ? 'Contoh: Pokok tumbang di Kea Farm' : 'e.g. Fallen tree near Kea Farm'}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-white/15 text-xs text-white focus:border-emerald-400 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">
                    {language === 'bm' ? 'Tahap Keterukan' : 'Severity'}
                  </label>
                  <select
                    value={severity}
                    onChange={(e: any) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-white/15 text-xs text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="low">Low / Smooth</option>
                    <option value="moderate">Moderate / Caution</option>
                    <option value="high">High / Major Delay</option>
                    <option value="critical">Critical / Blocked</option>
                  </select>
                </div>
              </div>

              {/* Location Sharing: GPS Capture & Lat/Lng */}
              <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'bm' ? 'Perkongsian Lokasi GPS Peta' : 'Precise GPS Coordinates'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={isLocating}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    <span>{language === 'bm' ? 'Guna GPS Semasa' : 'Get Current GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400">Latitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 4.4734)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-white/10 font-mono text-xs text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400">Longitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 101.3787)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-white/10 font-mono text-xs text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {gpsStatus && (
                  <div
                    className={`px-3 py-2 rounded-xl text-[11px] font-medium border ${
                      gpsStatus.type === 'success'
                        ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {gpsStatus.text}
                  </div>
                )}
              </div>

              {/* Multimedia Support: Image Upload & Preview */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
                  <span>{language === 'bm' ? 'Lampiran Foto (Bukti Visual)' : 'Multimedia Evidence (Image Attach)'}</span>
                  <span className="text-[10px] text-stone-400 font-mono">Optional</span>
                </label>

                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-stone-950 h-32 flex items-center justify-center">
                    <img src={imageUrl} alt="Incident Evidence" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 hover:bg-red-600 text-stone-200 hover:text-white transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/20 hover:border-emerald-400/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 bg-stone-950/60 cursor-pointer transition-colors group">
                    <div className="p-2 rounded-xl bg-stone-900 text-stone-400 group-hover:text-emerald-400 transition-colors">
                      {imageUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </div>
                    <span className="text-xs font-semibold text-stone-300 group-hover:text-white">
                      {language === 'bm' ? 'Klik untuk muat naik foto insiden' : 'Click to attach photo evidence'}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">JPEG, PNG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !titleInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{language === 'bm' ? 'Menghantar Laporan...' : 'Submitting Report...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{language === 'bm' ? 'Siarkan Laporan Insiden' : 'Post Live Incident'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
};
