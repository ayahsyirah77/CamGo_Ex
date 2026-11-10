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
    subCatStr === 'hotels_resorts';

  const isFnB =
    catStr === 'food' ||
    subCatStr.startsWith('fb_') ||
    subCatStr === 'dining';

  const isVehicleRental =
    catStr === 'transport' ||
    subCatStr.startsWith('rental_') ||
    subCatStr === 'car_bike_rentals';

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
          {isVehicleRental && '5.3 Vehicle Rentals Sector'}
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
          5.3 VEHICLE RENTALS (Motorbikes, Scooters, Cars, etc.)
      ------------------------------------------------------------- */}
      {(isVehicleRental || specifics.vehicleRental) && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <Bike className="w-4 h-4 text-cyan-400" />
            <span>5.3 Vehicle Rental Fleet &amp; Availability Toggles</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-stone-300 mb-1">Fleet Vehicle Types Available</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={(specifics.vehicleRental?.vehicleTypes || ['Scooters (155cc)', 'Automatic Bikes', 'Family SUVs', 'Sedans']).join(', ')}
                onChange={(e) => {
                  const arr = e.target.value.split(',').map((s) => s.trim());
                  updateSectorSpecifics({
                    vehicleRental: { ...specifics.vehicleRental, vehicleTypes: arr },
                  });
                }}
                placeholder="e.g. Motorbikes, Scooters, SUVs, Vans"
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-300 mb-1">Total Fleet Capacity Size</label>
              <input
                type="number"
                disabled={isReadOnly}
                value={specifics.vehicleRental?.totalFleetSize || 25}
                onChange={(e) => {
                  updateSectorSpecifics({
                    vehicleRental: { ...specifics.vehicleRental, totalFleetSize: Number(e.target.value) },
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
              />
            </div>
          </div>

          {/* Real-time Availability Toggles */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Real-Time Fleet Availability Status Toggles
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'high', label: 'Plenty Available' },
                { id: 'medium', label: 'Moderate Availability' },
                { id: 'low', label: 'Limited Fleet Left' },
                { id: 'sold_out', label: 'Zero / Fully Booked' },
              ].map((st) => {
                const isSelected = (specifics.vehicleRental?.realTimeAvailability || vendor.motorbikeFleetStatus || 'high') === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      updateSectorSpecifics({
                        vehicleRental: { ...specifics.vehicleRental, realTimeAvailability: st.id as any },
                      });
                      onChange({
                        ...vendor,
                        motorbikeFleetStatus: st.id as any,
                        sectorSpecifics: {
                          ...specifics,
                          vehicleRental: { ...specifics.vehicleRental, realTimeAvailability: st.id as any },
                        },
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white border border-cyan-400 shadow-md'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}{st.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={specifics.vehicleRental?.serviceOptions?.deliveryIncluded ?? true}
                onChange={(e) => {
                  updateSectorSpecifics({
                    vehicleRental: {
                      ...specifics.vehicleRental,
                      serviceOptions: { ...specifics.vehicleRental?.serviceOptions, deliveryIncluded: e.target.checked },
                    },
                  });
                }}
                className="w-4 h-4 rounded text-cyan-600 bg-stone-950 border-stone-700 focus:ring-0"
              />
              <span className="text-white font-medium">Hotel Delivery Included</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={specifics.vehicleRental?.serviceOptions?.selfPickup ?? true}
                onChange={(e) => {
                  updateSectorSpecifics({
                    vehicleRental: {
                      ...specifics.vehicleRental,
                      serviceOptions: { ...specifics.vehicleRental?.serviceOptions, selfPickup: e.target.checked },
                    },
                  });
                }}
                className="w-4 h-4 rounded text-cyan-600 bg-stone-950 border-stone-700 focus:ring-0"
              />
              <span className="text-white font-medium">Self-Pickup Hub Active</span>
            </label>
          </div>
        </div>
      )}

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
