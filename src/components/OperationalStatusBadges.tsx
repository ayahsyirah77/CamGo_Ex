/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  VendorRealTimeStatus,
  DiyHarvestStatus,
  ParkingStatus,
  RoomAvailabilityStatus,
  Language,
} from '../types';
import {
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  ParkingCircle,
  Home,
  Bed,
  Car,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface OperationalStatusBadgesProps {
  realTimeStatus?: VendorRealTimeStatus;
  diyHarvestStatus?: DiyHarvestStatus;
  parkingStatus?: ParkingStatus;
  roomAvailabilityStatus?: RoomAvailabilityStatus;
  language?: Language;
  compact?: boolean;
}

export const OperationalStatusBadges: React.FC<OperationalStatusBadgesProps> = ({
  realTimeStatus = 'open',
  diyHarvestStatus,
  parkingStatus = 'private_available',
  roomAvailabilityStatus,
  language = 'en',
  compact = false,
}) => {
  const isBm = language === 'bm';

  // 1. Operating Status Config
  const getOperatingBadge = () => {
    switch (realTimeStatus) {
      case 'open':
        return {
          label: isBm ? 'Dibuka Masa Nyata' : 'Open Now',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400 animate-pulse',
        };
      case 'busy':
        return {
          label: isBm ? 'Orang Ramai / Sesak' : 'High Crowd / Busy',
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
          color: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
        };
      case 'sold_out':
        return {
          label: isBm ? 'Tiket / Slot Habis' : 'Tickets Sold Out',
          icon: <Ban className="w-3 h-3 text-purple-400" />,
          color: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
          dot: 'bg-purple-400',
        };
      case 'closed_roadworks':
        return {
          label: isBm ? 'Tutup / Kerjajalan' : 'Closed / Roadworks',
          icon: <Ban className="w-3 h-3 text-rose-400" />,
          color: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-400',
        };
      default:
        return null;
    }
  };

  // 2. DIY Harvest Config
  const getHarvestBadge = () => {
    if (!diyHarvestStatus) return null;
    switch (diyHarvestStatus) {
      case 'picking_open':
        return {
          label: isBm ? '🍓 Petik Buah Dibuka' : '🍓 DIY Harvest Open',
          color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        };
      case 'farm_open_no_picking':
        return {
          label: isBm ? '🧺 Ladang Buka (Siap Bungkus)' : '🧺 Farm Open (No DIY)',
          color: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
        };
      case 'closed_season':
        return {
          label: isBm ? '❄ Luar Musim Tuai' : '❄ Off-Season Harvest',
          color: 'bg-stone-800/80 text-stone-400 border-stone-700/40',
        };
      default:
        return null;
    }
  };

  // 3. Parking Status Config
  const getParkingBadge = () => {
    if (!parkingStatus) return null;
    switch (parkingStatus) {
      case 'private_available':
        return {
          label: isBm ? '🅿️ Parkir Khas Ada' : '🅿️ Private Park Available',
          color: 'bg-teal-950/80 text-teal-300 border-teal-500/30',
        };
      case 'street_busy':
        return {
          label: isBm ? '🚘 Parkir Tepi Jalan Sesak' : '🚘 Street Parking Busy',
          color: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
        };
      case 'valet_only':
        return {
          label: isBm ? '🔑 Parkir Valet Sahaja' : '🔑 Valet Only',
          color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
        };
      default:
        return null;
    }
  };

  // 4. Room / Apartment Availability Config
  const getRoomBadge = () => {
    if (!roomAvailabilityStatus || roomAvailabilityStatus === 'not_applicable') return null;
    switch (roomAvailabilityStatus) {
      case 'rooms_available':
        return {
          label: isBm ? '🏨 Bilik / Apartment Ada' : '🏨 Rooms Available',
          color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        };
      case 'limited_units':
        return {
          label: isBm ? '⚡ Unit Terhad Sahaja' : '⚡ Limited Units Left',
          color: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
        };
      case 'fully_booked':
        return {
          label: isBm ? '🔴 Penuh Tempah' : '🔴 Fully Booked',
          color: 'bg-rose-950/80 text-rose-300 border-rose-500/30',
        };
      default:
        return null;
    }
  };

  const opBadge = getOperatingBadge();
  const harvBadge = getHarvestBadge();
  const parkBadge = getParkingBadge();
  const roomBadge = getRoomBadge();

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {opBadge && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${opBadge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${opBadge.dot}`} />
            {opBadge.label}
          </span>
        )}
        {harvBadge && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${harvBadge.color}`}>
            {harvBadge.label}
          </span>
        )}
        {parkBadge && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${parkBadge.color}`}>
            {parkBadge.label}
          </span>
        )}
        {roomBadge && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${roomBadge.color}`}>
            {roomBadge.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {opBadge && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm ${opBadge.color}`}>
            <span className={`w-2 h-2 rounded-full ${opBadge.dot}`} />
            {opBadge.label}
          </span>
        )}
        {roomBadge && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm ${roomBadge.color}`}>
            {roomBadge.label}
          </span>
        )}
        {harvBadge && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm ${harvBadge.color}`}>
            {harvBadge.label}
          </span>
        )}
        {parkBadge && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm ${parkBadge.color}`}>
            {parkBadge.label}
          </span>
        )}
      </div>
    </div>
  );
};
