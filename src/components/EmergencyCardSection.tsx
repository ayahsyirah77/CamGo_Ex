import React, { useState, useEffect } from 'react';
import { EmergencyCard, Language } from '../types';
import { firebaseService, DEFAULT_EMERGENCY_CARD } from '../services/firebase';
import {
  ShieldAlert,
  Heart,
  AlertTriangle,
  Pill,
  PhoneCall,
  Save,
  CheckCircle,
  Copy,
  Smartphone,
  Droplet,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface EmergencyCardSectionProps {
  language: Language;
  onSaved?: () => void;
}

export const EmergencyCardSection: React.FC<EmergencyCardSectionProps> = ({
  language,
  onSaved,
}) => {
  const [card, setCard] = useState<EmergencyCard>(() => firebaseService.getEmergencyCard());
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedNote, setCopiedNote] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setCard(firebaseService.getEmergencyCard());
    };
    handleUpdate();
    window.addEventListener('emergency-card-updated', handleUpdate);
    window.addEventListener('user-profile-updated', handleUpdate);
    return () => {
      window.removeEventListener('emergency-card-updated', handleUpdate);
      window.removeEventListener('user-profile-updated', handleUpdate);
    };
  }, []);

  const handleChange = (field: keyof EmergencyCard, value: any) => {
    setCard((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePrimaryContactChange = (field: string, value: string) => {
    setCard((prev) => {
      const primary = prev?.primaryContact || DEFAULT_EMERGENCY_CARD.primaryContact;
      return {
        ...prev,
        primaryContact: {
          ...primary,
          [field]: value,
        },
        designatedSosNumber:
          prev.designatedSosNumber === primary.phone ? value : prev.designatedSosNumber || value,
      };
    });
  };

  const handleSecondaryContactChange = (field: string, value: string) => {
    setCard((prev) => {
      const secondary = prev?.secondaryContact || DEFAULT_EMERGENCY_CARD.secondaryContact;
      return {
        ...prev,
        secondaryContact: {
          ...secondary,
          [field]: value,
        },
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await firebaseService.saveEmergencyCard(card);
      setSuccessMessage(
        language === 'bm'
          ? 'Kad Kecemasan Perubatan & Kenalan ICE berjaya disimpan!'
          : 'Emergency Medical Card & ICE Contacts saved successfully!'
      );
      if (onSaved) onSaved();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch {
      window.alert('Error saving emergency card. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyDigitalSummary = () => {
    const summary = [
      `🚨 EMERGENCY MEDICAL INFO / KAD KECEMASAN 🚨`,
      `Name: ${card.fullLegalName}${card.preferredName ? ` (${card.preferredName})` : ''}`,
      `DOB: ${card.dateOfBirth} | Blood Type: ${card.bloodType}`,
      `⚠️ Severe Allergies: ${card.severeAllergies || 'None declared'}`,
      `🏥 Chronic Conditions: ${card.chronicConditions || 'None declared'}`,
      `💊 Current Medications: ${card.currentMedications || 'None'}`,
      `📞 ICE 1 (Primary): ${card.primaryContact.name} (${card.primaryContact.relationship}) - ${card.primaryContact.phone}`,
      `📞 ICE 2 (Secondary): ${card.secondaryContact.name} (${card.secondaryContact.relationship}) - ${card.secondaryContact.phone}`,
    ].join('\n');

    navigator.clipboard.writeText(summary);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-red-950/80 via-stone-900 to-rose-950/50 border border-red-500/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-heading font-black text-white tracking-wide">
                  Emergency Medical Card (ICE)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-mono font-bold uppercase">
                  In Case of Emergency
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                {language === 'bm'
                  ? 'Isi profil perubatan dan kenalan kecemasan anda. Apabila butang widget SOS ditekan, maklumat penting ini bersama koordinat GPS langsung akan dihantar secara automatik ke nombor pilihan anda.'
                  : 'Complete your medical profile and emergency contacts. When the SOS button is tapped, this vital data and your exact GPS coordinates are dispatched instantly to your designated contact.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyDigitalSummary}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-semibold cursor-pointer transition-colors shadow-sm shrink-0"
            title="Copy text summary for lock screen or notes"
          >
            {copiedNote ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied Summary</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-stone-400" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>

        {/* User Note Banner: Digital Access Lock Screen Advice */}
        <div className="mt-4 p-3.5 rounded-2xl bg-stone-950/80 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
          <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block mb-0.5">
              📱 Digital Access &amp; Lock Screen Tip:
            </span>
            If making a digital lock screen wallpaper for your phone, include your emergency info and contact numbers directly on the lock screen image so it can be viewed by first responders without unlocking the phone.
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Personal Identification */}
        <div className="p-5 sm:p-6 rounded-3xl glass-panel bg-stone-900/80 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <User className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-stone-100 text-sm tracking-wide">
              1. Personal Identification
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Full Legal Name <span className="text-stone-400 font-normal">(And preferred name, if different)</span> *
              </label>
              <input
                type="text"
                required
                value={card.fullLegalName}
                onChange={(e) => handleChange('fullLegalName', e.target.value)}
                placeholder="e.g., Kassim Selamat"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-white/10 text-stone-100 placeholder-stone-500 text-sm focus:border-red-500/50 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Preferred Name / Nickname
              </label>
              <input
                type="text"
                value={card.preferredName || ''}
                onChange={(e) => handleChange('preferredName', e.target.value)}
                placeholder="e.g., Kassim"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-white/10 text-stone-100 placeholder-stone-500 text-sm focus:border-red-500/50 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                <span>Date of Birth *</span>
              </label>
              <input
                type="date"
                required
                value={card.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-sm focus:border-red-500/50 outline-none transition-colors font-mono"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Important for medical identification and drug dosage calculations.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-red-400" />
                <span>Blood Type *</span>
              </label>
              <select
                value={card.bloodType}
                onChange={(e) => handleChange('bloodType', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-sm focus:border-red-500/50 outline-none transition-colors font-bold"
              >
                <option value="O+">O+ (O Positive)</option>
                <option value="A+">A+ (A Positive)</option>
                <option value="B+">B+ (B Positive)</option>
                <option value="AB+">AB+ (AB Positive)</option>
                <option value="O-">O- (O Negative - Universal Donor)</option>
                <option value="A-">A- (A Negative)</option>
                <option value="B-">B- (B Negative)</option>
                <option value="AB-">AB- (AB Negative)</option>
                <option value="Unknown">Unknown / Not Tested</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Critical Medical Information */}
        <div className="p-5 sm:p-6 rounded-3xl glass-panel bg-stone-900/80 border border-red-500/20 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Heart className="w-4 h-4 text-red-400" />
            <h4 className="font-bold text-stone-100 text-sm tracking-wide">
              2. Critical Medical Information
            </h4>
          </div>

          <div className="space-y-4">
            {/* Severe Allergies */}
            <div>
              <label className="block text-xs font-bold text-rose-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Severe Allergies (Specifically highlight life-threatening allergies) *</span>
              </label>
              <textarea
                rows={2}
                value={card.severeAllergies}
                onChange={(e) => handleChange('severeAllergies', e.target.value)}
                placeholder="e.g., Penicillin (Severe Anaphylaxis), Peanuts, Bee/Wasp stings, Latex, NSAIDs..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/90 border border-rose-500/30 text-stone-100 placeholder-stone-500 text-sm focus:border-rose-500 outline-none transition-colors"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Paramedics immediately check this to prevent adverse drug reactions during acute interventions.
              </p>
            </div>

            {/* Chronic Medical Conditions */}
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Chronic Medical Conditions *</span>
              </label>
              <textarea
                rows={2}
                value={card.chronicConditions}
                onChange={(e) => handleChange('chronicConditions', e.target.value)}
                placeholder="Conditions that require immediate attention during an emergency (e.g., Type 1 Diabetes, Epilepsy, Heart Condition, Asthma, Severe Hypertension)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-white/10 text-stone-100 placeholder-stone-500 text-sm focus:border-amber-500 outline-none transition-colors"
              />
            </div>

            {/* Current Medications */}
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-emerald-400" />
                <span>Current Medications *</span>
              </label>
              <textarea
                rows={2}
                value={card.currentMedications}
                onChange={(e) => handleChange('currentMedications', e.target.value)}
                placeholder="Life-sustaining or critical medications you take regularly (e.g., Blood thinners, Insulin, Anti-seizure meds, Ventolin inhaler)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-white/10 text-stone-100 placeholder-stone-500 text-sm focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contacts (ICE 1 and ICE 2) */}
        <div className="p-5 sm:p-6 rounded-3xl glass-panel bg-stone-900/80 border border-white/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-sky-400" />
              <h4 className="font-bold text-stone-100 text-sm tracking-wide">
                3. Emergency Contacts
              </h4>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
              Tip: Label them clearly as &quot;ICE 1&quot; and &quot;ICE 2&quot;
            </span>
          </div>

          {/* Primary Contact: ICE 1 */}
          <div className="p-4 rounded-2xl bg-stone-950/60 border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-sky-500 text-white font-mono font-black text-xs">
                ICE 1 (Primary Contact)
              </span>
              <span className="text-[11px] text-stone-400">First person to notify</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={card.primaryContact.name}
                  onChange={(e) => handlePrimaryContactChange('name', e.target.value)}
                  placeholder="e.g., Mak Jemah"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-xs outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  value={card.primaryContact.relationship}
                  onChange={(e) => handlePrimaryContactChange('relationship', e.target.value)}
                  placeholder="e.g., Spouse, Parent, Partner"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-xs outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">Primary Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={card.primaryContact.phone}
                  onChange={(e) => handlePrimaryContactChange('phone', e.target.value)}
                  placeholder="e.g., +60 19-482 9102"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-xs outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Secondary Contact: ICE 2 */}
          <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-stone-700 text-stone-200 font-mono font-bold text-xs">
                ICE 2 (Secondary Contact)
              </span>
              <span className="text-[11px] text-stone-400">A backup person if primary is unreachable</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={card.secondaryContact.name}
                  onChange={(e) => handleSecondaryContactChange('name', e.target.value)}
                  placeholder="e.g., John Labu"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-xs outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  value={card.secondaryContact.relationship}
                  onChange={(e) => handleSecondaryContactChange('relationship', e.target.value)}
                  placeholder="e.g., Brother, Close Friend"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-xs outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={card.secondaryContact.phone}
                  onChange={(e) => handleSecondaryContactChange('phone', e.target.value)}
                  placeholder="e.g., +60 12-349 8811"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 text-xs outline-none focus:border-stone-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Designated SOS Destination Option */}
          <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/20">
            <label className="block text-xs font-bold text-red-300 mb-1">
              Automated SOS 1-Click Destination Number
            </label>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="sosTarget"
                  checked={card.designatedSosNumber === card.primaryContact.phone}
                  onChange={() => handleChange('designatedSosNumber', card.primaryContact.phone)}
                  className="accent-red-500"
                />
                <span>Route to ICE 1 ({card.primaryContact.phone || 'Primary'})</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="sosTarget"
                  checked={card.designatedSosNumber === card.secondaryContact.phone}
                  onChange={() => handleChange('designatedSosNumber', card.secondaryContact.phone)}
                  className="accent-red-500"
                />
                <span>Route to ICE 2 ({card.secondaryContact.phone || 'Secondary'})</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live Digital Emergency ID Card Preview */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400 border-b border-white/5 pb-2">
            <span className="font-bold text-stone-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Live Emergency ID Card Preview
            </span>
            <span className="font-mono text-[10px]">Ready for lock screen &amp; automated dispatch</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="text-stone-400 text-[11px]">Cardholder:</div>
              <div className="font-bold text-sm text-white">
                {card.fullLegalName || '—'}{' '}
                {card.preferredName ? <span className="text-stone-400 font-normal">({card.preferredName})</span> : null}
              </div>
              <div className="text-stone-400 flex items-center gap-3 text-[11px] font-mono mt-1">
                <span>DOB: {card.dateOfBirth || '—'}</span>
                <span className="px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-300 font-bold">
                  Blood: {card.bloodType}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-rose-400 font-bold text-[11px]">Severe Allergies:</div>
              <div className="text-stone-200 text-xs bg-red-950/30 p-2 rounded-xl border border-red-500/20">
                {card.severeAllergies || 'None declared'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-white/5">
            <div>
              <span className="text-stone-400 text-[10px] block uppercase font-mono">ICE 1 Primary Contact</span>
              <span className="font-bold text-sky-300">
                {card?.primaryContact?.name || '—'} ({card?.primaryContact?.relationship || '—'}) •{' '}
                <span className="font-mono">{card?.primaryContact?.phone || '—'}</span>
              </span>
            </div>
            <div>
              <span className="text-stone-400 text-[10px] block uppercase font-mono">ICE 2 Secondary Contact</span>
              <span className="font-bold text-stone-300">
                {card?.secondaryContact?.name || '—'} ({card?.secondaryContact?.relationship || '—'}) •{' '}
                <span className="font-mono">{card?.secondaryContact?.phone || '—'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-950/60 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Card...' : 'Save Emergency Card & ICE Contacts'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
