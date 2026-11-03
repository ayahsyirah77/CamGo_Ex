export interface BusinessCategoryItem {
  id: string;
  label: string;
  description: string;
  rateLabel: string;
  specLabel: string;
  featuresLabel: string;
  defaultSpecPlaceholder: string;
  defaultFeaturesPlaceholder: string;
  defaultAddonPlaceholder: string;
  defaultImage: string;
  sampleItemName: string;
  unitLabel: string;
}

export interface BusinessSector {
  id: string;
  name: string;
  shortName: string;
  iconName: string;
  badgeColor: string;
  moduleType: 'rental_fleet' | 'dining_menu' | 'property_units' | 'product_catalog' | 'service_catalog' | 'ticket_passes';
  moduleTitle: string;
  moduleSubtitle: string;
  itemNoun: string;
  addItemLabel: string;
  categories: BusinessCategoryItem[];
}

export const BUSINESS_TAXONOMY: BusinessSector[] = [
  {
    id: 'food_beverage',
    name: 'Food & Beverage (F&B)',
    shortName: 'F&B & Dining',
    iconName: 'Utensils',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    moduleType: 'dining_menu',
    moduleTitle: 'Menu Items, Dining Packages & Table Reservations',
    moduleSubtitle: 'Manage signature dishes, meal sets, pre-orders, and incoming table dining reservations.',
    itemNoun: 'Menu Item / Dining Set',
    addItemLabel: 'Add Menu Item / Dish',
    categories: [
      {
        id: 'fb_restaurants_cafes',
        label: 'Restaurants, Cafes & Bistros (Dine-in, Reservations)',
        description: 'Casual & fine dining establishments offering dine-in seating, table bookings, and chef specialties.',
        rateLabel: 'Price / Set Rate (RM)',
        specLabel: 'Portion / Course Type',
        featuresLabel: 'Ingredients & Dietary Notes',
        defaultSpecPlaceholder: 'e.g. 2-3 Pax Sharing / 4-Course Degustation',
        defaultFeaturesPlaceholder: 'e.g. Halal Ingredients, Includes Soup & Highland Tea',
        defaultAddonPlaceholder: 'e.g. Add Truffle Butter RM8, Extra Rice RM3',
        defaultImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Signature Charcoal Highland Tomyam Steamboat Set',
        unitLabel: 'Table / Set'
      },
      {
        id: 'fb_fast_food',
        label: 'Fast Food & Quick Service (Delivery-focused)',
        description: 'High-speed counter food, burger bars, fried chicken, and quick takeout meals.',
        rateLabel: 'Item / Combo Price (RM)',
        specLabel: 'Combo Size / Serving',
        featuresLabel: 'Sides & Beverage Inclusions',
        defaultSpecPlaceholder: 'e.g. Regular Combo / Jumbo Box',
        defaultFeaturesPlaceholder: 'e.g. Served with Crispy Fries and Iced Lemon Tea',
        defaultAddonPlaceholder: 'e.g. Upgrade to Cheese Fries +RM4',
        defaultImage: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Crispy Mountain Chicken Burger Combo',
        unitLabel: 'Combo'
      },
      {
        id: 'fb_bakeries',
        label: 'Bakeries, Pastries & Home Bakers (Pre-orders, custom cakes)',
        description: 'Fresh highland scones, sourdough loaves, birthday cakes, croissants, and artisan tarts.',
        rateLabel: 'Price (RM)',
        specLabel: 'Weight / Cake Size',
        featuresLabel: 'Flavour & Lead Time',
        defaultSpecPlaceholder: 'e.g. 1.0 kg / 6-inch Round / Box of 4 Scones',
        defaultFeaturesPlaceholder: 'e.g. Made with Fresh Cameron Strawberries & Devonshire Clotted Cream',
        defaultAddonPlaceholder: 'e.g. Custom Birthday Fondant Plaque +RM15',
        defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Traditional Cameron Fresh Cream Strawberry Scones (Box of 4)',
        unitLabel: 'Box / Cake'
      },
      {
        id: 'fb_cloud_kitchens',
        label: 'Ghost Kitchens & Cloud Kitchens (Multi-brand delivery)',
        description: 'Delivery-only commercial kitchens hosting virtual food brands and online takeout.',
        rateLabel: 'Meal Price (RM)',
        specLabel: 'Brand / Cuisine Concept',
        featuresLabel: 'Packaging & Prep Time',
        defaultSpecPlaceholder: 'e.g. Bento Box / 15-Minute Rapid Prep',
        defaultFeaturesPlaceholder: 'e.g. Eco-friendly biodegradable leakproof container',
        defaultAddonPlaceholder: 'e.g. Add Miso Soup +RM3',
        defaultImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Teriyaki Chicken Rice Bowl & Gyoza Set',
        unitLabel: 'Meal'
      },
      {
        id: 'fb_food_trucks',
        label: 'Food Trucks & Mobile Vendors (Event-based locations)',
        description: 'Mobile street food units operating across night markets, event pop-ups, and scenic viewpoints.',
        rateLabel: 'Price per Serving (RM)',
        specLabel: 'Serving Format',
        featuresLabel: 'Flavour Profiles & Toppings',
        defaultSpecPlaceholder: 'e.g. Cone / Skewer Platter / Bowl',
        defaultFeaturesPlaceholder: 'e.g. Grilled over charcoal with homemade sweet strawberry chili glaze',
        defaultAddonPlaceholder: 'e.g. Double Cheese Drizzle +RM3',
        defaultImage: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Smoked Beef Brisket Bao with Strawberry Slaw',
        unitLabel: 'Serving'
      },
      {
        id: 'fb_beverage_boba',
        label: 'Beverage, Coffee & Boba Shops',
        description: 'Specialty pour-over coffee, cold brew, matcha, artisanal bubble teas, and tropical fruit smoothies.',
        rateLabel: 'Drink Price (RM)',
        specLabel: 'Cup Size & Temperature',
        featuresLabel: 'Milk, Sweetness & Toppings',
        defaultSpecPlaceholder: 'e.g. Large 500ml / Iced or Hot',
        defaultFeaturesPlaceholder: 'e.g. Oat Milk option, 50% Sugar, Brown Sugar Pearls',
        defaultAddonPlaceholder: 'e.g. Extra Cheese Foam +RM3.50',
        defaultImage: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Highland Roasted Oolong Milk Tea with Pearls',
        unitLabel: 'Cup'
      },
      {
        id: 'fb_catering',
        label: 'Catering Services (Buffets, corporate events, weddings)',
        description: 'Full-service event buffets, canapé platters, tea reception spreads, and private dinner chefs.',
        rateLabel: 'Price per Pax (RM)',
        specLabel: 'Minimum Pax & Setup',
        featuresLabel: 'Menu Courses & Equipment',
        defaultSpecPlaceholder: 'e.g. Min 30 Pax / Full Buffet Chafing Dishes',
        defaultFeaturesPlaceholder: 'e.g. 7-Course spread, Includes servers, cutlery & floral centerpiece',
        defaultAddonPlaceholder: 'e.g. Live Roast Lamb Carving Station +RM800',
        defaultImage: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Highland Garden Wedding Deluxe Buffet Catering',
        unitLabel: 'Pax'
      }
    ]
  },
  {
    id: 'retail_products',
    name: 'Retail & Physical Products',
    shortName: 'Retail & Farm Goods',
    iconName: 'ShoppingBag',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    moduleType: 'product_catalog',
    moduleTitle: 'Product Catalog, Farm Harvest & Retail Inventory',
    moduleSubtitle: 'Organize physical products, retail merchandise, fresh agricultural crops, and customer orders.',
    itemNoun: 'Product / Merchandise',
    addItemLabel: 'Add Product to Catalog',
    categories: [
      {
        id: 'retail_fashion',
        label: 'Fashion, Apparel & Accessories (Clothing, shoes, bags)',
        description: 'Sweaters, alpine outdoor jackets, winter scarves, footwear, leather goods, and boutique fashion.',
        rateLabel: 'Retail Price (RM)',
        specLabel: 'Size / Color / Material',
        featuresLabel: 'Material & Fitting Details',
        defaultSpecPlaceholder: 'e.g. Sizes S, M, L, XL / 100% Wool',
        defaultFeaturesPlaceholder: 'e.g. Heavy-knit alpine thermal sweater with ribbed cuffs',
        defaultAddonPlaceholder: 'e.g. Gift Packaging Box +RM5',
        defaultImage: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Highland Merino Wool Cable-Knit Pullover',
        unitLabel: 'Piece'
      },
      {
        id: 'retail_electronics',
        label: 'Electronics, Gadgets & Mobile Tech',
        description: 'Smartphones, charging accessories, power banks, audio headphones, and smart home gadgets.',
        rateLabel: 'Price (RM)',
        specLabel: 'Model / Technical Specs',
        featuresLabel: 'Warranty & In-box Items',
        defaultSpecPlaceholder: 'e.g. 20,000mAh 65W Fast Charge / USB-C',
        defaultFeaturesPlaceholder: 'e.g. 1-Year Local Warranty, Includes Braided USB-C Cable',
        defaultAddonPlaceholder: 'e.g. Heavy-Duty Shockproof Silicone Case +RM25',
        defaultImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
        sampleItemName: '65W GaN Fast Charger Power Bank 20,000mAh',
        unitLabel: 'Unit'
      },
      {
        id: 'retail_home_furniture',
        label: 'Home, Living & Furniture (Decor, wooden furniture, appliances)',
        description: 'Hardwood dining tables, pine lounge chairs, scented candles, ceramic tableware, and home living.',
        rateLabel: 'Price (RM)',
        specLabel: 'Dimensions / Wood Type',
        featuresLabel: 'Finish & Delivery Terms',
        defaultSpecPlaceholder: 'e.g. 180cm x 90cm / Solid Teak & Pine',
        defaultFeaturesPlaceholder: 'e.g. Natural matte protective seal, scratch-resistant brass legs',
        defaultAddonPlaceholder: 'e.g. White-glove assembly & placement +RM80',
        defaultImage: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Solid Pine 6-Seater Highland Dining Table',
        unitLabel: 'Unit'
      },
      {
        id: 'retail_groceries_produce',
        label: 'Groceries, Fresh Produce & Local Farm Goods (Vegetables, fruits, meats)',
        description: 'Cameron strawberries, organic watercress, sweet corn, highland honey, artisanal jams, and farm crops.',
        rateLabel: 'Price / Punnet (RM)',
        specLabel: 'Weight / Grade / Variety',
        featuresLabel: 'Farm Origin & Organic Certification',
        defaultSpecPlaceholder: 'e.g. 500g Premium Grade A / Hand-Picked',
        defaultFeaturesPlaceholder: 'e.g. Harvested this morning from Kea Farm organic pesticide-free beds',
        defaultAddonPlaceholder: 'e.g. Insulated Cooler Bag with Ice Gel +RM6',
        defaultImage: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Fresh Sweet Japanese Strawberry Punnet (500g)',
        unitLabel: 'Punnet / Kg'
      },
      {
        id: 'retail_beauty_skincare',
        label: 'Health, Beauty & Skincare Products',
        description: 'Organic botanical cleansers, tea tree essential oils, herbal balms, sunscreens, and wellness cosmetics.',
        rateLabel: 'Retail Price (RM)',
        specLabel: 'Volume / Skin Type',
        featuresLabel: 'Active Botanical Ingredients',
        defaultSpecPlaceholder: 'e.g. 100ml / For Sensitive & Dry Skin',
        defaultFeaturesPlaceholder: 'e.g. Infused with pure Cameron green tea extract & aloe vera',
        defaultAddonPlaceholder: 'e.g. Travel Mini Set +RM20',
        defaultImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Green Tea & Rose Hydrating Facial Mist (100ml)',
        unitLabel: 'Bottle'
      },
      {
        id: 'retail_books_stationery',
        label: 'Books, Stationery & Publishing (Physical books, KDP items, merch)',
        description: 'Local travel guidebooks, nature photo journals, illustrated botanical postcards, and custom stationery.',
        rateLabel: 'Price (RM)',
        specLabel: 'Format / Page Count',
        featuresLabel: 'Binding & Paper Stock',
        defaultSpecPlaceholder: 'e.g. Hardcover 240 Pages / Full Color',
        defaultFeaturesPlaceholder: 'e.g. Premium FSC-certified recycled art paper with gold foil title',
        defaultAddonPlaceholder: 'e.g. Author Signed Bookplate + Bookmark Included',
        defaultImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Flora of the Mossy Forest: Photographic Field Guide',
        unitLabel: 'Book'
      },
      {
        id: 'retail_auto_parts',
        label: 'Automotive Parts, Accessories & Spares (Body kits, rims, oils)',
        description: 'Heavy-duty brake pads for mountain slopes, all-terrain tires, fog lamps, engine oil, and 4x4 accessories.',
        rateLabel: 'Price (RM)',
        specLabel: 'Fitment / Vehicle Compatibility',
        featuresLabel: 'Brand & Certification',
        defaultSpecPlaceholder: 'e.g. Toyota Hilux / Ford Ranger 2016-2024',
        defaultFeaturesPlaceholder: 'e.g. Ceramic composite high-temperature heat resistant compound',
        defaultAddonPlaceholder: 'e.g. Installation at workshop +RM50',
        defaultImage: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Mountain Slopes High-Performance Ceramic Brake Pads',
        unitLabel: 'Set'
      }
    ]
  },
  {
    id: 'real_estate_accommodation',
    name: 'Real Estate & Accommodation',
    shortName: 'Stays & Real Estate',
    iconName: 'Building2',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    moduleType: 'property_units',
    moduleTitle: 'Units, Rooms & Stays Availability Management',
    moduleSubtitle: 'Track room categories, apartment availability, guest capacity, and booking inquiries.',
    itemNoun: 'Room / Property Unit',
    addItemLabel: 'Add Room / Property Unit',
    categories: [
      {
        id: 'realestate_residential',
        label: 'Residential Real Estate (Apartments, condominiums, landed homes for sale/long-term rent)',
        description: 'Long-term residential leases, retirement villas, hillside condominiums, and freehold landed houses.',
        rateLabel: 'Monthly Rent / Sale Price (RM)',
        specLabel: 'Built-up / Bedrooms / Bathrooms',
        featuresLabel: 'Furnishing & Facilities',
        defaultSpecPlaceholder: 'e.g. 1,200 sqft / 3 Beds 2 Baths',
        defaultFeaturesPlaceholder: 'e.g. Fully Furnished, Balcony with Valley View, Covered Parking',
        defaultAddonPlaceholder: 'e.g. High-speed broadband included in monthly rent',
        defaultImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Crown Imperial Court 3-Bedroom Penthouse Suite',
        unitLabel: 'Unit / Month'
      },
      {
        id: 'realestate_vacation_homestay',
        label: 'Short-Term Vacation Rentals & Homestays (Villas, chalets, Airbnb-style stays)',
        description: 'Holiday apartments, private Tudor chalets, heritage family bungalows, and luxury hillside retreats.',
        rateLabel: 'Nightly Rate (RM)',
        specLabel: 'Max Guests / Bed Configuration',
        featuresLabel: 'Amenities & House Rules',
        defaultSpecPlaceholder: 'e.g. Up to 8 Guests / 3 Queen Beds, 2 Singles',
        defaultFeaturesPlaceholder: 'e.g. Steamboat hotpot cooker, High-speed WiFi, BBQ pit, Netflix',
        defaultAddonPlaceholder: 'e.g. Extra Mattress Set RM35/night, BBQ charcoal pack RM20',
        defaultImage: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'English Tudor Alpine Cottage (Whole Villa)',
        unitLabel: 'Night'
      },
      {
        id: 'realestate_commercial',
        label: 'Commercial & Retail Spaces (Office lots, co-working spaces, shoplots)',
        description: 'Ground floor retail lots, tea cafe spaces, corporate branch offices, and flexible desk co-working.',
        rateLabel: 'Monthly Rental (RM)',
        specLabel: 'Floor Area / Level',
        featuresLabel: 'Power Specs & Footfall Potential',
        defaultSpecPlaceholder: 'e.g. 1,500 sqft / Ground Floor Main Road',
        defaultFeaturesPlaceholder: 'e.g. 3-Phase 60A Power, Dual Entrance, High Tourist Foot Traffic Corridor',
        defaultAddonPlaceholder: 'e.g. Dedicated reserved customer parking bays',
        defaultImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Barrington Square Prime Commercial Retail Lot',
        unitLabel: 'Month'
      },
      {
        id: 'realestate_agritourism_farm',
        label: 'Agritourism & Farm Stays (Ranches, orchards, campsite plots)',
        description: 'Scenic glamping domes, tea valley camper plots, strawberry ranch eco-lodges, and stargazing tents.',
        rateLabel: 'Nightly Rate per Plot / Dome (RM)',
        specLabel: 'Plot Size & Capacity',
        featuresLabel: 'Campfire, Washrooms & Activities',
        defaultSpecPlaceholder: 'e.g. Geodesic Dome (4 Pax) / Private Deck',
        defaultFeaturesPlaceholder: 'e.g. Heated ensuite shower, Private campfire ring, Complimentary farm tour',
        defaultAddonPlaceholder: 'e.g. Firewood Bundle RM25, BBQ Grill Set Rental RM40',
        defaultImage: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Stargazer Luxury Glamping Dome with Mountain View',
        unitLabel: 'Night'
      }
    ]
  },
  {
    id: 'vehicle_equipment_rental',
    name: 'Vehicle & Equipment Rentals',
    shortName: 'Vehicles & Fleet',
    iconName: 'Bike',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    moduleType: 'rental_fleet',
    moduleTitle: 'Fleet & Rental Equipment Inventory Management',
    moduleSubtitle: 'Maintain rental vehicles, bikes, scooters, power machinery, gear inventory, and bookings.',
    itemNoun: 'Rental Vehicle / Equipment',
    addItemLabel: 'Add Vehicle / Equipment to Fleet',
    categories: [
      {
        id: 'rental_car_van',
        label: 'Car & Van Fleet (Sedans, SUVs, MPVs, commercial vans)',
        description: 'Compact hatchbacks for mountain curves, 7-seater MPVs for families, and cargo vans.',
        rateLabel: 'Daily Rental Rate (RM)',
        specLabel: 'Engine CC & Transmission',
        featuresLabel: 'Seating & Inclusions',
        defaultSpecPlaceholder: 'e.g. 1.5L Dual VVT-i Auto / 7-Seater',
        defaultFeaturesPlaceholder: 'e.g. Full Tank Fuel, Comprehensive Insurance, Child Safety Seat',
        defaultAddonPlaceholder: 'e.g. Additional Driver Cover RM15/day, Dashcam RM10/day',
        defaultImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Perodua Aruz 1.5X 7-Seater Automatic SUV',
        unitLabel: 'Day'
      },
      {
        id: 'rental_motorcycle_scooter',
        label: 'Motorcycle, Scooter & Micro-mobility Fleet (Commuters, maxi-scooters, e-bikes)',
        description: 'Automatic scooters, lightweight mopeds, dual-sport bikes, and touring maxi-scooters.',
        rateLabel: 'Daily Rental Rate (RM)',
        specLabel: 'Engine CC / Electric Power',
        featuresLabel: 'Helmets & Accessories Included',
        defaultSpecPlaceholder: 'e.g. 155cc Liquid-Cooled ABS',
        defaultFeaturesPlaceholder: 'e.g. 2 SIRIM Helmets Included, Phone Mount, Top Box Storage',
        defaultAddonPlaceholder: 'e.g. Touring Raincoat RM5/day, Action Cam Mount RM5/day',
        defaultImage: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Yamaha NMAX 155cc ABS Maxi-Scooter',
        unitLabel: 'Day'
      },
      {
        id: 'rental_powersports_marine',
        label: 'Powersports & Marine (ATVs, UTVs, jet skis, speedboats, RVs/campers)',
        description: 'Off-road 4x4 quad bikes, trail buggies, Land Rover safari jeeps, and adventure campers.',
        rateLabel: 'Rate per Session / Day (RM)',
        specLabel: 'Engine Spec & Drive System',
        featuresLabel: 'Safety Gear & Guide Inclusions',
        defaultSpecPlaceholder: 'e.g. 450cc 4WD Off-Road Quad / 1.5 Hour Session',
        defaultFeaturesPlaceholder: 'e.g. Full Face Helmet, Chest Protector, Marshall Trail Guide',
        defaultAddonPlaceholder: 'e.g. Mud Boots Rental RM10, HD GoPro Footage RM50',
        defaultImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Yamaha Grizzly 4x4 ATV Guided Forest Safari (90 Mins)',
        unitLabel: 'Session'
      },
      {
        id: 'rental_heavy_machinery',
        label: 'Heavy Machinery, Construction & Industrial Tools (Generators, excavators)',
        description: 'Diesel generators for highland events, mini excavators for farming terraces, and scaffolding towers.',
        rateLabel: 'Daily / Weekly Rate (RM)',
        specLabel: 'Capacity / Operating Weight',
        featuresLabel: 'Fuel Consumption & Operator Inclusions',
        defaultSpecPlaceholder: 'e.g. 25kVA Silent Diesel Generator / 3-Phase',
        defaultFeaturesPlaceholder: 'e.g. Low noise casing, 50m heavy duty distribution board, fuel tank full',
        defaultAddonPlaceholder: 'e.g. On-site certified technician standby RM150/day',
        defaultImage: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
        sampleItemName: '25kVA Silent Soundproof Diesel Generator Unit',
        unitLabel: 'Day'
      },
      {
        id: 'rental_photo_audio',
        label: 'Photography, Audio & Production Gear (Cameras, lighting, drones)',
        description: 'Mirrorless 4K camera bodies, drone aircraft, studio strobe lighting, and wireless lapel microphones.',
        rateLabel: 'Daily Rental Rate (RM)',
        specLabel: 'Equipment Model & Sensor',
        featuresLabel: 'Lenses, Batteries & Memory Cards',
        defaultSpecPlaceholder: 'e.g. 4K/60p 33MP Full-Frame / 24-70mm f/2.8 GM',
        defaultFeaturesPlaceholder: 'e.g. 3x Original Batteries, Dual 128GB High-Speed SD, Peak Design Strap',
        defaultAddonPlaceholder: 'e.g. Carbon Fiber Tripod RM25/day, DJI Wireless Mic RM35/day',
        defaultImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Sony A7 IV 4K Kit with 24-70mm f/2.8 Lens',
        unitLabel: 'Day'
      }
    ]
  },
  {
    id: 'professional_home_services',
    name: 'Professional & Home Services',
    shortName: 'Services & Trades',
    iconName: 'Wrench',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    moduleType: 'service_catalog',
    moduleTitle: 'Service Offerings, Packages & Quotation Requests',
    moduleSubtitle: 'Publish professional trade services, standard rates, consultation booking, and customer job requests.',
    itemNoun: 'Service Package / Job',
    addItemLabel: 'Add Service Offering',
    categories: [
      {
        id: 'services_home_carpentry',
        label: 'Home Improvement, Handyman & Carpentry (Renovations, sliding doors, custom furniture, fencing)',
        description: 'Custom timber carpentry, sliding door installation, roof waterproofing, and house renovations.',
        rateLabel: 'Starting / Job Rate (RM)',
        specLabel: 'Scope / Unit of Measure',
        featuresLabel: 'Warranty & Material Quality',
        defaultSpecPlaceholder: 'e.g. Per Foot Run / Full Living Hall Cabinetry',
        defaultFeaturesPlaceholder: 'e.g. Anti-termite treated solid Nyatoh wood with soft-close Blum hinges',
        defaultAddonPlaceholder: 'e.g. 3D Architectural render consultation included',
        defaultImage: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Custom Hardwood Wardrobe & Sliding Glass Door Installation',
        unitLabel: 'Job / Project'
      },
      {
        id: 'services_cleaning_pest',
        label: 'Cleaning, Maintenance & Pest Control',
        description: 'Homestay deep cleaning, turnover linen service, upholstery steam sanitization, and termite barrier sprays.',
        rateLabel: 'Rate per Session (RM)',
        specLabel: 'Property Size / Duration',
        featuresLabel: 'Equipment & Eco Chemicals Used',
        defaultSpecPlaceholder: 'e.g. 3-Bedroom Apartment / 3.5 Hours',
        defaultFeaturesPlaceholder: 'e.g. Hospital-grade disinfectant, high-pressure carpet extraction, linen change',
        defaultAddonPlaceholder: 'e.g. Balcony glass waterjet wash +RM40',
        defaultImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Turnover Homestay Deep Cleaning & Sanitize Service',
        unitLabel: 'Session'
      },
      {
        id: 'services_auto_repair',
        label: 'Automotive Servicing, Repair & Tuning (Mechanic workshops, detailing)',
        description: 'Brake pad replacement, mountain engine overheating diagnostic, 4x4 tuning, and ceramic coat detailing.',
        rateLabel: 'Service Fee / Package (RM)',
        specLabel: 'Vehicle Class / Oil Grade',
        featuresLabel: 'Service Checklist Inclusions',
        defaultSpecPlaceholder: 'e.g. Fully Synthetic 5W-40 / 35-Point Inspection',
        defaultFeaturesPlaceholder: 'e.g. Engine flush, brake fluid test, tire rotation, coolant top-up included',
        defaultAddonPlaceholder: 'e.g. Air-con antibacterial ozone fogging +RM30',
        defaultImage: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Highland Mountain Safe Major Service & Brake Inspection',
        unitLabel: 'Service'
      },
      {
        id: 'services_it_software',
        label: 'IT, Software Development & Digital Marketing Services',
        description: 'Custom web development, mobile apps, point-of-sale setup, SEO ranking, and Google Maps business listing.',
        rateLabel: 'Project Base Rate (RM)',
        specLabel: 'Deliverable Scope / Timeline',
        featuresLabel: 'Tech Stack & Maintenance Terms',
        defaultSpecPlaceholder: 'e.g. Complete Responsive Web App / 2 Weeks',
        defaultFeaturesPlaceholder: 'e.g. React & Node.js, Custom CMS, Payment Gateway, 3 Months Free Support',
        defaultAddonPlaceholder: 'e.g. Annual Cloud Hosting & Domain Management +RM450/year',
        defaultImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Local Business E-Commerce Website & Booking Portal',
        unitLabel: 'Project'
      },
      {
        id: 'services_consulting',
        label: 'Professional Consulting (Legal, accounting, business coaching)',
        description: 'SSM company secretarial, municipal council licenses, personal income tax filing, and hotel management advice.',
        rateLabel: 'Consultation Fee (RM)',
        specLabel: 'Duration / Scope of Advice',
        featuresLabel: 'Documentation & Regulatory Filings',
        defaultSpecPlaceholder: 'e.g. 60-Minute Strategy Session / Monthly Retainer',
        defaultFeaturesPlaceholder: 'e.g. Full review of MDCH compliance, fire safety BOMBA permit, and SSM audits',
        defaultAddonPlaceholder: 'e.g. Submission of official municipal appeal letter +RM250',
        defaultImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Cameron Highlands Tourism License & SSM Compliance Advisory',
        unitLabel: 'Session'
      },
      {
        id: 'services_photo_events',
        label: 'Photography, Videography & Event Planning',
        description: 'Pre-wedding photoshoot in tea hills, drone aerial videography, family holiday portraits, and event coordinators.',
        rateLabel: 'Package Rate (RM)',
        specLabel: 'Coverage Hours & Crew Size',
        featuresLabel: 'Edited Deliverables & Drone Shots',
        defaultSpecPlaceholder: 'e.g. 4-Hour Scenic Session / 1 Lead Photographer',
        defaultFeaturesPlaceholder: 'e.g. 50 Color-Graded Hi-Res Photos, Drone 4K Reel, Online Private Gallery',
        defaultAddonPlaceholder: 'e.g. 24-Page Leather Hardcover Photobook +RM250',
        defaultImage: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'BOH Tea Valley Cinematic Pre-Wedding Photoshoot',
        unitLabel: 'Package'
      }
    ]
  },
  {
    id: 'tourism_leisure_events',
    name: 'Tourism, Leisure & Events',
    shortName: 'Tours & Attractions',
    iconName: 'Palmtree',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    moduleType: 'ticket_passes',
    moduleTitle: 'Tickets, Passes, Tour Packages & Event Venue Bookings',
    moduleSubtitle: 'Issue admission passes, guided nature tours, workshop slots, and private event venue bookings.',
    itemNoun: 'Ticket / Tour Package',
    addItemLabel: 'Add Ticket / Tour Package',
    categories: [
      {
        id: 'tourism_tours_packages',
        label: 'Tour & Activity Packages (Guided excursions, adventure trips, river rafting)',
        description: 'Mossy forest boardwalk tours, sunrise 4x4 climbs, jungle trail 10 trekking, and agro farm excursions.',
        rateLabel: 'Price per Person (RM)',
        specLabel: 'Duration & Departure Time',
        featuresLabel: 'Guide, 4x4 Transport & Permit Included',
        defaultSpecPlaceholder: 'e.g. Half-Day 4 Hours / Departs 8:30 AM',
        defaultFeaturesPlaceholder: 'e.g. Licensed Forestry Permit, Experienced Nature Guide, Return 4x4 Jeep Ride',
        defaultAddonPlaceholder: 'e.g. Packed Highland Picnic Lunch +RM25/pax',
        defaultImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Mossy Forest & Gunung Brinchang Guided 4x4 Safari',
        unitLabel: 'Pax'
      },
      {
        id: 'tourism_ticketing_attractions',
        label: 'Ticketing & Attractions (Theme parks, museums, animal farms, movie screenings)',
        description: 'Single and family admission passes, botanical gardens, petting sheep sanctuaries, and lavender farms.',
        rateLabel: 'Adult Admission Rate (RM)',
        specLabel: 'Child / Senior Rate & Entry Slot',
        featuresLabel: 'Inclusions & Activities',
        defaultSpecPlaceholder: 'e.g. Child RM15 / Open Dated Ticket Valid 90 Days',
        defaultFeaturesPlaceholder: 'e.g. Unlimited entry to floral terraces, Includes shuttle transfer and feeding box',
        defaultAddonPlaceholder: 'e.g. VIP Express Pass Lane +RM10',
        defaultImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Cameron Flora Park Hilltop Admission & Shuttle Pass',
        unitLabel: 'Ticket'
      },
      {
        id: 'tourism_event_venues',
        label: 'Event Spaces & Venue Rental (Wedding halls, seminar rooms)',
        description: 'Highland glass pavilions, conference auditoriums, outdoor amphitheaters, and corporate retreat venues.',
        rateLabel: 'Venue Rental / Half Day (RM)',
        specLabel: 'Capacity / Hall Dimensions',
        featuresLabel: 'Audio Visual & Seating Layout',
        defaultSpecPlaceholder: 'e.g. Up to 150 Pax Banquet / 3,000 sqft',
        defaultFeaturesPlaceholder: 'e.g. 4K Projector & Screen, JBL PA Sound System, Stage & Round Tables',
        defaultAddonPlaceholder: 'e.g. High-speed streaming broadcast technician +RM350',
        defaultImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
        sampleItemName: 'Pine Crest Glass Conservatory Wedding & Seminar Venue',
        unitLabel: 'Session / Day'
      }
    ]
  }
];

export function findBusinessSector(subCategoryOrId?: string): BusinessSector {
  if (!subCategoryOrId) return BUSINESS_TAXONOMY[3]; // default vehicle_equipment_rental or food_beverage
  
  for (const sector of BUSINESS_TAXONOMY) {
    if (sector.id === subCategoryOrId) return sector;
    for (const cat of sector.categories) {
      if (cat.id === subCategoryOrId) return sector;
    }
  }

  // Fallback mappings from legacy subcategories
  const id = subCategoryOrId.toLowerCase();
  if (id.includes('food') || id.includes('steamboat') || id.includes('cafe') || id.includes('dining')) {
    return BUSINESS_TAXONOMY[0];
  }
  if (id.includes('retail') || id.includes('market') || id.includes('shopping') || id.includes('produce')) {
    return BUSINESS_TAXONOMY[1];
  }
  if (id.includes('hotel') || id.includes('stay') || id.includes('room') || id.includes('chalet') || id.includes('homestay') || id.includes('camp')) {
    return BUSINESS_TAXONOMY[2];
  }
  if (id.includes('car') || id.includes('bike') || id.includes('motor') || id.includes('rental') || id.includes('scooter') || id.includes('fleet')) {
    return BUSINESS_TAXONOMY[3];
  }
  if (id.includes('tour') || id.includes('attraction') || id.includes('ticket') || id.includes('event')) {
    return BUSINESS_TAXONOMY[5];
  }
  if (id.includes('service') || id.includes('repair') || id.includes('clean') || id.includes('plumb') || id.includes('carpentry')) {
    return BUSINESS_TAXONOMY[4];
  }

  return BUSINESS_TAXONOMY[3];
}

export function findBusinessCategory(subCategoryOrId?: string): BusinessCategoryItem | null {
  if (!subCategoryOrId) return null;
  for (const sector of BUSINESS_TAXONOMY) {
    for (const cat of sector.categories) {
      if (cat.id === subCategoryOrId) return cat;
    }
  }
  return null;
}
