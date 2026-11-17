import React from 'react';
import {
  VendorListing,
  VendorSectorSpecifics,
  AccommodationSpecifics,
  FoodBeverageSpecifics,
  VehicleRentalSpecifics,
  AgritourismFarmSpecifics,
  SurpriseDeliverySpecifics,
  SurprisePlannerSpecifics,
} from '../types';
import {
  ParkingCircle,
  Coffee,
  Home,
  Utensils,
  Bike,
  Sun,
  Gift,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  Car,
  Wrench,
  DollarSign,
  AlertTriangle,
  Truck,
} from 'lucide-react';

interface DynamicBusinessNatureFieldsProps {
  vendor: VendorListing;
  onChange: (updatedVendor: VendorListing) => void;
  isReadOnly?: boolean;
}

export const DynamicBusinessNatureFields: React.FC<DynamicBusinessNatureFieldsProps> = ({
  vendor,
  onChange,
  isReadOnly = false,
}) => {
  const specifics: VendorSectorSpecifics = vendor.sectorSpecifics || {};
  const subCatStr = (vendor.subCategory || '') as string;
  const catStr = (vendor.category || '') as string;

  // Determine active sector type
  const isAccommodation =
    catStr === 'accommodation' ||
    subCatStr.startsWith('realestate_') ||
    subCatStr === 'hotels_resorts' ||
    subCatStr === 'hostels_roomstay';

  const isFnB =
    catStr === 'food' ||
    subCatStr.startsWith('fb_') ||
    subCatStr === 'dining';

  const isVehicleRental =
    catStr === 'transport' ||
    subCatStr.startsWith('rental_') ||
    subCatStr === 'car_bike_rentals';

  const isMotorbikeSector =
    subCatStr === 'rental_motorcycle_scooter' ||
    subCatStr === 'car_bike_rentals' ||
    vendor.businessName.toLowerCase().includes('motor') ||
    vendor.businessName.toLowerCase().includes('scooter') ||
    vendor.businessName.toLowerCase().includes('skuter');

  const isAgritourism =
    subCatStr === 'agrotourism_farms' ||
    subCatStr === 'tourism_agritourism_farm' ||
    subCatStr === 'realestate_agritourism_farm' ||
    vendor.businessName.toLowerCase().includes('strawberry') ||
    vendor.businessName.toLowerCase().includes('farm');

  const isSurpriseDelivery = subCatStr === 'services_surprise_delivery';
  const isSurprisePlanner = subCatStr === 'services_surprise_planner';

  // Helper to update specific sector specifics safely
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Dynamic Business Nature Controls &amp; Context-Aware Attributes</span>
        </h3>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase">
          {isAccommodation && '5.1 Accommodation Sector'}
          {isFnB && '5.2 Food & Beverage Sector'}
          {isVehicleRental && (isMotorbikeSector ? '5.3 Motorbikes, Scooters & Micro-Mobility' : '5.3 Rentals & Equipment Sector')}
          {isAgritourism && '5.4 Agritourism & Farms Sector'}
          {isSurpriseDelivery && '5.5 Surprise Delivery Services'}
          {isSurprisePlanner && '5.6 Surprise Planners & Event Coordinators'}
          {!isAccommodation && !isFnB && !isVehicleRental && !isAgritourism && !isSurpriseDelivery && !isSurprisePlanner && 'Specialized Sector Attributes'}
        </span>
      </div>

      {/* -------------------------------------------------------------
          5.1 ACCOMMODATION SECTOR (Hotels, Chalets, Guesthouses, Apartments)
      ------------------------------------------------------------- */}
      {(isAccommodation || specifics.accommodation) && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
            <Home className="w-4 h-4 text-teal-400" />
            <span>5.1 Accommodation &amp; Lodging Attributes</span>
          </div>

          {/* Parking Toggles */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Parking Facilities &amp; Availability
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'private_available', label: 'Private Parking' },
                { id: 'public_parking', label: 'Public Parking' },
                { id: 'valet', label: 'Valet Parking' },
                { id: 'none', label: 'No Parking' },
              ].map((opt) => {
                const isSelected =
                  (specifics.accommodation?.parkingType || vendor.parkingStatus) === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const updatedAccom: AccommodationSpecifics = {
                        ...specifics.accommodation,
                        parkingType: opt.id as any,
                      };
                      updateSectorSpecifics({ accommodation: updatedAccom });
                      onChange({
                        ...vendor,
                        parkingStatus: (opt.id === 'valet' ? 'valet_only' : opt.id === 'public_parking' ? 'street_busy' : 'private_available') as any,
                        sectorSpecifics: { ...specifics, accommodation: updatedAccom },
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border border-teal-400 shadow-md'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hotel Specifics: Room Type Definitions & Quantity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-300">
                Room Types &amp; Quantity Available
              </label>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const currentRooms = specifics.accommodation?.roomTypes || [];
                    const updatedAccom: AccommodationSpecifics = {
                      ...specifics.accommodation,
                      roomTypes: [
                        ...currentRooms,
                        { id: `room-${Date.now()}`, name: 'Deluxe Room', quantity: 5, pricePerNight: 180 },
                      ],
                    };
                    updateSectorSpecifics({ accommodation: updatedAccom });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-teal-400" />
                  <span>Add Room Type</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(specifics.accommodation?.roomTypes || [
                { id: 'r1', name: 'Deluxe Family Suite', quantity: 4, pricePerNight: 280 },
                { id: 'r2', name: 'Standard Twin Room', quantity: 8, pricePerNight: 160 },
              ]).map((room, idx) => (
                <div key={room.id || idx} className="flex items-center gap-2 p-2 rounded-xl bg-stone-900 border border-stone-800 text-xs">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={room.name}
                    onChange={(e) => {
                      const updatedRooms = [...(specifics.accommodation?.roomTypes || [])];
                      updatedRooms[idx] = { ...room, name: e.target.value };
                      updateSectorSpecifics({
                        accommodation: { ...specifics.accommodation, roomTypes: updatedRooms },
                      });
                    }}
                    placeholder="Room Name"
                    className="flex-1 px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-400 font-mono">Qty:</span>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={room.quantity}
                      onChange={(e) => {
                        const updatedRooms = [...(specifics.accommodation?.roomTypes || [])];
                        updatedRooms[idx] = { ...room, quantity: Number(e.target.value) };
                        updateSectorSpecifics({
                          accommodation: { ...specifics.accommodation, roomTypes: updatedRooms },
                        });
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-400 font-mono">RM:</span>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={room.pricePerNight}
                      onChange={(e) => {
                        const updatedRooms = [...(specifics.accommodation?.roomTypes || [])];
                        updatedRooms[idx] = { ...room, pricePerNight: Number(e.target.value) };
                        updateSectorSpecifics({
                          accommodation: { ...specifics.accommodation, roomTypes: updatedRooms },
                        });
                      }}
                      className="w-20 px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-center"
                    />
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const updatedRooms = (specifics.accommodation?.roomTypes || []).filter((_, i) => i !== idx);
                        updateSectorSpecifics({
                          accommodation: { ...specifics.accommodation, roomTypes: updatedRooms },
                        });
                      }}
                      className="p-1 rounded text-stone-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Breakfast Included & Apartment Details */}
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-400" />
                Breakfast Option Included
              </span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const currentVal = !!specifics.accommodation?.breakfastIncluded;
                  updateSectorSpecifics({
                    accommodation: { ...specifics.accommodation, breakfastIncluded: !currentVal },
                  });
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  specifics.accommodation?.breakfastIncluded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {specifics.accommodation?.breakfastIncluded ? 'Yes (Included)' : 'No'}
              </button>
            </div>

            {/* Apartment Specifics */}
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
              <span className="text-xs font-semibold text-white block">Apartment &amp; Unit Breakdown</span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block">Total Units</span>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={specifics.accommodation?.apartment?.totalUnits || 12}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        accommodation: {
                          ...specifics.accommodation,
                          apartment: { ...specifics.accommodation?.apartment, totalUnits: Number(e.target.value) },
                        },
                      });
                    }}
                    className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Rooms / Unit</span>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={specifics.accommodation?.apartment?.roomsPerUnit || 3}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        accommodation: {
                          ...specifics.accommodation,
                          apartment: { ...specifics.accommodation?.apartment, roomsPerUnit: Number(e.target.value) },
                        },
                      });
                    }}
                    className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Cooking?</span>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      const cur = !!specifics.accommodation?.apartment?.cookingPermitted;
                      updateSectorSpecifics({
                        accommodation: {
                          ...specifics.accommodation,
                          apartment: { ...specifics.accommodation?.apartment, cookingPermitted: !cur },
                        },
                      });
                    }}
                    className={`w-full py-1 rounded font-bold transition-all text-center ${
                      specifics.accommodation?.apartment?.cookingPermitted ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {specifics.accommodation?.apartment?.cookingPermitted ? 'Permitted' : 'No'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5.2 FOOD & BEVERAGE (F&B) SECTOR
      ------------------------------------------------------------- */}
      {(isFnB || specifics.foodBeverage) && (
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
                const selectedList = specifics.foodBeverage?.dietaryCompliance || (vendor.dietaryTags as any) || [];
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
                    {isSelected ? '✓ ' : '+ '}{dt.label}
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
                  specifics.foodBeverage?.parkingAvailable ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
                }`}
              >
                {specifics.foodBeverage?.parkingAvailable ? 'Parking Available' : 'Limited Street Parking'}
              </button>
            </div>
            <input
              type="text"
              disabled={isReadOnly}
              value={specifics.foodBeverage?.parkingDetails || 'Dedicated customer lot in front of restaurant + street bays'}
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
          5.3 MOTORBIKES, SCOOTERS & MICRO-MOBILITY / VEHICLE RENTALS
      ------------------------------------------------------------- */}
      {(isVehicleRental || specifics.vehicleRental) && (() => {
        const vr = specifics.vehicleRental || {};
        const fleetUnits = vr.fleetUnits || [
          { id: 'unit-1', model: 'Yamaha NMAX 155cc ABS', plateOrCode: 'CAM-101', status: 'available' as const, dailyRateRm: 85, hourlyRateRm: 20 },
          { id: 'unit-2', model: 'Honda Vario 160cc', plateOrCode: 'CAM-102', status: 'available' as const, dailyRateRm: 75, hourlyRateRm: 18 },
        ];
        const addOnPackages = vr.addOnPackages || [
          { id: 'addon-helmet', name: 'Extra SIRIM Full-Face / Open Helmet', priceRm: 10, enabled: true, category: 'helmet' as const },
          { id: 'addon-mount', name: 'Waterproof Handlebar Phone Mount + USB', priceRm: 10, enabled: true, category: 'mount' as const },
          { id: 'addon-insurance', name: 'Comprehensive Theft & Road-Assist Tier', priceRm: 18, enabled: true, category: 'insurance' as const },
          { id: 'addon-gear', name: 'Highland Riding Jacket & Raincoat Set', priceRm: 12, enabled: false, category: 'gear' as const },
        ];

        const selfCollectActive = vr.serviceOptions?.selfCollect ?? vr.serviceOptions?.selfPickup ?? true;
        const deliveredActive = vr.serviceOptions?.deliveredToRenter ?? vr.serviceOptions?.deliveryIncluded ?? true;
        const allowDays = vr.durationModels?.allowDays ?? true;
        const allowHours = vr.durationModels?.allowHours ?? true;

        return (
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-cyan-500/25 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Bike className="w-4 h-4 text-cyan-400" />
                <span>
                  {isMotorbikeSector
                    ? '5.3 Motorbikes, Scooters & Micro-Mobility Fleet Controls'
                    : '5.3 Rental & Equipment Inventory Controls'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {vr.maintenanceStatus === 'scheduled_maintenance'
                  ? 'Scheduled Maintenance'
                  : vr.maintenanceStatus === 'service_paused'
                  ? 'Service Paused'
                  : 'Fleet Operational'}
              </span>
            </div>

            {/* A. Fleet Management Counts & Maintenance Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-stone-300 mb-1">Total Fleet Units</label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={vr.totalFleetSize ?? 18}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      vehicleRental: { ...vr, totalFleetSize: Number(e.target.value) },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-emerald-300 mb-1">Active Ready Units</label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={vr.activeFleetCount ?? 15}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      vehicleRental: { ...vr, activeFleetCount: Number(e.target.value) },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-emerald-500/30 text-emerald-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-amber-300 mb-1">In Maintenance</label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={vr.maintenanceCount ?? 2}
                  onChange={(e) => {
                    updateSectorSpecifics({
                      vehicleRental: { ...vr, maintenanceCount: Number(e.target.value) },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-amber-500/30 text-amber-300 font-mono font-bold"
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
                  <option value="service_paused">Fleet Paused</option>
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
                  { id: 'high', label: 'Many Units Available', short: 'Many', activeClass: 'bg-emerald-600 text-white border-emerald-400' },
                  { id: 'medium', label: 'Moderate Availability', short: 'Moderate', activeClass: 'bg-cyan-600 text-white border-cyan-400' },
                  { id: 'low', label: 'Less Units Left', short: 'Less', activeClass: 'bg-amber-600 text-white border-amber-400' },
                  { id: 'sold_out', label: 'Zero Units Available', short: 'Zero', activeClass: 'bg-rose-600 text-white border-rose-400' },
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
                            ...specifics,
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
                      {isSelected ? '✓ ' : ''}{st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C. Fulfillment Options (Self-Collect vs Delivered to Renter) & Pickup / Drop-off Settings */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fulfillment Options &amp; Pick-up / Drop-off Hubs</span>
                </span>
                <span className="text-[10px] font-mono text-stone-400">Toggle Delivery &amp; Self-Collect</span>
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
                    <span className="font-bold block">Self-Collect at Shop Hub</span>
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
                    <span className="font-bold block">Delivered to Renter</span>
                    <span className="text-[10px] text-stone-400">Drop-off to hotel, homestay, or bus terminal</span>
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
                    value={vr.serviceOptions?.pickupHubAddress || vendor.address || `${vendor.township} Central Terminal`}
                    onChange={(e) => {
                      updateSectorSpecifics({
                        vehicleRental: {
                          ...vr,
                          serviceOptions: { ...vr.serviceOptions, pickupHubAddress: e.target.value },
                        },
                      });
                    }}
                    placeholder="e.g. Tanah Rata Bus Terminal / Shop Lot 4"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Drop-off Locations</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={(vr.serviceOptions?.dropoffLocations || ['Tanah Rata', 'Brinchang', 'Kea Farm']).join(', ')}
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* D. Rental Duration Models (Days vs Hours) & Deposit Configuration */}
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
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono"
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
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono"
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
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Deposit Configuration & Maintenance Alert */}
              <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Security Deposit &amp; Maintenance</span>
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
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-amber-300 font-mono font-bold"
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
                      className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-emerald-300 font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Maintenance / Deposit Terms Note</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={vr.maintenanceAlertNote ?? 'Refundable upon clean key & helmet return. License B2/B/D required.'}
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

            {/* E. Package Options & Custom Add-ons (Helmet rentals, phone mounts, insurance tiers, gear) */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Package Add-ons (Helmets, Phone Mounts, Insurance Tiers, Gear)</span>
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextAddons = [
                        ...addOnPackages,
                        { id: 'addon-' + Date.now(), name: 'Custom Riding Add-on', priceRm: 15, enabled: true, category: 'other' as const },
                      ];
                      updateSectorSpecifics({ vehicleRental: { ...vr, addOnPackages: nextAddons } });
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {addOnPackages.map((addon, idx) => (
                  <div key={addon.id} className="p-2 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={addon.enabled}
                      onChange={(e) => {
                        const updated = addOnPackages.map((a, i) => (i === idx ? { ...a, enabled: e.target.checked } : a));
                        updateSectorSpecifics({ vehicleRental: { ...vr, addOnPackages: updated } });
                      }}
                      className="w-4 h-4 rounded text-emerald-600 bg-stone-900 border-stone-700 shrink-0"
                    />
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={addon.name}
                      onChange={(e) => {
                        const updated = addOnPackages.map((a, i) => (i === idx ? { ...a, name: e.target.value } : a));
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
                          const updated = addOnPackages.map((a, i) => (i === idx ? { ...a, priceRm: Number(e.target.value) } : a));
                          updateSectorSpecifics({ vehicleRental: { ...vr, addOnPackages: updated } });
                        }}
                        className="w-14 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-emerald-300 font-mono text-xs text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* F. Individual Fleet Unit Maintenance & Active Status */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>Individual Fleet Unit Status &amp; Maintenance Log</span>
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextUnits = [
                        ...fleetUnits,
                        { id: 'unit-' + Date.now(), model: 'Scooter Unit 155cc', plateOrCode: `CAM-${103 + fleetUnits.length}`, status: 'available' as const, dailyRateRm: 80, hourlyRateRm: 18 },
                      ];
                      updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: nextUnits } });
                    }}
                    className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Unit
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {fleetUnits.map((unit, idx) => (
                  <div key={unit.id} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={unit.model}
                      onChange={(e) => {
                        const next = fleetUnits.map((u, i) => (i === idx ? { ...u, model: e.target.value } : u));
                        updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                      }}
                      placeholder="Model Name"
                      className="flex-1 min-w-[140px] px-2 py-1 rounded bg-stone-900 border border-stone-700 text-white font-semibold"
                    />
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={unit.plateOrCode || ''}
                      onChange={(e) => {
                        const next = fleetUnits.map((u, i) => (i === idx ? { ...u, plateOrCode: e.target.value } : u));
                        updateSectorSpecifics({ vehicleRental: { ...vr, fleetUnits: next } });
                      }}
                      placeholder="Plate / Code"
                      className="w-24 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 font-mono"
                    />
                    <select
                      disabled={isReadOnly}
                      value={unit.status}
                      onChange={(e) => {
                        const next = fleetUnits.map((u, i) => (i === idx ? { ...u, status: e.target.value as any } : u));
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
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          5.4 AGRITOURISM & FARMS (Strawberries, Lettuce, Lavender)
      ------------------------------------------------------------- */}
      {(isAgritourism || specifics.agritourismFarm) && (
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
                  const cur = !!specifics.agritourismFarm?.pickingSeasonActive;
                  updateSectorSpecifics({
                    agritourismFarm: { ...specifics.agritourismFarm, pickingSeasonActive: !cur },
                  });
                }}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  (specifics.agritourismFarm?.pickingSeasonActive ?? true) ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
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
                  const cur = !!specifics.agritourismFarm?.selfPickingAllowed;
                  updateSectorSpecifics({
                    agritourismFarm: { ...specifics.agritourismFarm, selfPickingAllowed: !cur },
                  });
                }}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  (specifics.agritourismFarm?.selfPickingAllowed ?? true) ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
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
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  specifics.agritourismFarm?.onFarmDelivery ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
                }`}
              >
                {specifics.agritourismFarm?.onFarmDelivery ? 'Yes' : 'No'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Produce Harvested &amp; Offered</label>
            <input
              type="text"
              disabled={isReadOnly}
              value={(specifics.agritourismFarm?.produceTypes || ['Japanese Sweet Strawberries', 'Hydroponic Watercress', 'Highland Honey', 'Cactus']).join(', ')}
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
          5.5 SPECIALIZED SERVICES: SURPRISE DELIVERY SERVICES
      ------------------------------------------------------------- */}
      {(isSurpriseDelivery || specifics.surpriseDelivery) && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
            <Gift className="w-4 h-4 text-rose-400" />
            <span>5.5 Surprise Delivery Services Logistics &amp; Packages</span>
          </div>

          {/* Service Packages Offered */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Service Offerings &amp; Packages</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'birthday_surprise', label: 'Birthday Surprise' },
                { id: 'anniversary_bundle', label: 'Anniversary Special' },
                { id: 'graduation_celebration', label: 'Graduation Package' },
                { id: 'romantic_setup', label: 'Romantic Hotel Setup' },
                { id: 'corporate_bundles', label: 'Corporate Bundles' },
              ].map((pkg) => {
                const currentPkgs = specifics.surpriseDelivery?.packages || ['birthday_surprise', 'anniversary_bundle', 'romantic_setup'];
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
                    {isSelected ? '✓ ' : '+ '}{pkg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery Logistics & Execution Style */}
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Fixed-Time Slot Delivery</span>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    const cur = !!specifics.surpriseDelivery?.deliveryLogistics?.fixedTimeSlotDelivery;
                    updateSectorSpecifics({
                      surpriseDelivery: {
                        ...specifics.surpriseDelivery,
                        deliveryLogistics: { ...specifics.surpriseDelivery?.deliveryLogistics, fixedTimeSlotDelivery: !cur },
                      },
                    });
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    (specifics.surpriseDelivery?.deliveryLogistics?.fixedTimeSlotDelivery ?? true) ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
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
                        deliveryLogistics: { ...specifics.surpriseDelivery?.deliveryLogistics, sameDayCutoffTime: e.target.value },
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
                  const currentStyles = specifics.surpriseDelivery?.deliveryLogistics?.executionStyle || ['stealth_dropoff', 'photo_video_included'];
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
                              deliveryLogistics: { ...specifics.surpriseDelivery?.deliveryLogistics, executionStyle: newStyles },
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

          {/* Add-ons */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Add-on Options</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'custom_message_card', label: 'Custom Message Card' },
                { id: 'polaroid_printing', label: 'Polaroid Printing' },
                { id: 'fairy_lights', label: 'Fairy Lights Drizzle' },
                { id: 'chocolate_addons', label: 'Highland Chocolates' },
              ].map((ao) => {
                const currentAddons = specifics.surpriseDelivery?.addOnOptions || ['custom_message_card', 'polaroid_printing', 'fairy_lights'];
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
                      isSelected ? 'bg-rose-600 text-white border border-rose-400' : 'bg-stone-900 text-stone-400 border border-stone-800'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{ao.label}
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
      {(isSurprisePlanner || specifics.surprisePlanner) && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>5.6 Surprise Planners &amp; Event Coordinators Scale &amp; Inclusions</span>
          </div>

          {/* Event Specializations */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Event Specializations</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'proposals', label: 'Marriage Proposals' },
                { id: 'anniversaries', label: 'Anniversary Dinners' },
                { id: 'milestone_birthdays', label: 'Milestone Birthdays' },
                { id: 'romantic_dinners', label: 'Private Hilltop Dinners' },
                { id: 'room_makeovers', label: 'Hotel Room Makeovers' },
                { id: 'trunk_surprises', label: 'Car Trunk Surprises' },
              ].map((sp) => {
                const currentSpecs = specifics.surprisePlanner?.eventSpecializations || ['proposals', 'anniversaries', 'room_makeovers', 'trunk_surprises'];
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
                    {isSelected ? '✓ ' : '+ '}{sp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Package Tiers & Logistics */}
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
              <span className="font-semibold text-white block">Package Tiers &amp; Scale</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'basic_setup', label: 'Basic Setup' },
                  { id: 'premium_styling', label: 'Premium Styling' },
                  { id: 'luxury_custom', label: 'Luxury Custom Production' },
                ].map((tier) => {
                  const currentTiers = specifics.surprisePlanner?.packageTiers || ['basic_setup', 'premium_styling', 'luxury_custom'];
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
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
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
                          setupLogistics: { ...specifics.surprisePlanner?.setupLogistics, venueCoordinationIncluded: e.target.checked },
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
                          setupLogistics: { ...specifics.surprisePlanner?.setupLogistics, cleanUpTeardownIncluded: e.target.checked },
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

          {/* Inclusions & Collaborations */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Inclusions &amp; Talent Collaborations</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'private_chef', label: 'Private Chef Booking' },
                { id: 'secret_photographer', label: 'Secret Photographer' },
                { id: 'musician_bookings', label: 'Musician / Violinist' },
              ].map((inc) => {
                const currentInclusions = specifics.surprisePlanner?.inclusionsCollaborations || ['secret_photographer'];
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
                    {isSelected ? '✓ ' : '+ '}{inc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
