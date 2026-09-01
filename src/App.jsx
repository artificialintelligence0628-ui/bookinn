import React, { useState, useMemo, useRef, useEffect } from "react";
import { api } from "./api.js";
import PlatformAdminEmails from "./AdminEmails.jsx";
import { C } from "./theme.js";
import { Badge, PrimaryButton, GhostButton, AdminStatCard, DataTable, RoleBadge } from "./adminUI.jsx";
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
   (now in ./theme.js — imported above — so AdminEmails.jsx can use the
   same tokens without a circular import back to this file)
--------------------------------------------------------- */

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
// Mobile browsers are far stricter than desktop about treating a
// window.open() as "user-initiated" once any async hop (the inquiry
// request) sits between the click and the open/redirect. The
// pre-opened-blank-tab trick below is kept for desktop, but on mobile
// we skip it entirely and just navigate the current tab straight to
// WhatsApp — a same-tab navigation is never subject to popup-blocking
// rules, so it's the one approach that's reliable everywhere.
function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
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

// Payment integration and owner subscription plans have been removed — every
// owner now always has full feature access. Mirrors server/plans.js FULL_FEATURES.
const FULL_FEATURES = {
  maxListings: 3, maxPhotos: 20, videoTour: true, whatsappEnquiries: true, analytics: true,
  verifiedBadge: true, topSearch: true, homepagePlacement: true, priorityEnquiries: true,
  featuredBadge: true, virtualWalkthrough: true, maxWalkthroughStops: 6, advancedAvailability: true,
};


// Cloudinary URLs support on-the-fly resizing/compression via URL params —
// inserting w_{width},q_auto,f_auto right after /upload/ tells Cloudinary to
// serve a smaller, auto-compressed, auto-format (WebP/AVIF where supported)
// version instead of the original upload. Local asset imports and bare
// placeholder keys (e.g. "hostel1") pass through untouched.
const cld = (url, width) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com") || !width) return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};

const img = (key, width) => {
  const resolved = PROPERTY_IMAGES[key] || key || PROPERTY_IMAGES.hostel1;
  return cld(resolved, width);
};

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

/* ---------------------------------------------------------
   HEADER
--------------------------------------------------------- */
function Header({ view, setView, favCount, mobileOpen, setMobileOpen, user, onOwnerDashboardClick, onListPropertyClick, onSignOut, platformAdminUser, onAdminSignOut }) {
  const navItem = (key, label) => (
    <button
      onClick={() => { setView(key); setMobileOpen(false); }}
      style={{ color: view === key ? C.white : "rgba(255,255,255,0.85)" }}
      className="text-sm font-semibold hover:text-white transition px-1"
    >
      {label}
    </button>
  );

  // On the platform-admin panel, the header always shows the admin's own
  // identity and a sign-out that ends the admin session — never the public
  // site's user/token, which can currently belong to an impersonated owner
  // (see handleManageOwner). Showing "Hi, <owner name>" here while looking
  // at the admin panel was misleading, since that owner session is separate
  // from — and irrelevant to — the admin session actually powering this page.
  const isAdminPanel = view === "platform-admin";

  return (
    <header style={{ background: C.navy }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => setView(isAdminPanel ? "platform-admin" : "home")} className="flex items-center gap-2">
            <img src={ibiIcon} alt="BookInn" className="w-8 h-8 rounded-full" />
            <span className="text-white font-extrabold text-xl tracking-tight">BookInn</span>
            {isAdminPanel && (
              <span style={{ background: "rgba(255,255,255,0.15)", color: C.white }} className="text-xs font-semibold px-2 py-0.5 rounded-md ml-1">
                Admin
              </span>
            )}
          </button>

          {!isAdminPanel && (
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
          )}

          <div className="hidden md:flex items-center gap-3">
            {isAdminPanel ? (
              platformAdminUser && (
                <div className="flex items-center gap-2.5">
                  <span style={{ color: C.white }} className="text-sm font-semibold">
                    {platformAdminUser.name.split(" ")[0]} (Admin)
                  </span>
                  <button
                    onClick={onAdminSignOut}
                    style={{ borderColor: "rgba(255,255,255,0.4)", color: C.white }}
                    className="text-sm font-semibold px-3.5 py-2 rounded-md border hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </div>
              )
            ) : (
              <>
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
              </>
            )}
          </div>

          {!isAdminPanel && (
            <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {!isAdminPanel && mobileOpen && (
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
        <h1 className="text-white text-2xl md:text-4xl font-extrabold mb-2">Find student accommodation near your campus</h1>
        <p style={{ color: "rgba(255,255,255,0.85)" }} className="text-sm md:text-base mb-6">
          Compare hostels, self-contained units and shared apartments around your University — contactable in one tap.
        </p>

        <div style={{ background: C.white }} className="rounded-lg shadow-lg p-3 md:p-4 flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-md" style={{ background: C.blueMist }}>
            <Search size={18} color={C.gray600} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hostel or apartment name"
              aria-label="Search by hostel or apartment name"
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
function FilterSidebar({ filters, setFilters, resultCount, universities, showUniversityFilter }) {
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

      {showUniversityFilter && universities?.length > 0 && (
        <div className="mb-5">
          <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">University</p>
          <select
            aria-label="Filter by university"
            value={filters.university}
            onChange={(e) => setFilters((f) => ({ ...f, university: e.target.value }))}
            style={{ borderColor: C.border, color: C.ink }}
            className="w-full border rounded-md text-sm px-3 py-2 bg-white"
          >
            <option value="Any">All universities</option>
            {universities.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}

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
          aria-label="Bathroom type"
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
        <img src={img(listing.image, 500)} alt={listing.name} loading="lazy" className="w-full h-44 sm:h-full object-cover" />
        {(listing.featured || listing.verified) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {listing.featured && <Badge tone="yellow"><span className="flex items-center gap-1"><Sparkles size={12} /> Featured</span></Badge>}
            {listing.verified && <Badge tone="blue"><span className="flex items-center gap-1"><BadgeCheck size={12} /> Verified</span></Badge>}
          </div>
        )}
        <button
          onClick={() => toggleFav(listing.id)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
          aria-label={isFav ? "Remove from saved" : "Save this listing"}
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
function HomeView({ favorites, toggleFav, onOpenListing, listings, loading, studentUniversity, universities }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ priceMax: MAX_PRICE, roomTypes: [], propertyTypes: [], bath: "Any", kitchen: false, university: "Any" });
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
      // Students are already scoped to their own university server-side, so
      // this optional dropdown is only meaningful (and only shown) for
      // guests/parents browsing every campus at once.
      if (!studentUniversity && filters.university !== "Any" && l.university !== filters.university) return false;
      return true;
    });
    if (sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
    if (sort === "rating") out = [...out].sort((a, b) => b.rating - a.rating);
    return out;
  }, [listings, searchQuery, filters, sort, studentUniversity]);

  // True "homepage" state — no search or filters applied yet. This is where a
  // Featured-plan listing's homepagePlacement actually earns its keep: a dedicated
  // strip above the regular results, instead of just being a flag nothing reads.
  const isDefaultView = !searchQuery && filters.priceMax === MAX_PRICE && filters.roomTypes.length === 0
    && filters.propertyTypes.length === 0 && filters.bath === "Any" && !filters.kitchen && filters.university === "Any";
  const featuredListings = useMemo(
    () => (isDefaultView ? listings.filter((l) => l.homepagePlacement) : []),
    [isDefaultView, listings]
  );

  return (
    <div>
      <Hero searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        {studentUniversity && (
          <div style={{ background: C.blueMist, borderColor: C.border, color: C.gray600 }} className="border rounded-md px-3.5 py-2 text-xs font-medium mb-4 flex items-center gap-1.5">
            <MapPin size={13} color={C.blue} /> Showing hostels &amp; apartments near <span style={{ color: C.ink }} className="font-semibold">{studentUniversity}</span> only.
          </div>
        )}
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
          <FilterSidebar filters={filters} setFilters={setFilters} resultCount={filtered.length} universities={universities} showUniversityFilter={!studentUniversity} />

          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 style={{ color: C.ink }} className="font-bold text-lg">{filtered.length} places to stay</h2>
              <select
                aria-label="Sort listings"
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

function ContactModal({ listing, roomType, onClose }) {
   const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sentWaLink, setSentWaLink] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", moveIn: "",
   message: `Hi, I saw ${listing.name}${roomType ? ` (${roomType})` : ""} on BookInn and I'm interested. Is it still available?`,
  });
  const ownerWhatsappDigits = toWhatsappDigits(listing.ownerWhatsapp);
  const mailLink = listing.ownerEmail ? `mailto:${listing.ownerEmail}?subject=${encodeURIComponent("Inquiry: " + listing.name)}&body=${encodeURIComponent(form.message)}` : null;

  // Popups can only be opened synchronously inside a user gesture (the click
  // handler that fires them). Once any async hop (like the inquiry request)
  // sits between the click and the open/redirect, browsers no longer trust
  // it as user-initiated and silently block it. Fix: open the blank tab up
  // front in sendRequest (the real click handler) and just redirect it here
  // once the inquiry has been sent. Desktop browsers still honor a blank tab
  // that was pre-opened synchronously and redirected later, so that trick is
  // kept for desktop. Mobile browsers are stricter, so on mobile we instead
  // navigate the CURRENT tab straight to WhatsApp, which is a plain page
  // navigation, not a popup, so it's never blocked.
  const isMobile = isMobileDevice();

  const submitBookingRequest = async (waTab) => {
    try {
      await api.sendInquiry({
        listingId: listing.id, name: form.name, phone: form.phone, email: form.email,
        moveIn: form.moveIn,
        message: form.message,
        roomType,
      });
      if (ownerWhatsappDigits) {
        const summary = [
          `New BookInn booking request for ${listing.name}${roomType ? ` — ${roomType}` : ""}`,
          `Name: ${form.name}`,
          form.phone ? `Phone: ${form.phone}` : null,
          form.email ? `Email: ${form.email}` : null,
          form.moveIn ? `Move-in: ${form.moveIn}` : null,
          `Message: ${form.message}`,
        ].filter(Boolean).join("\n");
        const autoWaLink = `https://wa.me/${ownerWhatsappDigits}?text=${encodeURIComponent(summary)}`;
        setSentWaLink(autoWaLink);
        if (isMobile) {
          // Same-tab navigation — always allowed, and on a phone this hands
          // straight off to the WhatsApp app just like a normal wa.me link.
          // sentWaLink above also powers a manual fallback button in the
          // "sent" view, in case a particular in-app browser still blocks it.
          setSent(true);
          setTimeout(() => { window.location.href = autoWaLink; }, 400);
          return;
        }
        if (waTab && !waTab.closed) waTab.location.href = autoWaLink;
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

  const sendRequest = () => {
    if (!form.name) { setSendError("Enter your name so the property manager knows who's asking."); return; }
    if (!ownerWhatsappDigits && !mailLink) { setSendError("This owner hasn't added a WhatsApp number or email yet."); return; }
    setSendError("");
    setBusy(true);
    // Open the tab now, synchronously inside this click handler, so the
    // browser's popup blocker treats it as user-initiated. It sits on
    // about:blank until submitBookingRequest redirects it later.
    // Skipped on mobile — see the comment above.
    const waTab = (ownerWhatsappDigits && !isMobile) ? window.open("", "_blank") : null;
    submitBookingRequest(waTab);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.55)" }} onClick={onClose}>
      <div style={{ background: C.white }} className="rounded-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4" aria-label="Close"><X size={20} color={C.gray600} /></button>
        <h3 style={{ color: C.ink }} className="font-bold text-lg mb-1">Contact about this room</h3>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">{listing.name}{roomType ? ` · ${roomType}` : ""}</p>

        {sent ? (
          <div style={{ background: C.blueLight }} className="rounded-md p-4 text-center">
            <Check className="mx-auto mb-2" color={C.navy} />
            <p style={{ color: C.navy }} className="font-semibold text-sm">
              Inquiry sent — we've also opened WhatsApp with your details ready to send to the owner.
            </p>
            {sentWaLink && (
              <a
                href={sentWaLink}
                target={isMobile ? undefined : "_blank"}
                rel="noopener noreferrer"
                style={{ background: C.blue }}
                className="mt-3 inline-flex items-center justify-center gap-1.5 text-white text-sm font-semibold py-2 px-4 rounded-md"
              >
                <MessageCircle size={16} /> WhatsApp didn't open? Tap here
              </a>
            )}
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
                Send your request — it goes straight to the owner's WhatsApp automatically.
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

                {sendError && (
                  <p style={{ color: "#b3261e" }} className="text-xs">{sendError}</p>
                )}
                <PrimaryButton full onClick={sendRequest} disabled={busy}>
                  {busy ? "Sending…" : "Send request & continue to WhatsApp"}
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
        <select value={rating} aria-label="Rating out of 10" onChange={(e) => setRating(Number(e.target.value))}
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

  function DetailView({ listing, onBack, isFav, toggleFav, onReviewAdded, user, onRequireAuth }) {
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
          <button onClick={() => toggleFav(listing.id)} style={{ borderColor: C.border }} className="border w-10 h-10 rounded-md flex items-center justify-center" aria-label={isFav ? "Remove from saved" : "Save this listing"}>
            <Heart size={18} color={isFav ? C.blue : C.gray400} fill={isFav ? C.blue : "none"} />
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="h-52 sm:h-64 md:h-80 mb-3 rounded-lg overflow-hidden">
        <img src={img(galleryImages[activeImg], 900)} className="object-cover w-full h-full" alt={listing.name} />
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
              <img src={img(src, 150)} loading="lazy" className="w-16 h-16 sm:w-20 sm:h-20 object-cover" alt={`${listing.name} view ${i + 1}`} />
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
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={20} color={C.white} />
                      </button>
                      <button
                        onClick={() => setWalkStep((s) => (s + 1) % walkthroughStops.length)}
                        style={{ background: "rgba(0,0,0,0.45)" }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-black/60"
                        aria-label="Next photo"
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
                        aria-label={`View ${stop.label || `stop ${i + 1}`}`}
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
                aria-label="Room category"
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

         <PrimaryButton
            full
            onClick={() => {
              if (!user) { onRequireAuth(); return; }
              setShowContact(true);
            }}
          >
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
function PricingView({ onGoToDashboard }) {
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

      <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        <div style={{ background: C.blueLight, borderColor: C.border }} className="border rounded-lg p-4 mb-6 flex items-start gap-3">
          <Sparkles size={18} color={C.blue} className="mt-0.5 shrink-0" />
          <p style={{ color: C.navy }} className="text-sm">
            <span className="font-bold">Listing is free.</span> Create an Owner account and publish your listing from the dashboard — no card required, no plan to choose.
          </p>
        </div>

        <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white mb-4">
          <h3 style={{ color: C.ink }} className="font-bold text-lg mb-3">What you get</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              "Up to 3 hostel/apartment listings", "Up to 20 photos per listing", "Video tour", "Virtual walkthrough",
              "WhatsApp enquiries", "Top-of-search placement", "Homepage placement", "Verified badge", "Analytics",
            ].map((f) => (
              <li key={f} style={{ color: C.gray600 }} className="text-sm flex items-start gap-2">
                <Check size={15} color={C.blue} className="mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white flex items-center justify-between flex-wrap gap-4">
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

function NotOwnerNotice({ user, setView }) {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <p style={{ color: C.ink }} className="font-semibold mb-2">This account is registered as a {user.role}</p>
      <p style={{ color: C.gray600 }} className="text-sm mb-4">Only Owner accounts can list properties. Create a separate Owner account to get started.</p>
      <PrimaryButton onClick={() => setView("home")}>Back to home</PrimaryButton>
    </div>
  );
}

function AdminView({ user, token, listings, maxListings, ownerStats, statsLoading, ownerInquiries, inquiriesLoading, addListing, updateListing, deleteListing, onConfirmResident, universities }) {
  const emptyForm = {
    name: "", university: universities[0] || "", price: "",
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

  // Universities load async — if the list wasn't ready yet when this form's
  // initial state was set, backfill the default once it arrives (only while
  // the "add listing" form is still untouched/unopened).
  React.useEffect(() => {
    if (!form.university && universities.length && !editingId) {
      setForm((f) => ({ ...f, university: universities[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universities]);

  const hasListing = listings.length > 0;
  const atListingLimit = listings.length >= maxListings;
  const canAddListing = !atListingLimit;

  const features = FULL_FEATURES;
  const galleryCap = FULL_FEATURES.maxPhotos;

  const residentCount = ownerInquiries.filter((i) => i.confirmedResident).length;
  const stats = [
    { label: "Active listings", value: statsLoading ? "…" : (ownerStats?.activeListings ?? 0), icon: Building2 },
    { label: "Inquiries this month", value: statsLoading ? "…" : (ownerStats?.inquiriesThisMonth ?? 0), icon: Users },
    { label: "Confirmed residents", value: inquiriesLoading ? "…" : residentCount, icon: BadgeCheck },
  ];
  // Clicking "Students" on a listing row opens a focused popup — same pattern
  // as the platform admin's roster — split into confirmed residents (for
  // record-keeping) and everyone who's simply sent a booking request.
  const [rosterListing, setRosterListing] = useState(null);
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
      setSubmitError(`You've reached the ${cap}-photo limit per listing.`);
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
      uploadingImage: false, uploadingGallery: false, uploadingVideo: false, uploadingWalkthrough: {},
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
            onClick={() => (showForm ? cancelForm() : setShowForm(true))}
          >
            <span className="flex items-center gap-2">
              <Plus size={16} />
              {showForm ? "Add listing" : "Add listing"}
            </span>
          </PrimaryButton>
        )}
      </div>

      {hasListing && (
        <p style={{ color: C.gray600 }} className="text-xs -mt-4 mb-4">
          {listings.length}/{maxListings} listing{maxListings === 1 ? "" : "s"} used.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} style={{ borderColor: C.border }} className="border rounded-lg p-3 sm:p-4 bg-white min-w-0">
            <s.icon size={18} color={C.blue} className="mb-2 shrink-0" />
            <p style={{ color: C.ink }} className="text-lg sm:text-xl font-extrabold truncate">{s.value}</p>
            <p style={{ color: C.gray600 }} className="text-xs mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
        {analyticsStats.map((s) => (
          <div key={s.label} style={{ borderColor: C.border }} className="border rounded-lg p-3 sm:p-4 bg-white min-w-0">
            <s.icon size={18} color={C.blue} className="mb-2 shrink-0" />
            <p style={{ color: C.ink }} className="text-lg sm:text-xl font-extrabold truncate">{s.value}</p>
            <p style={{ color: C.gray600 }} className="text-xs mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ borderColor: C.border }} className="border rounded-lg bg-white mb-6">
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3">
          <div>
            <h3 style={{ color: C.ink }} className="font-bold text-sm">Recent inquiries</h3>
            <p style={{ color: C.gray600 }} className="text-xs mt-0.5">
              Your inquiries get priority — they're flagged below.
            </p>
          </div>
          <Badge tone="yellow"><span className="flex items-center gap-1"><Sparkles size={12} /> Priority</span></Badge>
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
            <select value={form.university} aria-label="University" onChange={(e) => setForm({ ...form, university: e.target.value })}
              style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none">
              {universities.map((u) => <option key={u}>{u}</option>)}
            </select>
            <select value={form.bath} aria-label="Bathroom type" onChange={(e) => setForm({ ...form, bath: e.target.value })}
              style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none">
              {["Shared bath", "Ensuite bath"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Pricing period</p>
            <select value={form.pricingPeriod} aria-label="Pricing period" onChange={(e) => setForm({ ...form, pricingPeriod: e.target.value })}
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
              <select value={form.travelMode} aria-label="Travel mode" onChange={(e) => setForm({ ...form, travelMode: e.target.value })}
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
                    {r.checked && (
                      <select
                        aria-label={`${r.roomType} availability`}
                        value={r.availability}
                        onChange={(e) => setHostelRoomAvailability(r.roomType, e.target.value)}
                        style={{ borderColor: C.border, color: C.ink }}
                        className="border rounded-md px-2 py-1.5 text-xs outline-none"
                      >
                        {AVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Room type &amp; price</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={form.roomType} aria-label="Room type" onChange={(e) => setForm({ ...form, roomType: e.target.value })}
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
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.gray600 }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} style={{ accentColor: C.blue }} />
              Featured listing
            </label>
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
                      aria-label="Remove photo"
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
                      aria-label={`Remove room photo ${i + 1}`}
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
                {`Up to ${galleryCap} photos per listing.`}
              </p>
            </div>

            <div>
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                Video tour
              </p>
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
              <p style={{ color: C.gray600 }} className="text-xs mt-1.5">
                {form.videoData ? "Video attached." : "Optional — MP4 under 25MB recommended."}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              Virtual walkthrough
            </p>
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
                <th className="py-2.5 px-4 font-semibold">Students</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} style={{ borderColor: C.border }} className="border-t">
                  <td className="py-2.5 px-4 font-semibold truncate" style={{ color: C.ink }}>
                    <div className="flex items-center gap-2.5">
                      <img src={img(l.image, 100)} alt={l.name} loading="lazy" className="w-9 h-9 rounded object-cover flex-shrink-0" />
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
                    <button
                      onClick={() => setRosterListing(l)}
                      style={{ color: C.blue }}
                      className="text-xs font-semibold hover:underline whitespace-nowrap"
                    >
                      View students
                    </button>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => startEdit(l)} title="Edit listing" aria-label={`Edit ${l.name}`}>
                        <Pencil size={15} color={C.gray600} className="cursor-pointer" />
                      </button>
                      <button onClick={() => handleDelete(l.id)} disabled={deletingId === l.id} title="Delete listing" aria-label={`Delete ${l.name}`}>
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

      {rosterListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.55)" }} onClick={() => setRosterListing(null)}>
          <div style={{ background: C.white }} className="rounded-lg max-w-md w-full p-6 relative max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setRosterListing(null)} className="absolute top-4 right-4" aria-label="Close"><X size={20} color={C.gray600} /></button>
            <h3 style={{ color: C.ink }} className="font-bold text-lg mb-1">Students — {rosterListing.name}</h3>
            <p style={{ color: C.gray600 }} className="text-xs mb-1">For your records — who's living here now, and who's still just asked about it.</p>
            {(() => {
              const roster = ownerInquiries.filter((inq) => inq.listingId === rosterListing.id);
              if (!roster.length) {
                return <p style={{ color: C.gray600 }} className="text-sm mt-4">No students have inquired about this property yet.</p>;
              }
              const residents = roster.filter((s) => s.confirmedResident);
              const requests = roster.filter((s) => !s.confirmedResident);
              return (
                <StudentRosterLists residents={residents} requests={requests} onToggle={onConfirmResident} />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}


/* ---------------------------------------------------------
   LOGIN VIEW
--------------------------------------------------------- */
function LoginView({ onAuthSuccess, onGuest, redirectNote, setView, universities }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Universities load async — default to the first one once the list arrives,
  // as long as the person hasn't already picked something themselves.
  React.useEffect(() => {
    if (!university && universities?.length) setUniversity(universities[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universities]);
  // True when the last sign-in attempt was blocked specifically because the
  // account's email isn't confirmed yet — lets us offer a "resend the link" option.
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSignIn = async () => {
    setError("");
    setNeedsVerification(false);
    setResendSent(false);
    if (!email || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    try {
      const data = await api.login(email, password);
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
      if (err.message === "Please check your email to confirm your account first.") {
        setNeedsVerification(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResendBusy(true);
    try {
      await api.resendVerification(email);
      setResendSent(true);
    } catch {
      // resend-verification never errors on invalid email (privacy-safe), so this
      // only happens on a network/server failure — the message below stays generic.
      setResendSent(true);
    } finally {
      setResendBusy(false);
    }
  };

  const handleSignUp = async () => {
    setError("");
    if (!name || !email || !password || !confirmPassword) { setError("Fill in all fields to create an account."); return; }
    if (!emailValid(email)) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (role === "Student" && !university) { setError("Select your university."); return; }
    setBusy(true);
    try {
      const data = await api.signup(name, email, password, role, role === "Student" ? university : undefined);
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
            onClick={() => { setMode("signin"); setError(""); setNeedsVerification(false); setResendSent(false); }}
            style={{ background: mode === "signin" ? C.blue : "transparent", color: mode === "signin" ? C.white : C.gray600 }}
            className="flex-1 text-sm font-semibold py-1.5 rounded-md transition"
          >
            Sign in
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); setNeedsVerification(false); setResendSent(false); }}
            style={{ background: mode === "signup" ? C.blue : "transparent", color: mode === "signup" ? C.white : C.gray600 }}
            className="flex-1 text-sm font-semibold py-1.5 rounded-md transition"
          >
            Create account
          </button>
        </div>

       {error && (
          <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2 mb-3">
            {error}
            {needsVerification && (
              resendSent ? (
                <p className="mt-1.5 font-semibold">Check your inbox for a new confirmation link.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendBusy}
                  className="block mt-1.5 font-semibold underline"
                >
                  {resendBusy ? "Sending…" : "Resend confirmation email"}
                </button>
              )
            )}
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
              {role === "Student" && (
                <div>
                  <p style={{ color: C.ink }} className="text-xs font-semibold mb-1.5">My university</p>
                  <select
                    value={university}
                    aria-label="University"
                    onChange={(e) => setUniversity(e.target.value)}
                    style={{ borderColor: C.border, color: C.ink }}
                    className="border rounded-md px-3 py-2.5 text-sm outline-none w-full"
                  >
                    {universities.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <p style={{ color: C.gray600 }} className="text-xs mt-1.5">
                    You'll only see hostels and apartments near this campus.
                  </p>
                </div>
              )}
            </>
          )}
          <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mode === "signin" && submit()}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          {mode === "signup" && (
            <input placeholder="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          )}
          {mode === "signin" && (
            <button type="button" onClick={() => setView("forgot-password")} style={{ color: C.blue }} className="text-xs font-semibold text-right hover:underline -mt-1">
              Forgot password?
            </button>
          )}
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
   FORGOT PASSWORD — requests a reset link by email. Always shows the same
   confirmation regardless of whether the email is registered (matches the
   backend's behavior), so this screen can't be used to check who has an
   account.
--------------------------------------------------------- */
function ForgotPasswordView({ setView }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError("");
    if (!email) { setError("Enter your email address."); return; }
    setBusy(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
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
        <h1 style={{ color: C.ink }} className="text-xl font-extrabold mb-1">Reset your password</h1>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">Enter your email and we'll send you a link to reset your password.</p>

        {sent ? (
          <div style={{ background: C.blueLight }} className="rounded-md p-4 text-center mb-4">
            <Check className="mx-auto mb-2" color={C.navy} />
            <p style={{ color: C.navy }} className="font-semibold text-sm">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {error && (
              <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
            <PrimaryButton full onClick={submit} disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </PrimaryButton>
          </div>
        )}

        <p style={{ color: C.gray600 }} className="text-xs text-center mt-4">
          <button onClick={() => setView("login")} style={{ color: C.blue }} className="font-semibold hover:underline">Back to sign in</button>
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   RESET PASSWORD — landing page for the emailed reset link
   (bookinngh.com/reset-password?token=...). On success, signs the person
   straight in with their new password, same as the login/signup flows.
--------------------------------------------------------- */
function ResetPasswordView({ token, onAuthSuccess, setView }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!password || !confirmPassword) { setError("Enter and confirm your new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setBusy(true);
    try {
      const data = await api.resetPassword(token, password);
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white text-center">
          <p style={{ color: C.ink }} className="font-semibold mb-2">This reset link is missing or invalid</p>
          <p style={{ color: C.gray600 }} className="text-sm mb-4">Request a new password reset link to continue.</p>
          <PrimaryButton onClick={() => setView("forgot-password")}>Request new link</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white">
        <img src={bookinnWordmark} alt="BookInn" className="h-8 mb-4" />
        <h1 style={{ color: C.ink }} className="text-xl font-extrabold mb-1">Set a new password</h1>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">Choose a new password for your BookInn account.</p>

        <div className="flex flex-col gap-3">
          {error && (
            <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <input placeholder="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          <input placeholder="Confirm new password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
          <PrimaryButton full onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Set new password"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   VERIFY EMAIL — landing page for the emailed "confirm your email" link
   (bookinngh.com/verify-email?token=...). Fires the verification call once
   on load; the account already works normally either way, this just flags
   the email as confirmed.
--------------------------------------------------------- */
function VerifyEmailView({ token, setView, onVerified }) {
  const [status, setStatus] = useState("checking"); // checking | success | error
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!token) { setStatus("error"); setError("This verification link is missing or invalid."); return; }
    api.verifyEmail(token)
      .then((data) => {
        setStatus("success");
        onVerified?.(data.user);
      })
      .catch((err) => {
        setStatus("error");
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white text-center">
        <img src={bookinnWordmark} alt="BookInn" className="h-8 mb-4 mx-auto" />
        {status === "checking" && (
          <p style={{ color: C.gray600 }} className="text-sm">Confirming your email…</p>
        )}
        {status === "success" && (
          <>
            <div style={{ background: C.blueLight }} className="rounded-md p-4 mb-4">
              <Check className="mx-auto mb-2" color={C.navy} />
              <p style={{ color: C.navy }} className="font-semibold text-sm">Your email is confirmed.</p>
            </div>
            <PrimaryButton onClick={() => setView("home")}>Continue to BookInn</PrimaryButton>
          </>
        )}
        {status === "error" && (
          <>
            <p style={{ color: "#b3261e" }} className="font-semibold text-sm mb-4">{error}</p>
            <PrimaryButton onClick={() => setView("home")}>Continue to BookInn</PrimaryButton>
          </>
        )}
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
        <button onClick={onClose} className="absolute top-4 right-4" aria-label="Close"><X size={20} color={C.gray600} /></button>
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
   STUDENT ROSTER — shared by the platform admin's "View students" popup
   and the owner dashboard's "Students" popup. Splits a listing's students
   into two clear groups: confirmed residents (for record-keeping) and
   everyone who has simply sent a booking request but isn't marked as
   moved in yet.
--------------------------------------------------------- */
function StudentRosterLists({ residents, requests, onToggle }) {
  const Row = ({ s }) => (
    <div className="py-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p style={{ color: C.ink }} className="text-sm font-semibold flex items-center gap-1.5">
          {s.name}
          {s.confirmedResident && <Badge tone="green">Resident</Badge>}
        </p>
        <p style={{ color: C.gray600 }} className="text-xs mt-0.5">
          {s.roomType ? `${s.roomType} · ` : ""}{s.phone || s.email || "No contact provided"}
        </p>
        <p style={{ color: C.gray400 }} className="text-xs mt-0.5">
          {s.moveIn ? `Move-in: ${s.moveIn}` : ""}
          {s.createdAt ? ` · Booked ${new Date(s.createdAt).toLocaleDateString()}` : ""}
        </p>
      </div>
      <button
        onClick={() => onToggle(s)}
        style={{ borderColor: C.border, color: s.confirmedResident ? C.gray600 : C.blue }}
        className="border rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
      >
        {s.confirmedResident ? "Unmark" : "Mark resident"}
      </button>
    </div>
  );
  return (
    <>
      <div className="mt-4">
        <h4 style={{ color: C.ink }} className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
          <BadgeCheck size={14} color={C.green || "#16a34a"} /> Residents ({residents.length})
        </h4>
        <p style={{ color: C.gray600 }} className="text-xs mt-0.5 mb-1">Students confirmed as actually living here — keep for your records.</p>
        {residents.length ? (
          <div className="flex flex-col divide-y" style={{ borderColor: C.border }}>
            {residents.map((s) => <Row key={s.id} s={s} />)}
          </div>
        ) : (
          <p style={{ color: C.gray400 }} className="text-xs py-2">No confirmed residents yet.</p>
        )}
      </div>
      <div className="mt-5">
        <h4 style={{ color: C.ink }} className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
          <Inbox size={14} color={C.blue} /> Booking requests ({requests.length})
        </h4>
        <p style={{ color: C.gray600 }} className="text-xs mt-0.5 mb-1">Everyone who has sent a booking request but isn't marked as a resident yet.</p>
        {requests.length ? (
          <div className="flex flex-col divide-y" style={{ borderColor: C.border }}>
            {requests.map((s) => <Row key={s.id} s={s} />)}
          </div>
        ) : (
          <p style={{ color: C.gray400 }} className="text-xs py-2">No pending booking requests.</p>
        )}
      </div>
    </>
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

function PlatformAdminView({ token, onManageOwner }) {
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "students", label: "Students" },
    { key: "parents", label: "Parents" },
    { key: "owners", label: "Owners" },
    { key: "listings", label: "Listings" },
    { key: "inquiries", label: "Inquiries" },
    { key: "universities", label: "Universities" },
    { key: "emails", label: "Emails" },
  ];
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [listings, setListings] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  // Applies to the Listings and Inquiries tabs — lets the admin narrow either
  // table down to a single campus instead of relying on free-text search.
  const [universityFilter, setUniversityFilter] = useState("All");

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsData, usersData, inquiriesData, listingsData, universitiesData] = await Promise.all([
        api.getAdminStats(token),
        api.getAdminUsers(token),
        api.getInquiries(token),
        api.getListings(),
        api.getUniversities(),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setInquiries(inquiriesData.inquiries);
      setListings(listingsData.listings);
      setUniversities(universitiesData.universities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (tab === "overview" || tab === "listings" || tab === "universities") loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadAll]);

  const [newUniversityName, setNewUniversityName] = useState("");
  const [universityBusy, setUniversityBusy] = useState(false);
  const [universityError, setUniversityError] = useState("");

  const addUniversity = async () => {
    const name = newUniversityName.trim();
    if (!name) return;
    setUniversityBusy(true);
    setUniversityError("");
    try {
      const { university } = await api.addUniversity(name, token);
      setUniversities((prev) => (prev.some((u) => u.id === university.id) ? prev : [...prev, university].sort((a, b) => a.name.localeCompare(b.name))));
      setNewUniversityName("");
    } catch (err) {
      setUniversityError(err.message);
    } finally {
      setUniversityBusy(false);
    }
  };

  const [deletingUniversityId, setDeletingUniversityId] = useState(null);
  const removeUniversity = async (u) => {
    setDeletingUniversityId(u.id);
    setUniversityError("");
    try {
      await api.deleteUniversity(u.id, token);
      setUniversities((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      setUniversityError(err.message);
    } finally {
      setDeletingUniversityId(null);
    }
  };

  // Inline rename — click the pencil to turn a row into a text input.
  const [editingUniversityId, setEditingUniversityId] = useState(null);
  const [editingUniversityName, setEditingUniversityName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const startUniversityEdit = (u) => {
    setUniversityError("");
    setEditingUniversityId(u.id);
    setEditingUniversityName(u.name);
  };
  const cancelUniversityEdit = () => {
    setEditingUniversityId(null);
    setEditingUniversityName("");
  };
  const saveUniversityEdit = async (u) => {
    const name = editingUniversityName.trim();
    if (!name) return;
    if (name === u.name) { cancelUniversityEdit(); return; }
    setRenameBusy(true);
    setUniversityError("");
    try {
      const { university } = await api.renameUniversity(u.id, name, token);
      setUniversities((prev) => prev.map((x) => (x.id === university.id ? university : x)).sort((a, b) => a.name.localeCompare(b.name)));
      cancelUniversityEdit();
    } catch (err) {
      setUniversityError(err.message);
    } finally {
      setRenameBusy(false);
    }
  };

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

  const byRole = (role) =>
    users
      .filter((u) => u.role === role)
      .filter((u) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      });

  const filteredListings = listings.filter((l) => {
    if (universityFilter !== "All" && l.university !== universityFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return l.name.toLowerCase().includes(q) || (l.university || "").toLowerCase().includes(q);
  });

  const listingNameById = useMemo(() => {
    const map = {};
    listings.forEach((l) => { map[l.id] = l.name; });
    return map;
  }, [listings]);
  const listingUniversityById = useMemo(() => {
    const map = {};
    listings.forEach((l) => { map[l.id] = l.university; });
    return map;
  }, [listings]);

  const filteredInquiries = inquiries.filter((inq) => {
    if (universityFilter !== "All" && listingUniversityById[inq.listingId] !== universityFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return inq.name.toLowerCase().includes(q) || (listingNameById[inq.listingId] || "").toLowerCase().includes(q);
  });

 const personColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (u) => <RoleBadge role={u.role} /> },
    { key: "createdAt", label: "Joined", render: (u) => u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—" },
  ];

  // Owners table gets one extra column — a button that logs the admin
  // straight into that owner's dashboard to add/edit listings for them.
  const [impersonatingId, setImpersonatingId] = useState(null);
  const handleManageOwner = async (ownerId) => {
    setImpersonatingId(ownerId);
    try {
      const data = await api.impersonateUser(ownerId, token);
      onManageOwner(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setImpersonatingId(null);
    }
  };
  const ownerColumns = [
    ...personColumns,
    {
      key: "manage", label: "", render: (u) => (
        <button
          onClick={() => handleManageOwner(u.id)}
          disabled={impersonatingId === u.id}
          style={{ color: C.blue }}
          className="text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-60"
        >
          {impersonatingId === u.id ? "Opening…" : "Manage listings →"}
        </button>
      ),
    },
  ];

  // Clicking "View students" on a listing opens this instead of jumping tabs —
  // a focused popup of just that property's students, by name.
  const [rosterListing, setRosterListing] = useState(null);

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
          onClick={() => setRosterListing(l)}
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

          {tab !== "overview" && tab !== "emails" && tab !== "universities" && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative max-w-sm w-full sm:w-auto flex-1">
                <Search size={16} style={{ color: C.gray400 }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tab === "listings" ? "Search by property or university…" : tab === "inquiries" ? "Search by name or property…" : "Search by name or email…"}
                  style={{ borderColor: C.border }}
                  className="w-full border rounded-md pl-9 pr-3 py-2 text-sm outline-none"
                />
              </div>
              {(tab === "listings" || tab === "inquiries") && universities.length > 0 && (
                <select
                  aria-label="Filter by university"
                  value={universityFilter}
                  onChange={(e) => setUniversityFilter(e.target.value)}
                  style={{ borderColor: C.border, color: C.ink }}
                  className="border rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="All">All universities</option>
                  {universities.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              )}
            </div>
          )}

          {tab === "students" && (
            <DataTable columns={personColumns} rows={byRole("Student")} emptyLabel="No students found." />
          )}
          {tab === "parents" && (
            <DataTable columns={personColumns} rows={byRole("Parent")} emptyLabel="No parents found." />
          )}
         {tab === "owners" && (
            <DataTable columns={ownerColumns} rows={byRole("Owner")} emptyLabel="No property owners found." />
          )}
          {tab === "listings" && (
            <DataTable columns={listingColumns} rows={filteredListings} emptyLabel="No listings found." />
          )}
        {tab === "inquiries" && (
            <DataTable columns={inquiryColumns} rows={filteredInquiries} emptyLabel="No inquiries yet." />
          )}
          {tab === "universities" && (
            <div style={{ borderColor: C.border }} className="border rounded-lg bg-white p-4 sm:p-5">
              <h3 style={{ color: C.ink }} className="font-bold text-sm mb-1">Universities</h3>
              <p style={{ color: C.gray600 }} className="text-xs mb-4">
                The list of campuses BookInn operates in.
              </p>

              <div className="flex flex-wrap items-end gap-2 mb-2">
                <div className="flex-1 min-w-[220px]">
                  <p style={{ color: C.ink }} className="text-xs font-semibold mb-1.5">Add a university</p>
                  <input
                    value={newUniversityName}
                    onChange={(e) => setNewUniversityName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addUniversity()}
                    placeholder="e.g. University of Ghana"
                    style={{ borderColor: C.border }}
                    className="w-full border rounded-md px-3 py-2 text-sm outline-none"
                  />
                </div>
                <PrimaryButton onClick={addUniversity} disabled={universityBusy || !newUniversityName.trim()}>
                  {universityBusy ? "Adding…" : "Add"}
                </PrimaryButton>
              </div>
              {universityError && (
                <p style={{ color: "#b3261e" }} className="text-xs mb-3">{universityError}</p>
              )}

              <div className="flex flex-col divide-y mt-4" style={{ borderColor: C.border }}>
                {universities.length === 0 && (
                  <p style={{ color: C.gray600 }} className="text-sm py-4 text-center">No universities added yet.</p>
                )}
                {universities.map((u) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                    {editingUniversityId === u.id ? (
                      <>
                        <input
                          value={editingUniversityName}
                          onChange={(e) => setEditingUniversityName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveUniversityEdit(u);
                            if (e.key === "Escape") cancelUniversityEdit();
                          }}
                          autoFocus
                          style={{ borderColor: C.border }}
                          className="flex-1 min-w-0 border rounded-md px-2.5 py-1.5 text-sm outline-none"
                        />
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => saveUniversityEdit(u)}
                            disabled={renameBusy || !editingUniversityName.trim()}
                            style={{ color: C.blue }}
                            className="text-xs font-semibold hover:underline disabled:opacity-60"
                          >
                            {renameBusy ? "Saving…" : "Save"}
                          </button>
                          <button onClick={cancelUniversityEdit} style={{ color: C.gray600 }} className="text-xs font-semibold hover:underline">
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span style={{ color: C.ink }} className="text-sm font-medium truncate">{u.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <button onClick={() => startUniversityEdit(u)} title={`Edit ${u.name}`} aria-label={`Edit ${u.name}`}>
                            <Pencil size={14} color={C.gray600} className="cursor-pointer" />
                          </button>
                          <button
                            onClick={() => removeUniversity(u)}
                            disabled={deletingUniversityId === u.id}
                            style={{ color: "#b3261e" }}
                            className="text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-60"
                          >
                            {deletingUniversityId === u.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === "emails" && <PlatformAdminEmails token={token} />}
        </>
      )}

      {rosterListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.55)" }} onClick={() => setRosterListing(null)}>
          <div style={{ background: C.white }} className="rounded-lg max-w-md w-full p-6 relative max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setRosterListing(null)} className="absolute top-4 right-4" aria-label="Close"><X size={20} color={C.gray600} /></button>
            <h3 style={{ color: C.ink }} className="font-bold text-lg mb-1">Students — {rosterListing.name}</h3>
            {(() => {
              const roster = inquiries.filter((inq) => inq.listingId === rosterListing.id);
              if (!roster.length) {
                return <p style={{ color: C.gray600 }} className="text-sm mt-4">No students have inquired about this property yet.</p>;
              }
              const residents = roster.filter((s) => s.confirmedResident);
              const requests = roster.filter((s) => !s.confirmedResident);
              const onToggle = async (s) => {
                const updated = await api.setConfirmedResident(s.id, !s.confirmedResident, token);
                setInquiries((prev) => prev.map((i) => (i.id === s.id ? updated.inquiry : i)));
              };
              return (
                <StudentRosterLists residents={residents} requests={requests} onToggle={onToggle} />
              );
            })()}
          </div>
        </div>
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
  "forgot-password": "/forgot-password",
  "reset-password": "/reset-password",   // ?token=... appended separately, read from window.location.search
  "verify-email": "/verify-email",       // ?token=... appended separately, read from window.location.search
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
  const [ownerStats, setOwnerStats] = useState(null);
  const [ownerStatsLoading, setOwnerStatsLoading] = useState(false);
  const [ownerInquiries, setOwnerInquiries] = useState([]);
  const [ownerInquiriesLoading, setOwnerInquiriesLoading] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [myMaxListings, setMyMaxListings] = useState(1);
  // The editable list of campuses (managed from the platform admin dashboard's
  // Universities tab) — loaded once on mount and threaded down to signup, the
  // owner listing form, and the guest/student browse filters.
  const [universities, setUniversities] = useState([]);
  React.useEffect(() => {
    api.getUniversities().then((data) => setUniversities((data.universities || []).map((u) => u.name))).catch(() => {});
  }, []);

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
  // A logged-in student's feed is scoped server-side to their own university
  // (see university on their account, set at signup) — so cards, search and
  // favorites for that account never include another school's listings.
  const studentUniversity = user?.role === "Student" ? user?.university : null;
  React.useEffect(() => {
    if (view !== "home") return;
    setListingsLoading((prev) => (listings.length === 0 ? true : prev));
    api.getListings(studentUniversity)
      .then((data) => setListings(data.listings))
      .catch((err) => setListingsError(err.message))
      .finally(() => setListingsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, studentUniversity]);

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

  // Used by the owner dashboard's "Students" popup to mark/unmark a
  // confirmed resident — updates the cached ownerInquiries in place so the
  // popup and the "Confirmed residents" stat both reflect it immediately.
  const confirmResident = React.useCallback(async (inquiry) => {
    const { inquiry: updated } = await api.setConfirmedResident(inquiry.id, !inquiry.confirmedResident, token);
    setOwnerInquiries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    return updated;
  }, [token]);

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

  React.useEffect(() => {
    if (view === "admin" && user?.role === "Owner") refreshMyListings();
  }, [view, user?.role, refreshMyListings]);

  const toggleFav = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openListing = (listing) => {
    // Defense in depth — the student feed is already scoped server-side, so
    // this only matters for a stale card (e.g. a favorite saved before a
    // listing's university changed). Never let a student open another school's listing.
    if (studentUniversity && listing.university !== studentUniversity) return;
    setSelectedListing(listing);
    setView("detail");
    window.scrollTo?.(0, 0);
  };

  const refreshPublicListings = React.useCallback(() => {
    api.getListings(studentUniversity).then((data) => setListings(data.listings)).catch(() => {});
  }, [studentUniversity]);

  const addListing = async (l) => {
    const data = await api.addListing(l, token);
    if (data.user) setUser(data.user);
    refreshOwnerStats();
    refreshMyListings();
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

 const goToAdmin = () => { if (user) { setView("admin"); } else { setAuthRedirect("admin"); setView("login"); } };

  // "List your property" drops any signed-in Owner straight into their dashboard.
  const goToListProperty = () => {
    if (!user) { setAuthRedirect("admin"); setView("login"); return; }
    if (user.role === "Owner") { setView("admin"); }
    else { setView("pricing"); }
  };

  // Used by the platform admin's "Manage listings" button — signs the admin's
  // browser session in as that owner (their token, their dashboard) so listings
  // can be added/edited on their behalf, without needing their password or a
  // verified email. The admin's own separate platform-admin session is untouched.
  const handleManageOwner = (ownerUser, ownerToken) => {
    // Clear any previously-cached owner data first — otherwise impersonating
    // Owner B right after Owner A could briefly render A's stats/inquiries/
    // listings before B's own data loads in.
    setOwnerStats(null);
    setOwnerInquiries([]);
    setMyListings([]);
    setMyMaxListings(1);
    setUser(ownerUser);
    setToken(ownerToken);
    localStorage.setItem("bookinn_token", ownerToken);
    setView("admin");
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
    // Clear every piece of cached per-account data (owner stats, inquiries,
    // listings, subscription). Without this, if a different person signs
    // into a different account right after, AdminView could render for a
    // moment with the PREVIOUS owner's stats/inquiries/listings still in
    // state — a real data leak between accounts, not just a stale-UI
    // annoyance, since ownerInquiries contains other people's names/contacts.
    setOwnerStats(null);
    setOwnerInquiries([]);
    setMyListings([]);
    setMyMaxListings(1);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.blueMist, minHeight: "100vh" }} className="flex flex-col">
      <style>{FONT_IMPORT}</style>
      <Header
        view={view} setView={(v) => { setView(v); setMobileOpen(false); }} favCount={favorites.size}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
        user={user} onOwnerDashboardClick={goToAdmin} onListPropertyClick={goToListProperty} onSignOut={handleSignOut}
        platformAdminUser={platformAdminUser} onAdminSignOut={handleAdminSignOut}
      />

      <main className="flex-1">
        {view === "home" && (
          listingsError ? (
            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
              <p style={{ color: C.ink }} className="font-semibold mb-1">Couldn't load listings</p>
              <p style={{ color: C.gray600 }} className="text-sm">{listingsError} — is the backend server running? Try <code>npm run dev:all</code>.</p>
            </div>
          ) : (
            <HomeView favorites={favorites} toggleFav={toggleFav} onOpenListing={openListing} listings={listings} loading={listingsLoading} studentUniversity={studentUniversity} universities={universities} />
          )
        )}
       {view === "detail" && selectedListing && (
          <DetailView
            listing={selectedListing} onBack={() => setView("home")} isFav={favorites.has(selectedListing.id)} toggleFav={toggleFav}
            onReviewAdded={(updated) => {
              setSelectedListing(updated);
              setListings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            }}
            user={user}
            onRequireAuth={() => { setAuthRedirect("detail"); setView("login"); }}
          />
        )}
        {view === "saved" && <SavedView listings={listings} favorites={favorites} toggleFav={toggleFav} onOpenListing={openListing} />}
        {view === "pricing" && <PricingView onGoToDashboard={goToAdmin} />}
        {view === "how-it-works" && <HowBookingWorksView setView={setView} />}
        {view === "help-center" && <HelpCenterView setView={setView} />}
        {view === "safety-tips" && <SafetyTipsView setView={setView} />}
        {view === "account" && user && <AccountView user={user} favCount={favorites.size} setView={setView} />}
        {view === "admin" && (
          !user ? (
            <LoginView onAuthSuccess={handleAuthSuccess} onGuest={handleGuest} setView={setView} redirectNote="Sign in to manage your property listings." universities={universities} />
          ) : user.role !== "Owner" ? (
            <NotOwnerNotice user={user} setView={setView} />
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
              addListing={addListing} updateListing={updateListing} deleteListing={deleteListingHandler}
              onConfirmResident={confirmResident}
              universities={universities}
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
            universities={universities}
          />
        )}
        {view === "forgot-password" && <ForgotPasswordView setView={setView} />}
        {view === "reset-password" && (
          <ResetPasswordView
            token={new URLSearchParams(window.location.search).get("token")}
            onAuthSuccess={handleAuthSuccess}
            setView={setView}
          />
        )}
        {view === "verify-email" && (
          <VerifyEmailView
            token={new URLSearchParams(window.location.search).get("token")}
            setView={setView}
            onVerified={(updatedUser) => { if (user) setUser(updatedUser); }}
          />
        )}
        {view === "platform-admin" && (
          checkingAdminSession ? null : !platformAdminUser ? (
            <AdminLoginView onAuthSuccess={handleAdminAuthSuccess} />
          ) : (
            <PlatformAdminView token={platformAdminToken} onManageOwner={handleManageOwner} />
          )
        )}
      </main>

      {view !== "platform-admin" && (
        <Footer setView={setView} onOwnerDashboardClick={goToAdmin} onListPropertyClick={goToListProperty} />
      )}
    </div>
  );
}
