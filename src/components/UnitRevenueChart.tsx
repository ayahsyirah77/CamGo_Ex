import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  BedDouble,
  BarChart3,
} from 'lucide-react';
import {
  VendorListing,
  AccommodationBooking,
  MotorbikeBookingRecord,
  AccommodationUnitConfig,
} from '../types';
import { resolveVendorSectorKey } from '../utils/sectorIsolation';

interface UnitRevenueChartProps {
  vendor: VendorListing;
  accommodationBookings: AccommodationBooking[];
  motorbikeBookings?: MotorbikeBookingRecord[];
  onSelectUnit?: (unitId: string) => void;
}

interface MonthlyMetric {
  monthKey: string;
  monthLabel: string;
  revenue: number;
  deposits: number;
  bookings: number;
  nights: number;
}

export const UnitRevenueChart: React.FC<UnitRevenueChartProps> = ({
  vendor,
  accommodationBookings,
  motorbikeBookings = [],
  onSelectUnit,
}) => {
  const [rangeMonths, setRangeMonths] = useState<6 | 12>(6);
  const sectorKey = resolveVendorSectorKey(vendor);
  const isAccommodation = sectorKey === 'accommodation';

  const units: AccommodationUnitConfig[] = vendor.sectorSpecifics?.accommodation?.units || [];
  const selectedUnitId = vendor.sectorSpecifics?.accommodation?.selectedUnitId;
  const selectedUnit: AccommodationUnitConfig | undefined = useMemo(() => {
    if (units.length === 0) return undefined;
    return units.find((u) => u.id === selectedUnitId) || units[0];
  }, [units, selectedUnitId]);

  const activeUnitCode = selectedUnit?.unitCode?.trim() || 'CH-1';
  const activeUnitLabel = selectedUnit?.unitLabel?.trim() || 'Unit 1';

  // Filter bookings strictly for the currently selected unit (or vendor for non-accommodation)
  const scopedAccommodationBookings = useMemo(() => {
    const validBookings = accommodationBookings.filter(
      (b) =>
        b.status !== 'rejected' &&
        b.status !== 'auto_refunded' &&
        (b.homestayId === vendor.id ||
          (b.vendorUid && vendor.ownerUid && b.vendorUid === vendor.ownerUid) ||
          (b.vendorEmail &&
            vendor.ownerEmail &&
            b.vendorEmail.toLowerCase() === vendor.ownerEmail.toLowerCase()))
    );

    if (!isAccommodation || units.length <= 1 || !selectedUnit) {
      return validBookings;
    }

    const codeLower = activeUnitCode.toLowerCase();
    const labelLower = activeUnitLabel.toLowerCase();

    return validBookings.filter((b) => {
      const masked = (b.maskedTitle || '').toLowerCase().trim();
      const roomName = (b.roomTypeName || '').toLowerCase();
      if (masked && masked === codeLower) return true;
      if (roomName && (roomName.includes(codeLower) || roomName.includes(labelLower))) return true;
      return false;
    });
  }, [
    accommodationBookings,
    vendor.id,
    vendor.ownerUid,
    vendor.ownerEmail,
    isAccommodation,
    units.length,
    selectedUnit,
    activeUnitCode,
    activeUnitLabel,
  ]);

  const scopedVehicleBookings = useMemo(() => {
    if (isAccommodation) return [];
    return motorbikeBookings.filter(
      (b) =>
        b.status !== 'cancelled' &&
        (b.partnerId === vendor.id ||
          (b.vendorEmail &&
            vendor.ownerEmail &&
            b.vendorEmail.toLowerCase() === vendor.ownerEmail.toLowerCase()))
    );
  }, [motorbikeBookings, isAccommodation, vendor.id, vendor.ownerEmail]);

  // Build monthly time-series across the last 6 or 12 months
  const monthlyData: MonthlyMetric[] = useMemo(() => {
    const now = new Date();
    const buckets: MonthlyMetric[] = [];
    const bucketMap = new Map<string, MonthlyMetric>();

    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const entry: MonthlyMetric = {
        monthKey: key,
        monthLabel: label,
        revenue: 0,
        deposits: 0,
        bookings: 0,
        nights: 0,
      };
      buckets.push(entry);
      bucketMap.set(key, entry);
    }

    if (isAccommodation) {
      for (const b of scopedAccommodationBookings) {
        const dateStr = b.checkInDate || b.createdAt;
        const parsed = dateStr ? new Date(dateStr) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) continue;
        const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        const target = bucketMap.get(key);
        if (target) {
          target.revenue += Number(b.totalRoomPrice) || 0;
          target.deposits += Number(b.depositAmount) || 0;
          target.bookings += 1;
          target.nights += Number(b.nights) || 1;
        }
      }
    } else {
      for (const b of scopedVehicleBookings) {
        const dateStr = b.startDate || b.createdAt;
        const parsed = dateStr ? new Date(dateStr) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) continue;
        const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        const target = bucketMap.get(key);
        if (target) {
          target.revenue += Number(b.totalRm) || 0;
          target.deposits += Number(b.depositRm || b.lockInFeeRm) || 0;
          target.bookings += 1;
          target.nights += Number(b.days) || 1;
        }
      }
    }

    return buckets;
  }, [rangeMonths, isAccommodation, scopedAccommodationBookings, scopedVehicleBookings]);

  const totals = useMemo(() => {
    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalBookings = monthlyData.reduce((sum, m) => sum + m.bookings, 0);
    const totalDeposits = monthlyData.reduce((sum, m) => sum + m.deposits, 0);
    const totalNights = monthlyData.reduce((sum, m) => sum + m.nights, 0);
    const avgRevenue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
    return { totalRevenue, totalBookings, totalDeposits, totalNights, avgRevenue };
  }, [monthlyData]);

  const normalRate = selectedUnit?.roomTypes?.[0]?.pricePerNight ?? 0;
  const peakRate = selectedUnit?.roomTypes?.[0]?.peakPricePerNight ?? 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/85 border border-emerald-500/25 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAccommodation
                ? `Monthly Revenue & Booking Trends — Unit ${activeUnitCode}`
                : `Monthly Revenue & Booking Trends — ${vendor.businessName}`}
            </span>
          </h4>
          <p className="text-[11px] text-stone-400">
            {isAccommodation ? (
              <>
                Tracking confirmed stay revenue and booking volume for{' '}
                <strong className="text-emerald-300">
                  Unit {activeUnitCode} — {vendor.businessName}
                </strong>
                {normalRate > 0 ? ` · Normal RM ${normalRate}/night` : ''}
                {peakRate > 0 ? ` · Peak RM ${peakRate}/night` : ''}
              </>
            ) : (
              'Live monthly revenue performance and booking volume across your business.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAccommodation && units.length > 0 && onSelectUnit && (
            <select
              value={selectedUnit?.id || ''}
              onChange={(e) => onSelectUnit(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-xs font-semibold text-white cursor-pointer"
              aria-label="Select unit for revenue chart"
            >
              {units.map((u, idx) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unitCode || `CH-${idx + 1}`} — {u.unitLabel || `Unit ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center bg-stone-900 p-0.5 rounded-xl border border-stone-800 text-[11px]">
            <button
              type="button"
              onClick={() => setRangeMonths(6)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                rangeMonths === 6
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              6M
            </button>
            <button
              type="button"
              onClick={() => setRangeMonths(12)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                rangeMonths === 12
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              12M
            </button>
          </div>
        </div>
      </div>

      {/* Unit-Scoped Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
          <span className="text-[10px] font-medium text-stone-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span>{rangeMonths}M Revenue</span>
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono tabular-nums mt-0.5">
            RM {totals.totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
          <span className="text-[10px] font-medium text-stone-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>Total Bookings</span>
          </span>
          <div className="text-base sm:text-lg font-black text-white font-mono tabular-nums mt-0.5">
            {totals.totalBookings}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
          <span className="text-[10px] font-medium text-stone-400 flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-teal-400" />
            <span>Deposits Paid</span>
          </span>
          <div className="text-base sm:text-lg font-black text-teal-300 font-mono tabular-nums mt-0.5">
            RM {totals.totalDeposits.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
          <span className="text-[10px] font-medium text-stone-400 flex items-center gap-1">
            <BedDouble className="w-3 h-3 text-cyan-400" />
            <span>Avg. Booking Value</span>
          </span>
          <div className="text-base sm:text-lg font-black text-cyan-300 font-mono tabular-nums mt-0.5">
            RM {totals.avgRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Recharts ComposedChart: Monthly Revenue (Area) + Bookings (Bar) */}
      <div className="w-full h-64 sm:h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={monthlyData}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="unitRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              stroke="#a8a29e"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#44403c' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#10b981"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `RM ${v}`}
              width={64}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#f59e0b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as MonthlyMetric | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-xl bg-stone-950/95 border border-emerald-500/40 px-3 py-2.5 text-xs shadow-2xl space-y-1">
                    <div className="font-bold text-white border-b border-stone-800 pb-1">
                      {label} {isAccommodation ? `· Unit ${activeUnitCode}` : ''}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-emerald-300">Revenue:</span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        RM {row.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-amber-300">Bookings:</span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        {row.bookings}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-teal-300">Deposits:</span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        RM {row.deposits.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-stone-400">
                        {isAccommodation ? 'Nights:' : 'Days:'}
                      </span>
                      <span className="font-mono font-bold text-stone-200 tabular-nums">
                        {row.nights}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
            />
            <Bar
              yAxisId="right"
              dataKey="bookings"
              name="Bookings"
              fill="#f59e0b"
              fillOpacity={0.85}
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="Revenue (RM)"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#unitRevenueGrad)"
              activeDot={{ r: 5, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {totals.totalBookings === 0 && (
        <div className="text-[11px] text-stone-400 text-center pt-1">
          No paid bookings recorded yet for{' '}
          <strong className="text-stone-200">
            {isAccommodation ? `Unit ${activeUnitCode}` : vendor.businessName}
          </strong>{' '}
          in this period. Confirmed reservations will appear automatically on the chart.
        </div>
      )}
    </div>
  );
};
