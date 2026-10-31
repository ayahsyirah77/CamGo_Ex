import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  Globe,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';

interface CurrencyConverterWidgetProps {
  language: Language;
}

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  fallbackMyrRate: number; // How many MYR for 1 unit of foreign currency
}

const COMMON_CURRENCIES: CurrencyOption[] = [
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', fallbackMyrRate: 3.32 },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', fallbackMyrRate: 4.38 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', fallbackMyrRate: 4.75 },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', fallbackMyrRate: 5.68 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', fallbackMyrRate: 2.88 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', fallbackMyrRate: 0.13 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', fallbackMyrRate: 0.00028 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', fallbackMyrRate: 0.61 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', fallbackMyrRate: 0.029 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', fallbackMyrRate: 3.15 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', fallbackMyrRate: 0.052 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', flag: '🇸🇦', fallbackMyrRate: 1.17 },
];

export const CurrencyConverterWidget: React.FC<CurrencyConverterWidgetProps> = ({ language }) => {
  const [amountInput, setAmountInput] = useState<string>('100');
  const [selectedCode, setSelectedCode] = useState<string>('SGD');
  const [myrPerUnit, setMyrPerUnit] = useState<number>(3.32);
  const [loadingRates, setLoadingRates] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Live Exchange Rate Fetcher
  const fetchLiveRates = async () => {
    setLoadingRates(true);
    setFetchError(null);

    try {
      // open.er-api.com returns rates with base MYR
      const res = await fetch('https://open.er-api.com/v6/latest/MYR');
      if (!res.ok) throw new Error('HTTP status ' + res.status);

      const data = await res.json();
      if (data && data.result === 'success' && data.rates) {
        // rates[USD] is units of USD per 1 MYR
        // So 1 USD in MYR = 1 / rates[USD]
        const rateMap: Record<string, number> = {};
        Object.keys(data.rates).forEach((code) => {
          const rateToMyr = data.rates[code];
          if (rateToMyr > 0) {
            rateMap[code] = 1 / rateToMyr;
          }
        });

        // Store active rate for selected currency
        const currentCurrency = COMMON_CURRENCIES.find((c) => c.code === selectedCode);
        if (rateMap[selectedCode]) {
          setMyrPerUnit(rateMap[selectedCode]);
        } else if (currentCurrency) {
          setMyrPerUnit(currentCurrency.fallbackMyrRate);
        }

        setIsLive(true);
        const formattedDate = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastUpdatedTime(formattedDate);
      } else {
        throw new Error('Invalid rate payload format');
      }
    } catch (err) {
      console.warn('Live rate API fetch warning, using fallback rates:', err);
      setIsLive(false);
      const currentCurrency = COMMON_CURRENCIES.find((c) => c.code === selectedCode);
      if (currentCurrency) {
        setMyrPerUnit(currentCurrency.fallbackMyrRate);
      }
      setFetchError(language === 'bm' ? 'Menggunakan kadar anggaran tempatan' : 'Using estimated baseline rates');
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveRates();
  }, []);

  // Update exchange rate when user selects a different currency
  useEffect(() => {
    const currency = COMMON_CURRENCIES.find((c) => c.code === selectedCode);
    if (currency) {
      // Re-fetch or apply
      if (!isLive) {
        setMyrPerUnit(currency.fallbackMyrRate);
      } else {
        // Re-run fetch if needed or update dynamically
        fetchLiveRates();
      }
    }
  }, [selectedCode]);

  const numAmount = parseFloat(amountInput) || 0;
  const convertedValueMYR = numAmount * myrPerUnit;
  const activeCurrency = COMMON_CURRENCIES.find((c) => c.code === selectedCode) || COMMON_CURRENCIES[0];

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-emerald-500/30 shadow-2xl relative overflow-hidden space-y-5">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-inner">
            <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                TRAVELER UTILITY
              </span>
              <span className="text-xs font-bold text-stone-200">
                {activeCurrency.flag} {activeCurrency.code} → MYR
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-heading font-extrabold text-white mt-0.5 tracking-tight">
              {language === 'bm' ? 'Penukar Mata Wang Live (MYR / RM)' : 'Real-Time Traveler Currency Converter'}
            </h4>
          </div>
        </div>

        {/* Live Rates Status Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border ${
            isLive
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>
              {isLive
                ? (language === 'bm' ? `Kadar Live (${lastUpdatedTime})` : `Live Rates Loaded (${lastUpdatedTime})`)
                : (language === 'bm' ? 'Kadar Anggaran' : 'Estimated Rates')}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchLiveRates}
            disabled={loadingRates}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh Live Exchange Rates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRates ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Input Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Amount Input */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="block text-xs font-bold text-stone-300 flex items-center justify-between">
            <span>{language === 'bm' ? 'Amaun Mata Wang Asing' : 'Foreign Amount'}</span>
            <span className="text-[10px] text-stone-500 font-mono">({activeCurrency.symbol})</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 font-bold text-stone-400 text-sm select-none">
              {activeCurrency.symbol}
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="100"
              className="w-full pl-9 pr-4 py-3 rounded-2xl bg-stone-950/90 border border-white/15 focus:border-emerald-400 text-stone-100 font-mono text-base font-bold outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Foreign Currency Selector Dropdown */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="block text-xs font-bold text-stone-300 flex items-center justify-between">
            <span>{language === 'bm' ? 'Pilih Mata Wang' : 'Select Currency'}</span>
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
          </label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full px-3.5 py-3 rounded-2xl bg-stone-950/90 border border-white/15 focus:border-emerald-400 text-stone-100 text-xs font-bold outline-none transition-all cursor-pointer shadow-inner"
          >
            {COMMON_CURRENCIES.map((cur) => (
              <option key={cur.code} value={cur.code} className="bg-stone-900 text-stone-100">
                {cur.flag} {cur.code} - {cur.name} ({cur.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Equivalent MYR Display */}
        <div className="md:col-span-3 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-teal-950/60 border border-emerald-500/40 text-center space-y-1 shadow-lg">
          <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block tracking-wider">
            {language === 'bm' ? 'Nilai Ringgit Malaysia' : 'Malaysian Ringgit'}
          </span>
          <div className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
            RM {convertedValueMYR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-mono text-emerald-300/80 block">
            MYR / RM
          </span>
        </div>
      </div>

      {/* Exchange Rate Summary Note */}
      <div className="p-3 rounded-2xl bg-stone-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {language === 'bm' ? 'Kadar Pertukaran Live:' : 'Live Exchange Rate:'}{' '}
            <strong className="text-stone-200 font-mono">
              1 {selectedCode} = RM {myrPerUnit.toFixed(4)} MYR
            </strong>
          </span>
        </div>

        <span className="text-[11px] text-stone-500 font-mono">
          {language === 'bm' ? 'Sesuai untuk bayaran bil, kedai & pasar malam' : 'Ideal for QR, e-Wallets & local card payments'}
        </span>
      </div>
    </div>
  );
};
