import React, { useState } from 'react';
import {
  VendorListing,
  VendorSectorSpecifics,
  AccommodationSpecifics,
  VehicleRentalSpecifics,
  RetailProductSpecifics,
  ProfessionalServiceSpecifics,
} from '../types';
import { resolveVendorSectorKey } from '../utils/sectorIsolation';
import {
  ParkingCircle,
  Coffee,
  Home,
  Utensils,
  Bike,
  Sun,
  Gift,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  Calendar,
  Wrench,
  DollarSign,
  Truck,
  ShoppingBag,
  Briefcase,
  Compass,
  BedDouble,
  Users,
  ClipboardCheck,
} from 'lucide-react';

interface DynamicBusinessNatureFieldsProps {
  vendor: VendorListing;
  onChange: (updatedVendor: VendorListing) => void;
  isReadOnly?: boolean;
}

interface RentalSubConfig {
  title: string;
  unitNoun: string;
  codeLabel: string;
  specLabel: string;
  sampleItems: Array<{
    name: string;
    code: string;
    spec: string;
    dailyRateRm: number;
    hourlyRateRm: number;
  }>;
  defaultAddons: Array<{
    id: string;
    name: string;
    priceRm: number;
    enabled: boolean;
    category: 'helmet' | 'mount' | 'insurance' | 'gear' | 'other';
  }>;
  defaultDropoffs: string[];
  defaultDepositNote: string;
}

function getRentalSubConfig(subCategory: string): RentalSubConfig {
  if (subCategory === 'rental_car_van') {
    return {
      title: '5.3 Cars, SUVs & Vans Fleet Inventory',
      unitNoun: 'Vehicle',
      codeLabel: 'Reg. Plate',
      specLabel: 'Transmission & Seats',
      sampleItems: [
        { name: 'Perodua Aruz 1.5X Auto (7-Seater)', code: 'VHR-101', spec: 'Auto · 7 Seats', dailyRateRm: 220, hourlyRateRm: 45 },
        { name: 'Honda City RS Hatchback', code: 'VHR-102', spec: 'Auto · 5 Seats', dailyRateRm: 170, hourlyRateRm: 35 },
      ],
      defaultAddons: [
        { id: 'addon-driver', name: 'Additional Authorised Driver Cover', priceRm: 20, enabled: true, category: 'insurance' },
        { id: 'addon-seat', name: 'ISOFIX Child Safety Seat', priceRm: 15, enabled: true, category: 'gear' },
        { id: 'addon-dashcam', name: 'Front & Rear 4K Dashcam + GPS', priceRm: 10, enabled: false, category: 'mount' },
      ],
      defaultDropoffs: ['Tanah Rata Terminal', 'Brinchang Hotel Zone', 'Kea Farm'],
      defaultDepositNote: 'Refundable upon fuel-level match & clean vehicle return. Valid Class D licence required.',
    };
  }
  if (subCategory === 'rental_powersports_marine') {
    return {
      title: '5.3 Powersports, ATVs & 4x4 Adventure Inventory',
      unitNoun: 'Unit',
      codeLabel: 'Unit Code',
      specLabel: 'Drive & Trail Spec',
      sampleItems: [
        { name: 'Yamaha Grizzly 450cc 4x4 ATV', code: 'ATV-01', spec: '4WD Off-Road', dailyRateRm: 260, hourlyRateRm: 95 },
        { name: 'Land Rover Defender Highland 4x4', code: 'SAF-02', spec: 'Manual 4x4 · 7 Pax', dailyRateRm: 420, hourlyRateRm: 140 },
      ],
      defaultAddons: [
        { id: 'addon-armor', name: 'Off-Road Helmet, Goggles & Chest Guard', priceRm: 15, enabled: true, category: 'helmet' },
        { id: 'addon-guide', name: 'Licensed Trail Marshall Escort', priceRm: 50, enabled: true, category: 'other' },
        { id: 'addon-boots', name: 'Mud Terrain Boots Rental', priceRm: 10, enabled: false, category: 'gear' },
      ],
      defaultDropoffs: ['Basecamp Trailhead', 'Brinchang Safari Gate', 'Mossy Forest Access'],
      defaultDepositNote: 'Safety briefing mandatory before departure. Refundable after trail inspection.',
    };
  }
  if (subCategory === 'rental_heavy_machinery') {
    return {
      title: '5.3 Heavy Machinery, Generators & Industrial Tools',
      unitNoun: 'Equipment / Tool',
      codeLabel: 'Asset Tag',
      specLabel: 'Capacity / Power Spec',
      sampleItems: [
        { name: '25kVA Silent Diesel Generator', code: 'GEN-25A', spec: '3-Phase · 25kVA', dailyRateRm: 380, hourlyRateRm: 75 },
        { name: 'Mini Crawler Excavator 1.8T', code: 'EXC-018', spec: '1.8 Ton · Rubber Track', dailyRateRm: 550, hourlyRateRm: 110 },
      ],
      defaultAddons: [
        { id: 'addon-tech', name: 'On-Site Certified Technician Standby', priceRm: 150, enabled: true, category: 'other' },
        { id: 'addon-cable', name: '50m Heavy-Duty Distribution Cable & DB', priceRm: 45, enabled: true, category: 'gear' },
        { id: 'addon-fuel', name: 'Pre-Filled Full Diesel Reserve Drum', priceRm: 120, enabled: false, category: 'other' },
      ],
      defaultDropoffs: ['Agricultural Terrace Site', 'Brinchang Commercial Depot', 'Kuala Terla Zone'],
      defaultDepositNote: 'Site access clearance required before delivery. Refundable post-return diagnostic.',
    };
  }
  if (subCategory === 'rental_photo_audio') {
    return {
      title: '5.3 Photography, Audio & Production Gear Inventory',
      unitNoun: 'Gear Kit',
      codeLabel: 'Serial / Kit ID',
      specLabel: 'Sensor / Audio Spec',
      sampleItems: [
        { name: 'Sony A7 IV + 24-70mm f/2.8 GM II Kit', code: 'CAM-A74', spec: '4K60 Full-Frame', dailyRateRm: 180, hourlyRateRm: 45 },
        { name: 'DJI Mic 2 Dual Wireless System', code: 'AUD-M2', spec: '2x TX + 1x RX · 32-Bit', dailyRateRm: 55, hourlyRateRm: 15 },
      ],
      defaultAddons: [
        { id: 'addon-tripod', name: 'Peak Design Carbon Fiber Travel Tripod', priceRm: 25, enabled: true, category: 'mount' },
        { id: 'addon-battery', name: '2x Extra High-Capacity Batteries + Charger', priceRm: 20, enabled: true, category: 'gear' },
        { id: 'addon-damage', name: 'Accidental Lens & Weather-Seal Waiver', priceRm: 30, enabled: true, category: 'insurance' },
      ],
      defaultDropoffs: ['Tanah Rata Studio Desk', 'Hotel Lobby Drop-off', 'BOH Tea Meeting Point'],
      defaultDepositNote: 'NRIC / Passport verification required at handover. Zero scratch sensor check.',
    };
  }

  return {
    title: '5.3 Motorbikes, Scooters & Micro-Mobility Fleet Controls',
    unitNoun: 'Bike / Scooter',
    codeLabel: 'Plate / Fleet Code',
    specLabel: 'CC / Power Spec',
    sampleItems: [
      { name: 'Yamaha NMAX 155cc ABS', code: 'CAM-101', spec: '155cc Liquid-Cooled', dailyRateRm: 85, hourlyRateRm: 20 },
      { name: 'Honda Vario 160cc', code: 'CAM-102', spec: '160cc eSP+ ABS', dailyRateRm: 75, hourlyRateRm: 18 },
    ],
    defaultAddons: [
      { id: 'addon-helmet', name: 'Extra SIRIM Full-Face / Open Helmet', priceRm: 10, enabled: true, category: 'helmet' },
      { id: 'addon-mount', name: 'Waterproof Handlebar Phone Mount + USB', priceRm: 10, enabled: true, category: 'mount' },
      { id: 'addon-insurance', name: 'Comprehensive Theft & Road-Assist Tier', priceRm: 18, enabled: true, category: 'insurance' },
      { id: 'addon-gear', name: 'Highland Riding Jacket & Raincoat Set', priceRm: 12, enabled: false, category: 'gear' },
    ],
    defaultDropoffs: ['Tanah Rata', 'Brinchang', 'Kea Farm'],
    defaultDepositNote: 'Refundable upon clean key & helmet return. Licence B2/B/D required.',
  };
}

export const DynamicBusinessNatureFields: React.FC<DynamicBusinessNatureFieldsProps> = ({
  vendor,
  onChange,
  isReadOnly = false,
}) => {
  const specifics: VendorSectorSpecifics = vendor.sectorSpecifics || {};
  const subCatStr = String(vendor.subCategory || '');
  const sectorKey = resolveVendorSectorKey(vendor);

  const [newBlockedDate, setNewBlockedDate] = useState('');

  const isAccommodation = sectorKey === 'accommodation';
  const isFnB = sectorKey === 'food_beverage';
  const isVehicleRental = sectorKey === 'vehicle_rental';
  const isAgritourism = sectorKey === 'agritourism';
  const isSurpriseDelivery = sectorKey === 'surprise_delivery';
  const isSurprisePlanner = sectorKey === 'surprise_planner';
  const isRetail = sectorKey === 'retail_products';
  const isProfessionalServices = sectorKey === 'professional_services';
  const isTourismAttractions = sectorKey === 'tourism_attractions';

  const isMotorbikeSector =
    isVehicleRental &&
    (subCatStr === 'rental_motorcycle_scooter' ||
      subCatStr === 'car_bike_rentals' ||
      subCatStr === '');

  const rentalSubConfig = getRentalSubConfig(subCatStr);

  // Strict isolated sector updater: only touches the active sector's specifics key
  const updateSectorSpecifics = (newSpecifics: Partial<VendorSectorSpecifics>) => {
    onChange({
      ...vendor,
      sectorSpecifics: {
        ...vendor.sectorSpecifics,
        ...newSpecifics,
      },
    });
  };

  return (
    <div className="space-y-6 pt-4 border-t border-stone-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Dynamic Business Nature Controls &amp; Context-Aware Attributes</span>
        </h3>
        <span className="text-[11px] font-mono font-semibold text-emerald-300 uppercase tracking-wide">
          {isAccommodation && '5.1 Accommodation & Lodging Sector'}
          {isFnB && '5.2 Food & Beverage Sector'}
          {isVehicleRental &&
            (isMotorbikeSector
              ? '5.3 Motorbikes, Scooters & Micro-Mobility'
              : '5.3 Rentals & Equipment Inventory')}
          {isAgritourism && '5.4 Agritourism & Farms Sector'}
          {isSurpriseDelivery && '5.5 Surprise Delivery Services'}
          {isSurprisePlanner && '5.6 Surprise Planners & Coordinators'}
          {isRetail && '5.7 Retail & Physical Products'}
          {isProfessionalServices && '5.8 Professional & Home Services'}
          {isTourismAttractions && '5.9 Tours, Tickets & Attractions'}
        </span>
      </div>

      {/* -------------------------------------------------------------
          5.1 ACCOMMODATION & LODGING SECTOR (Strictly isolated)
      ------------------------------------------------------------- */}
      {isAccommodation && (() => {
        const accom: AccommodationSpecifics = specifics.accommodation || {};
        const roomTypes = accom.roomTypes || [];
        const amenityAddons = accom.amenityAddons || [
          { id: 'am-mattress', name: 'Extra Single Mattress & Blanket Set', priceRm: 35, enabled: true },
          { id: 'am-steamboat', name: 'Portable Steamboat Pot & Butane Gas', priceRm: 25, enabled: true },
          { id: 'am-bbq', name: 'Outdoor BBQ Charcoal & Pit Setup', priceRm: 40, enabled: false },
          { id: 'am-lateout', name: 'Late Check-Out Extension (Until 2:00 PM)', priceRm: 50, enabled: false },
        ];
        const showApartmentUnitBlock =
          subCatStr === 'realestate_residential' ||
          subCatStr === 'realestate_vacation_homestay' ||
          subCatStr === 'homestay' ||
          subCatStr === 'homestay_apartment';

        return (
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-teal-500/25 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                <Home className="w-4 h-4 text-teal-400" />
                <span>5.1 Accommodation &amp; Lodging Attributes</span>
              </div>
              <span className="text-[11px] font-mono text-teal-300">
                Housekeeping:{' '}
                <strong className="uppercase">
                  {(accom.housekeepingStatus || 'clean_ready').replace(/_/g, ' ')}
                </strong>
              </span>
            </div>

            {/* Check-in / Check-out Windows, Occupancy Limit & Bed Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-stone-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Check-In Window</span>
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={accom.checkInWindow ?? '15:00 - 22:00'}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      accommodation: { ...accom, checkInWindow: e.target.value },
                    })
                  }
                  placeholder="e.g. 15:00 - 22:00"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Check-Out Window</span>
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={accom.checkOutWindow ?? '08:00 - 12:00'}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      accommodation: { ...accom, checkOutWindow: e.target.value },
                    })
                  }
                  placeholder="e.g. 08:00 - 12:00"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>Max Occupancy (Guests)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={isReadOnly}
                  value={accom.maxOccupancy ?? 6}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      accommodation: { ...accom, maxOccupancy: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono tabular-nums font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1 flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-teal-400" />
                  <span>Primary Bed Configuration</span>
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={accom.bedConfig ?? '2 Queen Beds + 1 Single'}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      accommodation: { ...accom, bedConfig: e.target.value },
                    })
                  }
                  placeholder="e.g. 1 King + 2 Singles"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white"
                />
              </div>
            </div>

            {/* Housekeeping Status */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Housekeeping &amp; Unit Readiness Status</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'clean_ready', label: 'Clean & Ready' },
                  { id: 'turnover_in_progress', label: 'Turnover In Progress' },
                  { id: 'inspection_needed', label: 'Inspection Needed' },
                  { id: 'deep_cleaning', label: 'Deep Cleaning' },
                ].map((hk) => {
                  const isSelected = (accom.housekeepingStatus || 'clean_ready') === hk.id;
                  return (
                    <button
                      key={hk.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() =>
                        updateSectorSpecifics({
                          accommodation: { ...accom, housekeepingStatus: hk.id as any },
                        })
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}
                      {hk.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parking Toggles */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Parking Facilities &amp; Availability
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'private_available', label: 'Private Parking' },
                  { id: 'public_parking', label: 'Public Parking' },
                  { id: 'valet', label: 'Valet Parking' },
                  { id: 'none', label: 'No Parking' },
                ].map((opt) => {
                  const isSelected = (accom.parkingType || vendor.parkingStatus) === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        const updatedAccom: AccommodationSpecifics = {
                          ...accom,
                          parkingType: opt.id as any,
                        };
                        onChange({
                          ...vendor,
                          parkingStatus: (opt.id === 'valet'
                            ? 'valet_only'
                            : opt.id === 'public_parking'
                            ? 'street_busy'
                            : 'private_available') as any,
                          sectorSpecifics: { ...vendor.sectorSpecifics, accommodation: updatedAccom },
                        });
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Types, Nightly Rates, Bed Config & Occupancy */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-stone-300">
                  Room Types, Nightly Rates &amp; Bed Configurations
                </label>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      updateSectorSpecifics({
                        accommodation: {
                          ...accom,
                          roomTypes: [
                            ...roomTypes,
                            {
                              id: `room-${Date.now()}`,
                              name: `${vendor.businessName ? `${vendor.businessName} Room` : 'Standard Room'} ${roomTypes.length + 1}`,
                              quantity: 1,
                              pricePerNight: 180,
                              bedConfig: '1 Queen Bed',
                              maxOccupancy: 2,
                            },
                          ],
                        },
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-teal-600/30"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Add Room Type</span>
                  </button>
                )}
              </div>

              {roomTypes.length === 0 ? (
                <div className="p-4 rounded-xl bg-stone-900/70 border border-dashed border-stone-800 text-center space-y-2">
                  <p className="text-xs text-stone-400">
                    No room or unit configurations added for{' '}
                    <strong className="text-white">{vendor.businessName}</strong> yet.
                  </p>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSectorSpecifics({
                          accommodation: {
                            ...accom,
                            roomTypes: [
                              {
                                id: `room-${Date.now()}`,
                                name: 'Standard Highland Room',
                                quantity: 2,
                                pricePerNight: 180,
                                bedConfig: '1 Queen Bed',
                                maxOccupancy: 2,
                              },
                            ],
                          },
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold cursor-pointer hover:bg-teal-600/35"
                    >
                      + Create First Room / Unit Entry
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {roomTypes.map((room, idx) => (
                    <div
                      key={room.id || idx}
                      className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                    >
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={room.name}
                        onChange={(e) => {
                          const updatedRooms = roomTypes.map((r, i) =>
                            i === idx ? { ...r, name: e.target.value } : r
                          );
                          updateSectorSpecifics({
                            accommodation: { ...accom, roomTypes: updatedRooms },
                          });
                        }}
                        placeholder="Room / Unit Name"
                        className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white"
                      />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={room.bedConfig || ''}
                        onChange={(e) => {
                          const updatedRooms = roomTypes.map((r, i) =>
                            i === idx ? { ...r, bedConfig: e.target.value } : r
                          );
                          updateSectorSpecifics({
                            accommodation: { ...accom, roomTypes: updatedRooms },
                          });
                        }}
                        placeholder="Bed config (e.g. 2 Queen)"
                        className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200"
                      />
                      <div className="sm:col-span-1 flex items-center gap-1">
                        <span className="text-[10px] text-stone-400 font-mono">Pax:</span>
                        <input
                          type="number"
                          min={1}
                          disabled={isReadOnly}
                          value={room.maxOccupancy ?? 2}
                          onChange={(e) => {
                            const updatedRooms = roomTypes.map((r, i) =>
                              i === idx ? { ...r, maxOccupancy: Number(e.target.value) } : r
                            );
                            updateSectorSpecifics({
                              accommodation: { ...accom, roomTypes: updatedRooms },
                            });
                          }}
                          className="w-full px-1.5 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums text-center"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center gap-1">
                        <span className="text-[10px] text-stone-400 font-mono">Qty:</span>
                        <input
                          type="number"
                          min={0}
                          disabled={isReadOnly}
                          value={room.quantity}
                          onChange={(e) => {
                            const updatedRooms = roomTypes.map((r, i) =>
                              i === idx ? { ...r, quantity: Number(e.target.value) } : r
                            );
                            updateSectorSpecifics({
                              accommodation: { ...accom, roomTypes: updatedRooms },
                            });
                          }}
                          className="w-full px-1.5 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums text-center"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-1">
                        <span className="text-[10px] text-stone-400 font-mono">RM:</span>
                        <input
                          type="number"
                          min={0}
                          disabled={isReadOnly}
                          value={room.pricePerNight}
                          onChange={(e) => {
                            const updatedRooms = roomTypes.map((r, i) =>
                              i === idx ? { ...r, pricePerNight: Number(e.target.value) } : r
                            );
                            updateSectorSpecifics({
                              accommodation: { ...accom, roomTypes: updatedRooms },
                            });
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-emerald-300 font-mono tabular-nums text-right font-bold"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedRooms = roomTypes.filter((_, i) => i !== idx);
                              updateSectorSpecifics({
                                accommodation: { ...accom, roomTypes: updatedRooms },
                              });
                            }}
                            className="p-1.5 rounded bg-rose-950/50 text-rose-300 hover:bg-rose-900 cursor-pointer"
                            title="Remove Room Type"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amenity Add-ons */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Guest Amenity Add-ons &amp; Stay Upgrades</span>
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextAddons = [
                        ...amenityAddons,
                        { id: 'am-' + Date.now(), name: 'Extra Amenity Add-on', priceRm: 20, enabled: true },
                      ];
                      updateSectorSpecifics({ accommodation: { ...accom, amenityAddons: nextAddons } });
                    }}
                    className="px-2 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Amenity
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {amenityAddons.map((addon, idx) => (
                  <div
                    key={addon.id}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      addon.enabled
                        ? 'bg-stone-950 border-teal-500/40'
                        : 'bg-stone-950/50 border-stone-800 opacity-65'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={addon.enabled}
                      onChange={(e) => {
                        const updated = amenityAddons.map((a, i) =>
                          i === idx ? { ...a, enabled: e.target.checked } : a
                        );
                        updateSectorSpecifics({ accommodation: { ...accom, amenityAddons: updated } });
                      }}
                      className="w-3.5 h-3.5 rounded text-teal-500 bg-stone-900 border-stone-700 shrink-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={addon.name}
                      onChange={(e) => {
                        const updated = amenityAddons.map((a, i) =>
                          i === idx ? { ...a, name: e.target.value } : a
                        );
                        updateSectorSpecifics({ accommodation: { ...accom, amenityAddons: updated } });
                      }}
                      className="flex-1 min-w-0 bg-transparent text-white text-xs focus:outline-none border-b border-transparent focus:border-teal-500"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-stone-500">RM</span>
                      <input
                        type="number"
                        min={0}
                        disabled={isReadOnly}
                        value={addon.priceRm}
                        onChange={(e) => {
                          const updated = amenityAddons.map((a, i) =>
                            i === idx ? { ...a, priceRm: Number(e.target.value) } : a
                          );
                          updateSectorSpecifics({ accommodation: { ...accom, amenityAddons: updated } });
                        }}
                        className="w-14 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-emerald-300 font-mono tabular-nums text-xs text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakfast Included & Apartment Unit Breakdown */}
            <div className={`grid ${showApartmentUnitBlock ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-3 pt-2 border-t border-stone-800`}>
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900 border border-stone-800">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  Breakfast Option Included
                </span>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    const currentVal = !!accom.breakfastIncluded;
                    updateSectorSpecifics({
                      accommodation: { ...accom, breakfastIncluded: !currentVal },
                    });
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    accom.breakfastIncluded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {accom.breakfastIncluded ? 'Yes (Included)' : 'No'}
                </button>
              </div>

              {showApartmentUnitBlock && (
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <span className="text-xs font-semibold text-white block">
                    Unit &amp; Kitchen Breakdown
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Total Units</span>
                      <input
                        type="number"
                        min={1}
                        disabled={isReadOnly}
                        value={accom.apartment?.totalUnits ?? 1}
                        onChange={(e) => {
                          updateSectorSpecifics({
                            accommodation: {
                              ...accom,
                              apartment: { ...accom.apartment, totalUnits: Number(e.target.value) },
                            },
                          });
                        }}
                        className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-white font-mono tabular-nums text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Rooms / Unit</span>
                      <input
                        type="number"
                        min={1}
                        disabled={isReadOnly}
                        value={accom.apartment?.roomsPerUnit ?? 2}
                        onChange={(e) => {
                          updateSectorSpecifics({
                            accommodation: {
                              ...accom,
                              apartment: { ...accom.apartment, roomsPerUnit: Number(e.target.value) },
                            },
                          });
                        }}
                        className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-white font-mono tabular-nums text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Cooking?</span>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const cur = !!accom.apartment?.cookingPermitted;
                          updateSectorSpecifics({
                            accommodation: {
                              ...accom,
                              apartment: { ...accom.apartment, cookingPermitted: !cur },
                            },
                          });
                        }}
                        className={`w-full py-1 rounded font-bold transition-all text-center cursor-pointer ${
                          accom.apartment?.cookingPermitted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {accom.apartment?.cookingPermitted ? 'Permitted' : 'No'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          5.2 FOOD & BEVERAGE (F&B) SECTOR (Strictly isolated)
      ------------------------------------------------------------- */}
      {isFnB && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Utensils className="w-4 h-4 text-amber-400" />
            <span>5.2 Food &amp; Beverage (F&amp;B) Compliance &amp; Parking</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Dietary Compliance Toggles
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'halal_certified', label: 'Halal Certified' },
                { id: 'muslim_owned', label: 'Muslim-Owned' },
                { id: 'pork_free', label: 'Pork-Free' },
                { id: 'non_halal', label: 'Non-Halal' },
                { id: 'vegetarian_vegan', label: 'Vegetarian / Vegan Options' },
              ].map((dt) => {
                const selectedList =
                  specifics.foodBeverage?.dietaryCompliance || (vendor.dietaryTags as any) || [];
                const isSelected = selectedList.includes(dt.id);
                return (
                  <button
                    key={dt.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const newList = isSelected
                        ? selectedList.filter((x: string) => x !== dt.id)
                        : [...selectedList, dt.id];
                      updateSectorSpecifics({
                        foodBeverage: { ...specifics.foodBeverage, dietaryCompliance: newList },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white border border-amber-400'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {dt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-2">
                <ParkingCircle className="w-4 h-4 text-amber-400" />
                Dine-in Customer Parking Space Availability
              </span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const cur = !!specifics.foodBeverage?.parkingAvailable;
                  updateSectorSpecifics({
                    foodBeverage: { ...specifics.foodBeverage, parkingAvailable: !cur },
                  });
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  specifics.foodBeverage?.parkingAvailable
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {specifics.foodBeverage?.parkingAvailable ? 'Parking Available' : 'Limited Street Parking'}
              </button>
            </div>
            <input
              type="text"
              disabled={isReadOnly}
              value={
                specifics.foodBeverage?.parkingDetails ??
                'Dedicated customer lot in front of restaurant + street bays'
              }
              onChange={(e) => {
                updateSectorSpecifics({
                  foodBeverage: { ...specifics.foodBeverage, parkingDetails: e.target.value },
                });
              }}
              placeholder="Parking details (e.g. Free customer basement parking, street parking bays)"
              className="w-full px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5.3 RENTALS & EQUIPMENT INVENTORY MANAGEMENT (Vehicles, Tools, Gear — Strictly isolated)
      ------------------------------------------------------------- */}
      {isVehicleRental && (() => {
        const vr: VehicleRentalSpecifics = specifics.vehicleRental || {};
        const fleetUnits = vr.fleetUnits || [];
        const addOnPackages = vr.addOnPackages || rentalSubConfig.defaultAddons;
        const customHourPackages = vr.customHourPackages || [];
        const fuelPolicy = vr.fuelPolicy || 'none';
        const freeRaincoat = vr.freeRaincoat ?? false;
        const childrenHelmet = vr.childrenHelmet ?? false;
        const vendorRulesNotice = vr.vendorRulesNotice ?? vendor.vendorTerms ?? '';
        const calendarConfig = vr.bookingCalendar || {};
        const maintSched = vr.maintenanceSchedule || {};
        const blockedDates = calendarConfig.blockedDates || [];

        const selfCollectActive = vr.serviceOptions?.selfCollect ?? vr.serviceOptions?.selfPickup ?? true;
        const deliveredActive = vr.serviceOptions?.deliveredToRenter ?? vr.serviceOptions?.deliveryIncluded ?? true;
        const allowDays = vr.durationModels?.allowDays ?? true;
        const allowHours = vr.durationModels?.allowHours ?? true;

        return (
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-cyan-500/25 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Bike className="w-4 h-4 text-cyan-400" />
                <span>{rentalSubConfig.title}</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-cyan-300">
                {vr.maintenanceStatus === 'scheduled_maintenance'
                  ? 'Scheduled Maintenance'
                  : vr.maintenanceStatus === 'service_paused'
                  ? 'Service Paused'
                  : 'Inventory Operational'}
              </span>
            </div>

            {/* A. Inventory Counts & Maintenance State */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-stone-300 mb-1">
                  Total {rentalSubConfig.unitNoun}s
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={vr.totalFleetSize ?? (fleetUnits.length > 0 ? fleetUnits.length : 8)}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      vehicleRental: { ...vr, totalFleetSize: Number(e.target.value) },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono tabular-nums font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-emerald-300 mb-1">Active Ready Units</label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={vr.activeFleetCount ?? (fleetUnits.length > 0 ? fleetUnits.filter((u) => u.status === 'available').length : 6)}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      vehicleRental: { ...vr, activeFleetCount: Number(e.target.value) },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-emerald-500/30 text-emerald-300 font-mono tabular-nums font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-amber-300 mb-1">In Maintenance / Servicing</label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={vr.maintenanceCount ?? (fleetUnits.length > 0 ? fleetUnits.filter((u) => u.status === 'maintenance').length : 0)}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      vehicleRental: { ...vr, maintenanceCount: Number(e.target.value) },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-amber-500/30 text-amber-300 font-mono tabular-nums font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-stone-300 mb-1">Maintenance State</label>
                <select
                  disabled={isReadOnly}
                  value={vr.maintenanceStatus || 'operational'}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      vehicleRental: { ...vr, maintenanceStatus: e.target.value as any },
                    });
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs font-semibold"
                >
                  <option value="operational">Operational</option>
                  <option value="scheduled_maintenance">Maintenance Check</option>
                  <option value="service_paused">Rentals Paused</option>
                </select>
              </div>
            </div>

            {/* B. Live Availability Status (Many, Moderate, Less, Zero) */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Live Availability Status (Displayed on Traveler Marketplace)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'high', label: 'Many Units Available', activeClass: 'bg-emerald-600 text-white border-emerald-400' },
                  { id: 'medium', label: 'Moderate Availability', activeClass: 'bg-cyan-600 text-white border-cyan-400' },
                  { id: 'low', label: 'Less Units Left', activeClass: 'bg-amber-600 text-white border-amber-400' },
                  { id: 'sold_out', label: 'Zero Units Available', activeClass: 'bg-rose-600 text-white border-rose-400' },
                ].map((st) => {
                  const currentAvail = vr.realTimeAvailability || vendor.motorbikeFleetStatus || 'high';
                  const isSelected = currentAvail === st.id || (st.id === 'low' && currentAvail === 'limited');
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        onChange({
                          ...vendor,
                          motorbikeFleetStatus: st.id as any,
                          sectorSpecifics: {
                            ...vendor.sectorSpecifics,
                            vehicleRental: { ...vr, realTimeAvailability: st.id as any },
                          },
                        });
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? `${st.activeClass} shadow-md`
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C. Fulfillment Rules (Self-Collect vs Delivered to Renter) & Pick-up / Drop-off Hubs */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fulfillment Rules &amp; Pick-up / Drop-off Hubs</span>
                </span>
                <span className="text-[10px] font-mono text-stone-400">Self-Collect &amp; Delivery</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    const nextVal = !selfCollectActive;
                    updateSectorSpecifics({
                      vehicleRental: {
                        ...vr,
                        serviceOptions: { ...vr.serviceOptions, selfCollect: nextVal, selfPickup: nextVal },
                      },
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    selfCollectActive
                      ? 'bg-emerald-950/50 border-emerald-500/50 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div>
                    <span className="font-bold block">Self-Collect at Shop / Depot Hub</span>
                    <span className="text-[10px] text-stone-400">Renter picks up &amp; returns at hub</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selfCollectActive ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'}`}>
                    {selfCollectActive ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    const nextVal = !deliveredActive;
                    updateSectorSpecifics({
                      vehicleRental: {
                        ...vr,
                        serviceOptions: { ...vr.serviceOptions, deliveredToRenter: nextVal, deliveryIncluded: nextVal },
                      },
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    deliveredActive
                      ? 'bg-cyan-950/50 border-cyan-500/50 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div>
                    <span className="font-bold block">Delivered to Renter / Site</span>
                    <span className="text-[10px] text-stone-400">Drop-off to hotel, site, or terminal</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${deliveredActive ? 'bg-cyan-600 text-white' : 'bg-stone-800 text-stone-400'}`}>
                    {deliveredActive ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Primary Pick-up Hub</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={vr.serviceOptions?.pickupHubAddress ?? (vendor.address || `${vendor.township} Central Hub`)}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          serviceOptions: { ...vr.serviceOptions, pickupHubAddress: e.target.value },
                        },
                      });
                    }}
                    placeholder="e.g. Tanah Rata Terminal / Shop Lot 4"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Drop-off Locations</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={(vr.serviceOptions?.dropoffLocations || rentalSubConfig.defaultDropoffs).join(', ')}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          serviceOptions: {
                            ...vr.serviceOptions,
                            dropoffLocations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          },
                        },
                      });
                    }}
                    placeholder="Tanah Rata, Brinchang, Kea Farm"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Delivery Fee (RM)</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={vr.serviceOptions?.deliveryFeeRm ?? 15}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          serviceOptions: { ...vr.serviceOptions, deliveryFeeRm: Number(e.target.value) },
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums text-xs"
                  />
                </div>
              </div>
            </div>

            {/* D. Rental Duration Models (Days vs Hours) & Security Deposit Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rental Duration Models (Days / Hours)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          durationModels: { ...vr.durationModels, allowDays: !allowDays },
                        },
                      });
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      allowDays ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200' : 'bg-stone-950 border-stone-800 text-stone-500'
                    }`}
                  >
                    {allowDays ? '✓ ' : ''}By Days (Daily)
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          durationModels: { ...vr.durationModels, allowHours: !allowHours },
                        },
                      });
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      allowHours ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200' : 'bg-stone-950 border-stone-800 text-stone-500'
                    }`}
                  >
                    {allowHours ? '✓ ' : ''}By Hours (Hourly)
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Daily Rate (RM)</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly || !allowDays}
                      value={vr.durationModels?.defaultDailyRateRm ?? vr.baseDailyRateRm ?? 75}
                      onChange={(e) => {
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            baseDailyRateRm: Number(e.target.value),
                            durationModels: { ...vr.durationModels, defaultDailyRateRm: Number(e.target.value) },
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Hourly Rate (RM)</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly || !allowHours}
                      value={vr.durationModels?.defaultHourlyRateRm ?? vr.baseHourlyRateRm ?? 18}
                      onChange={(e) => {
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            baseHourlyRateRm: Number(e.target.value),
                            durationModels: { ...vr.durationModels, defaultHourlyRateRm: Number(e.target.value) },
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Min Hours</label>
                    <input
                      type="number"
                      min={1}
                      disabled={isReadOnly || !allowHours}
                      value={vr.durationModels?.minHours ?? 2}
                      onChange={(e) => {
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            durationModels: { ...vr.durationModels, minHours: Number(e.target.value) },
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Security Deposit Configuration */}
              <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Security Deposit Configuration</span>
                  </span>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const req = !(vr.depositConfig?.required ?? true);
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          depositConfig: { ...vr.depositConfig, required: req },
                        },
                      });
                    }}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                      (vr.depositConfig?.required ?? true) ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {(vr.depositConfig?.required ?? true) ? 'Deposit Required' : 'No Deposit'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Security Deposit (RM)</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly || !(vr.depositConfig?.required ?? true)}
                      value={vr.depositConfig?.depositAmountRm ?? 100}
                      onChange={(e) => {
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            depositConfig: { ...vr.depositConfig, depositAmountRm: Number(e.target.value) },
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-amber-300 font-mono tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">CamGo Lock-in Fee (RM)</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={vr.depositConfig?.lockInFeeRm ?? 20}
                      onChange={(e) => {
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            depositConfig: { ...vr.depositConfig, lockInFeeRm: Number(e.target.value) },
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-emerald-300 font-mono tabular-nums font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Deposit Terms &amp; Renter Requirements</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={vr.maintenanceAlertNote ?? rentalSubConfig.defaultDepositNote}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        vehicleRental: { ...vr, maintenanceAlertNote: e.target.value },
                      });
                    }}
                    className="w-full px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* E. Daily & Hourly Booking Calendar Rules + Maintenance Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Daily &amp; Hourly Booking Calendar</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Calendar Slot Mode</label>
                    <select
                      disabled={isReadOnly}
                      value={calendarConfig.bookingSlotMode || 'daily_and_hourly'}
                      onChange={(e) =>
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            bookingCalendar: { ...calendarConfig, bookingSlotMode: e.target.value as any },
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white"
                    >
                      <option value="daily_and_hourly">Daily &amp; Hourly Slots</option>
                      <option value="daily_only">Full-Day Rentals Only</option>
                      <option value="hourly_only">Hourly Time-Slots Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Min Advance Notice (Hrs)</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={calendarConfig.minAdvanceHours ?? 2}
                      onChange={(e) =>
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            bookingCalendar: { ...calendarConfig, minAdvanceHours: Number(e.target.value) },
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Turnover Buffer (Mins)</label>
                    <input
                      type="number"
                      min={0}
                      step={15}
                      disabled={isReadOnly}
                      value={calendarConfig.bufferMinutesBetweenRentals ?? 30}
                      onChange={(e) =>
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            bookingCalendar: {
                              ...calendarConfig,
                              bufferMinutesBetweenRentals: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Weekend Peak Surcharge (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={isReadOnly}
                      value={calendarConfig.peakWeekendSurchargePercent ?? 0}
                      onChange={(e) =>
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            bookingCalendar: {
                              ...calendarConfig,
                              peakWeekendSurchargePercent: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-amber-300 font-mono tabular-nums"
                    />
                  </div>
                </div>

                {/* Blackout / Blocked Dates */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] text-stone-400 block">
                    Blocked Calendar Dates (Maintenance / Off-Days)
                  </label>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={newBlockedDate}
                        onChange={(e) => setNewBlockedDate(e.target.value)}
                        className="flex-1 px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newBlockedDate || blockedDates.includes(newBlockedDate)) return;
                          updateSectorSpecifics({
                            vehicleRental: {
                              ...vr,
                              bookingCalendar: {
                                ...calendarConfig,
                                blockedDates: [...blockedDates, newBlockedDate].sort(),
                              },
                            },
                          });
                          setNewBlockedDate('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 text-[11px] font-bold cursor-pointer"
                      >
                        Block Date
                      </button>
                    </div>
                  )}
                  {blockedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {blockedDates.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-950 border border-stone-700 text-[10px] font-mono text-stone-300"
                        >
                          {d}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectorSpecifics({
                                  vehicleRental: {
                                    ...vr,
                                    bookingCalendar: {
                                      ...calendarConfig,
                                      blockedDates: blockedDates.filter((x) => x !== d),
                                    },
                                  },
                                })
                              }
                              className="text-rose-400 hover:text-rose-300 cursor-pointer"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Maintenance Schedule */}
              <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>Maintenance Schedule &amp; Inspection Log</span>
                </span>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Next Scheduled Service Date</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={maintSched.nextInspectionDate || ''}
                    onChange={(e) =>
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          maintenanceSchedule: { ...maintSched, nextInspectionDate: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Service Interval / Checklist Note</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={maintSched.intervalNote ?? 'Full brake, tyre pressure & safety check every 14 days'}
                    onChange={(e) =>
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          maintenanceSchedule: { ...maintSched, intervalNote: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-stone-300">Auto-hide units flagged for Maintenance</span>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() =>
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          maintenanceSchedule: {
                            ...maintSched,
                            autoBlockOnService: !(maintSched.autoBlockOnService ?? true),
                          },
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                      (maintSched.autoBlockOnService ?? true)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {(maintSched.autoBlockOnService ?? true) ? 'Auto-Block ON' : 'Manual'}
                  </button>
                </div>
              </div>
            </div>

            {/* F. Custom Rental Packages, Equipment Add-ons, Policies & Rules */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Custom Rental Packages &amp; Equipment Add-ons</span>
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextAddons = [
                        ...addOnPackages,
                        {
                          id: 'addon-' + Date.now(),
                          name: `Custom ${rentalSubConfig.unitNoun} Add-on`,
                          priceRm: 15,
                          enabled: true,
                          category: 'other' as const,
                        },
                      ];
                      updateSectorSpecifics({ vehicleRental: { ...vr, addOnPackages: nextAddons } });
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                )}
              </div>

              {/* Fuel Policy, Free Waterproof Raincoat, Children's Helmet */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                {/* Fuel Policy Segmented Toggle */}
                <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 space-y-2">
                  <span className="text-[11px] font-bold text-stone-200 block">
                    Fuel Policy on Handover
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'none', label: 'No Fuel' },
                        { id: 'half_tank', label: 'Half Tank' },
                        { id: 'full_tank', label: 'Full Tank' },
                      ] as const
                    ).map((fp) => (
                      <button
                        key={fp.id}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() =>
                          updateSectorSpecifics({
                            vehicleRental: { ...vr, fuelPolicy: fp.id },
                          })
                        }
                        className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          fuelPolicy === fp.id
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                            : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                        }`}
                      >
                        {fp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free Waterproof Raincoat */}
                <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-stone-200 block">
                      Free Waterproof Raincoat
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Provided free with rental
                    </span>
                  </div>
                  <div className="inline-flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 shrink-0">
                    {[
                      { val: true, label: 'Yes' },
                      { val: false, label: 'No' },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() =>
                          updateSectorSpecifics({
                            vehicleRental: { ...vr, freeRaincoat: opt.val },
                          })
                        }
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                          freeRaincoat === opt.val
                            ? opt.val
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-700 text-white'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Children's Helmet */}
                <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-stone-200 block">
                      Children&apos;s Helmet
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Child-size available on request
                    </span>
                  </div>
                  <div className="inline-flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 shrink-0">
                    {[
                      { val: true, label: 'Yes' },
                      { val: false, label: 'No' },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() =>
                          updateSectorSpecifics({
                            vehicleRental: { ...vr, childrenHelmet: opt.val },
                          })
                        }
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                          childrenHelmet === opt.val
                            ? opt.val
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-700 text-white'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Hour Packages (e.g. 4-Hour Express, Half-Day 6 Hrs) */}
              <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Custom Hour Packages (Optional Deals)</span>
                  </span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [
                          ...customHourPackages,
                          {
                            id: 'hrpkg-' + Date.now(),
                            label: `${customHourPackages.length === 0 ? 'Half-Day Highland Loop' : 'Sunset Ride Package'}`,
                            hours: customHourPackages.length === 0 ? 4 : 6,
                            priceRm: customHourPackages.length === 0 ? 45 : 60,
                            enabled: true,
                          },
                        ];
                        updateSectorSpecifics({ vehicleRental: { ...vr, customHourPackages: next } });
                      }}
                      className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Hour Package
                    </button>
                  )}
                </div>

                {customHourPackages.length === 0 ? (
                  <p className="text-[11px] text-stone-500 italic">
                    No custom hour packages configured yet. Click &quot;Add Hour Package&quot; to offer 3hr/4hr/6hr bundles.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customHourPackages.map((pkg, idx) => (
                      <div
                        key={pkg.id}
                        className={`p-2 rounded-xl border flex flex-wrap items-center gap-1.5 text-xs ${
                          pkg.enabled ? 'bg-stone-900 border-cyan-500/30' : 'bg-stone-950 border-stone-800 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={pkg.enabled}
                          onChange={(e) => {
                            const updated = customHourPackages.map((item, i) =>
                              i === idx ? { ...item, enabled: e.target.checked } : item
                            );
                            updateSectorSpecifics({ vehicleRental: { ...vr, customHourPackages: updated } });
                          }}
                          className="w-3.5 h-3.5 rounded text-cyan-500 bg-stone-900 border-stone-700 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={pkg.label}
                          onChange={(e) => {
                            const updated = customHourPackages.map((item, i) =>
                              i === idx ? { ...item, label: e.target.value } : item
                            );
                            updateSectorSpecifics({ vehicleRental: { ...vr, customHourPackages: updated } });
                          }}
                          placeholder="Package Label"
                          className="flex-1 min-w-[110px] bg-transparent text-white text-xs focus:outline-none border-b border-transparent focus:border-cyan-500"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min={1}
                            disabled={isReadOnly}
                            value={pkg.hours}
                            onChange={(e) => {
                              const updated = customHourPackages.map((item, i) =>
                                i === idx ? { ...item, hours: Math.max(1, Number(e.target.value)) } : item
                              );
                              updateSectorSpecifics({ vehicleRental: { ...vr, customHourPackages: updated } });
                            }}
                            className="w-11 px-1 py-0.5 rounded bg-stone-950 border border-stone-700 text-cyan-300 font-mono text-[11px] text-right"
                          />
                          <span className="text-[10px] text-stone-400">hrs</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-stone-400">RM</span>
                          <input
                            type="number"
                            min={0}
                            disabled={isReadOnly}
                            value={pkg.priceRm}
                            onChange={(e) => {
                              const updated = customHourPackages.map((item, i) =>
                                i === idx ? { ...item, priceRm: Math.max(0, Number(e.target.value)) } : item
                              );
                              updateSectorSpecifics({ vehicleRental: { ...vr, customHourPackages: updated } });
                            }}
                            className="w-12 px-1 py-0.5 rounded bg-stone-950 border border-stone-700 text-emerald-300 font-mono text-[11px] text-right"
                          />
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = customHourPackages.filter((_, i) => i !== idx);
                              updateSectorSpecifics({ vehicleRental: { ...vr, customHourPackages: updated } });
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                            title="Remove Package"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Paid Equipment Add-on Packages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {addOnPackages.map((addon, idx) => (
                  <div
                    key={addon.id}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      addon.enabled
                        ? 'bg-stone-950 border-emerald-500/40'
                        : 'bg-stone-950/50 border-stone-800 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={addon.enabled}
                      onChange={(e) => {
                        const updated = addOnPackages.map((a, i) =>
                          i === idx ? { ...a, enabled: e.target.checked } : a
                        );
                        updateSectorSpecifics({ vehicleRental: { ...vr, addOnPackages: updated } });
                      }}
                      className="w-3.5 h-3.5 rounded text-emerald-500 bg-stone-900 border-stone-700 shrink-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={addon.name}
                      onChange={(e) => {
                        const updated = addOnPackages.map((a, i) =>
                          i === idx ? { ...a, name: e.target.value } : a
                        );
                        updateSectorSpecifics({ vehicleRental: { ...vr, addOnPackages: updated } });
                      }}
                      className="flex-1 min-w-0 bg-transparent text-white text-xs focus:outline-none border-b border-transparent focus:border-cyan-500"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-stone-500">RM</span>
                      <input
                        type="number"
                        min={0}
                        disabled={isReadOnly}
                        value={addon.priceRm}
                        onChange={(e) => {
                          const updated = addOnPackages.map((a, i) =>
                            i === idx ? { ...a, priceRm: Number(e.target.value) } : a
                          );
                          updateSectorSpecifics({ vehicleRental: { ...vr, addOnPackages: updated } });
                        }}
                        className="w-14 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-emerald-300 font-mono tabular-nums text-xs text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Vendor Rules & Notice Multi-line Editor */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-amber-300 block">
                  Vendor Rules &amp; Notice (Shown on Public Card &amp; Booking Modal)
                </label>
                <textarea
                  rows={3}
                  disabled={isReadOnly}
                  value={vendorRulesNotice}
                  onChange={(e) => {
                    const nextText = e.target.value;
                    onChange({
                      ...vendor,
                      vendorTerms: nextText,
                      sectorSpecifics: {
                        ...vendor.sectorSpecifics,
                        vehicleRental: {
                          ...vr,
                          vendorRulesNotice: nextText,
                        },
                      },
                    });
                  }}
                  placeholder="e.g., Must hold valid B2/B license, deposit refundable upon return with same fuel level. No riding beyond Blue Valley / Lojing after 8PM."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* G. Individual Rental Inventory & Equipment Unit List */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Active {rentalSubConfig.unitNoun} Inventory &amp; Maintenance Log
                  </span>
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const template = rentalSubConfig.sampleItems[0];
                      const modelName = template ? template.name : `${rentalSubConfig.unitNoun} #${fleetUnits.length + 1}`;
                      const guessedType = modelName.toLowerCase().includes('scooter') || modelName.toLowerCase().includes('vario') || modelName.toLowerCase().includes('nmax') || modelName.toLowerCase().includes('beat') || modelName.toLowerCase().includes('avantiz')
                        ? ('scooter' as const)
                        : ('motorbike' as const);
                      const nextUnits = [
                        ...fleetUnits,
                        {
                          id: 'unit-' + Date.now(),
                          model: modelName,
                          vehicleType: guessedType,
                          plateOrCode: `INV-${101 + fleetUnits.length}`,
                          status: 'available' as const,
                          dailyRateRm: template?.dailyRateRm ?? 80,
                          hourlyRateRm: template?.hourlyRateRm ?? 18,
                        },
                      ];
                      updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: nextUnits } });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add {rentalSubConfig.unitNoun}
                  </button>
                )}
              </div>

              {fleetUnits.length === 0 ? (
                <div className="p-4 rounded-xl bg-stone-950/70 border border-dashed border-stone-800 text-center space-y-2">
                  <p className="text-xs text-stone-400">
                    No {rentalSubConfig.unitNoun.toLowerCase()} units logged yet for{' '}
                    <strong className="text-white">{vendor.businessName}</strong>.
                  </p>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const starter = rentalSubConfig.sampleItems.map((s, i) => ({
                          id: `unit-${Date.now()}-${i}`,
                          model: s.name,
                          vehicleType: (s.name.toLowerCase().includes('scooter') || s.name.toLowerCase().includes('vario') || s.name.toLowerCase().includes('nmax') || s.name.toLowerCase().includes('beat') || s.name.toLowerCase().includes('avantiz')) ? ('scooter' as const) : ('motorbike' as const),
                          plateOrCode: s.code,
                          status: 'available' as const,
                          dailyRateRm: s.dailyRateRm,
                          hourlyRateRm: s.hourlyRateRm,
                        }));
                        updateSectorSpecifics({
                          vehicleRental: {
                            ...vr,
                            fleetUnits: starter,
                            totalFleetSize: starter.length,
                            activeFleetCount: starter.length,
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold cursor-pointer"
                    >
                      + Load Starter {rentalSubConfig.unitNoun} Inventory
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {fleetUnits.map((unit, idx) => (
                    <div
                      key={unit.id}
                      className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap lg:flex-nowrap items-center gap-2 text-xs"
                    >
                      {isMotorbikeSector && (
                        <select
                          disabled={isReadOnly}
                          value={unit.vehicleType || (unit.model.toLowerCase().includes('scooter') || unit.model.toLowerCase().includes('vario') || unit.model.toLowerCase().includes('nmax') || unit.model.toLowerCase().includes('beat') || unit.model.toLowerCase().includes('avantiz') ? 'scooter' : 'motorbike')}
                          onChange={(e) => {
                            const next = fleetUnits.map((u, i) =>
                              i === idx ? { ...u, vehicleType: e.target.value as 'scooter' | 'motorbike' } : u
                            );
                            updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                          }}
                          className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-cyan-300 font-bold text-[11px]"
                        >
                          <option value="scooter">Scooter</option>
                          <option value="motorbike">Motorbike</option>
                        </select>
                      )}
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={unit.model}
                        onChange={(e) => {
                          const next = fleetUnits.map((u, i) =>
                            i === idx ? { ...u, model: e.target.value } : u
                          );
                          updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                        }}
                        placeholder={`${rentalSubConfig.unitNoun} Name / Model`}
                        className="flex-1 min-w-[160px] px-2 py-1 rounded bg-stone-900 border border-stone-700 text-white font-semibold"
                      />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={unit.plateOrCode || ''}
                        onChange={(e) => {
                          const next = fleetUnits.map((u, i) =>
                            i === idx ? { ...u, plateOrCode: e.target.value } : u
                          );
                          updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                        }}
                        placeholder={rentalSubConfig.codeLabel}
                        className="w-28 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 font-mono"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-stone-500">Day RM</span>
                        <input
                          type="number"
                          min={0}
                          disabled={isReadOnly}
                          value={unit.dailyRateRm}
                          onChange={(e) => {
                            const next = fleetUnits.map((u, i) =>
                              i === idx ? { ...u, dailyRateRm: Number(e.target.value) } : u
                            );
                            updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                          }}
                          className="w-16 px-1.5 py-1 rounded bg-stone-900 border border-stone-700 text-emerald-300 font-mono tabular-nums text-right"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-stone-500">Hr RM</span>
                        <input
                          type="number"
                          min={0}
                          disabled={isReadOnly}
                          value={unit.hourlyRateRm ?? 0}
                          onChange={(e) => {
                            const next = fleetUnits.map((u, i) =>
                              i === idx ? { ...u, hourlyRateRm: Number(e.target.value) } : u
                            );
                            updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                          }}
                          className="w-14 px-1.5 py-1 rounded bg-stone-900 border border-stone-700 text-cyan-300 font-mono tabular-nums text-right"
                        />
                      </div>
                      <select
                        disabled={isReadOnly}
                        value={unit.status}
                        onChange={(e) => {
                          const next = fleetUnits.map((u, i) =>
                            i === idx ? { ...u, status: e.target.value as any } : u
                          );
                          updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                        }}
                        className={`px-2 py-1 rounded border text-[11px] font-bold ${
                          unit.status === 'available'
                            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                            : unit.status === 'rented'
                            ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
                            : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        <option value="available">Active Ready</option>
                        <option value="rented">Active Rental</option>
                        <option value="maintenance">Maintenance Req.</option>
                      </select>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = fleetUnits.filter((_, i) => i !== idx);
                            updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                          }}
                          className="p-1.5 rounded bg-rose-950/50 text-rose-300 hover:bg-rose-900 cursor-pointer"
                          title="Remove Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          5.4 AGRITOURISM & FARMS (Strictly isolated)
      ------------------------------------------------------------- */}
      {isAgritourism && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <Sun className="w-4 h-4 text-emerald-400" />
            <span>5.4 Agritourism &amp; Farm Harvest Toggles</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
              <span className="font-semibold text-white">Picking Season Active</span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const cur = !!(specifics.agritourismFarm?.pickingSeasonActive ?? true);
                  updateSectorSpecifics({
                    agritourismFarm: { ...specifics.agritourismFarm, pickingSeasonActive: !cur },
                  });
                }}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  (specifics.agritourismFarm?.pickingSeasonActive ?? true)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {(specifics.agritourismFarm?.pickingSeasonActive ?? true) ? 'Active' : 'Closed'}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
              <span className="font-semibold text-white">Customer Self-Picking</span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const cur = !!(specifics.agritourismFarm?.selfPickingAllowed ?? true);
                  updateSectorSpecifics({
                    agritourismFarm: { ...specifics.agritourismFarm, selfPickingAllowed: !cur },
                  });
                }}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  (specifics.agritourismFarm?.selfPickingAllowed ?? true)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {(specifics.agritourismFarm?.selfPickingAllowed ?? true) ? 'Allowed' : 'No'}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
              <span className="font-semibold text-white">On-Farm Delivery</span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const cur = !!specifics.agritourismFarm?.onFarmDelivery;
                  updateSectorSpecifics({
                    agritourismFarm: { ...specifics.agritourismFarm, onFarmDelivery: !cur },
                  });
                }}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  specifics.agritourismFarm?.onFarmDelivery
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {specifics.agritourismFarm?.onFarmDelivery ? 'Yes' : 'No'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Produce Harvested &amp; Offered
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={(
                specifics.agritourismFarm?.produceTypes || [
                  'Strawberries',
                  'Hydroponic Greens',
                  'Highland Honey',
                ]
              ).join(', ')}
              onChange={(e) => {
                const arr = e.target.value.split(',').map((s) => s.trim());
                updateSectorSpecifics({
                  agritourismFarm: { ...specifics.agritourismFarm, produceTypes: arr },
                });
              }}
              placeholder="e.g. Strawberries, Hydroponic Lettuce, Lavender, Honey"
              className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5.5 SPECIALIZED SERVICES: SURPRISE DELIVERY SERVICES (Strictly isolated)
      ------------------------------------------------------------- */}
      {isSurpriseDelivery && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
            <Gift className="w-4 h-4 text-rose-400" />
            <span>5.5 Surprise Delivery Services Logistics &amp; Packages</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Service Offerings &amp; Packages
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'birthday_surprise', label: 'Birthday Surprise' },
                { id: 'anniversary_bundle', label: 'Anniversary Special' },
                { id: 'graduation_celebration', label: 'Graduation Package' },
                { id: 'romantic_setup', label: 'Romantic Hotel Setup' },
                { id: 'corporate_bundles', label: 'Corporate Bundles' },
              ].map((pkg) => {
                const currentPkgs = specifics.surpriseDelivery?.packages || [
                  'birthday_surprise',
                  'anniversary_bundle',
                  'romantic_setup',
                ];
                const isSelected = currentPkgs.includes(pkg.id);
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const updatedPkgs = isSelected
                        ? currentPkgs.filter((p) => p !== pkg.id)
                        : [...currentPkgs, pkg.id];
                      updateSectorSpecifics({
                        surpriseDelivery: { ...specifics.surpriseDelivery, packages: updatedPkgs },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border border-rose-400'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {pkg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Fixed-Time Slot Delivery</span>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    const cur = !!(specifics.surpriseDelivery?.deliveryLogistics?.fixedTimeSlotDelivery ?? true);
                    updateSectorSpecifics({
                      surpriseDelivery: {
                        ...specifics.surpriseDelivery,
                        deliveryLogistics: {
                          ...specifics.surpriseDelivery?.deliveryLogistics,
                          fixedTimeSlotDelivery: !cur,
                        },
                      },
                    });
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                    (specifics.surpriseDelivery?.deliveryLogistics?.fixedTimeSlotDelivery ?? true)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {(specifics.surpriseDelivery?.deliveryLogistics?.fixedTimeSlotDelivery ?? true) ? 'Yes' : 'No'}
                </button>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 block mb-1">Same-Day Cutoff Time</span>
                <input
                  type="time"
                  disabled={isReadOnly}
                  value={specifics.surpriseDelivery?.deliveryLogistics?.sameDayCutoffTime || '14:00'}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      surpriseDelivery: {
                        ...specifics.surpriseDelivery,
                        deliveryLogistics: {
                          ...specifics.surpriseDelivery?.deliveryLogistics,
                          sameDayCutoffTime: e.target.value,
                        },
                      },
                    });
                  }}
                  className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
              <span className="font-semibold text-white block">Surprise Execution Styles</span>
              <div className="space-y-1">
                {[
                  { id: 'flash_mob', label: 'Flash Mob Delivery' },
                  { id: 'singing_telegram', label: 'Singing Telegram' },
                  { id: 'stealth_dropoff', label: 'Stealth Drop-off' },
                  { id: 'photo_video_included', label: 'Photo/Video Included' },
                ].map((st) => {
                  const currentStyles = specifics.surpriseDelivery?.deliveryLogistics?.executionStyle || [
                    'stealth_dropoff',
                    'photo_video_included',
                  ];
                  const isChecked = currentStyles.includes(st.id as any);
                  return (
                    <label key={st.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={isChecked}
                        onChange={(e) => {
                          const newStyles = e.target.checked
                            ? [...currentStyles, st.id as any]
                            : currentStyles.filter((x) => x !== st.id);
                          updateSectorSpecifics({
                            surpriseDelivery: {
                              ...specifics.surpriseDelivery,
                              deliveryLogistics: {
                                ...specifics.surpriseDelivery?.deliveryLogistics,
                                executionStyle: newStyles,
                              },
                            },
                          });
                        }}
                        className="w-3.5 h-3.5 rounded text-rose-600 bg-stone-950 border-stone-700 focus:ring-0"
                      />
                      <span className="text-stone-300 font-medium">{st.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Add-on Options</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'custom_message_card', label: 'Custom Message Card' },
                { id: 'polaroid_printing', label: 'Polaroid Printing' },
                { id: 'fairy_lights', label: 'Fairy Lights Drizzle' },
                { id: 'chocolate_addons', label: 'Highland Chocolates' },
              ].map((ao) => {
                const currentAddons = specifics.surpriseDelivery?.addOnOptions || [
                  'custom_message_card',
                  'polaroid_printing',
                  'fairy_lights',
                ];
                const isSelected = currentAddons.includes(ao.id as any);
                return (
                  <button
                    key={ao.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const updated = isSelected
                        ? currentAddons.filter((x) => x !== ao.id)
                        : [...currentAddons, ao.id as any];
                      updateSectorSpecifics({
                        surpriseDelivery: { ...specifics.surpriseDelivery, addOnOptions: updated },
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border border-rose-400'
                        : 'bg-stone-900 text-stone-400 border border-stone-800'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {ao.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5.6 SPECIALIZED SERVICES: SURPRISE PLANNERS & EVENT COORDINATORS
      ------------------------------------------------------------- */}
      {isSurprisePlanner && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>5.6 Surprise Planners &amp; Event Coordinators Scale &amp; Inclusions</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Event Specializations
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'proposals', label: 'Marriage Proposals' },
                { id: 'anniversaries', label: 'Anniversary Dinners' },
                { id: 'milestone_birthdays', label: 'Milestone Birthdays' },
                { id: 'romantic_dinners', label: 'Private Hilltop Dinners' },
                { id: 'room_makeovers', label: 'Hotel Room Makeovers' },
                { id: 'trunk_surprises', label: 'Car Trunk Surprises' },
              ].map((sp) => {
                const currentSpecs = specifics.surprisePlanner?.eventSpecializations || [
                  'proposals',
                  'anniversaries',
                  'room_makeovers',
                  'trunk_surprises',
                ];
                const isSelected = currentSpecs.includes(sp.id as any);
                return (
                  <button
                    key={sp.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const updated = isSelected
                        ? currentSpecs.filter((x) => x !== sp.id)
                        : [...currentSpecs, sp.id as any];
                      updateSectorSpecifics({
                        surprisePlanner: { ...specifics.surprisePlanner, eventSpecializations: updated },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border border-purple-400'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {sp.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
              <span className="font-semibold text-white block">Package Tiers &amp; Scale</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'basic_setup', label: 'Basic Setup' },
                  { id: 'premium_styling', label: 'Premium Styling' },
                  { id: 'luxury_custom', label: 'Luxury Custom Production' },
                ].map((tier) => {
                  const currentTiers = specifics.surprisePlanner?.packageTiers || [
                    'basic_setup',
                    'premium_styling',
                    'luxury_custom',
                  ];
                  const isSelected = currentTiers.includes(tier.id as any);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        const updated = isSelected
                          ? currentTiers.filter((x) => x !== tier.id)
                          : [...currentTiers, tier.id as any];
                        updateSectorSpecifics({
                          surprisePlanner: { ...specifics.surprisePlanner, packageTiers: updated },
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        isSelected ? 'bg-purple-700 text-white' : 'bg-stone-950 text-stone-400'
                      }`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
              <span className="font-semibold text-white block">Setup Logistics Included</span>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={specifics.surprisePlanner?.setupLogistics?.venueCoordinationIncluded ?? true}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        surprisePlanner: {
                          ...specifics.surprisePlanner,
                          setupLogistics: {
                            ...specifics.surprisePlanner?.setupLogistics,
                            venueCoordinationIncluded: e.target.checked,
                          },
                        },
                      });
                    }}
                    className="w-3.5 h-3.5 rounded text-purple-600 bg-stone-950 border-stone-700 focus:ring-0"
                  />
                  <span className="text-stone-300 font-medium">Venue Coordination Included</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={specifics.surprisePlanner?.setupLogistics?.cleanUpTeardownIncluded ?? true}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        surprisePlanner: {
                          ...specifics.surprisePlanner,
                          setupLogistics: {
                            ...specifics.surprisePlanner?.setupLogistics,
                            cleanUpTeardownIncluded: e.target.checked,
                          },
                        },
                      });
                    }}
                    className="w-3.5 h-3.5 rounded text-purple-600 bg-stone-950 border-stone-700 focus:ring-0"
                  />
                  <span className="text-stone-300 font-medium">Clean-Up &amp; Teardown Included</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Inclusions &amp; Talent Collaborations
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'private_chef', label: 'Private Chef Booking' },
                { id: 'secret_photographer', label: 'Secret Photographer' },
                { id: 'musician_bookings', label: 'Musician / Violinist' },
              ].map((inc) => {
                const currentInclusions = specifics.surprisePlanner?.inclusionsCollaborations || [
                  'secret_photographer',
                ];
                const isSelected = currentInclusions.includes(inc.id as any);
                return (
                  <button
                    key={inc.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const updated = isSelected
                        ? currentInclusions.filter((x) => x !== inc.id)
                        : [...currentInclusions, inc.id as any];
                      updateSectorSpecifics({
                        surprisePlanner: { ...specifics.surprisePlanner, inclusionsCollaborations: updated },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border border-purple-400'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {inc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5.7 RETAIL & PHYSICAL PRODUCTS (Strictly isolated)
      ------------------------------------------------------------- */}
      {isRetail && (() => {
        const rp: RetailProductSpecifics = specifics.retailProducts || {};
        const modes = rp.fulfillmentModes || ['in_store_pickup', 'local_delivery'];
        return (
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-emerald-500/25 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>5.7 Retail Stock, Fulfillment &amp; Wholesale Attributes</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-medium text-stone-300 mb-1">Inventory Stock Status</label>
                <select
                  disabled={isReadOnly}
                  value={rp.stockStatus || 'in_stock'}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      retailProducts: { ...rp, stockStatus: e.target.value as any },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-semibold"
                >
                  <option value="in_stock">Ready Stock In Store</option>
                  <option value="low_stock">Limited Stock Remaining</option>
                  <option value="pre_order">Pre-Order / Fresh Batch</option>
                  <option value="out_of_stock">Temporarily Sold Out</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1">Min Order Quantity</label>
                <input
                  type="number"
                  min={1}
                  disabled={isReadOnly}
                  value={rp.minOrderQty ?? 1}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      retailProducts: { ...rp, minOrderQty: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono tabular-nums"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() =>
                    updateSectorSpecifics({
                      retailProducts: { ...rp, wholesaleAvailable: !rp.wholesaleAvailable },
                    })
                  }
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rp.wholesaleAvailable
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-stone-900 text-stone-400 border-stone-800'
                  }`}
                >
                  {rp.wholesaleAvailable ? '✓ Wholesale / Bulk Orders Active' : 'Retail Only (No Wholesale)'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Fulfillment Channels</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'in_store_pickup', label: 'In-Store Self Pick-up' },
                  { id: 'local_delivery', label: 'Highland Local Runner' },
                  { id: 'courier_shipping', label: 'Nationwide Courier Shipping' },
                ].map((m) => {
                  const active = modes.includes(m.id as any);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        const nextModes = active
                          ? modes.filter((x) => x !== m.id)
                          : [...modes, m.id as any];
                        updateSectorSpecifics({
                          retailProducts: { ...rp, fulfillmentModes: nextModes },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white border border-emerald-400'
                          : 'bg-stone-900 text-stone-400 border border-stone-800'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          5.8 PROFESSIONAL & HOME SERVICES (Strictly isolated)
      ------------------------------------------------------------- */}
      {isProfessionalServices && (() => {
        const ps: ProfessionalServiceSpecifics = specifics.professionalServices || {};
        return (
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-indigo-500/25 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>5.8 Service Dispatch, Callout Fees &amp; Warranty Controls</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-medium text-stone-300 mb-1">Coverage Radius / Townships</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={ps.serviceRadius ?? 'All Cameron Highlands Townships'}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      professionalServices: { ...ps, serviceRadius: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-stone-300 mb-1">Standard Callout / Inspection (RM)</label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={ps.baseCalloutFeeRm ?? 50}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      professionalServices: { ...ps, baseCalloutFeeRm: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium text-stone-300 mb-1">Service Warranty (Months)</label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={ps.warrantyMonths ?? 3}
                  onChange={(e) =>
                    updateSectorSpecifics({
                      professionalServices: { ...ps, warrantyMonths: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  updateSectorSpecifics({
                    professionalServices: {
                      ...ps,
                      onSiteVisitAvailable: !(ps.onSiteVisitAvailable ?? true),
                    },
                  })
                }
                className={`p-2.5 rounded-xl border font-bold text-left flex items-center justify-between cursor-pointer ${
                  (ps.onSiteVisitAvailable ?? true)
                    ? 'bg-indigo-950/50 border-indigo-500/50 text-white'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <span>On-Site / Home Visit Dispatch</span>
                <span>{(ps.onSiteVisitAvailable ?? true) ? 'ACTIVE' : 'OFF'}</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  updateSectorSpecifics({
                    professionalServices: {
                      ...ps,
                      emergencyCallout24h: !ps.emergencyCallout24h,
                    },
                  })
                }
                className={`p-2.5 rounded-xl border font-bold text-left flex items-center justify-between cursor-pointer ${
                  ps.emergencyCallout24h
                    ? 'bg-emerald-950/50 border-emerald-500/50 text-white'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <span>24/7 Emergency Standby</span>
                <span>{ps.emergencyCallout24h ? '24H READY' : 'STANDARD HOURS'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          5.9 TOURS, ATTRACTIONS & EVENT VENUES (Strictly isolated)
      ------------------------------------------------------------- */}
      {isTourismAttractions && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-rose-500/25 space-y-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <Compass className="w-4 h-4 text-rose-400" />
            <span>5.9 Tour Operations, Ticketing &amp; Venue Capacity Controls</span>
          </div>
          <p className="text-stone-400">
            Admission slots, guided departures, and ticket packages configured below in your Tour &amp; Attraction Catalog sync directly to CamGo Travelers.
          </p>
        </div>
      )}
    </div>
  );
};
