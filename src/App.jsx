import React, { useState, useMemo, useRef, useEffect } from "react";
import { api } from "./api.js";
import {
  Search, MapPin, Star, Wifi, Droplet, Zap, UtensilsCrossed, ShieldCheck,
  Car, Heart, X, Menu, Phone, Mail, MessageCircle, PlayCircle, ChevronLeft,
  ChevronRight, SlidersHorizontal, Check, Building2, Users, TrendingUp,
  LayoutDashboard, Plus, LogIn, BedDouble, Bath, Sparkles, ArrowRight,
  Eye, Pencil, Trash2, BadgeCheck, ImagePlus, Flame, Gauge,
  ChevronDown, AlertTriangle, Lock, CreditCard, HelpCircle,
  Shirt, Table2, Armchair, Fan, Copy, Compass, BookOpen, Dumbbell,
  GraduationCap, UserCog, Inbox, Shield, RefreshCw, Wallet, Clock, LogOut
} from "lucide-react";

/* ---------------------------------------------------------
   TOKENS — booking.com inspired blue & white system
--------------------------------------------------------- */
const C = {
  navy: "#003580",      // header / deep brand blue
  blue: "#0071c2",      // primary CTA blue
  blueHover: "#00487a",
  blueLight: "#e6f2fb",  // light blue surfaces
  blueMist: "#f0f6fc",   // page background tint
  yellow: "#febb02",     // accent, used sparingly (save/featured)
  yellowDark: "#8a6300",
  green: "#008009",
  ink: "#1a1a1a",
  gray600: "#6b6b6b",
  gray400: "#98a2b3",
  border: "#e7edf3",
  white: "#ffffff",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`;

/* ---------------------------------------------------------
   REAL PROPERTY PHOTOS (uploaded, embedded as base64)
--------------------------------------------------------- */
import hostel1 from "./assets/images/hostel1.jpg";
import apartment2 from "./assets/images/apartment2.jpg";
import single3 from "./assets/images/single3.jpg";
import hostel4 from "./assets/images/hostel4.jpg";
import selfcon5 from "./assets/images/selfcon5.jpg";
import ibiIcon from "./assets/brand/ibi-icon.png";
import bookinnWordmark from "./assets/brand/bookinn-wordmark.png";

/* ---------------------------------------------------------
   REAL PROPERTY PHOTOS (local asset imports)
--------------------------------------------------------- */
const PROPERTY_IMAGES = {
  hostel1,
  apartment2,
  single3,
  hostel4,
  selfcon5,
};

const UNIVERSITIES = ["Koforidua Technical University"];
const MAX_PRICE = 25000;

// wa.me links require the full international number with no leading 0 and no
// "+" — a raw Ghana number like "0244000000" opens WhatsApp to a "number not on
// WhatsApp" / new-chat screen instead of the owner's DM. Owners type numbers in
// local format ("024...", "055...", spaces, dashes, etc), so normalize to
// Ghana's country code before building any wa.me link.
function toWhatsappDigits(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return "233" + digits.slice(1);
  return "233" + digits;
}
const PRICING_PERIODS = ["Per semester", "Per both semesters", "Per year"];

const AMENITY_ICONS = {
  Wifi: Wifi,
  "Constant water": Droplet,
  "Backup power": Zap,
  Kitchen: UtensilsCrossed,
  Security: ShieldCheck,
  Parking: Car,
  Gas: Flame,
  "No sanitation issues": Sparkles,
  "Own meter (per room)": Gauge,
  "Shared meter": Users,
  "Bed and mattress": BedDouble,
  Wardrobe: Shirt,
  Table: Table2,
  Chairs: Armchair,
  Fan: Fan,
  "Study area": BookOpen,
  Gym: Dumbbell,
};
const AMENITY_LIST = Object.keys(AMENITY_ICONS);
const HOSTEL_ROOM_TYPES = ["One in a room", "Two in a room", "Three in a room", "Four in a room", "Six in a room"];
const APARTMENT_ROOM_TYPES = ["Self-contained", "Shared Apartment"];
const ALL_ROOM_TYPES = [...HOSTEL_ROOM_TYPES, ...APARTMENT_ROOM_TYPES];
const AVAILABILITY_STATUSES = ["Space available", "Partly booked", "Fully booked"];
const AVAILABILITY_TONE = { "Space available": "green", "Partly booked": "yellow", "Fully booked": "red" };

// Listings now come from the backend API (see server/index.js and server/seed.js for the seed data).


const REVIEWS_SAMPLE = [
  { name: "Nana A.", rating: 9, text: "Quiet and close to campus. Landlord responded to my WhatsApp message within minutes." },
  { name: "Kwabena O.", rating: 8, text: "Water and light are steady, which was my biggest worry. Would recommend to level 100 students." },
  { name: "Efua M.", rating: 9, text: "The agent sent me a video tour before I paid anything, which made the whole process feel safe." },
];

// Single source of truth for plan display is the backend (server/plans.js) — these
// mirror it for the pricing/subscribe UI. Every actual permission/limit is enforced
// server-side regardless of what's shown here.
const PRICING_TIERS = [
  {
    name: "Basic", amount: 250, price: "GH₵250", period: "/year", highlight: false,
    features: ["1 hostel/apartment listing", "Up to 3 photos", "Basic listing", "Room availability", "Student enquiries","WhatsApp enquiries", "Standard search placement"],
  },
  {
    name: "Premium", amount: 250, price: "GH₵350", period: "/year", highlight: true,
    features: ["Up to 2 hostel/apartment listings", "Up to 10 photos per listing", "Video tour", "WhatsApp enquiries", "Higher search ranking", "Availability management", "Analytics", "Verified badge"],
  },
  {
    name: "Featured", amount: 500, price: "GH₵500", period: "/year", highlight: false,
    features: ["Up to 3 hostel/apartment listings", "Up to 20 photos", "Everything in Premium", "Top of search", "Homepage placement", "Priority enquiries", "Featured badge", "Virtual walkthrough"],
  },
];

// Mirrors server/plans.js PLAN_PRICES.
const PLAN_PRICES_UI = { Basic: 250, Premium: 350, Featured: 500 };

// Mirrors server/plans.js PLAN_FEATURES — used only to drive UI (locked-feature
// hints, photo-limit copy). The backend independently re-derives and enforces
// every one of these from the owner's real subscription record.
const PLAN_FEATURES = {
  Basic: { maxListings: 1, maxPhotos: 3, videoTour: false, whatsappEnquiries: true, analytics: false, verifiedBadge: false, topSearch: false, homepagePlacement: false, priorityEnquiries: false, featuredBadge: false, virtualWalkthrough: false, maxWalkthroughStops: 0, advancedAvailability: false },
  Premium: { maxListings: 2, maxPhotos: 10, videoTour: true, whatsappEnquiries: true, analytics: true, verifiedBadge: true, topSearch: false, homepagePlacement: false, priorityEnquiries: false, featuredBadge: false, virtualWalkthrough: false, maxWalkthroughStops: 0, advancedAvailability: true },
  Featured: { maxListings: 3, maxPhotos: 20, videoTour: true, whatsappEnquiries: true, analytics: true, verifiedBadge: true, topSearch: true, homepagePlacement: true, priorityEnquiries: true, featuredBadge: true, virtualWalkthrough: true, maxWalkthroughStops: 6, advancedAvailability: true },
};


const img = (key) => PROPERTY_IMAGES[key] || key || PROPERTY_IMAGES.hostel1;

function ScoreBadge({ score, size = "md" }) {
  const label = score >= 9 ? "Exceptional" : score >= 8.5 ? "Excellent" : score >= 7.5 ? "Very good" : "Good";
  const dims = size === "sm" ? { w: 34, h: 34, fs: 13 } : { w: 42, h: 42, fs: 15 };
  return (
    <div className="flex items-center gap-2">
      <div
        style={{ background: C.navy, width: dims.w, height: dims.h, fontSize: dims.fs }}
        className="rounded-md flex items-center justify-center text-white font-bold shrink-0"
      >
        {score.toFixed(1)}
      </div>
      <div className="leading-tight">
        <div style={{ color: C.ink }} className="text-sm font-semibold">{label}</div>
      </div>
    </div>
  );
}

function Badge({ children, tone = "blue" }) {
  const styles = {
    blue: { background: C.blueLight, color: C.navy },
    yellow: { background: "#fff6dc", color: C.yellowDark },
    green: { background: "#e7f7e8", color: "#0a6b0f" },
    red: { background: "#fdecea", color: "#b3261e" },
  }[tone];
  return (
    <span style={styles} className="text-xs font-semibold px-2 py-1 rounded">
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, full, style, ...rest }) {
  return (
    <button
      onClick={onClick}
      style={{ background: C.blue, ...style }}
      className={`text-white font-semibold px-4 py-2.5 rounded-md hover:opacity-90 active:scale-[0.98] transition ${full ? "w-full" : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, full, style, ...rest }) {
  return (
    <button
      onClick={onClick}
      style={{ borderColor: C.border, color: C.navy, ...style }}
      className={`border font-semibold px-4 py-2.5 rounded-md hover:bg-slate-50 transition ${full ? "w-full" : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------
   HEADER
--------------------------------------------------------- */
function Header({ view, setView, favCount, mobileOpen, setMobileOpen, user, onOwnerDashboardClick, onListPropertyClick, onSignOut }) {
  const navItem = (key, label) => (
    <button
      onClick={() => { setView(key); setMobileOpen(false); }}
      style={{ color: view === key ? C.white : "rgba(255,255,255,0.85)" }}
      className="text-sm font-semibold hover:text-white transition px-1"
    >
      {label}
    </button>
  );

  return (
    <header style={{ background: C.navy }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => setView("home")} className="flex items-center gap-2">
            <img src={ibiIcon} alt="BookInn" className="w-8 h-8 rounded-full" />
            <span className="text-white font-extrabold text-xl tracking-tight">BookInn</span>
          </button>

          <nav className="hidden md:flex items-center gap-6">
            {navItem("home", "Explore stays")}
            {navItem("saved", `Saved${favCount ? ` (${favCount})` : ""}`)}
            <button
              onClick={() => { onListPropertyClick(); setMobileOpen(false); }}
              style={{ color: view === "pricing" || view === "admin" ? C.white : "rgba(255,255,255,0.85)" }}
              className="text-sm font-semibold hover:text-white transition px-1"
            >
              List your property
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => { onOwnerDashboardClick(); setMobileOpen(false); }} style={{ color: C.white }} className="text-sm font-semibold flex items-center gap-1.5 hover:opacity-90">
              <LayoutDashboard size={16} /> Owner dashboard
            </button>
            {user ? (
              <div className="flex items-center gap-2.5">
                <button onClick={() => setView("account")} style={{ color: C.white }} className="text-sm font-semibold hover:underline">
                  Hi, {user.name.split(" ")[0]}
                </button>
                <button
                  onClick={onSignOut}
                  style={{ borderColor: "rgba(255,255,255,0.4)", color: C.white }}
                  className="text-sm font-semibold px-3.5 py-2 rounded-md border hover:bg-white/10"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView("login")}
                style={{ background: C.white, color: C.navy }}
                className="text-sm font-semibold px-3.5 py-2 rounded-md flex items-center gap-1.5 hover:opacity-90"
              >
                <LogIn size={15} /> Sign in
              </button>
            )}
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3 border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            <div className="pt-3 flex flex-col gap-3">
              {navItem("home", "Explore stays")}
              {navItem("saved", `Saved${favCount ? ` (${favCount})` : ""}`)}
              <button
                onClick={() => { onListPropertyClick(); setMobileOpen(false); }}
                style={{ color: "rgba(255,255,255,0.85)" }}
                className="text-sm font-semibold hover:text-white transition px-1 text-left"
              >
                List your property
              </button>
              <button
                onClick={() => { onOwnerDashboardClick(); setMobileOpen(false); }}
                style={{ color: "rgba(255,255,255,0.85)" }}
                className="text-sm font-semibold hover:text-white transition px-1 text-left"
              >
                Owner dashboard
              </button>
              {user && navItem("account", "My account")}
              {user ? (
                <button onClick={() => { onSignOut(); setMobileOpen(false); }} style={{ color: "rgba(255,255,255,0.85)" }} className="text-sm font-semibold hover:text-white transition px-1 text-left">
                  Sign out ({user.name.split(" ")[0]})
                </button>
              ) : (
                navItem("login", "Sign in")
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------
   HERO + SEARCH
--------------------------------------------------------- */
function Hero({ searchQuery, setSearchQuery }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.blue} 100%)` }} className="pb-16 pt-8 md:pt-12">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ background: "rgba(255,255,255,0.15)", color: C.white }} className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <MapPin size={12} /> Koforidua Technical University
          </span>
        </div>
        <h1 className="text-white text-2xl md:text-4xl font-extrabold mb-2">Find student housing near KTU</h1>
        <p style={{ color: "rgba(255,255,255,0.85)" }} className="text-sm md:text-base mb-6">
          Compare hostels, self-contained units and shared apartments around Koforidua Technical University — verified by agents, contactable in one tap.
        </p>

        <div style={{ background: C.white }} className="rounded-lg shadow-lg p-3 md:p-4 flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-md" style={{ background: C.blueMist }}>
            <Search size={18} color={C.gray600} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hostel or apartment name"
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: C.ink }}
            />
          </div>
          <PrimaryButton style={{ padding: "0.65rem 1.75rem" }}>
            <span className="flex items-center gap-2"><Search size={16} /> Search</span>
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   FILTER SIDEBAR
--------------------------------------------------------- */
/* ---------------------------------------------------------
   MULTI-SELECT DROPDOWN — collapsed by default, opens like the
   "Sort: Recommended" select, checkboxes live inside the panel
--------------------------------------------------------- */
function MultiSelectDropdown({ label, options, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const summary = selected.length === 0 ? label : `${label} (${selected.length})`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ borderColor: C.border, color: C.ink }}
        className="w-full border rounded-md text-sm px-3 py-2 bg-white flex items-center justify-between"
      >
        <span>{summary}</span>
        <ChevronDown size={16} color={C.gray600} />
      </button>
      {open && (
        <div
          style={{ borderColor: C.border }}
          className="absolute z-10 mt-1 w-full border rounded-md bg-white shadow-lg p-2 flex flex-col gap-1 max-h-60 overflow-y-auto"
        >
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded hover:bg-gray-50"
              style={{ color: C.gray600 }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => onToggle(opt)}
                style={{ accentColor: C.blue }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   FILTER SIDEBAR
--------------------------------------------------------- */
function FilterSidebar({ filters, setFilters, resultCount }) {
  const toggleRoomType = (rt) => {
    setFilters((f) => ({
      ...f,
      roomTypes: f.roomTypes.includes(rt) ? f.roomTypes.filter((x) => x !== rt) : [...f.roomTypes, rt],
    }));
  };

  const togglePropertyType = (pt) => {
    setFilters((f) => ({
      ...f,
      propertyTypes: f.propertyTypes.includes(pt) ? f.propertyTypes.filter((x) => x !== pt) : [...f.propertyTypes, pt],
    }));
  };

  const roomTypes = ALL_ROOM_TYPES;
  const propertyTypes = ["Hostel", "Apartment"];

  return (
    <aside style={{ borderColor: C.border }} className="border rounded-lg p-4 h-fit md:sticky md:top-4 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal size={16} color={C.navy} />
        <h3 style={{ color: C.ink }} className="font-bold text-sm">Filter results</h3>
      </div>

      <div className="mb-5">
        <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Max price (GH₵{filters.priceMax.toLocaleString()})</p>
        <input
          type="range" min="500" max={MAX_PRICE} step="250"
          value={filters.priceMax}
          onChange={(e) => setFilters((f) => ({ ...f, priceMax: Number(e.target.value) }))}
          className="w-full accent-current"
          style={{ accentColor: C.blue }}
        />
        <p style={{ color: C.gray600 }} className="text-xs mt-1.5">Prices are per semester, per both semesters, or per year, shown on each listing.</p>
      </div>

      <div className="mb-5">
       
      <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Property type</p>
        <MultiSelectDropdown
          label="Any property type"
          options={propertyTypes}
          selected={filters.propertyTypes}
          onToggle={togglePropertyType}
        />
      </div>

      <div className="mb-5">
        <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Room type</p>
        <MultiSelectDropdown
          label="Any room type"
          options={roomTypes}
          selected={filters.roomTypes}
          onToggle={toggleRoomType}
        />
      </div>

      <div className="mb-5">
        <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Bathroom</p>
        <select
          value={filters.bath}
          onChange={(e) => setFilters((f) => ({ ...f, bath: e.target.value }))}
          style={{ borderColor: C.border, color: C.ink }}
          className="w-full border rounded-md text-sm px-3 py-2 bg-white"
        >
          {["Any", "Ensuite bath", "Shared bath"].map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
          <input type="checkbox" checked={filters.kitchen} onChange={(e) => setFilters((f) => ({ ...f, kitchen: e.target.checked }))} style={{ accentColor: C.blue }} />
          Shared kitchen required
        </label>
      </div>

      <div style={{ borderColor: C.border }} className="border-t mt-4 pt-3 text-xs" >
        <span style={{ color: C.gray600 }}>{resultCount} propert{resultCount === 1 ? "y" : "ies"} match your filters</span>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------
   LISTING CARD
--------------------------------------------------------- */
function ListingCard({ listing, isFav, toggleFav, onOpen }) {
  return (
    <div style={{ borderColor: C.border }} className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition flex flex-col sm:flex-row">
      <div className="relative sm:w-56 shrink-0">
        <img src={img(listing.image)} alt={listing.name} className="w-full h-44 sm:h-full object-cover" />
        {(listing.featured || listing.verified) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {listing.featured && <Badge tone="yellow"><span className="flex items-center gap-1"><Sparkles size={12} /> Featured</span></Badge>}
            {listing.verified && <Badge tone="blue"><span className="flex items-center gap-1"><BadgeCheck size={12} /> Verified</span></Badge>}
          </div>
        )}
        <button
          onClick={() => toggleFav(listing.id)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
        >
          <Heart size={16} color={isFav ? C.blue : C.gray400} fill={isFav ? C.blue : "none"} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={() => onOpen(listing)} style={{ color: C.blue }} className="text-left font-bold text-base hover:underline">
              {listing.name}
            </button>
            <p style={{ color: C.gray600 }} className="text-xs mt-1 flex items-center gap-1"><MapPin size={12} /> {listing.university} · {listing.distance}</p>
          </div>
          <ScoreBadge score={listing.rating} size="sm" />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge>{listing.roomOptions?.length > 1 ? `${listing.roomOptions.length} room types` : (listing.roomOptions?.[0]?.roomType || listing.roomType)}</Badge>
          <Badge>{listing.bath}</Badge>
          {listing.kitchen && <Badge tone="green">Shared kitchen</Badge>}
          <Badge tone={AVAILABILITY_TONE[listing.availability] || "green"}>{listing.availability || "Space available"}</Badge>
        </div>

        <div className="flex flex-wrap gap-3 mt-3">
          {listing.amenities.slice(0, 4).map((a) => {
            const Icon = AMENITY_ICONS[a] || Check;
            return (
              <span key={a} style={{ color: C.gray600 }} className="text-xs flex items-center gap-1">
                <Icon size={13} /> {a}
              </span>
            );
          })}
        </div>

        <div className="mt-auto pt-4 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p style={{ color: C.gray600 }} className="text-xs">{listing.reviewCount ?? (listing.reviews?.length || 0)} student reviews</p>
            <p style={{ color: C.ink }} className="text-xl font-extrabold">
              {listing.roomOptions?.length > 1 && <span className="text-sm font-medium" style={{ color: C.gray600 }}>From </span>}
              GH₵{listing.price.toLocaleString()}<span className="text-sm font-medium" style={{ color: C.gray600 }}> · {listing.pricingPeriod || "Per semester"}</span>
            </p>
          </div>
          <PrimaryButton onClick={() => onOpen(listing)}>View room</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HOME VIEW
--------------------------------------------------------- */
function HomeView({ favorites, toggleFav, onOpenListing, listings, loading }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ priceMax: MAX_PRICE, roomTypes: [], propertyTypes: [], bath: "Any", kitchen: false });
  const [sort, setSort] = useState("recommended");

  const filtered = useMemo(() => {
    let out = listings.filter((l) => {
      if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (l.price > filters.priceMax) return false;
      if (filters.roomTypes.length) {
        const types = (l.roomOptions || []).map((r) => r.roomType);
        const hasMatch = types.length ? types.some((t) => filters.roomTypes.includes(t)) : filters.roomTypes.includes(l.roomType);
        if (!hasMatch) return false;
      }
      if (filters.propertyTypes.length && !filters.propertyTypes.includes(l.type)) return false;
      if (filters.bath !== "Any" && l.bath !== filters.bath) return false;
      if (filters.kitchen && !l.kitchen) return false;
      return true;
    });
    if (sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
    if (sort === "rating") out = [...out].sort((a, b) => b.rating - a.rating);
    return out;
  }, [listings, searchQuery, filters, sort]);

  // True "homepage" state — no search or filters applied yet. This is where a
  // Featured-plan listing's homepagePlacement actually earns its keep: a dedicated
  // strip above the regular results, instead of just being a flag nothing reads.
  const isDefaultView = !searchQuery && filters.priceMax === MAX_PRICE && filters.roomTypes.length === 0
    && filters.propertyTypes.length === 0 && filters.bath === "Any" && !filters.kitchen;
  const featuredListings = useMemo(
    () => (isDefaultView ? listings.filter((l) => l.homepagePlacement) : []),
    [isDefaultView, listings]
  );

  return (
    <div>
      <Hero searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        {!loading && featuredListings.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} color={C.yellow} />
              <h2 style={{ color: C.ink }} className="font-bold text-lg">Featured properties</h2>
            </div>
            {/* ListingCard is a wide horizontal layout (image left, details right) —
                cramming it into a multi-column grid left no room for the text, cutting
                it off mid-word. A horizontal scroller gives each card its full natural
                width instead, so nothing overlaps. */}
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
              {featuredListings.map((l) => (
                <div key={l.id} className="w-[300px] sm:w-[480px] shrink-0 snap-start">
                  <ListingCard listing={l} isFav={favorites.has(l.id)} toggleFav={toggleFav} onOpen={onOpenListing} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
          <FilterSidebar filters={filters} setFilters={setFilters} resultCount={filtered.length} />

          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 style={{ color: C.ink }} className="font-bold text-lg">{filtered.length} places to stay</h2>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ borderColor: C.border, color: C.ink }}
                className="border rounded-md text-sm px-3 py-2 bg-white"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </div>

            <div className="flex flex-col gap-4">
              {loading && (
                <div style={{ borderColor: C.border }} className="border rounded-lg p-10 text-center bg-white">
                  <p style={{ color: C.gray600 }} className="text-sm">Loading listings…</p>
                </div>
              )}
              {!loading && filtered.map((l) => (
                <ListingCard key={l.id} listing={l} isFav={favorites.has(l.id)} toggleFav={toggleFav} onOpen={onOpenListing} />
              ))}
              {!loading && filtered.length === 0 && (
                <div style={{ borderColor: C.border }} className="border rounded-lg p-10 text-center bg-white">
                  <p style={{ color: C.ink }} className="font-semibold mb-1">No properties match those filters</p>
                  <p style={{ color: C.gray600 }} className="text-sm">Try widening your price range or clearing a filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   CONTACT / BOOKING MODAL
--------------------------------------------------------- */

  const BOOKING_FEE_GHS = 5;

function ContactModal({ listing, roomType, onClose }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", moveIn: "",
    message: `Hi, I'm interested in ${listing.name}${roomType ? ` (${roomType})` : ""}. Is it still available?`,
  });

  const ownerWhatsappDigits = toWhatsappDigits(listing.ownerWhatsapp);
  const mailLink = listing.ownerEmail ? `mailto:${listing.ownerEmail}?subject=${encodeURIComponent("Inquiry: " + listing.name)}&body=${encodeURIComponent(form.message)}` : null;

  const submitBookingRequest = async (paymentReference) => {
    const waTab = ownerWhatsappDigits ? window.open("", "_blank") : null;
    try {
      await api.sendInquiry({
        listingId: listing.id, name: form.name, phone: form.phone, email: form.email,
        moveIn: form.moveIn,
        message: `${form.message}\n\n(Booking fee of GH₵${BOOKING_FEE_GHS} paid — ref: ${paymentReference})`,
        roomType,
      });
      if (ownerWhatsappDigits) {
        const summary = [
          `New BookInn booking request for ${listing.name}${roomType ? ` — ${roomType}` : ""}`,
          `Name: ${form.name}`,
          form.phone ? `Phone: ${form.phone}` : null,
          form.email ? `Email: ${form.email}` : null,
          form.moveIn ? `Move-in: ${form.moveIn}` : null,
          `Booking fee: GH₵${BOOKING_FEE_GHS} PAID (ref: ${paymentReference})`,
          `Message: ${form.message}`,
        ].filter(Boolean).join("\n");
        const autoWaLink = `https://wa.me/${ownerWhatsappDigits}?text=${encodeURIComponent(summary)}`;
        if (waTab) waTab.location.href = autoWaLink;
        else window.open(autoWaLink, "_blank", "noopener,noreferrer");
      }
      setSent(true);
    } catch (err) {
      if (waTab) waTab.close();
      setSendError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const payAndSend = () => {
    if (!form.name) { setSendError("Enter your name so the property manager knows who's asking."); return; }
    if (!form.email) { setSendError("Enter your email — Paystack needs it for the payment receipt."); return; }
    if (!ownerWhatsappDigits) { setSendError("This owner hasn't added a WhatsApp number yet — try Email instead."); return; }
    setSendError("");
    if (!PAYSTACK_PUBLIC_KEY) {
      setSendError("Payments aren't configured yet — set VITE_PAYSTACK_PUBLIC_KEY.");
      return;
    }
    if (!window.PaystackPop) {
      setSendError("Couldn't load the payment window. Check your connection and try again.");
      return;
    }
    setBusy(true);
    const reference = `bookinn_fee_${listing.id}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: form.email,
      amount: BOOKING_FEE_GHS * 100,
      currency: "GHS",
      ref: reference,
      metadata: { listingId: listing.id, roomType, purpose: "booking_fee" },
      callback: (response) => {
        api.verifyBookingPayment(response.reference)
          .then(() => submitBookingRequest(response.reference))
          .catch((err) => { setSendError(err.message); setBusy(false); });
      },
      onClose: () => setBusy(false),
    });
    handler.openIframe();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.55)" }} onClick={onClose}>
      <div style={{ background: C.white }} className="rounded-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4"><X size={20} color={C.gray600} /></button>
        <h3 style={{ color: C.ink }} className="font-bold text-lg mb-1">Contact about this room</h3>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">{listing.name}{roomType ? ` · ${roomType}` : ""}</p>

        {sent ? (
          <div style={{ background: C.blueLight }} className="rounded-md p-4 text-center">
            <Check className="mx-auto mb-2" color={C.navy} />
            <p style={{ color: C.navy }} className="font-semibold text-sm">
              Booking fee paid and inquiry sent — we've also opened WhatsApp with your details ready to send to the owner.
            </p>
          </div>
        ) : (
          <>
            {mailLink && (
              <div className="flex gap-2 mb-4">
                <a href={mailLink} style={{ borderColor: C.border, color: C.navy }} className="flex-1 border text-sm font-semibold py-2.5 rounded-md flex items-center justify-center gap-1.5">
                  <Mail size={16} /> Email instead
                </a>
              </div>
            )}

            <div style={{ borderColor: C.border }} className="border-t pt-4">
              <p style={{ color: C.gray600 }} className="text-xs mb-3">
                Pay the GH₵{BOOKING_FEE_GHS} booking fee to send your request — it's sent straight to the owner's WhatsApp automatically once confirmed.
              </p>
              <div className="flex flex-col gap-2.5">
                <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2" />
                <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
                <input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
                <input type="date" value={form.moveIn} onChange={(e) => setForm({ ...form, moveIn: e.target.value })}
                  style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none" />
                <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none resize-none" />

                <div style={{ background: C.blueMist, borderColor: C.border }} className="border rounded-md p-3">
                  <p style={{ color: C.ink }} className="text-xs font-semibold mb-0.5 flex items-center gap-1.5">
                    <ShieldCheck size={13} color={C.blue} /> Secure payment via Paystack
                  </p>
                  <p style={{ color: C.gray600 }} className="text-xs">You'll pay GH₵{BOOKING_FEE_GHS} in a secure Paystack window. Your card details never touch BookInn's servers, and WhatsApp only opens once payment is verified.</p>
                </div>

                {sendError && (
                  <p style={{ color: "#b3261e" }} className="text-xs">{sendError}</p>
                )}
                <PrimaryButton full onClick={payAndSend} disabled={busy}>
                  {busy ? "Processing…" : `Pay GH₵${BOOKING_FEE_GHS} & continue to WhatsApp`}
                </PrimaryButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   LISTING DETAIL VIEW
--------------------------------------------------------- */
function ReviewForm({ listingId, onSubmitted }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(9);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name) { setError("Enter your name."); return; }
    setError("");
    setSubmitting(true);
    try {
      const { listing } = await api.addReview(listingId, { name, rating, text });
      onSubmitted?.(listing);
      setDone(true);
      setName("");
      setText("");
      setRating(9);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ borderColor: C.border, background: C.blueLight }} className="border rounded-lg p-4 text-sm">
        <p style={{ color: C.ink }} className="font-semibold mb-1">Thanks for your review!</p>
        <button onClick={() => setDone(false)} style={{ color: C.blue }} className="text-xs font-semibold hover:underline">Leave another review</button>
      </div>
    );
  }

  return (
    <div style={{ borderColor: C.border }} className="border rounded-lg p-4">
      <p style={{ color: C.ink }} className="font-semibold text-sm mb-3">Leave a review</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-2 mb-2">
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
          style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}
          style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}/10</option>)}
        </select>
      </div>
      <textarea placeholder="What was your experience like? (optional)" rows={2} value={text} onChange={(e) => setText(e.target.value)}
        style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full resize-none mb-2" />
      {error && <p style={{ color: "#b3261e" }} className="text-xs mb-2">{error}</p>}
      <PrimaryButton onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}</PrimaryButton>
    </div>
  );
}

function DetailView({ listing, onBack, isFav, toggleFav, onReviewAdded }) {
  const [showContact, setShowContact] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [walkStep, setWalkStep] = useState(0);
  const roomOptions = listing.roomOptions?.length ? listing.roomOptions : [{ roomType: listing.roomType, price: listing.price }];
  const [selectedRoom, setSelectedRoom] = useState(roomOptions[0]?.roomType || "");
  const galleryImages = [listing.image, ...(listing.images || [])].filter(Boolean);
  const walkthroughStops = listing.virtualWalkthrough ? (listing.walkthrough || []) : [];

  React.useEffect(() => {
    setActiveImg(0);
    setWalkStep(0);
    setSelectedRoom(roomOptions[0]?.roomType || "");
    api.recordView(listing.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  const selectedPrice = roomOptions.find((r) => r.roomType === selectedRoom)?.price ?? listing.price;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <button onClick={onBack} style={{ color: C.blue }} className="text-sm font-semibold flex items-center gap-1 mb-4 hover:underline">
        <ChevronLeft size={16} /> Back to results
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 style={{ color: C.ink }} className="text-2xl font-extrabold">{listing.name}</h1>
          <p style={{ color: C.gray600 }} className="text-sm mt-1 flex items-center gap-1"><MapPin size={14} /> {listing.university} · {listing.distance}</p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge score={listing.rating} />
          <button onClick={() => toggleFav(listing.id)} style={{ borderColor: C.border }} className="border w-10 h-10 rounded-md flex items-center justify-center">
            <Heart size={18} color={isFav ? C.blue : C.gray400} fill={isFav ? C.blue : "none"} />
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="h-52 sm:h-64 md:h-80 mb-3 rounded-lg overflow-hidden">
        <img src={img(galleryImages[activeImg])} className="object-cover w-full h-full" alt={listing.name} />
      </div>
      {galleryImages.length > 1 ? (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {galleryImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              style={{ borderColor: i === activeImg ? C.blue : "transparent" }}
              className="shrink-0 rounded-md overflow-hidden border-2"
            >
              <img src={img(src)} className="w-16 h-16 sm:w-20 sm:h-20 object-cover" alt={`${listing.name} view ${i + 1}`} />
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="flex flex-wrap gap-2 mb-5">
            {roomOptions.map((r) => <Badge key={r.roomType}>{r.roomType}</Badge>)}
            <Badge>{listing.bath}</Badge>
            {listing.kitchen && <Badge tone="green">Shared kitchen</Badge>}
            {listing.featured && <Badge tone="yellow">Featured listing</Badge>}
            {listing.verified && <Badge tone="blue"><span className="flex items-center gap-1"><BadgeCheck size={12} /> Verified</span></Badge>}
          </div>

          <h3 style={{ color: C.ink }} className="font-bold text-base mb-2">About this room</h3>
          <p style={{ color: C.gray600 }} className="text-sm leading-relaxed mb-6">{listing.desc}</p>

          {listing.locationDescription && (
            <>
              <h3 style={{ color: C.ink }} className="font-bold text-base mb-2 flex items-center gap-1.5"><MapPin size={16} color={C.blue} /> Location</h3>
              <p style={{ color: C.gray600 }} className="text-sm leading-relaxed mb-6">{listing.locationDescription}</p>
            </>
          )}

          <h3 style={{ color: C.ink }} className="font-bold text-base mb-3">Amenities</h3>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {listing.amenities.map((a) => {
              const Icon = AMENITY_ICONS[a] || Check;
              return (
                <div key={a} style={{ color: C.ink }} className="flex items-center gap-2 text-sm">
                  <Icon size={16} color={C.blue} /> {a}
                </div>
              );
            })}
          </div>

          <h3 style={{ color: C.ink }} className="font-bold text-base mb-3">Video tour</h3>
          {listing.video ? (
            <div className="mb-6 rounded-lg overflow-hidden" style={{ borderColor: C.border }}>
              <video src={listing.video} controls className="w-full max-h-96 bg-black" />
            </div>
          ) : (
            <div style={{ background: C.blueMist, borderColor: C.border }} className="border rounded-lg p-4 sm:p-6 flex items-center gap-4 mb-6">
              <div style={{ background: C.navy }} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0">
                <PlayCircle size={26} color={C.white} />
              </div>
              <div>
                <p style={{ color: C.ink }} className="font-semibold text-sm">No video tour uploaded yet</p>
                <p style={{ color: C.gray600 }} className="text-xs mt-0.5">The property manager hasn't added a walkthrough video for this listing.</p>
              </div>
            </div>
          )}

          {walkthroughStops.length > 0 && (
            <>
              <h3 style={{ color: C.ink }} className="font-bold text-base mb-3 flex items-center gap-1.5">
                <Compass size={17} color={C.blue} /> Virtual walkthrough
              </h3>
              <div className="mb-6 rounded-lg overflow-hidden border" style={{ borderColor: C.border }}>
                <div className="relative h-56 sm:h-72 bg-black">
                  <img
                    src={walkthroughStops[walkStep]?.image}
                    alt={walkthroughStops[walkStep]?.label || `Stop ${walkStep + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {walkthroughStops.length > 1 && (
                    <>
                      <button
                        onClick={() => setWalkStep((s) => (s - 1 + walkthroughStops.length) % walkthroughStops.length)}
                        style={{ background: "rgba(0,0,0,0.45)" }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-black/60"
                      >
                        <ChevronLeft size={20} color={C.white} />
                      </button>
                      <button
                        onClick={() => setWalkStep((s) => (s + 1) % walkthroughStops.length)}
                        style={{ background: "rgba(0,0,0,0.45)" }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-black/60"
                      >
                        <ChevronRight size={20} color={C.white} />
                      </button>
                    </>
                  )}
                  <div style={{ background: "rgba(0,0,0,0.55)" }} className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between">
                    <p className="text-white text-sm font-semibold">{walkthroughStops[walkStep]?.label || `Stop ${walkStep + 1}`}</p>
                    <p className="text-white text-xs">{walkStep + 1}/{walkthroughStops.length}</p>
                  </div>
                </div>
                {walkthroughStops.length > 1 && (
                  <div className="flex gap-2 p-2 overflow-x-auto" style={{ background: C.blueMist }}>
                    {walkthroughStops.map((stop, i) => (
                      <button
                        key={stop.id ?? i}
                        onClick={() => setWalkStep(i)}
                        style={{ borderColor: i === walkStep ? C.blue : "transparent" }}
                        className="shrink-0 rounded-md overflow-hidden border-2"
                      >
                        <img src={stop.image} className="w-14 h-14 object-cover" alt={stop.label || `Stop ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <h3 style={{ color: C.ink }} className="font-bold text-base mb-3">Student reviews ({listing.reviewCount ?? (listing.reviews?.length || 0)})</h3>
          <div className="flex flex-col gap-3 mb-4">
            {(listing.reviews || []).length === 0 && (
              <p style={{ color: C.gray600 }} className="text-sm">No reviews yet — be the first student to share your experience.</p>
            )}
            {(listing.reviews || []).map((r, i) => (
              <div key={i} style={{ borderColor: C.border }} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p style={{ color: C.ink }} className="font-semibold text-sm">{r.name}</p>
                  <div style={{ background: C.navy }} className="text-white text-xs font-bold px-2 py-0.5 rounded">{r.rating}.0</div>
                </div>
                {r.text && <p style={{ color: C.gray600 }} className="text-sm">{r.text}</p>}
              </div>
            ))}
          </div>

          <ReviewForm listingId={listing.id} onSubmitted={onReviewAdded} />
        </div>

        {/* Booking sidebar */}
        <div style={{ borderColor: C.border }} className="border rounded-lg p-5 h-fit md:sticky md:top-4">
          <p style={{ color: C.ink }} className="text-2xl font-extrabold">GH₵{selectedPrice.toLocaleString()}<span className="text-sm font-medium" style={{ color: C.gray600 }}> · {listing.pricingPeriod || "Per semester"}</span></p>
          <p style={{ color: listing.availability === "Fully booked" ? "#b3261e" : listing.availability === "Partly booked" ? C.yellowDark : C.green }} className="text-xs font-semibold mt-1 flex items-center gap-1">
            <BadgeCheck size={14} /> {listing.availability || "Space available"}
          </p>

          <div style={{ borderColor: C.border }} className="border-t my-4" />

          {roomOptions.length > 1 && (
            <div className="mb-4">
              <p style={{ color: C.ink }} className="text-xs font-semibold mb-1.5">Room category</p>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                style={{ borderColor: C.border, color: C.ink }}
                className="border rounded-md px-3 py-2 text-sm outline-none w-full"
              >
                {roomOptions.map((r) => (
                  <option key={r.roomType} value={r.roomType}>{r.roomType} — GH₵{r.price.toLocaleString()}{r.availability ? ` (${r.availability})` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2.5 mb-4 text-sm" style={{ color: C.gray600 }}>
            <div className="flex items-center gap-2"><BedDouble size={15} /> {selectedRoom}</div>
            <div className="flex items-center gap-2"><Bath size={15} /> {listing.bath}</div>
            <div className="flex items-center gap-2"><MapPin size={15} /> {listing.distance}</div>
          </div>

          <PrimaryButton full onClick={() => setShowContact(true)}>
            {listing.availability === "Fully booked" ? "Ask about waitlist" : "Contact / Book room"}
          </PrimaryButton>
          <p style={{ color: C.gray400 }} className="text-xs text-center mt-3">No payment required to send an inquiry</p>
        </div>
      </div>

      {showContact && <ContactModal listing={listing} roomType={selectedRoom} onClose={() => setShowContact(false)} />}
    </div>
  );
}

/* ---------------------------------------------------------
   SAVED VIEW
--------------------------------------------------------- */
function SavedView({ listings, favorites, toggleFav, onOpenListing }) {
  const saved = listings.filter((l) => favorites.has(l.id));
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <h1 style={{ color: C.ink }} className="text-2xl font-extrabold mb-1">Your saved stays</h1>
      <p style={{ color: C.gray600 }} className="text-sm mb-6">Rooms you've bookmarked while browsing.</p>
      {saved.length === 0 ? (
        <div style={{ borderColor: C.border }} className="border rounded-lg p-10 text-center bg-white">
          <Heart className="mx-auto mb-2" color={C.gray400} />
          <p style={{ color: C.ink }} className="font-semibold mb-1">Nothing saved yet</p>
          <p style={{ color: C.gray600 }} className="text-sm">Tap the heart icon on any listing to keep track of it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {saved.map((l) => (
            <ListingCard key={l.id} listing={l} isFav toggleFav={toggleFav} onOpen={onOpenListing} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   PRICING / LIST-YOUR-PROPERTY VIEW
--------------------------------------------------------- */
function PricingView({ onSelectTier, onGoToDashboard }) {
  return (
    <div>
      <div style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.blue} 100%)` }} className="py-14">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-white text-2xl md:text-3xl font-extrabold mb-3">Reach more students, faster</h1>
          <p style={{ color: "rgba(255,255,255,0.85)" }} className="text-sm md:text-base max-w-2xl mx-auto">
            List your hostel or apartment on BookInn and get discovered by students searching by campus, price and room type.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        <div style={{ background: C.blueLight, borderColor: C.border }} className="border rounded-lg p-4 mb-4 flex items-start gap-3">
          <Sparkles size={18} color={C.blue} className="mt-0.5 shrink-0" />
          <p style={{ color: C.navy }} className="text-sm">
            <span className="font-bold">Try it free for 270 days.</span> Create an Owner account and publish your listing from the dashboard — no card required. Your listing stays visible to students for the full trial; subscribe anytime to keep it active afterward.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_TIERS.map((t) => (
            <div
              key={t.name}
              style={{ borderColor: t.highlight ? C.blue : C.border, borderWidth: t.highlight ? 2 : 1 }}
              className="border rounded-lg p-6 bg-white flex flex-col"
            >
              {t.highlight && <Badge tone="yellow">Most popular</Badge>}
              <h3 style={{ color: C.ink }} className="font-bold text-lg mt-2">{t.name}</h3>
              <p className="mt-1 mb-4">
                <span style={{ color: C.ink }} className="text-2xl font-extrabold">{t.price}</span>
                <span style={{ color: C.gray600 }} className="text-sm">{t.period}</span>
              </p>
              <ul className="flex flex-col gap-2 mb-6 flex-1">
                {t.features.map((f) => (
                  <li key={f} style={{ color: C.gray600 }} className="text-sm flex items-start gap-2">
                    <Check size={15} color={C.blue} className="mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {t.highlight ? (
                <PrimaryButton full onClick={() => onSelectTier(t.name)}>Get started</PrimaryButton>
              ) : (
                <GhostButton full onClick={() => onSelectTier(t.name)}>Get started</GhostButton>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white mt-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 style={{ color: C.ink }} className="font-bold text-base mb-1">Already have a listing?</h3>
            <p style={{ color: C.gray600 }} className="text-sm">Manage rooms, photos and inquiries from your dashboard.</p>
          </div>
          <PrimaryButton onClick={onGoToDashboard}>
            <span className="flex items-center gap-2">Go to dashboard <ArrowRight size={16} /></span>
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ADMIN DASHBOARD
--------------------------------------------------------- */
function AccountView({ user, favCount, setView }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white">
        <div className="flex items-center gap-3 mb-5">
          <div style={{ background: C.navy }} className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
            {user.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p style={{ color: C.ink }} className="font-bold">{user.name}</p>
            <p style={{ color: C.gray600 }} className="text-sm">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div style={{ borderColor: C.border }} className="border rounded-md p-3">
            <p style={{ color: C.gray600 }} className="text-xs">Account type</p>
            <p style={{ color: C.ink }} className="font-semibold text-sm">{user.role}</p>
          </div>
          <div style={{ borderColor: C.border }} className="border rounded-md p-3">
            <p style={{ color: C.gray600 }} className="text-xs">Saved listings</p>
            <p style={{ color: C.ink }} className="font-semibold text-sm">{favCount}</p>
          </div>
          {user.role === "Owner" && (
            <div style={{ borderColor: C.border }} className="border rounded-md p-3">
              <p style={{ color: C.gray600 }} className="text-xs">Subscription</p>
              <p style={{ color: C.ink }} className="font-semibold text-sm">
                {user.subscription?.status === "active" ? `${user.subscription.tier} · active` : "Not subscribed"}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {user.role === "Owner" ? (
            <PrimaryButton onClick={() => setView("admin")}>Go to owner dashboard</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setView("saved")}>View saved listings</PrimaryButton>
          )}
          <GhostButton onClick={() => setView("home")}>Explore stays</GhostButton>
        </div>
      </div>
    </div>
  );
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

function SubscribeView({ user, token, initialTier, onSubscribed, setView }) {
  const [tier, setTier] = useState(initialTier || "Premium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plan = PRICING_TIERS.find((t) => t.name === tier);

  const payWithPaystack = () => {
    setError("");
    if (!plan) return;
    if (!PAYSTACK_PUBLIC_KEY) {
      setError("Payments aren't configured yet — set VITE_PAYSTACK_PUBLIC_KEY in your .env file.");
      return;
    }
    if (!window.PaystackPop) {
      setError("Couldn't load the payment window. Check your connection and try again.");
      return;
    }
    setBusy(true);
    const reference = `bookinn_${tier.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: plan.amount * 100, // Paystack expects the amount in pesewas (GHS minor units)
      currency: "GHS",
      ref: reference,
      metadata: { userId: user.id, tier },
      callback: (response) => {
        // The popup reporting success isn't enough on its own — confirm with Paystack server-side
        // before unlocking the dashboard, so the amount/status can't be spoofed from the browser.
        api.verifyPayment(response.reference, tier, token)
          .then((data) => onSubscribed(data.user))
          .catch((err) => setError(err.message))
          .finally(() => setBusy(false));
      },
      onClose: () => setBusy(false),
    });
    handler.openIframe();
  };

  if (user && user.role !== "Owner") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p style={{ color: C.ink }} className="font-semibold mb-2">This account is registered as a {user.role}</p>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">Only Owner accounts can subscribe to list properties. Create a separate Owner account to get started.</p>
        <PrimaryButton onClick={() => setView("home")}>Back to home</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white">
        <h1 style={{ color: C.ink }} className="text-xl font-extrabold mb-1">Subscribe to list properties</h1>
        <p style={{ color: C.gray600 }} className="text-sm mb-5">Choose a plan to unlock the owner dashboard.</p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {PRICING_TIERS.map((t) => (
            <button
              key={t.name}
              onClick={() => setTier(t.name)}
              style={{ borderColor: tier === t.name ? C.blue : C.border, background: tier === t.name ? C.blueLight : C.white }}
              className="border rounded-md p-3 text-left"
            >
              <p style={{ color: C.ink }} className="text-sm font-bold">{t.name}</p>
              <p style={{ color: C.gray600 }} className="text-xs">{t.price}{t.period}</p>
            </button>
          ))}
        </div>

        {plan && (
          <ul className="flex flex-col gap-1.5 mb-5">
            {plan.features.map((f) => (
              <li key={f} style={{ color: C.gray600 }} className="text-xs flex items-start gap-2">
                <Check size={13} color={C.blue} className="mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        )}

        <div style={{ background: C.blueMist, borderColor: C.border }} className="border rounded-md p-3 mb-4">
          <p style={{ color: C.ink }} className="text-xs font-semibold mb-0.5 flex items-center gap-1.5">
            <ShieldCheck size={13} color={C.blue} /> Secure payment via Paystack
          </p>
          <p style={{ color: C.gray600 }} className="text-xs">You'll pay in a secure Paystack window. Your card details never touch BookInn's servers, and the subscription only unlocks once the payment is verified.</p>
        </div>

        {error && (
          <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <PrimaryButton full onClick={payWithPaystack} disabled={busy || !plan}>
          {busy ? "Processing…" : `Pay GH₵${plan?.amount.toLocaleString()} with Paystack`}
        </PrimaryButton>
      </div>
    </div>
  );
}

function AdminView({ user, token, listings, maxListings, ownerStats, statsLoading, ownerInquiries, inquiriesLoading, mySubscription, subLoading, reminder, addListing, updateListing, deleteListing, onCancelSubscription, onStartTrial, onUpgrade }) {
  const emptyForm = {
    name: "", university: UNIVERSITIES[0], price: "",
    type: "Hostel", roomType: HOSTEL_ROOM_TYPES[0], bath: "Shared bath",
    kitchen: false, featured: false, amenities: [], imageData: "", galleryData: [], videoData: "",
    walkthrough: [], uploadingImage: false, uploadingGallery: false, uploadingVideo: false, uploadingWalkthrough: {},
    desc: "", locationDescription: "", travelKm: "", travelMinutes: "", travelMode: "walk", pricingPeriod: "Per semester",
    ownerEmail: "", ownerWhatsapp: "", availability: AVAILABILITY_STATUSES[0],
    // Hostel room categories: owner ticks every occupancy their hostel actually offers
    // (e.g. both "Two in a room" and "Four in a room") and sets a price for each.
    hostelRooms: HOSTEL_ROOM_TYPES.map((rt) => ({ roomType: rt, checked: false, price: "", availability: AVAILABILITY_STATUSES[0] })),
  };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [dismissedReminder, setDismissedReminder] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialError, setTrialError] = useState("");

  const handleStartTrialClick = async () => {
    setTrialError("");
    setStartingTrial(true);
    try {
      await onStartTrial?.();
    } catch (err) {
      setTrialError(err.message || "Couldn't start your free trial. Please try again.");
    } finally {
      setStartingTrial(false);
    }
  };

  // The dashboard never decides plan/feature access on its own — everything here is
  // read straight from the live, server-computed subscription view (mySubscription),
  // which the backend independently re-derives and enforces on every request.
  const view = mySubscription; // { plan, status, effectivePlan, features, isListingVisible, daysRemaining, ... }
  const features = view?.features || PLAN_FEATURES.Basic;
  const hasListing = listings.length > 0;
  const atListingLimit = listings.length >= maxListings;
  // Matches the backend's requireCanCreateListing exactly: only allowed once a
  // trial or paid plan is actually live — the owner must start their free trial
  // themselves first (see the subscription card below), it's never auto-granted.
  const canAddListing = !atListingLimit && view?.isListingVisible;
  const trialAvailable = !view?.trialUsed && view?.status !== "active";

  const galleryCap = features.maxPhotos;

  const stats = [
    { label: "Active listings", value: statsLoading ? "…" : (ownerStats?.activeListings ?? 0), icon: Building2 },
    { label: "Inquiries this month", value: statsLoading ? "…" : (ownerStats?.inquiriesThisMonth ?? 0), icon: Users },
  ];
  const analyticsStats = [
    { label: "Profile views (30d)", value: statsLoading ? "…" : (ownerStats?.profileViews30d ?? 0).toLocaleString(), icon: Eye },
    { label: "Est. revenue (GH₵)", value: statsLoading ? "…" : (ownerStats?.estimatedRevenueGHS ?? 0).toLocaleString(), icon: TrendingUp },
  ];

  // Photos/video upload straight to Cloudinary via the server's multipart
  // /api/uploads route (see server/index.js + server/cloudinary.js) and only
  // the returned URL is kept in form state — never the raw file data.
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSubmitError("");
    setForm((f) => ({ ...f, uploadingImage: true }));
    try {
      const { url } = await api.uploadFile(file, token);
      setForm((f) => ({ ...f, imageData: url, uploadingImage: false }));
    } catch (err) {
      setSubmitError(err.message || "Photo upload failed — please try again.");
      setForm((f) => ({ ...f, uploadingImage: false }));
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const cap = galleryCap;
    const room = Math.max(0, cap - form.galleryData.length);
    const toAdd = files.slice(0, room);
    if (files.length > toAdd.length) {
      const nextPlan = view?.effectivePlan === "Basic" ? "Premium" : "Featured";
      setSubmitError(`You've reached the ${cap}-photo limit on the ${view?.effectivePlan || "Basic"} plan. Upgrade to ${nextPlan} for up to ${PLAN_FEATURES[nextPlan].maxPhotos} photos.`);
    } else {
      setSubmitError("");
    }
    if (!toAdd.length) return;
    setForm((f) => ({ ...f, uploadingGallery: true }));
    try {
      const uploaded = await Promise.all(toAdd.map((file) => api.uploadFile(file, token)));
      setForm((f) => ({
        ...f,
        galleryData: [...f.galleryData, ...uploaded.map((u) => u.url)].slice(0, cap),
        uploadingGallery: false,
      }));
    } catch (err) {
      setSubmitError(err.message || "Photo upload failed — please try again.");
      setForm((f) => ({ ...f, uploadingGallery: false }));
    }
  };

  const removeGalleryImage = (idx) => {
    setForm((f) => ({ ...f, galleryData: f.galleryData.filter((_, i) => i !== idx) }));
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) return;
    if (file.size > 25 * 1024 * 1024) {
      setSubmitError("That video is too large — please use a file under 25MB.");
      return;
    }
    setSubmitError("");
    setForm((f) => ({ ...f, uploadingVideo: true }));
    try {
      const { url } = await api.uploadFile(file, token);
      setForm((f) => ({ ...f, videoData: url, uploadingVideo: false }));
    } catch (err) {
      setSubmitError(err.message || "Video upload failed — please try again.");
      setForm((f) => ({ ...f, uploadingVideo: false }));
    }
  };

  // Virtual walkthrough (Featured plan only): an ordered set of labeled room
  // photos, distinct from the single video tour above — capped server-side too.
  const walkthroughCap = features.maxWalkthroughStops || 0;

  const addWalkthroughStop = () => {
    setForm((f) => (f.walkthrough.length >= walkthroughCap ? f : { ...f, walkthrough: [...f.walkthrough, { label: "", image: "" }] }));
  };

  const removeWalkthroughStop = (idx) => {
    setForm((f) => ({ ...f, walkthrough: f.walkthrough.filter((_, i) => i !== idx) }));
  };

  const setWalkthroughLabel = (idx, label) => {
    setForm((f) => ({ ...f, walkthrough: f.walkthrough.map((s, i) => (i === idx ? { ...s, label } : s)) }));
  };

  const handleWalkthroughImageUpload = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSubmitError("");
    setForm((f) => ({ ...f, uploadingWalkthrough: { ...f.uploadingWalkthrough, [idx]: true } }));
    try {
      const { url } = await api.uploadFile(file, token);
      setForm((f) => ({
        ...f,
        walkthrough: f.walkthrough.map((s, i) => (i === idx ? { ...s, image: url } : s)),
        uploadingWalkthrough: { ...f.uploadingWalkthrough, [idx]: false },
      }));
    } catch (err) {
      setSubmitError(err.message || "Photo upload failed — please try again.");
      setForm((f) => ({ ...f, uploadingWalkthrough: { ...f.uploadingWalkthrough, [idx]: false } }));
    }
  };

  const toggleAmenity = (a) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  };

  const toggleHostelRoom = (roomType) => {
    setForm((f) => ({
      ...f,
      hostelRooms: f.hostelRooms.map((r) => (r.roomType === roomType ? { ...r, checked: !r.checked } : r)),
    }));
  };

  const setHostelRoomPrice = (roomType, price) => {
    setForm((f) => ({
      ...f,
      hostelRooms: f.hostelRooms.map((r) => (r.roomType === roomType ? { ...r, price } : r)),
    }));
  };

  const setHostelRoomAvailability = (roomType, availability) => {
    setForm((f) => ({
      ...f,
      hostelRooms: f.hostelRooms.map((r) => (r.roomType === roomType ? { ...r, availability } : r)),
    }));
  };

  const startEdit = (listing) => {
    setEditingId(listing.id);
    // Matches both the new "1.2 km · 6 min walk to campus" format and the older "6 min walk to campus" format.
    const distanceMatch = (listing.distance || "").match(/^(?:([\d.]+)\s*km\s*·\s*)?(\d+)\s*min\s*(walk|drive)/i);
    const existingRooms = Array.isArray(listing.roomOptions) ? listing.roomOptions : [];
    setForm({
      name: listing.name, university: listing.university, price: String(listing.price),
      type: listing.type, roomType: existingRooms[0]?.roomType || listing.roomType, bath: listing.bath,
      kitchen: !!listing.kitchen, featured: !!listing.featured, amenities: listing.amenities || [],
      // An actual uploaded photo is a Cloudinary URL (or, for older listings
      // saved before this upload flow existed, a raw base64 data URI) — a bare
      // placeholder key like "hostel1" means no photo was ever uploaded.
      imageData: listing.image && (listing.image.startsWith("http") || listing.image.startsWith("data:")) ? listing.image : "",
      galleryData: listing.images || [],
      videoData: listing.video || "",
      walkthrough: Array.isArray(listing.walkthrough) ? listing.walkthrough.map((s) => ({ label: s.label || "", image: s.image || "" })) : [],
      desc: listing.desc || "",
      locationDescription: listing.locationDescription || "",
      ownerEmail: listing.ownerEmail || "",
      ownerWhatsapp: listing.ownerWhatsapp || "",
      availability: listing.availability || AVAILABILITY_STATUSES[0],
      travelKm: distanceMatch && distanceMatch[1] ? distanceMatch[1] : "",
      travelMinutes: distanceMatch ? distanceMatch[2] : "",
      travelMode: distanceMatch ? distanceMatch[3].toLowerCase() : "walk",
      pricingPeriod: listing.pricingPeriod || "Per semester",
      hostelRooms: HOSTEL_ROOM_TYPES.map((rt) => {
        const match = existingRooms.find((r) => r.roomType === rt);
        return { roomType: rt, checked: !!match, price: match ? String(match.price) : "", availability: match?.availability || AVAILABILITY_STATUSES[0] };
      }),
    });
    setShowForm(true);
    setSubmitError("");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setSubmitError("");
  };

  const stillUploading = form.uploadingImage || form.uploadingGallery || form.uploadingVideo
    || Object.values(form.uploadingWalkthrough).some(Boolean);

  const submit = async () => {
    if (!form.name) return;
    if (stillUploading) {
      setSubmitError("Please wait for photo/video uploads to finish before saving.");
      return;
    }
    const roomOptions = form.type === "Hostel"
      ? form.hostelRooms.filter((r) => r.checked && r.price !== "" && Number(r.price) > 0).map((r) => ({ roomType: r.roomType, price: Number(r.price), availability: r.availability }))
      : (form.roomType && form.price && Number(form.price) > 0 ? [{ roomType: form.roomType, price: Number(form.price) }] : []);
    if (!roomOptions.length) {
      setSubmitError(
        form.type === "Hostel"
          ? "Tick at least one room category (e.g. Two in a room) and set a price for it."
          : "Choose a room type and enter a price."
      );
      return;
    }
    if (!form.ownerEmail && !form.ownerWhatsapp) {
      setSubmitError("Add an email or WhatsApp number so students' booking requests reach you.");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const existing = editingId ? listings.find((l) => l.id === editingId) : null;
      const minutes = form.travelMinutes !== "" ? Number(form.travelMinutes) : null;
      const km = form.travelKm !== "" ? Number(form.travelKm) : null;
      let distance = "New listing";
      if (minutes !== null && !Number.isNaN(minutes)) {
        distance = km !== null && !Number.isNaN(km)
          ? `${km} km · ${minutes} min ${form.travelMode} to campus`
          : `${minutes} min ${form.travelMode} to campus`;
      } else if (km !== null && !Number.isNaN(km)) {
        distance = `${km} km to campus`;
      }
      const payload = {
        name: form.name, type: form.type, roomOptions, bath: form.bath,
        kitchen: form.kitchen, featured: form.featured, university: form.university,
        amenities: form.amenities, pricingPeriod: form.pricingPeriod,
        image: form.imageData || existing?.image || "hostel1",
        images: form.galleryData,
        video: form.videoData, desc: form.desc, locationDescription: form.locationDescription,
        walkthrough: form.walkthrough.filter((s) => s.image),
        ownerEmail: form.ownerEmail, ownerWhatsapp: form.ownerWhatsapp, availability: form.availability,
        distance,
      };
      if (editingId) {
        await updateListing(editingId, payload);
      } else {
        await addListing(payload);
      }
      cancelForm();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteListing(id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const roomTypeOptions = form.type === "Hostel" ? HOSTEL_ROOM_TYPES : APARTMENT_ROOM_TYPES;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 style={{ color: C.ink }} className="text-xl sm:text-2xl font-extrabold">Owner dashboard</h1>
          <p style={{ color: C.gray600 }} className="text-sm">Manage your listings and track inquiries.</p>
        </div>
        {!atListingLimit && (
          <PrimaryButton
            disabled={startingTrial}
            onClick={() => {
              if (!canAddListing && !showForm) {
                trialAvailable ? handleStartTrialClick() : onUpgrade?.();
                return;
              }
              showForm ? cancelForm() : setShowForm(true);
            }}
          >
            <span className="flex items-center gap-2">
              <Plus size={16} />
              {canAddListing || showForm ? "Add listing" : trialAvailable ? (startingTrial ? "Starting trial…" : "Start free trial to add listing") : "Subscribe to add listing"}
            </span>
          </PrimaryButton>
        )}
      </div>

      {hasListing && (
        <p style={{ color: C.gray600 }} className="text-xs -mt-4 mb-4">
          {listings.length}/{maxListings} listing{maxListings === 1 ? "" : "s"} used on your {view?.status === "trial" ? "trial" : view?.plan || "current"} plan.
          {atListingLimit && view?.plan !== "Featured" && (
            <> <button type="button" onClick={onUpgrade} style={{ color: C.blue }} className="font-semibold hover:underline">Upgrade for more →</button></>
          )}
        </p>
      )}
      {hasListing && !view?.isListingVisible && !subLoading && (
        <p style={{ color: "#b3261e" }} className="text-xs -mt-3 mb-4">
          Your trial/subscription isn't active — your listing{listings.length > 1 ? "s are" : " is"} currently hidden from students. Subscribe below to make {listings.length > 1 ? "them" : "it"} visible again.
        </p>
      )}

      {reminder && !dismissedReminder && (
        <div style={{ background: "#fff6dc", borderColor: C.border }} className="border rounded-lg p-3 mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} color={C.yellowDark} className="mt-0.5 shrink-0" />
            <p style={{ color: C.yellowDark }} className="text-sm font-medium">{reminder.message}</p>
          </div>
          <button onClick={() => setDismissedReminder(true)}><X size={15} color={C.gray600} /></button>
        </div>
      )}

      {!subLoading && view && (
        <div style={{ borderColor: C.border, background: view.status === "expired" ? "#fdecea" : C.white }} className="border rounded-lg p-4 sm:p-5 mb-6 flex items-start justify-between flex-wrap gap-4">
          {view.status === "trial" && (
            <div className="flex items-start gap-3">
              <Sparkles size={20} color={C.blue} className="mt-0.5 shrink-0" />
              <div>
                <p style={{ color: C.navy }} className="text-sm font-extrabold">Free Trial</p>
                <p style={{ color: C.ink }} className="text-sm mt-0.5">{view.daysRemaining} day{view.daysRemaining === 1 ? "" : "s"} remaining</p>
                <p style={{ color: C.gray600 }} className="text-xs mt-0.5">{hasListing ? "Your listing is currently active." : "Add your listing to publish it to students."}</p>
              </div>
            </div>
          )}
          {view.status === "active" && (
            <div className="flex items-start gap-3">
              <BadgeCheck size={20} color={C.green} className="mt-0.5 shrink-0" />
              <div>
                <p style={{ color: C.navy }} className="text-sm font-extrabold">{view.plan?.toUpperCase()} PLAN</p>
                <p style={{ color: C.gray600 }} className="text-xs mt-0.5">GH₵{PLAN_PRICES_UI[view.plan]}/year · Your subscription is active.</p>
                {view.nextBillingDate && <p style={{ color: C.gray400 }} className="text-xs mt-0.5">Next billing: {new Date(view.nextBillingDate).toLocaleDateString()}</p>}
              </div>
            </div>
          )}
          {view.status === "none" && trialAvailable && (
            <div className="flex items-start gap-3">
              <Sparkles size={20} color={C.blue} className="mt-0.5 shrink-0" />
              <div>
                <p style={{ color: C.navy }} className="text-sm font-extrabold">Free Trial Available</p>
                <p style={{ color: C.ink }} className="text-sm mt-0.5">30 days free, no card required.</p>
                <p style={{ color: C.gray600 }} className="text-xs mt-0.5">Click below to start your trial, then add your first listing to publish it to students.</p>
                {trialError && <p style={{ color: "#b3261e" }} className="text-xs mt-1 font-medium">{trialError}</p>}
              </div>
            </div>
          )}
          {(view.status === "expired" || view.status === "cancelled" || (view.status === "none" && !trialAvailable)) && (
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} color="#b3261e" className="mt-0.5 shrink-0" />
              <div>
                <p style={{ color: "#b3261e" }} className="text-sm font-extrabold">{view.expiredFromTrial ? "TRIAL EXPIRED" : view.status === "cancelled" ? "SUBSCRIPTION CANCELLED" : "NO ACTIVE PLAN"}</p>
                {view.expiredFromTrial ? (
                  <>
                    <p style={{ color: C.ink }} className="text-sm mt-0.5">Your free trial has ended.</p>
                    <p style={{ color: C.gray600 }} className="text-xs mt-0.5">Your listing is currently paused. Subscribe to make your hostel visible to students again.</p>
                  </>
                ) : (
                  <p style={{ color: C.gray600 }} className="text-xs mt-0.5">{hasListing ? "Your listing is currently paused." : "Subscribe to a plan to publish your listing."}</p>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            {view.status === "trial" && <GhostButton onClick={onUpgrade}>Upgrade anytime →</GhostButton>}
            {view.status === "active" && (
              <>
                <GhostButton onClick={onUpgrade}>Manage Subscription</GhostButton>
                <button onClick={onCancelSubscription} style={{ color: C.gray400 }} className="text-xs font-semibold hover:underline">Cancel</button>
              </>
            )}
            {view.status === "none" && trialAvailable && (
              <PrimaryButton disabled={startingTrial} onClick={handleStartTrialClick}>{startingTrial ? "Starting…" : "Start Free Trial"}</PrimaryButton>
            )}
            {(view.status === "expired" || view.status === "cancelled" || (view.status === "none" && !trialAvailable)) && (
              <PrimaryButton onClick={onUpgrade}>Subscribe Now</PrimaryButton>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} style={{ borderColor: C.border }} className="border rounded-lg p-3 sm:p-4 bg-white min-w-0">
            <s.icon size={18} color={C.blue} className="mb-2 shrink-0" />
            <p style={{ color: C.ink }} className="text-lg sm:text-xl font-extrabold truncate">{s.value}</p>
            <p style={{ color: C.gray600 }} className="text-xs mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
        {features.analytics ? (
          analyticsStats.map((s) => (
            <div key={s.label} style={{ borderColor: C.border }} className="border rounded-lg p-3 sm:p-4 bg-white min-w-0">
              <s.icon size={18} color={C.blue} className="mb-2 shrink-0" />
              <p style={{ color: C.ink }} className="text-lg sm:text-xl font-extrabold truncate">{s.value}</p>
              <p style={{ color: C.gray600 }} className="text-xs mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))
        ) : (
          <button onClick={onUpgrade} style={{ borderColor: C.border }} className="border rounded-lg p-3 sm:p-4 bg-white min-w-0 col-span-2 text-left hover:bg-gray-50">
            <Lock size={18} color={C.gray400} className="mb-2 shrink-0" />
            <p style={{ color: C.gray600 }} className="text-sm font-semibold">Analytics 🔒</p>
            <p style={{ color: C.gray400 }} className="text-xs mt-0.5">Available with Premium and Featured plans.</p>
          </button>
        )}
      </div>

      <div style={{ borderColor: C.border }} className="border rounded-lg bg-white mb-6">
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3">
          <div>
            <h3 style={{ color: C.ink }} className="font-bold text-sm">Recent inquiries</h3>
            <p style={{ color: C.gray600 }} className="text-xs mt-0.5">
              {features.priorityEnquiries
                ? "Your Featured plan gives your inquiries priority — they're flagged below."
                : "Messages from students about your listings."}
            </p>
          </div>
          {features.priorityEnquiries && <Badge tone="yellow"><span className="flex items-center gap-1"><Sparkles size={12} /> Priority</span></Badge>}
        </div>
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          {inquiriesLoading && <p style={{ color: C.gray600 }} className="text-sm py-4 text-center">Loading inquiries…</p>}
          {!inquiriesLoading && ownerInquiries.length === 0 && (
            <p style={{ color: C.gray600 }} className="text-sm py-4 text-center">No inquiries yet.</p>
          )}
          {!inquiriesLoading && ownerInquiries.length > 0 && (
            <div className="flex flex-col divide-y" style={{ borderColor: C.border }}>
              {ownerInquiries.map((i) => {
                const listing = listings.find((l) => l.id === i.listingId);
                return (
                  <div key={i.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p style={{ color: C.ink }} className="text-sm font-semibold truncate">
                        {i.name}{listing ? ` — ${listing.name}` : ""}
                      </p>
                      <p style={{ color: C.gray600 }} className="text-xs mt-0.5 line-clamp-2">{i.message}</p>
                      <p style={{ color: C.gray400 }} className="text-xs mt-1">
                        {i.phone || i.email || "No contact provided"}
                        {i.createdAt ? ` · ${new Date(i.createdAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    {i.priority && <Badge tone="yellow">Priority</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ borderColor: C.border }} className="border rounded-lg p-4 sm:p-5 bg-white mb-6">
          <h3 style={{ color: C.ink }} className="font-bold text-sm mb-4">{editingId ? "Edit listing" : "New listing details"}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input placeholder="Property name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
            <select value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })}
              style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none">
              {UNIVERSITIES.map((u) => <option key={u}>{u}</option>)}
            </select>
            <select value={form.bath} onChange={(e) => setForm({ ...form, bath: e.target.value })}
              style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none">
              {["Shared bath", "Ensuite bath"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Pricing period</p>
            <select value={form.pricingPeriod} onChange={(e) => setForm({ ...form, pricingPeriod: e.target.value })}
              style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none w-full sm:w-64">
              {PRICING_PERIODS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <p style={{ color: C.gray600 }} className="text-xs mt-1.5">Applies to every room category's price below.</p>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Distance from campus</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="number" min="0" step="0.1" placeholder="Distance (km)" value={form.travelKm} onChange={(e) => setForm({ ...form, travelKm: e.target.value })}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
              <input type="number" min="1" placeholder="Minutes" value={form.travelMinutes} onChange={(e) => setForm({ ...form, travelMinutes: e.target.value })}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
              <select value={form.travelMode} onChange={(e) => setForm({ ...form, travelMode: e.target.value })}
                style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none">
                <option value="walk">min walk to campus</option>
                <option value="drive">min drive to campus</option>
              </select>
            </div>
            <p style={{ color: C.gray600 }} className="text-xs mt-1.5">e.g. 1.2 km · 6 min walk to campus. Km is optional — leave blank to show minutes only.</p>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Location description</p>
            <textarea
              placeholder="Describe how to find the place — nearby landmarks, the area/neighborhood, directions, etc. e.g. 'Behind the SDA Church, opposite Melcom, off the main Koforidua–Accra road.'"
              rows={2}
              value={form.locationDescription}
              onChange={(e) => setForm({ ...form, locationDescription: e.target.value })}
              style={{ borderColor: C.border }}
              className="border rounded-md px-3 py-2 text-sm outline-none w-full resize-none"
            />
            <p style={{ color: C.gray600 }} className="text-xs mt-1.5">Optional — shown to students on the listing page to help them find the property.</p>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Contact for booking requests</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email" placeholder="Your email address" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
              <input type="tel" placeholder="Your WhatsApp number, e.g. 0244000000" value={form.ownerWhatsapp} onChange={(e) => setForm({ ...form, ownerWhatsapp: e.target.value })}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
            </div>
            <p style={{ color: C.gray600 }} className="text-xs mt-1.5">Required — when a student sends a booking request, it's sent straight to your email or WhatsApp. Add at least one.</p>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Room availability</p>
            <div className="flex gap-2">
              {AVAILABILITY_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, availability: s }))}
                  style={{ background: form.availability === s ? C.blue : C.white, color: form.availability === s ? C.white : C.ink, borderColor: C.border }}
                  className="border rounded-md px-3 py-2 text-sm font-semibold flex-1"
                >
                  {s}
                </button>
              ))}
            </div>
            <p style={{ color: C.gray600 }} className="text-xs mt-1.5">Let students know at a glance whether there's still room, before they reach out.</p>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Property type</p>
            <div className="flex gap-2">
              {["Hostel", "Apartment"].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t, roomType: t === "Hostel" ? HOSTEL_ROOM_TYPES[0] : APARTMENT_ROOM_TYPES[0] }))}
                  style={{ background: form.type === t ? C.blue : C.white, color: form.type === t ? C.white : C.ink, borderColor: C.border }}
                  className="border rounded-md px-4 py-2 text-sm font-semibold flex-1"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {form.type === "Hostel" ? (
            <div className="mb-4">
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Room categories &amp; prices</p>
              <p style={{ color: C.gray600 }} className="text-xs mb-2.5">Tick every occupancy your hostel offers (a hostel can have several — e.g. Two, Four and Six in a room all at once) and set a price for each.</p>
              <div className="flex flex-col gap-2">
                {form.hostelRooms.map((r) => (
                  <div
                    key={r.roomType}
                    style={{ borderColor: r.checked ? C.blue : C.border, background: r.checked ? C.blueLight : C.white }}
                    className="border rounded-md p-2.5 flex items-center gap-3 flex-wrap"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-[160px]" style={{ color: C.ink }}>
                      <input type="checkbox" checked={r.checked} onChange={() => toggleHostelRoom(r.roomType)} style={{ accentColor: C.blue }} />
                      {r.roomType}
                    </label>
                    {r.checked && (
                      <input
                        type="number" placeholder="Price (GH₵)" value={r.price}
                        onChange={(e) => setHostelRoomPrice(r.roomType, e.target.value)}
                        style={{ borderColor: C.border }} className="border rounded-md px-3 py-1.5 text-sm outline-none w-36"
                      />
                    )}
                    {r.checked && features.advancedAvailability && (
                      <select
                        value={r.availability}
                        onChange={(e) => setHostelRoomAvailability(r.roomType, e.target.value)}
                        style={{ borderColor: C.border, color: C.ink }}
                        className="border rounded-md px-2 py-1.5 text-xs outline-none"
                      >
                        {AVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                    {r.checked && !features.advancedAvailability && (
                      <button type="button" onClick={onUpgrade} style={{ color: C.blue }} className="text-xs font-semibold hover:underline">
                        Set per-room status →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Room type &amp; price</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                  style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none">
                  {roomTypeOptions.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input type="number" placeholder="Price (GH₵)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
              <input type="checkbox" checked={form.kitchen} onChange={(e) => setForm({ ...form, kitchen: e.target.checked })} style={{ accentColor: C.blue }} />
              Shared kitchen
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: features.featuredBadge ? C.gray600 : C.gray400 }}>
              <input type="checkbox" checked={features.featuredBadge && form.featured} disabled={!features.featuredBadge} onChange={(e) => setForm({ ...form, featured: e.target.checked })} style={{ accentColor: C.blue }} />
              Featured listing {!features.featuredBadge && <Lock size={12} className="inline ml-0.5" />}
            </label>
            {!features.featuredBadge && (
              <button type="button" onClick={onUpgrade} style={{ color: C.blue }} className="text-xs font-semibold hover:underline -ml-2">
                Available with Featured plan →
              </button>
            )}
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Amenities</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITY_LIST.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
                  <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)} style={{ accentColor: C.blue }} />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Description</p>
            <textarea placeholder="A short description of the property" rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })}
              style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Property photo</p>
              <div className="flex items-center gap-3 flex-wrap">
                <label style={{ borderColor: C.border, color: C.gray600 }} className="border border-dashed rounded-md px-4 py-3 text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50">
                  <ImagePlus size={16} color={C.blue} />
                  {form.uploadingImage ? "Uploading…" : form.imageData ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={form.uploadingImage} className="hidden" />
                </label>
                {form.imageData && (
                  <div className="relative">
                    <img src={form.imageData} alt="Preview" className="w-14 h-14 object-cover rounded-md" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, imageData: "" }))}
                      style={{ background: C.white, borderColor: C.border }}
                      className="absolute -top-2 -right-2 border rounded-full p-0.5"
                    >
                      <X size={12} color={C.gray600} />
                    </button>
                  </div>
                )}
              </div>
              {!form.imageData && <p style={{ color: C.gray600 }} className="text-xs mt-1.5">No photo uploaded — a default placeholder image will be used.</p>}
            </div>

            <div>
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">
                More room photos ({form.galleryData.length}/{galleryCap})
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {form.galleryData.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Room ${i + 1}`} className="w-14 h-14 object-cover rounded-md" />
                    <button
                      onClick={() => removeGalleryImage(i)}
                      style={{ background: C.white, borderColor: C.border }}
                      className="absolute -top-2 -right-2 border rounded-full p-0.5"
                    >
                      <X size={12} color={C.gray600} />
                    </button>
                  </div>
                ))}
                {form.galleryData.length < galleryCap && (
                  <label style={{ borderColor: C.border, color: C.gray600 }} className="border border-dashed rounded-md px-4 py-3 text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50">
                    <ImagePlus size={16} color={C.blue} />
                    {form.uploadingGallery ? "Uploading…" : "Add photos"}
                    <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={form.uploadingGallery} className="hidden" />
                  </label>
                )}
              </div>
              <p style={{ color: C.gray600 }} className="text-xs mt-1.5">
                {`Your ${view?.effectivePlan || "Basic"} plan allows up to ${galleryCap} extra photos. `}
                {view?.effectivePlan !== "Featured" && <button type="button" onClick={onUpgrade} style={{ color: C.blue }} className="font-semibold hover:underline">Upgrade for more →</button>}
              </p>
            </div>

            <div>
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                Video tour {!features.videoTour && <Lock size={13} color={C.gray400} />}
              </p>
              {features.videoTour ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <label style={{ borderColor: C.border, color: C.gray600 }} className="border border-dashed rounded-md px-4 py-3 text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50">
                    <PlayCircle size={16} color={C.blue} />
                    {form.uploadingVideo ? "Uploading…" : form.videoData ? "Change video" : "Upload video"}
                    <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={form.uploadingVideo} className="hidden" />
                  </label>
                  {form.videoData && (
                    <button
                      onClick={() => setForm((f) => ({ ...f, videoData: "" }))}
                      style={{ borderColor: C.border, color: C.gray600 }}
                      className="border rounded-md px-2.5 py-1.5 text-xs flex items-center gap-1"
                    >
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ borderColor: C.border, background: "#fafbfc" }} className="border border-dashed rounded-md px-4 py-3 text-sm flex items-center justify-between gap-3">
                  <span style={{ color: C.gray600 }}>Available with Premium and Featured plans.</span>
                  <button type="button" onClick={onUpgrade} style={{ color: C.blue }} className="font-semibold hover:underline whitespace-nowrap">Upgrade →</button>
                </div>
              )}
              <p style={{ color: C.gray600 }} className="text-xs mt-1.5">
                {features.videoTour ? (form.videoData ? "Video attached." : "Optional — MP4 under 25MB recommended.") : ""}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              Virtual walkthrough {!features.virtualWalkthrough && <Lock size={13} color={C.gray400} />}
            </p>
            {features.virtualWalkthrough ? (
              <div>
                <div className="flex flex-col gap-3">
                  {form.walkthrough.map((stop, idx) => (
                    <div key={idx} style={{ borderColor: C.border }} className="border rounded-md p-3 flex items-center gap-3 flex-wrap">
                      <label className="shrink-0 w-16 h-16 rounded-md overflow-hidden border cursor-pointer flex items-center justify-center text-[10px] text-center" style={{ borderColor: C.border, background: "#fafbfc", color: C.gray600 }}>
                        {form.uploadingWalkthrough[idx] ? (
                          "Uploading…"
                        ) : stop.image ? (
                          <img src={stop.image} className="w-full h-full object-cover" alt={stop.label || `Stop ${idx + 1}`} />
                        ) : (
                          <ImagePlus size={18} color={C.gray400} />
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleWalkthroughImageUpload(idx, e)} disabled={!!form.uploadingWalkthrough[idx]} className="hidden" />
                      </label>
                      <input
                        type="text"
                        value={stop.label}
                        onChange={(e) => setWalkthroughLabel(idx, e.target.value)}
                        placeholder={`Room label, e.g. "Bedroom" (stop ${idx + 1})`}
                        style={{ borderColor: C.border }}
                        className="flex-1 min-w-[140px] border rounded-md px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeWalkthroughStop(idx)}
                        style={{ borderColor: C.border, color: C.gray600 }}
                        className="border rounded-md px-2.5 py-1.5 text-xs flex items-center gap-1"
                      >
                        <X size={12} /> Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addWalkthroughStop}
                  disabled={form.walkthrough.length >= walkthroughCap}
                  style={{ borderColor: C.border, color: form.walkthrough.length >= walkthroughCap ? C.gray400 : C.blue }}
                  className="border border-dashed rounded-md px-4 py-2.5 text-sm mt-3 flex items-center gap-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Compass size={16} /> Add walkthrough stop
                </button>
                <p style={{ color: C.gray600 }} className="text-xs mt-1.5">
                  {`Guide students room-by-room — up to ${walkthroughCap} stops (${form.walkthrough.length}/${walkthroughCap} used). Each stop is a photo with a short label, e.g. "Bedroom", "Kitchen", "Bathroom".`}
                </p>
              </div>
            ) : (
              <div style={{ borderColor: C.border, background: "#fafbfc" }} className="border border-dashed rounded-md px-4 py-3 text-sm flex items-center justify-between gap-3">
                <span style={{ color: C.gray600 }}>Available with the Featured plan.</span>
                <button type="button" onClick={onUpgrade} style={{ color: C.blue }} className="font-semibold hover:underline whitespace-nowrap">Upgrade →</button>
              </div>
            )}
          </div>

          {submitError && (
            <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2 mb-3">
              {submitError}
            </div>
          )}
          <div className="flex gap-2">
            <PrimaryButton onClick={submit} disabled={submitting || stillUploading}>
              {submitting ? "Saving…" : stillUploading ? "Uploading…" : editingId ? "Update listing" : "Save listing"}
            </PrimaryButton>
            <GhostButton onClick={cancelForm}>Cancel</GhostButton>
          </div>
        </div>
      )}

      <div style={{ borderColor: C.border }} className="border rounded-lg bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: C.blueMist, color: C.gray600 }} className="text-left">
                <th className="py-2.5 px-4 font-semibold">Property</th>
                <th className="py-2.5 px-4 font-semibold">University</th>
                <th className="py-2.5 px-4 font-semibold">Room categories</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} style={{ borderColor: C.border }} className="border-t">
                  <td className="py-2.5 px-4 font-semibold truncate" style={{ color: C.ink }}>
                    <div className="flex items-center gap-2.5">
                      <img src={img(l.image)} alt={l.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                      <span className="truncate">{l.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 truncate" style={{ color: C.gray600 }}>{l.university}</td>
                  <td className="py-2.5 px-4" style={{ color: C.ink }}>
                    {(l.roomOptions || []).map((r) => (
                      <span key={r.roomType} className="block text-xs">{r.roomType}: <span className="font-semibold">GH₵{Number(r.price).toLocaleString()}</span></span>
                    ))}
                    <span style={{ color: C.gray600 }} className="text-xs block">{l.pricingPeriod || "Per semester"}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    {l.visible !== false ? <Badge tone="green">Active</Badge> : <Badge tone="red">Paused</Badge>}
                    {l.photosOverLimit > 0 && (
                      <p style={{ color: C.yellowDark }} className="text-[11px] mt-1">{l.photosOverLimit} photo{l.photosOverLimit > 1 ? "s" : ""} hidden over plan limit</p>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => startEdit(l)} title="Edit listing">
                        <Pencil size={15} color={C.gray600} className="cursor-pointer" />
                      </button>
                      <button onClick={() => handleDelete(l.id)} disabled={deletingId === l.id} title="Delete listing">
                        <Trash2 size={15} color={deletingId === l.id ? C.gray400 : C.gray600} className="cursor-pointer" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/* ---------------------------------------------------------
   LOGIN VIEW
--------------------------------------------------------- */
function LoginView({ onAuthSuccess, onGuest, redirectNote, setView }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSignIn = async () => {
    setError("");
    if (!email || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    try {
      const data = await api.login(email, password);
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    setError("");
    if (!name || !email || !password) { setError("Fill in all fields to create an account."); return; }
    if (!emailValid(email)) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const data = await api.signup(name, email, password, role);
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => (mode === "signin" ? handleSignIn() : handleSignUp());

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white">
        <img src={bookinnWordmark} alt="BookInn" className="h-8 mb-4" />
        <h1 style={{ color: C.ink }} className="text-xl font-extrabold mb-1">
          {mode === "signin" ? "Sign in to BookInn" : "Create your BookInn account"}
        </h1>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">
          {redirectNote || "Save favorites, track inquiries and manage bookings."}
        </p>

        <div style={{ borderColor: C.border }} className="flex border rounded-md p-0.5 mb-4">
          <button
            onClick={() => { setMode("signin"); setError(""); }}
            style={{ background: mode === "signin" ? C.blue : "transparent", color: mode === "signin" ? C.white : C.gray600 }}
            className="flex-1 text-sm font-semibold py-1.5 rounded-md transition"
          >
            Sign in
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            style={{ background: mode === "signup" ? C.blue : "transparent", color: mode === "signup" ? C.white : C.gray600 }}
            className="flex-1 text-sm font-semibold py-1.5 rounded-md transition"
          >
            Create account
          </button>
        </div>

        {error && (
          <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
              <div>
                <p style={{ color: C.ink }} className="text-xs font-semibold mb-1.5">I am a…</p>
                <div className="flex gap-2">
                  {["Student", "Parent", "Owner"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{ background: role === r ? C.blue : C.white, color: role === r ? C.white : C.ink, borderColor: C.border }}
                      className="border rounded-md px-3 py-1.5 text-xs font-semibold flex-1"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          <PrimaryButton full onClick={submit} disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </PrimaryButton>
          <GhostButton full onClick={onGuest}>Continue as guest</GhostButton>
        </div>

        <p style={{ color: C.gray600 }} className="text-xs text-center mt-4">
          Demo mode — accounts are stored only in this browser session.
        </p>
        <p style={{ color: C.gray600 }} className="text-xs text-center mt-2">
          Property owner? <button onClick={() => setView("pricing")} style={{ color: C.blue }} className="font-semibold hover:underline">List your property</button>
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HOW BOOKING WORKS
--------------------------------------------------------- */
function InfoHero({ eyebrow, title, subtitle }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.blue} 100%)` }} className="py-14">
      <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
        {eyebrow && <p style={{ color: "rgba(255,255,255,0.7)" }} className="text-xs font-bold uppercase tracking-wide mb-2">{eyebrow}</p>}
        <h1 className="text-white text-2xl md:text-3xl font-extrabold mb-3">{title}</h1>
        {subtitle && (
          <p style={{ color: "rgba(255,255,255,0.85)" }} className="text-sm md:text-base max-w-2xl mx-auto">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function HowBookingWorksView({ setView }) {
  const steps = [
    { icon: Search, title: "Search & compare", text: "Filter by university, price and room type to find hostels and apartments near your campus." },
    { icon: MessageCircle, title: "Contact the owner", text: "Reach out directly via WhatsApp, phone or the inquiry form to ask questions and check availability." },
    { icon: Eye, title: "Visit or verify", text: "Where possible, view the room in person or ask the owner for a live video walkthrough before agreeing to anything." },
    { icon: BadgeCheck, title: "Confirm & move in", text: "Agree on price and terms directly with the owner, then move in for the semester." },
  ];

  const faqs = [
    { q: "Do I pay rent through BookInn?", a: "No. BookInn helps you discover and contact hostels and apartments near your campus — rent is paid directly to the property owner, not through the app." },
    { q: "Is browsing and contacting owners free?", a: "Yes, it's completely free for students. There's no charge to search listings, save favorites or send an inquiry." },
    { q: "Can I book instantly through the app?", a: "Not yet — think of BookInn as a directory that connects you to owners. All viewing, agreement and payment details are handled directly with them." },
    { q: "What if a listing is no longer available?", a: "Message the owner to confirm availability before making any plans to visit or pay — listings can fill up quickly, especially near the start of a semester." },
  ];

  return (
    <div>
      <InfoHero eyebrow="Students" title="How booking works" subtitle="A simple four-step way to find your next hostel or apartment near campus." />
      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-8 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={s.title} style={{ borderColor: C.border }} className="border rounded-lg p-5 bg-white relative">
              <span style={{ color: C.blueLight }} className="absolute top-3 right-4 text-3xl font-extrabold select-none">{i + 1}</span>
              <div style={{ background: C.blueLight }} className="w-9 h-9 rounded-md flex items-center justify-center mb-3">
                <s.icon size={18} color={C.blue} />
              </div>
              <h3 style={{ color: C.ink }} className="font-bold text-sm mb-1.5">{s.title}</h3>
              <p style={{ color: C.gray600 }} className="text-xs leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 pb-16">
        <h2 style={{ color: C.ink }} className="font-bold text-lg mb-4">Frequently asked questions</h2>
        <div className="flex flex-col gap-3 mb-8">
          {faqs.map((f) => (
            <div key={f.q} style={{ borderColor: C.border }} className="border rounded-lg p-4 bg-white">
              <p style={{ color: C.ink }} className="font-semibold text-sm mb-1">{f.q}</p>
              <p style={{ color: C.gray600 }} className="text-sm leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
        <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 style={{ color: C.ink }} className="font-bold text-base mb-1">Ready to find a place?</h3>
            <p style={{ color: C.gray600 }} className="text-sm">Browse hostels and apartments near your campus.</p>
          </div>
          <PrimaryButton onClick={() => setView("home")}>
            <span className="flex items-center gap-2">Browse listings <ArrowRight size={16} /></span>
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HELP CENTER
--------------------------------------------------------- */
function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q} style={{ borderColor: C.border }} className="border rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              style={{ color: C.ink }}
              className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 font-semibold text-sm"
            >
              {item.q}
              <ChevronDown size={16} style={{ color: C.gray400, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} className="shrink-0" />
            </button>
            {open && (
              <p style={{ color: C.gray600 }} className="text-sm leading-relaxed px-4 pb-4">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HelpCenterView({ setView }) {
  const studentFaqs = [
    { q: "Is BookInn free to use?", a: "Yes — searching listings, saving favorites, contacting owners and leaving reviews are all free for students." },
    { q: "How do I save a listing for later?", a: "Tap the heart icon on any listing card or on the listing's detail page. Find everything you've saved under \"Saved\" in the menu." },
    { q: "How do I contact a property owner?", a: "Open a listing and use the inquiry form, or reach out directly via the WhatsApp/phone/email details shown on the listing page." },
    { q: "Do I pay rent through the app?", a: "No — BookInn connects you with owners, but rent, deposits and agreements are handled directly between you and them. See \"How booking works\" for the full picture." },
    { q: "How do I leave a review?", a: "Open the listing's detail page and scroll to the reviews section — you can rate your stay and leave a comment there." },
  ];
  const ownerFaqs = [
    { q: "How do I list my property?", a: "Create an Owner account, choose a subscription plan, then add your listing's details and photos from the Owner dashboard." },
    { q: "What do the subscription plans include?", a: "Plans differ by how many listings you can post and whether your property gets featured placement. See the Pricing page for a full comparison." },
    { q: "How do I edit or remove a listing?", a: "Go to your Owner dashboard, find the listing, and use the edit or delete controls next to it." },
    { q: "Where do student inquiries go?", a: "Inquiries submitted through your listings are tied to your account so you can follow up with students directly." },
  ];

  return (
    <div>
      <InfoHero eyebrow="Support" title="Help center" subtitle="Answers to common questions — for students and property owners." />
      <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        <div style={{ borderColor: C.border }} className="border rounded-lg p-5 bg-white mb-8 flex items-center gap-3">
          <div style={{ background: C.blueLight }} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            <HelpCircle size={18} color={C.blue} />
          </div>
          <p style={{ color: C.gray600 }} className="text-sm">
            Can't find what you're looking for? <a href="mailto:bookinn88@gmail.com" style={{ color: C.blue }} className="font-semibold hover:underline">Email us</a> or <a href="https://wa.me/233597713233" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">WhatsApp us</a> and we'll help you out.
          </p>
        </div>

        <h2 style={{ color: C.ink }} className="font-bold text-lg mb-3">For students</h2>
        <div className="mb-8"><FaqAccordion items={studentFaqs} /></div>

        <h2 style={{ color: C.ink }} className="font-bold text-lg mb-3">For property owners</h2>
        <div className="mb-8"><FaqAccordion items={ownerFaqs} /></div>

        <div className="flex gap-2 flex-wrap">
          <GhostButton onClick={() => setView("how-it-works")}>How booking works</GhostButton>
          <GhostButton onClick={() => setView("safety-tips")}>Safety tips</GhostButton>
          <PrimaryButton onClick={() => setView("home")}>Browse listings</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   SAFETY TIPS
--------------------------------------------------------- */
function SafetyTipCard({ icon: Icon, title, text }) {
  return (
    <div style={{ borderColor: C.border }} className="border rounded-lg p-4 bg-white flex gap-3">
      <div style={{ background: C.blueLight }} className="w-9 h-9 rounded-md flex items-center justify-center shrink-0">
        <Icon size={17} color={C.blue} />
      </div>
      <div>
        <p style={{ color: C.ink }} className="font-semibold text-sm mb-1">{title}</p>
        <p style={{ color: C.gray600 }} className="text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function SafetyTipsView({ setView }) {
  const studentTips = [
    { icon: Eye, title: "View before you pay", text: "Visit in person, or ask the owner for a live video walkthrough, before sending any money." },
    { icon: CreditCard, title: "Get it in writing", text: "Avoid paying the full amount in cash with no receipt. Ask for a written agreement covering price, dates and what's included." },
    { icon: Users, title: "Bring a friend, share your plans", text: "Where possible, view properties in daylight and let someone know when and where you're going." },
    { icon: Star, title: "Check reviews first", text: "Read what previous tenants say on the listing page — patterns in reviews are more reliable than a single conversation." },
    { icon: AlertTriangle, title: "Be wary of deals that feel off", text: "Prices far below similar listings nearby, or pressure to pay immediately, are common warning signs." },
    { icon: MapPin, title: "Confirm the actual location", text: "Cross-check the university distance and address shown against what the owner tells you in person." },
  ];
  const ownerTips = [
    { icon: ShieldCheck, title: "Verify prospective tenants", text: "Ask for a student ID and contact details before confirming a room for someone you haven't met." },
    { icon: Lock, title: "Keep records", text: "Document agreements and payments in writing — it protects both you and the student if a dispute comes up." },
    { icon: BadgeCheck, title: "Keep your listing accurate", text: "Make sure amenities, photos and pricing shown on BookInn match what students will actually find on arrival." },
  ];

  return (
    <div>
      <InfoHero eyebrow="Support" title="Safety tips" subtitle="A few precautions to take before agreeing to any hostel or apartment." />
      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        <div style={{ background: "#fff4e0", borderColor: "#f5deac" }} className="border rounded-lg p-4 mb-8 flex gap-3">
          <AlertTriangle size={18} color="#8a6300" className="shrink-0 mt-0.5" />
          <p style={{ color: "#6b5000" }} className="text-xs leading-relaxed">
            BookInn helps you discover housing options near campus — but every viewing, agreement and payment happens directly between you and the property owner. Take the same precautions you would with any independent rental.
          </p>
        </div>

        <h2 style={{ color: C.ink }} className="font-bold text-lg mb-3">For students</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {studentTips.map((t) => <SafetyTipCard key={t.title} {...t} />)}
        </div>

        <h2 style={{ color: C.ink }} className="font-bold text-lg mb-3">For property owners</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {ownerTips.map((t) => <SafetyTipCard key={t.title} {...t} />)}
        </div>

        <div className="flex gap-2 flex-wrap">
          <GhostButton onClick={() => setView("how-it-works")}>How booking works</GhostButton>
          <GhostButton onClick={() => setView("help-center")}>Help center</GhostButton>
          <PrimaryButton onClick={() => setView("home")}>Browse listings</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   FOOTER
--------------------------------------------------------- */
function ContactUsModal({ onClose }) {
  const EMAIL = "bookinn88@gmail.com";
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the email is still shown as plain text above.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.55)" }} onClick={onClose}>
      <div style={{ background: C.white }} className="rounded-lg max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4"><X size={20} color={C.gray600} /></button>
        <h3 style={{ color: C.ink }} className="font-bold text-lg mb-1">Contact BookInn</h3>
        <p style={{ color: C.gray600 }} className="text-sm mb-5">We usually reply within a day.</p>

        <div style={{ borderColor: C.border }} className="border rounded-lg p-3 mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={16} color={C.blue} className="shrink-0" />
            <span style={{ color: C.ink }} className="text-sm truncate">{EMAIL}</span>
          </div>
          <button
            onClick={copyEmail}
            style={{ borderColor: C.border, color: C.navy }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-md border flex items-center gap-1 shrink-0 hover:bg-gray-50"
          >
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>

        <a
          href={`mailto:${EMAIL}`}
          style={{ borderColor: C.border, color: C.navy }}
          className="border rounded-md px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 mb-2.5"
        >
          <Mail size={15} /> Open in email app
        </a>

        <a
          href="https://wa.me/233597713233"
          target="_blank"
          rel="noreferrer"
          style={{ background: "#25D366" }}
          className="text-white text-sm font-semibold py-2.5 rounded-md flex items-center justify-center gap-1.5"
        >
          <MessageCircle size={16} /> WhatsApp us
        </a>

        <p style={{ color: C.gray400 }} className="text-xs text-center mt-4">
          If "Open in email app" doesn't do anything, your device likely has no default mail app set up — copy the address instead.
        </p>
      </div>
    </div>
  );
}

function Footer({ setView, onOwnerDashboardClick, onListPropertyClick }) {
  const [showContact, setShowContact] = useState(false);
  const FooterLink = ({ onClick, children }) => (
    <li>
      <button
        onClick={onClick}
        style={{ color: "rgba(255,255,255,0.65)" }}
        className="text-xs hover:text-white hover:underline transition text-left"
      >
        {children}
      </button>
    </li>
  );

  return (
    <footer style={{ background: C.navy }} className="mt-auto">
      {showContact && <ContactUsModal onClose={() => setShowContact(false)} />}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <img src={ibiIcon} alt="BookInn" className="w-7 h-7 rounded-full" />
            <span className="text-white font-extrabold">BookInn</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-xs leading-relaxed">Centralized student housing near your campus.</p>
        </div>
        <div>
          <p className="text-white text-sm font-semibold mb-2.5">Students</p>
          <ul className="flex flex-col gap-2">
            <FooterLink onClick={() => setView("home")}>Browse listings</FooterLink>
            <FooterLink onClick={() => setView("saved")}>Saved stays</FooterLink>
            <FooterLink onClick={() => setView("how-it-works")}>How booking works</FooterLink>
          </ul>
        </div>
        <div>
          <p className="text-white text-sm font-semibold mb-2.5">Property owners</p>
          <ul className="flex flex-col gap-2">
            <FooterLink onClick={onListPropertyClick}>List your property</FooterLink>
            <FooterLink onClick={() => setView("pricing")}>Pricing</FooterLink>
            <FooterLink onClick={onOwnerDashboardClick}>Owner dashboard</FooterLink>
          </ul>
        </div>
        <div>
          <p className="text-white text-sm font-semibold mb-2.5">Support</p>
          <ul className="flex flex-col gap-2">
            <FooterLink onClick={() => setView("help-center")}>Help center</FooterLink>
            <FooterLink onClick={() => setShowContact(true)}>Contact us</FooterLink>
            <li>
              <a
                href="https://wa.me/233597713233"
                target="_blank"
                rel="noreferrer"
                style={{ color: "rgba(255,255,255,0.65)" }}
                className="text-xs hover:text-white hover:underline transition flex items-center gap-1"
              >
                <MessageCircle size={12} /> WhatsApp us
              </a>
            </li>
            <FooterLink onClick={() => setView("safety-tips")}>Safety tips</FooterLink>
          </ul>
        </div>
      </div>
      <div style={{ borderColor: "rgba(255,255,255,0.15)" }} className="border-t py-4 text-center">
        <p style={{ color: "rgba(255,255,255,0.55)" }} className="text-xs">© 2026 BookInn. Built for students, by students.</p>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------
   PLATFORM ADMIN — site-wide stats, users, listings, inquiries.
   Restricted to accounts with role === "Admin". Reachable only
   by visiting /platform-admin directly — it is never linked from
   the Header or Footer, so ordinary visitors and owners never see
   it. The login screen below also rejects any non-Admin account,
   so even someone who finds the URL can't get in without an
   Admin login.
--------------------------------------------------------- */
function AdminStatCard({ label, value, icon: Icon }) {
  return (
    <div style={{ borderColor: C.border }} className="border rounded-lg p-3 sm:p-4 bg-white min-w-0">
      <Icon size={18} color={C.blue} className="mb-2 shrink-0" />
      <p style={{ color: C.ink }} className="text-lg sm:text-xl font-extrabold truncate">{value}</p>
      <p style={{ color: C.gray600 }} className="text-xs mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function DataTable({ columns, rows, emptyLabel }) {
  if (!rows.length) {
    return (
      <div style={{ borderColor: C.border, color: C.gray600 }} className="border rounded-lg p-8 text-center text-sm bg-white">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div style={{ borderColor: C.border }} className="border rounded-lg bg-white overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr style={{ borderColor: C.border }} className="border-b">
            {columns.map((c) => (
              <th key={c.key} style={{ color: C.gray600 }} className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderColor: C.border }} className="border-b last:border-0">
              {columns.map((c) => (
                <td key={c.key} style={{ color: C.ink }} className="px-4 py-3 align-top">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = {
    Student: { bg: "#e6f2fb", fg: C.blue },
    Parent: { bg: "#fff4e0", fg: "#8a6300" },
    Owner: { bg: "#e6f7e9", fg: C.green },
    Admin: { bg: "#fdecea", fg: "#b3261e" },
  };
  const c = colors[role] || { bg: C.blueLight, fg: C.blue };
  return (
    <span style={{ background: c.bg, color: c.fg }} className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
      {role}
    </span>
  );
}

function SubscriptionBadge({ subscription }) {
  if (!subscription || subscription.status !== "active") {
    return <span style={{ color: C.gray400 }} className="text-xs">No active plan</span>;
  }
  return (
    <span style={{ background: C.blueLight, color: C.blue }} className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
      {subscription.tier}
    </span>
  );
}

function PlatformAdminView({ token }) {
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "revenue", label: "Revenue" },
    { key: "students", label: "Students" },
    { key: "parents", label: "Parents" },
    { key: "owners", label: "Owners" },
    { key: "listings", label: "Listings" },
    { key: "inquiries", label: "Inquiries" },
  ];
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsData, usersData, inquiriesData, listingsData] = await Promise.all([
        api.getAdminStats(token),
        api.getAdminUsers(token),
        api.getInquiries(token),
        api.getListings(),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setInquiries(inquiriesData.inquiries);
      setListings(listingsData.listings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (tab === "overview" || tab === "listings") loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadAll]);

  const overviewStats = stats ? [
    { label: "Total users", value: stats.totalUsers, icon: Users },
    { label: "Students", value: stats.usersByRole.Student || 0, icon: GraduationCap },
    { label: "Parents", value: stats.usersByRole.Parent || 0, icon: UserCog },
    { label: "Owners", value: stats.usersByRole.Owner || 0, icon: Building2 },
    { label: "New signups", value: stats.newSignups30d, icon: Users },
    { label: "Active listings", value: stats.totalListings, icon: Building2 },
    { label: "Featured listings", value: stats.featuredListings, icon: Star },
    { label: "Inquiries", value: stats.inquiries30d, icon: Inbox },
  ] : [];

  const revenueStats = stats ? [
    { label: "Est. revenue (GH₵)", value: stats.estimatedRevenueGHS.toLocaleString(), icon: Wallet },
    { label: "Active subscriptions", value: stats.activeSubscriptions, icon: BadgeCheck },
    { label: "Avg. revenue / owner (GH₵)", value: stats.avgRevenuePerActiveOwner.toLocaleString(), icon: TrendingUp },
    { label: "Owner conversion rate", value: `${stats.ownerConversionRate}%`, icon: Users },
  ] : [];

  const byRole = (role) =>
    users
      .filter((u) => u.role === role)
      .filter((u) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      });

  const filteredListings = listings.filter((l) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return l.name.toLowerCase().includes(q) || (l.university || "").toLowerCase().includes(q);
  });

  const listingNameById = useMemo(() => {
    const map = {};
    listings.forEach((l) => { map[l.id] = l.name; });
    return map;
  }, [listings]);

  const filteredInquiries = inquiries.filter((inq) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return inq.name.toLowerCase().includes(q) || (listingNameById[inq.listingId] || "").toLowerCase().includes(q);
  });

  const personColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (u) => <RoleBadge role={u.role} /> },
    { key: "subscription", label: "Subscription", render: (u) => <SubscriptionBadge subscription={u.subscription} /> },
    { key: "createdAt", label: "Joined", render: (u) => u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—" },
  ];

  const listingColumns = [
    { key: "name", label: "Property" },
    { key: "university", label: "University" },
    { key: "type", label: "Type" },
    { key: "price", label: "Price", render: (l) => `GH₵${Number(l.price).toLocaleString()}` },
    { key: "featured", label: "Featured", render: (l) => (l.featured ? <BadgeCheck size={16} color={C.blue} /> : <span style={{ color: C.gray400 }}>—</span>) },
    { key: "rating", label: "Rating", render: (l) => l.rating ? `${l.rating} ★ (${l.reviewCount || 0})` : "No reviews yet" },
    {
      key: "students", label: "Students", render: (l) => (
        <button
          onClick={() => { setTab("inquiries"); setQuery(l.name); }}
          style={{ color: C.blue }}
          className="text-xs font-semibold hover:underline whitespace-nowrap"
        >
          View students
        </button>
      ),
    },
  ];

  const inquiryColumns = [
    { key: "name", label: "Name" },
    { key: "listingId", label: "Property", render: (inq) => listingNameById[inq.listingId] || `#${inq.listingId}` },
    { key: "roomType", label: "Room type", render: (inq) => inq.roomType || "—" },
    { key: "phone", label: "Phone", render: (inq) => inq.phone || "—" },
    { key: "email", label: "Email", render: (inq) => inq.email || "—" },
    { key: "moveIn", label: "Move-in", render: (inq) => inq.moveIn || "—" },
    { key: "createdAt", label: "Received", render: (inq) => inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : "—" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Shield size={22} color={C.blue} />
          <div>
            <h1 style={{ color: C.ink }} className="text-xl sm:text-2xl font-extrabold">Platform admin</h1>
            <p style={{ color: C.gray600 }} className="text-sm">Students, parents, owners, listings & inquiries — all in one place.</p>
          </div>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          style={{ borderColor: C.border, color: C.ink }}
          className="border rounded-md px-3 py-2 text-sm font-semibold flex items-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-sm rounded-md px-4 py-3 mb-5">
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? C.blue : C.white,
              color: tab === t.key ? C.white : C.ink,
              borderColor: C.border,
            }}
            className="border rounded-md px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap"
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !stats ? (
        <p style={{ color: C.gray600 }} className="text-sm">Loading platform data…</p>
      ) : (
        <>
          {tab === "overview" && stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6">
                {overviewStats.map((s) => <AdminStatCard key={s.label} {...s} />)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ borderColor: C.border }} className="border rounded-lg p-4 sm:p-5 bg-white">
                  <h3 style={{ color: C.ink }} className="font-bold text-sm mb-3 flex items-center gap-1.5"><Clock size={15} color={C.blue} /> Recent signups</h3>
                  {stats.recentSignups.length ? (
                    <ul className="flex flex-col gap-2.5">
                      {stats.recentSignups.map((u, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span style={{ color: C.ink }} className="font-medium truncate mr-2">{u.name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <RoleBadge role={u.role} />
                            <span style={{ color: C.gray600 }} className="text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: C.gray600 }} className="text-sm">No signups yet.</p>
                  )}
                </div>
                <div style={{ borderColor: C.border }} className="border rounded-lg p-4 sm:p-5 bg-white">
                  <h3 style={{ color: C.ink }} className="font-bold text-sm mb-3 flex items-center gap-1.5"><Star size={15} color={C.blue} /> Top-rated listings</h3>
                  {stats.topListings.length ? (
                    <ul className="flex flex-col gap-2.5">
                      {stats.topListings.map((l) => (
                        <li key={l.id} className="flex items-center justify-between text-sm">
                          <span style={{ color: C.ink }} className="font-medium truncate mr-2">{l.name}</span>
                          <span style={{ color: C.gray600 }} className="text-xs shrink-0">{l.rating ? `${l.rating} ★` : "No rating"} · {l.reviewCount} reviews</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: C.gray600 }} className="text-sm">No listings yet.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === "revenue" && stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6">
                {revenueStats.map((s) => <AdminStatCard key={s.label} {...s} />)}
              </div>
              <div style={{ borderColor: C.border }} className="border rounded-lg p-4 sm:p-5 bg-white">
                <h3 style={{ color: C.ink }} className="font-bold text-sm mb-3">Active subscriptions by plan</h3>
                <div className="grid grid-cols-3 gap-3 mb-1">
                  {["Basic", "Premium", "Featured"].map((tier) => (
                    <div key={tier} style={{ borderColor: C.border }} className="border rounded-md p-3 text-center">
                      <p style={{ color: C.ink }} className="text-lg font-extrabold">{stats.tierCounts[tier] || 0}</p>
                      <p style={{ color: C.gray600 }} className="text-xs mt-0.5">{tier}</p>
                    </div>
                  ))}
                </div>
                <p style={{ color: C.gray400 }} className="text-xs mt-3">
                  Estimated from active subscription plans — this reflects platform revenue from owner subscriptions, not full profit (running costs aren't tracked here).
                </p>
              </div>
            </>
          )}

          {tab !== "overview" && tab !== "revenue" && (
            <div className="relative mb-4 max-w-sm">
              <Search size={16} style={{ color: C.gray400 }} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "listings" ? "Search by property or university…" : tab === "inquiries" ? "Search by name or property…" : "Search by name or email…"}
                style={{ borderColor: C.border }}
                className="w-full border rounded-md pl-9 pr-3 py-2 text-sm outline-none"
              />
            </div>
          )}

          {tab === "students" && (
            <DataTable columns={personColumns} rows={byRole("Student")} emptyLabel="No students found." />
          )}
          {tab === "parents" && (
            <DataTable columns={personColumns} rows={byRole("Parent")} emptyLabel="No parents found." />
          )}
          {tab === "owners" && (
            <DataTable columns={personColumns} rows={byRole("Owner")} emptyLabel="No property owners found." />
          )}
          {tab === "listings" && (
            <DataTable columns={listingColumns} rows={filteredListings} emptyLabel="No listings found." />
          )}
          {tab === "inquiries" && (
            <DataTable columns={inquiryColumns} rows={filteredInquiries} emptyLabel="No inquiries yet." />
          )}
        </>
      )}
    </div>
  );
}

function AdminLoginView({ onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    try {
      const data = await api.login(email, password);
      if (data.user.role !== "Admin") {
        setError("This account doesn't have platform admin permissions.");
        setBusy(false);
        return;
      }
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white">
        <img src={bookinnWordmark} alt="BookInn" className="h-8 mb-4" />
        <h1 style={{ color: C.ink }} className="text-xl font-extrabold mb-1">Platform admin sign in</h1>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">
          Restricted to BookInn admin accounts.
        </p>

        {error && (
          <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          <PrimaryButton full onClick={submit} disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   URL ROUTING — gives bookmarkable addresses to key views.
   Lightweight (History API only, no router lib). The public
   views below all have addresses; the platform admin panel
   deliberately also gets one (/platform-admin) since it needs
   to be reachable, but it is never linked from the Header or
   Footer — only someone who already knows the URL (and has an
   Admin account) can get there.
--------------------------------------------------------- */
const VIEW_TO_PATH = {
  home: "/",
  saved: "/saved",
  pricing: "/pricing",
  account: "/account",
  admin: "/owner-dashboard",       // per-owner listings dashboard
  login: "/login",
  "how-it-works": "/how-it-works",
  "help-center": "/help-center",
  "safety-tips": "/safety-tips",
  "platform-admin": "/platform-admin",
};
const PATH_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_PATH).map(([v, p]) => [p, v]));

function viewFromPath(pathname) {
  return PATH_TO_VIEW[pathname] || "home";
}

/* ---------------------------------------------------------
   APP ROOT
--------------------------------------------------------- */
export default function App() {
  const [view, setViewState] = useState(() =>
    typeof window !== "undefined" ? viewFromPath(window.location.pathname) : "home"
  );
  // Wraps setView so every in-app navigation also updates the address bar —
  // this is what makes the admin panel reachable at its own /admin URL.
  const setView = React.useCallback((next) => {
    setViewState(next);
    if (typeof window !== "undefined") {
      const path = VIEW_TO_PATH[next];
      if (path && window.location.pathname !== path) {
        window.history.pushState({ view: next }, "", path);
      }
    }
  }, []);

  const [selectedListing, setSelectedListing] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authRedirect, setAuthRedirect] = useState(null);
  const [pendingTier, setPendingTier] = useState(null);
  const [ownerStats, setOwnerStats] = useState(null);
  const [ownerStatsLoading, setOwnerStatsLoading] = useState(false);
  const [ownerInquiries, setOwnerInquiries] = useState([]);
  const [ownerInquiriesLoading, setOwnerInquiriesLoading] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [myMaxListings, setMyMaxListings] = useState(1);
  const [mySubscription, setMySubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [reminder, setReminder] = useState(null);

  // Platform admin has its own sign-in, completely separate from the public
  // site's user/token above — kept under its own localStorage key so signing
  // in as a regular user/owner never grants (or interferes with) admin access.
  const [platformAdminUser, setPlatformAdminUser] = useState(null);
  const [platformAdminToken, setPlatformAdminToken] = useState(null);
  const [checkingAdminSession, setCheckingAdminSession] = useState(true);

  React.useEffect(() => {
    const savedAdminToken = localStorage.getItem("bookinn_admin_token");
    if (!savedAdminToken) { setCheckingAdminSession(false); return; }
    api.me(savedAdminToken)
      .then((data) => {
        if (data.user.role === "Admin") { setPlatformAdminToken(savedAdminToken); setPlatformAdminUser(data.user); }
        else localStorage.removeItem("bookinn_admin_token");
      })
      .catch(() => localStorage.removeItem("bookinn_admin_token"))
      .finally(() => setCheckingAdminSession(false));
  }, []);

  const handleAdminAuthSuccess = (loggedInUser, authToken) => {
    setPlatformAdminUser(loggedInUser);
    setPlatformAdminToken(authToken);
    localStorage.setItem("bookinn_admin_token", authToken);
  };

  const handleAdminSignOut = () => {
    setPlatformAdminUser(null);
    setPlatformAdminToken(null);
    localStorage.removeItem("bookinn_admin_token");
    setView("home");
  };

  // Keep view in sync with browser back/forward navigation.
  React.useEffect(() => {
    const onPopState = () => setViewState(viewFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Load listings from the backend on first mount, and again every time the
  // person lands back on the homepage — the feed is public data that other
  // owners can change at any time (new listing, plan upgrade, availability),
  // so a page fetched once on first load can go stale within the same session
  // (e.g. a newly-Featured listing not showing up in "Featured properties"
  // until a hard refresh).
  React.useEffect(() => {
    if (view !== "home") return;
    setListingsLoading((prev) => (listings.length === 0 ? true : prev));
    api.getListings()
      .then((data) => setListings(data.listings))
      .catch((err) => setListingsError(err.message))
      .finally(() => setListingsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Restore a saved session (if any) and verify it's still valid.
  React.useEffect(() => {
    const savedToken = localStorage.getItem("bookinn_token");
    if (!savedToken) return;
    api.me(savedToken)
      .then((data) => { setToken(savedToken); setUser(data.user); })
      .catch(() => localStorage.removeItem("bookinn_token"));
  }, []);

  const refreshOwnerStats = React.useCallback(() => {
    if (!token || user?.role !== "Owner") { setOwnerStats(null); return; }
    setOwnerStatsLoading(true);
    api.getOwnerStats(token)
      .then((data) => setOwnerStats(data))
      .catch(() => {})
      .finally(() => setOwnerStatsLoading(false));
  }, [token, user?.role]);

  // Owner dashboard stats are fetched fresh whenever the dashboard is opened or the
  // owner's listings change, so they're always real numbers, never placeholders.
  React.useEffect(() => {
    if (view === "admin" && user?.role === "Owner") refreshOwnerStats();
  }, [view, user?.role, refreshOwnerStats]);

  const refreshOwnerInquiries = React.useCallback(() => {
    if (!token || user?.role !== "Owner") { setOwnerInquiries([]); return; }
    setOwnerInquiriesLoading(true);
    api.getInquiries(token)
      .then((data) => setOwnerInquiries(data.inquiries || []))
      .catch(() => {})
      .finally(() => setOwnerInquiriesLoading(false));
  }, [token, user?.role]);

  React.useEffect(() => {
    if (view === "admin" && user?.role === "Owner") refreshOwnerInquiries();
  }, [view, user?.role, refreshOwnerInquiries]);

  const refreshMyListings = React.useCallback(() => {
    if (!token || user?.role !== "Owner") { setMyListings([]); setMyMaxListings(1); return; }
    setMyListingsLoading(true);
    api.getMyListings(token)
      .then((data) => { setMyListings(data.listings); setMyMaxListings(data.maxListings ?? 1); })
      .catch(() => {})
      .finally(() => setMyListingsLoading(false));
  }, [token, user?.role]);

  // The subscription card, trial countdown and one-time reminders all come from this
  // single live-computed endpoint — never from a client-side timer or stored count.
  const refreshSubscription = React.useCallback(() => {
    if (!token || user?.role !== "Owner") { setMySubscription(null); return; }
    setSubLoading(true);
    api.getMySubscription(token)
      .then((data) => {
        setMySubscription(data.subscriptionView);
        if (data.reminder) setReminder(data.reminder);
      })
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, [token, user?.role]);

  React.useEffect(() => {
    if (view === "admin" && user?.role === "Owner") { refreshMyListings(); refreshSubscription(); }
  }, [view, user?.role, refreshMyListings, refreshSubscription]);

  const handleCancelSubscription = async () => {
    if (!token) return;
    const data = await api.cancelSubscription(token);
    if (data.user) setUser(data.user);
    refreshSubscription();
    refreshMyListings();
  };

  // The free trial is only ever started by the owner explicitly clicking
  // "Start Free Trial" on their dashboard — never granted automatically.
  const handleStartTrial = async () => {
    if (!token) return;
    const data = await api.startFreeTrial(token);
    if (data.user) setUser(data.user);
    refreshSubscription();
    refreshMyListings();
  };

  const toggleFav = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openListing = (listing) => {
    setSelectedListing(listing);
    setView("detail");
    window.scrollTo?.(0, 0);
  };

  const refreshPublicListings = React.useCallback(() => {
    api.getListings().then((data) => setListings(data.listings)).catch(() => {});
  }, []);

  const addListing = async (l) => {
    const data = await api.addListing(l, token);
    if (data.user) setUser(data.user); // picks up the free-trial subscription, if it was just granted
    refreshOwnerStats();
    refreshMyListings();
    refreshSubscription();
    refreshPublicListings();
  };

  const updateListing = async (id, l) => {
    const { listing } = await api.updateListing(id, l, token);
    if (selectedListing?.id === id) setSelectedListing(listing);
    refreshOwnerStats();
    refreshMyListings();
    refreshPublicListings();
  };

  const deleteListingHandler = async (id) => {
    await api.deleteListing(id, token);
    refreshOwnerStats();
    refreshMyListings();
    refreshPublicListings();
  };

 const goToAdmin = () => { setPendingTier(null); if (user) { setView("admin"); } else { setAuthRedirect("admin"); setView("login"); } };

  // "List your property" drops any signed-in Owner straight into their dashboard,
  // where they can start their free trial themselves — no need to detour through pricing first.
  const goToListProperty = () => {
    if (!user) { setAuthRedirect("admin"); setView("login"); return; }
    if (user.role === "Owner") { setView("admin"); }
    else { setView("pricing"); }
  };

  const goToSubscribe = (tierName) => {
    setPendingTier(tierName);
    if (user) { setView("admin"); }
    else { setAuthRedirect("admin"); setView("login"); }
  };

  const handleSubscribed = (updatedUser) => {
    setUser(updatedUser);
    setPendingTier(null);
    refreshOwnerStats();
    refreshMyListings();
    refreshSubscription();
    refreshPublicListings();
  };

  const handleAuthSuccess = (loggedInUser, authToken) => {
    setUser(loggedInUser);
    setToken(authToken);
    localStorage.setItem("bookinn_token", authToken);
    setView(authRedirect || "home");
    setAuthRedirect(null);
  };

  const handleGuest = () => {
    setAuthRedirect(null);
    setView("home");
  };

  const handleSignOut = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("bookinn_token");
    setView("home");
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.blueMist, minHeight: "100vh" }} className="flex flex-col">
      <style>{FONT_IMPORT}</style>
      <Header
        view={view} setView={(v) => { setView(v); setMobileOpen(false); }} favCount={favorites.size}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
        user={user} onOwnerDashboardClick={goToAdmin} onListPropertyClick={goToListProperty} onSignOut={handleSignOut}
      />

      <div className="flex-1">
        {view === "home" && (
          listingsError ? (
            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
              <p style={{ color: C.ink }} className="font-semibold mb-1">Couldn't load listings</p>
              <p style={{ color: C.gray600 }} className="text-sm">{listingsError} — is the backend server running? Try <code>npm run dev:all</code>.</p>
            </div>
          ) : (
            <HomeView favorites={favorites} toggleFav={toggleFav} onOpenListing={openListing} listings={listings} loading={listingsLoading} />
          )
        )}
        {view === "detail" && selectedListing && (
          <DetailView
            listing={selectedListing} onBack={() => setView("home")} isFav={favorites.has(selectedListing.id)} toggleFav={toggleFav}
            onReviewAdded={(updated) => {
              setSelectedListing(updated);
              setListings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            }}
          />
        )}
        {view === "saved" && <SavedView listings={listings} favorites={favorites} toggleFav={toggleFav} onOpenListing={openListing} />}
        {view === "pricing" && <PricingView onSelectTier={goToSubscribe} onGoToDashboard={goToAdmin} />}
        {view === "how-it-works" && <HowBookingWorksView setView={setView} />}
        {view === "help-center" && <HelpCenterView setView={setView} />}
        {view === "safety-tips" && <SafetyTipsView setView={setView} />}
        {view === "account" && user && <AccountView user={user} favCount={favorites.size} setView={setView} />}
        {view === "admin" && (
          !user ? (
            <LoginView onAuthSuccess={handleAuthSuccess} onGuest={handleGuest} setView={setView} redirectNote="Sign in to manage your property listings." />
          ) : user.role !== "Owner" ? (
            <SubscribeView user={user} token={token} initialTier={pendingTier} onSubscribed={handleSubscribed} setView={setView} />
          ) : pendingTier ? (
            <SubscribeView user={user} token={token} initialTier={pendingTier} onSubscribed={handleSubscribed} setView={setView} />
          ) : (
            <AdminView
              user={user}
              token={token}
              listings={myListings}
              maxListings={myMaxListings}
              ownerStats={ownerStats}
              statsLoading={ownerStatsLoading}
              ownerInquiries={ownerInquiries}
              inquiriesLoading={ownerInquiriesLoading}
              mySubscription={mySubscription}
              subLoading={subLoading}
              reminder={reminder}
              addListing={addListing} updateListing={updateListing} deleteListing={deleteListingHandler}
              onCancelSubscription={handleCancelSubscription}
              onStartTrial={handleStartTrial}
              onUpgrade={() => setView("pricing")}
            />
          )
        )}
        {view === "login" && (
          <LoginView
            onAuthSuccess={handleAuthSuccess} onGuest={handleGuest} setView={setView}
            redirectNote={
              authRedirect === "admin" ? "Sign in to manage your property listings." :
              undefined
            }
          />
        )}
        {view === "platform-admin" && (
          checkingAdminSession ? null : !platformAdminUser ? (
            <AdminLoginView onAuthSuccess={handleAdminAuthSuccess} />
          ) : (
            <PlatformAdminView token={platformAdminToken} />
          )
        )}
      </div>

      {view === "platform-admin" ? (
        platformAdminUser && (
          <div style={{ borderColor: C.border }} className="border-t bg-white px-4 md:px-6 py-3 flex items-center justify-between max-w-6xl mx-auto w-full">
            <span style={{ color: C.gray600 }} className="text-xs">Signed in as {platformAdminUser.name} (Admin)</span>
            <button onClick={handleAdminSignOut} style={{ color: C.blue }} className="text-sm font-semibold flex items-center gap-1.5 hover:opacity-90">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )
      ) : (
        <Footer setView={setView} onOwnerDashboardClick={goToAdmin} onListPropertyClick={goToListProperty} />
      )}
    </div>
  );
}
