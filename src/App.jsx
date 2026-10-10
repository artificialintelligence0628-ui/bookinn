import React, { useState, useMemo, useRef, useEffect } from "react";
import { api } from "./api.js";
import PlatformAdminEmails from "./AdminEmails.jsx";
import GoogleAuthButton, { GOOGLE_CLIENT_ID, GoogleOneTap, GoogleSignInSheet, disableGoogleAutoSelect } from "./GoogleAuth.jsx";
import { PrivacyPolicyView, TermsView, CookiePolicyView } from "./LegalPages.jsx";
import { C } from "./theme.js";
import { SEO_PAGES, seoPagePath, findSeoPageByPath, matchesSeoPage } from "../shared/seoPages.js";
import { getListingCoords } from "./mapCoords.js";
import { Badge, PrimaryButton, GhostButton, AdminStatCard, DataTable, RoleBadge } from "./adminUI.jsx";
import {
  Search, MapPin, Star, Wifi, Droplet, Zap, UtensilsCrossed, ShieldCheck,
  Car, Heart, X, Menu, Phone, Mail, MessageCircle, PlayCircle, ChevronLeft,
  ChevronRight, SlidersHorizontal, Check, Building2, Users, TrendingUp,
  LayoutDashboard, Plus, LogIn, BedDouble, Bath, Sparkles, ArrowRight,
  Eye, EyeOff, Pencil, Trash2, BadgeCheck, ImagePlus, Flame, Gauge,
  ChevronDown, AlertTriangle, Lock, CreditCard, HelpCircle,
  Shirt, Table2, Armchair, Fan, Copy, Compass, BookOpen, Dumbbell,
  GraduationCap, UserCog, Inbox, Shield, RefreshCw, Wallet, Clock, LogOut, Briefcase, Share2,
  LayoutGrid, List as ListIcon, Map as MapIcon
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
// Beds per room where friends can book together (mirrors GROUP_CAPACITY in server/index.js).
const GROUP_CAPACITY = { "Two in a room": 2, "Three in a room": 3, "Four in a room": 4, "Six in a room": 6 };
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
  topSearch: true, homepagePlacement: true, priorityEnquiries: true,
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
      className="text-sm font-semibold hover:text-white transition px-1 text-left"
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
                style={{ color: view === "admin" ? C.white : "rgba(255,255,255,0.85)" }}
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
                  <LayoutDashboard size={16} /> {user?.role === "Agent" ? "Agent dashboard" : "Owner dashboard"}
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

          {isAdminPanel && platformAdminUser && (
            <button
              onClick={onAdminSignOut}
              style={{ borderColor: "rgba(255,255,255,0.4)", color: C.white }}
              className="md:hidden text-sm font-semibold px-3 py-1.5 rounded-md border flex items-center gap-1.5 active:bg-white/10"
            >
              <LogOut size={15} /> Sign out
            </button>
          )}

          {!isAdminPanel && (
            <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {!isAdminPanel && mobileOpen && (
          <div className="md:hidden pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            <div className="flex flex-col">
              {[
                { key: "home", label: "Explore stays", onClick: () => setView("home") },
                { key: "saved", label: `Saved${favCount ? ` (${favCount})` : ""}`, onClick: () => setView("saved") },
                { key: "list", label: "List your property", onClick: onListPropertyClick },
                { key: "dash", label: user?.role === "Agent" ? "Agent dashboard" : "Owner dashboard", onClick: onOwnerDashboardClick },
                ...(user ? [{ key: "account", label: "My account", onClick: () => setView("account") }] : []),
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { item.onClick(); setMobileOpen(false); }}
                  style={{
                    color: view === item.key ? C.white : "rgba(255,255,255,0.85)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                  className="w-full text-left text-base font-semibold py-3.5 border-b hover:text-white transition"
                >
                  {item.label}
                </button>
              ))}
              {user ? (
                <button
                  onClick={() => { onSignOut(); setMobileOpen(false); }}
                  style={{ color: "rgba(255,255,255,0.85)" }}
                  className="w-full text-left text-base font-semibold py-3.5 flex items-center gap-2 hover:text-white transition"
                >
                  <LogOut size={17} /> Sign out ({user.name.split(" ")[0]})
                </button>
              ) : (
                <button
                  onClick={() => { setView("login"); setMobileOpen(false); }}
                  style={{ background: C.white, color: C.navy }}
                  className="mt-3 w-full text-base font-semibold py-3 rounded-md flex items-center justify-center gap-2"
                >
                  <LogIn size={17} /> Sign in
                </button>
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
function Hero({ searchQuery, setSearchQuery, studentUniversity, landingPage = null }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.blue} 100%)` }} className="pb-16 pt-8 md:pt-12">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {studentUniversity && (
          <div className="flex items-center gap-2 mb-3">
            <span style={{ background: "rgba(255,255,255,0.15)", color: C.white }} className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
              <MapPin size={12} /> {studentUniversity}
            </span>
          </div>
        )}
        <h1 className="text-white text-2xl md:text-4xl font-extrabold mb-2">{landingPage ? landingPage.h1 : "Find student hostels and apartments near your campus in Ghana"}</h1>
        <p style={{ color: "rgba(255,255,255,0.85)" }} className="text-sm md:text-base mb-6">
          {landingPage
            ? landingPage.intro
            : studentUniversity
            ? `Compare hostels, self-contained units and shared apartments around ${studentUniversity} — contactable in one tap.`
            : "Compare hostels, self-contained units and shared apartments near university campuses across Ghana — contactable in one tap."}
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
const PRICE_PRESETS = [
  { label: "Under GH₵3,000", value: 3000 },
  { label: "Under GH₵5,000", value: 5000 },
  { label: "Under GH₵8,000", value: 8000 },
  { label: "Under GH₵12,000", value: 12000 },
  { label: "Any price", value: MAX_PRICE },
];

const DEFAULT_FILTERS = { priceMax: MAX_PRICE, roomTypes: [], propertyTypes: [], bath: "Any", kitchen: false, university: "Any", availableOnly: false };

function countActiveFilters(f) {
  return (f.priceMax !== MAX_PRICE ? 1 : 0) + f.roomTypes.length + f.propertyTypes.length
    + (f.bath !== "Any" ? 1 : 0) + (f.kitchen ? 1 : 0) + (f.university !== "Any" ? 1 : 0) + (f.availableOnly ? 1 : 0);
}

/* One-tap pill used for quick filters and for options inside the filter sheet */
function FilterChip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={active
        ? { background: C.blueLight, borderColor: C.blue, color: C.navy }
        : { background: C.white, borderColor: "#d5dde6", color: C.ink }}
      className="shrink-0 inline-flex items-center gap-1.5 border rounded-full text-sm font-medium px-3.5 h-9 whitespace-nowrap transition-colors hover:border-[#0071c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071c2]"
    >
      {active ? <Check size={14} color={C.blue} /> : Icon ? <Icon size={14} color={C.gray600} /> : null}
      {children}
    </button>
  );
}

function FilterSection({ title, hint, children }) {
  return (
    <div style={{ borderColor: C.border }} className="py-5 border-b last:border-b-0">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h4 style={{ color: C.ink }} className="font-semibold text-sm">{title}</h4>
        {hint && <span style={{ color: C.gray600 }} className="text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* "More filters" panel — bottom sheet on phones, centred dialog on desktop */
function FilterSheet({ open, onClose, filters, setFilters, resultCount, universities, showUniversityFilter }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const toggleIn = (key, val) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
  const active = countActiveFilters(filters);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="More filters">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div style={{ borderColor: C.border }} className="flex items-center justify-between px-5 h-14 border-b shrink-0">
          <h3 style={{ color: C.ink }} className="font-bold text-base">Filters</h3>
          <button type="button" onClick={onClose} aria-label="Close filters" className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={18} color={C.ink} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 flex-1">
          {showUniversityFilter && universities?.length > 0 && (
            <FilterSection title="University">
              <select
                aria-label="Filter by university"
                value={filters.university}
                onChange={(e) => setFilters((f) => ({ ...f, university: e.target.value }))}
                style={{ borderColor: "#d5dde6", color: C.ink }}
                className="w-full border rounded-lg text-sm px-3 h-11 bg-white"
              >
                <option value="Any">All universities</option>
                {universities.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </FilterSection>
          )}

          <FilterSection title="Budget" hint={filters.priceMax === MAX_PRICE ? "Any price" : `Up to GH₵${filters.priceMax.toLocaleString()}`}>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRICE_PRESETS.map((p) => (
                <FilterChip key={p.value} active={filters.priceMax === p.value} onClick={() => setFilters((f) => ({ ...f, priceMax: p.value }))}>
                  {p.label}
                </FilterChip>
              ))}
            </div>
            <input
              type="range" min="500" max={MAX_PRICE} step="250"
              aria-label="Maximum price"
              value={filters.priceMax}
              onChange={(e) => setFilters((f) => ({ ...f, priceMax: Number(e.target.value) }))}
              className="w-full"
              style={{ accentColor: C.blue }}
            />
            <p style={{ color: C.gray600 }} className="text-xs mt-2">Prices are per semester, per both semesters, or per year, as shown on each listing.</p>
          </FilterSection>

          <FilterSection title="Property type">
            <div className="flex flex-wrap gap-2">
              {["Hostel", "Apartment"].map((t) => (
                <FilterChip key={t} active={filters.propertyTypes.includes(t)} onClick={() => toggleIn("propertyTypes", t)}>{t}</FilterChip>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Room type">
            <div className="flex flex-wrap gap-2">
              {ALL_ROOM_TYPES.map((t) => (
                <FilterChip key={t} active={filters.roomTypes.includes(t)} onClick={() => toggleIn("roomTypes", t)}>{t}</FilterChip>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Bathroom">
            <div className="flex flex-wrap gap-2">
              {["Any", "Ensuite bath", "Shared bath"].map((b) => (
                <FilterChip key={b} active={filters.bath === b} onClick={() => setFilters((f) => ({ ...f, bath: b }))}>{b}</FilterChip>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Other">
            <div className="flex flex-wrap gap-2">
              <FilterChip active={filters.availableOnly} onClick={() => setFilters((f) => ({ ...f, availableOnly: !f.availableOnly }))}>Available now</FilterChip>
              <FilterChip active={filters.kitchen} onClick={() => setFilters((f) => ({ ...f, kitchen: !f.kitchen }))}>Shared kitchen</FilterChip>
            </div>
          </FilterSection>
        </div>

        <div style={{ borderColor: C.border }} className="flex items-center justify-between gap-3 px-5 py-3.5 border-t shrink-0 bg-white sm:rounded-b-2xl">
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            disabled={active === 0}
            style={{ color: active ? C.ink : C.gray400 }}
            className="text-sm font-semibold underline underline-offset-2 disabled:no-underline disabled:cursor-default"
          >
            Clear all
          </button>
          <PrimaryButton onClick={onClose}>
            Show {resultCount} propert{resultCount === 1 ? "y" : "ies"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* Quick chips + "More filters" — scrolls sideways on phones */
function FilterBar({ filters, setFilters, resultCount, universities, showUniversityFilter }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);
  const activeCount = countActiveFilters(filters);

  const toggleType = (t) =>
    setFilters((f) => ({ ...f, propertyTypes: f.propertyTypes.includes(t) ? f.propertyTypes.filter((x) => x !== t) : [...f.propertyTypes, t] }));

  return (
    <>
      <div className="flex items-center gap-2 mb-5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          style={{ borderColor: activeCount ? C.navy : "#d5dde6", color: C.ink }}
          className="shrink-0 inline-flex items-center gap-2 border rounded-full text-sm font-semibold px-4 h-9 bg-white hover:border-[#0071c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071c2]"
        >
          <SlidersHorizontal size={15} color={C.navy} />
          More filters
          {activeCount > 0 && (
            <span style={{ background: C.navy }} className="text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center">{activeCount}</span>
          )}
        </button>

        <span style={{ background: C.border }} className="shrink-0 w-px h-6 mx-1" aria-hidden="true" />

        <FilterChip active={filters.availableOnly} onClick={() => setFilters((f) => ({ ...f, availableOnly: !f.availableOnly }))}>Available now</FilterChip>
        <FilterChip active={filters.propertyTypes.includes("Hostel")} onClick={() => toggleType("Hostel")} icon={BedDouble}>Hostel</FilterChip>
        <FilterChip active={filters.propertyTypes.includes("Apartment")} onClick={() => toggleType("Apartment")} icon={Building2}>Apartment</FilterChip>
        <FilterChip active={filters.bath === "Ensuite bath"} onClick={() => setFilters((f) => ({ ...f, bath: f.bath === "Ensuite bath" ? "Any" : "Ensuite bath" }))} icon={Bath}>Ensuite</FilterChip>
        <FilterChip active={filters.kitchen} onClick={() => setFilters((f) => ({ ...f, kitchen: !f.kitchen }))} icon={UtensilsCrossed}>Shared kitchen</FilterChip>

        {activeCount > 0 && (
          <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} style={{ color: C.blue }} className="shrink-0 text-sm font-semibold px-2 h-9 hover:underline">
            Clear all
          </button>
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={closeSheet}
        filters={filters}
        setFilters={setFilters}
        resultCount={resultCount}
        universities={universities}
        showUniversityFilter={showUniversityFilter}
      />
    </>
  );
}

// Leaflet is only fetched when someone opens the map.
const ListingsMap = React.lazy(() => import("./ListingsMap.jsx"));
const LocationPicker = React.lazy(() => import("./LocationPicker.jsx"));

/* Grid / list / map switch */
function ViewToggle({ view, setView }) {
  const btn = (key, Icon, label) => (
    <button
      type="button"
      onClick={() => setView(key)}
      aria-pressed={view === key}
      aria-label={label}
      title={label}
      style={view === key ? { background: C.blueLight, color: C.navy } : { color: C.gray600 }}
      className="w-9 h-9 rounded-md flex items-center justify-center transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071c2]"
    >
      <Icon size={17} />
    </button>
  );
  return (
    <div style={{ borderColor: "#d5dde6" }} className="border rounded-lg bg-white p-0.5 flex">
      {btn("grid", LayoutGrid, "Grid view")}
      {btn("list", ListIcon, "List view")}
      {btn("map", MapIcon, "Map view")}
    </div>
  );
}

/* ---------------------------------------------------------
   LISTING CARD
--------------------------------------------------------- */
// The "New listing" placeholder (saved when an owner/agent leaves the travel
// time/distance blank) only shows for the first 7 days after a listing is
// created, then disappears. A real distance ("5 min walk to campus") always shows.
const NEW_LISTING_DAYS = 7;
function distanceLabel(listing) {
  const d = (listing?.distance || "").trim();
  if (d && d !== "New listing") return d;
  if (!listing?.createdAt) return d;
  const ageMs = Date.now() - new Date(listing.createdAt).getTime();
  return ageMs < NEW_LISTING_DAYS * 24 * 60 * 60 * 1000 ? "New listing" : "";
}

function ListingCard({ listing, isFav, toggleFav, onOpen, vertical = false }) {
  return (
    <div style={{ borderColor: C.border }} className={`border rounded-lg overflow-hidden bg-white hover:shadow-md transition flex flex-col ${vertical ? "h-full" : "sm:flex-row"}`}>
      <div className={`relative shrink-0 ${vertical ? "" : "sm:w-56"}`}>
        <img src={img(listing.image, 500)} alt={listing.name} loading="lazy" className={`w-full h-44 object-cover ${vertical ? "" : "sm:h-full"}`} />
               {(listing.featured || listing.listedByAgent) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {listing.featured && (
              <Badge tone="yellow"><span className="flex items-center gap-1"><Sparkles size={12} /> Featured</span></Badge>
            )}
            {listing.isPublic && (
              <Badge tone="purple"><span className="flex items-center gap-1"><Building2 size={12} /> {listing.publicKind === "Hall" ? "Public Hall" : "Public Hostel"}</span></Badge>
            )}
            {listing.listedByAgent && (
              listing.officialAgent
                ? <Badge tone="green"><span className="flex items-center gap-1"><BadgeCheck size={12} /> Official BookInn Agent</span></Badge>
                : <Badge tone="blue"><span className="flex items-center gap-1"><Briefcase size={12} /> Agent listing</span></Badge>
            )}
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
            <p style={{ color: C.gray600 }} className="text-xs mt-1 flex items-start gap-1"><MapPin size={12} className="shrink-0 mt-0.5" /> <span>{listing.university}{distanceLabel(listing) && ` · ${distanceLabel(listing)}`}</span></p>
          </div>
          {(listing.reviewCount ?? (listing.reviews?.length || 0)) > 0
            ? <ScoreBadge score={listing.rating} size="sm" />
            : <Badge tone="blue">New</Badge>}
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
            {listing.hidePrice ? (
              <p style={{ color: C.ink }} className="text-lg font-extrabold">Contact for price</p>
            ) : (
              <p style={{ color: C.ink }} className="text-xl font-extrabold">
                {listing.roomOptions?.length > 1 && <span className="text-sm font-medium" style={{ color: C.gray600 }}>From </span>}
                GH₵{listing.price.toLocaleString()}<span className="text-sm font-medium" style={{ color: C.gray600 }}> · {listing.pricingPeriod || "Per semester"}</span>
              </p>
            )}
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
function HomeView({ favorites, toggleFav, onOpenListing, listings: allListings, loading, studentUniversity, universities, landingPage = null, goTo }) {
  // On a campus/neighbourhood landing page, show just the matching listings. If none
  // match yet, fall back to everything so the page is never an empty dead end.
  const landingMatches = useMemo(
    () => (landingPage ? allListings.filter((l) => matchesSeoPage(l, landingPage)) : []),
    [allListings, landingPage]
  );
  const landingEmpty = !!landingPage && !loading && landingMatches.length === 0;
  const listings = landingPage && !landingEmpty ? landingMatches : allListings;
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState("recommended");
  const [view, setViewState] = useState(() => {
    try { const v = localStorage.getItem("bookinn:view"); return v === "list" || v === "map" ? v : "grid"; } catch { return "grid"; }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const listColRef = useRef(null);
  const setView = (v) => {
    setViewState(v);
    try { localStorage.setItem("bookinn:view", v); } catch { /* storage unavailable */ }
  };

  const filtered = useMemo(() => {
    let out = listings.filter((l) => {
      if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (!l.hidePrice && l.price > filters.priceMax) return false; // "Contact for price" listings aren't filtered by budget
      if (filters.roomTypes.length) {
        const types = (l.roomOptions || []).map((r) => r.roomType);
        const hasMatch = types.length ? types.some((t) => filters.roomTypes.includes(t)) : filters.roomTypes.includes(l.roomType);
        if (!hasMatch) return false;
      }
      if (filters.propertyTypes.length && !filters.propertyTypes.includes(l.type)) return false;
      if (filters.bath !== "Any" && l.bath !== filters.bath) return false;
      if (filters.kitchen && !l.kitchen) return false;
      if (filters.availableOnly && l.availability === "Fully booked") return false;
      // Students are already scoped to their own university server-side, so
      // this optional dropdown is only meaningful (and only shown) for
      // guests/parents browsing every campus at once.
      if (!studentUniversity && filters.university !== "Any" && l.university !== filters.university) return false;
      return true;
    });
    // "Contact for price" listings have no price to compare, so they always go last.
    if (sort === "price-asc" || sort === "price-desc") {
      const dir = sort === "price-asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        if (a.hidePrice !== b.hidePrice) return a.hidePrice ? 1 : -1;
        if (a.hidePrice) return 0;
        return (a.price - b.price) * dir;
      });
    }
    if (sort === "rating") out = [...out].sort((a, b) => b.rating - a.rating);
    // Keep fully-booked places at the bottom of the default ordering so people
    // see rooms they can actually book first.
    if (sort === "recommended") {
      out = [...out.filter((l) => l.availability !== "Fully booked"), ...out.filter((l) => l.availability === "Fully booked")];
    }
    return out;
  }, [listings, searchQuery, filters, sort, studentUniversity]);

  // True "homepage" state — no search or filters applied yet. This is where a
  // Featured-plan listing's homepagePlacement actually earns its keep: a dedicated
  // strip above the regular results, instead of just being a flag nothing reads.
  const isDefaultView = !searchQuery && filters.priceMax === MAX_PRICE && filters.roomTypes.length === 0
    && filters.propertyTypes.length === 0 && filters.bath === "Any" && !filters.kitchen && filters.university === "Any" && !filters.availableOnly;
  const featuredListings = useMemo(
    () => (isDefaultView ? listings.filter((l) => l.homepagePlacement) : []),
    [isDefaultView, listings]
  );

  const located = useMemo(() => filtered.filter((l) => getListingCoords(l)), [filtered]);
  const hasApproxPins = useMemo(() => located.some((l) => getListingCoords(l)?.approx), [located]);
  const selectedListing = filtered.find((l) => l.id === selectedId) || null;

  // Picking a pin scrolls the matching card into view in the side list.
  useEffect(() => {
    if (view !== "map" || selectedId == null || !listColRef.current) return;
    // On phones the map is pinned above the list and shows its own preview card,
    // so only auto-scroll the side list on wider screens.
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const el = listColRef.current.querySelector(`[data-listing-id="${selectedId}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, view]);

  return (
    <div>
      <Hero searchQuery={searchQuery} setSearchQuery={setSearchQuery} studentUniversity={studentUniversity} landingPage={landingPage} />

      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        {studentUniversity && (
          <div style={{ background: C.blueMist, borderColor: C.border, color: C.gray600 }} className="border rounded-md px-3.5 py-2 text-xs font-medium mb-4 flex items-center gap-1.5">
            <MapPin size={13} color={C.blue} /> Showing hostels &amp; apartments near <span style={{ color: C.ink }} className="font-semibold">{studentUniversity}</span> only.
          </div>
        )}
        {!loading && featuredListings.length > 0 && (
          <div className="mb-6">
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

        {landingEmpty && (
          <div style={{ background: C.blueMist, borderColor: C.border, color: C.gray600 }} className="border rounded-md px-3.5 py-2.5 text-sm mb-4">
            No listings near <span style={{ color: C.ink }} className="font-semibold">{landingPage.short}</span> yet — here are stays on BookInn you can browse in the meantime. Property owner? List yours for free from your dashboard.
          </div>
        )}
        <FilterBar filters={filters} setFilters={setFilters} resultCount={filtered.length} universities={universities} showUniversityFilter={!studentUniversity} />

        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 style={{ color: C.ink }} className="font-bold text-lg">{filtered.length} place{filtered.length === 1 ? "" : "s"} to stay</h2>
            <div className="flex items-center gap-2">
              <select
                aria-label="Sort listings"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ borderColor: "#d5dde6", color: C.ink }}
                className="border rounded-lg text-sm px-3 h-10 bg-white"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
              <ViewToggle view={view} setView={setView} />
            </div>
          </div>

          {loading && (
            <div style={{ borderColor: C.border }} className="border rounded-lg p-10 text-center bg-white">
              <p style={{ color: C.gray600 }} className="text-sm">Loading listings…</p>
            </div>
          )}
          {!loading && filtered.length > 0 && view !== "map" && (
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-4"}>
              {filtered.map((l) => (
                <ListingCard key={l.id} vertical={view === "grid"} listing={l} isFav={favorites.has(l.id)} toggleFav={toggleFav} onOpen={onOpenListing} />
              ))}
            </div>
          )}
          {!loading && filtered.length > 0 && view === "map" && (
            <div>
              {hasApproxPins && (
                <p style={{ background: C.blueMist, borderColor: C.border, color: C.gray600 }} className="border rounded-md px-3 py-2 text-xs mb-3 flex items-start gap-1.5">
                  <MapPin size={13} color={C.blue} className="shrink-0 mt-0.5" />
                  <span>Pin positions are approximate and sit around each campus. Exact locations appear once a listing adds them.</span>
                </p>
              )}
              <div className="flex flex-col md:grid md:grid-cols-[minmax(0,400px)_1fr] gap-4">
                <div ref={listColRef} className="flex flex-col gap-4 mt-4 md:mt-0 md:max-h-[calc(100vh-9rem)] md:overflow-y-auto pr-1 pb-1">
                  {filtered.map((l) => (
                    <div
                      key={l.id}
                      data-listing-id={l.id}
                      onMouseEnter={() => setHoverId(l.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={() => setSelectedId(l.id)}
                      className={`rounded-lg transition-shadow ${selectedId === l.id ? "ring-2 ring-[#0071c2]" : ""}`}
                    >
                      <ListingCard vertical listing={l} isFav={favorites.has(l.id)} toggleFav={toggleFav} onOpen={onOpenListing} />
                    </div>
                  ))}
                </div>

                <div style={{ borderColor: C.border }} className="relative border rounded-lg overflow-hidden order-first md:order-none sticky top-2 z-20 h-[42vh] min-h-[280px] md:h-[calc(100vh-9rem)] md:top-4 md:z-auto">
                  <React.Suspense fallback={<div style={{ color: C.gray600 }} className="w-full h-full flex items-center justify-center text-sm bg-white">Loading map…</div>}>
                    <ListingsMap listings={filtered} selectedId={selectedId} hoverId={hoverId} onSelect={setSelectedId} />
                  </React.Suspense>

                  {located.length < filtered.length && (
                    <div style={{ color: C.gray600 }} className="absolute top-3 left-3 z-[1000] bg-white/95 rounded-md shadow px-2.5 py-1.5 text-xs">
                      {filtered.length - located.length} without a map location
                    </div>
                  )}

                  {/* Phone: tapping a pin shows a compact preview over the pinned map */}
                  {selectedListing && (
                    <div className="md:hidden absolute left-3 right-3 bottom-3 z-[1000] bg-white rounded-xl shadow-xl flex overflow-hidden">
                      <img src={img(selectedListing.image, 300)} alt="" className="w-28 h-28 object-cover shrink-0" />
                      <div className="p-3 flex-1 min-w-0 flex flex-col">
                        <p style={{ color: C.ink }} className="font-bold text-sm truncate">{selectedListing.name}</p>
                        <p style={{ color: C.gray600 }} className="text-xs truncate">{selectedListing.university}</p>
                        <p style={{ color: C.ink }} className="font-extrabold text-base mt-auto">
                          {selectedListing.hidePrice ? "Contact for price" : (
                            <>
                              GH₵{selectedListing.price.toLocaleString()}
                              <span style={{ color: C.gray600 }} className="text-xs font-medium"> · {selectedListing.pricingPeriod || "Per semester"}</span>
                            </>
                          )}
                        </p>
                        <button type="button" onClick={() => onOpenListing(selectedListing)} style={{ color: C.blue }} className="text-left text-sm font-semibold">View room</button>
                      </div>
                      <button type="button" onClick={() => setSelectedId(null)} aria-label="Close preview" className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                        <X size={14} color={C.ink} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ borderColor: C.border }} className="border rounded-lg p-10 text-center bg-white">
              <p style={{ color: C.ink }} className="font-semibold mb-1">No properties match those filters</p>
              <p style={{ color: C.gray600 }} className="text-sm">Try widening your price range or clearing a filter.</p>
            </div>
          )}
        </div>

        {landingPage && (
          <div className="mt-10">
            <h2 style={{ color: C.ink }} className="font-bold text-base mb-3">More student accommodation searches</h2>
            <div className="flex flex-wrap gap-2">
              {SEO_PAGES.filter((p) => p.slug !== landingPage.slug).map((p) => (
                <a
                  key={p.slug}
                  href={seoPagePath(p)}
                  onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); goTo(`landing:${p.slug}`); window.scrollTo(0, 0); }}
                  style={{ borderColor: C.border, color: C.blue }}
                  className="border rounded-full px-3 py-1 text-xs font-semibold bg-white hover:bg-gray-50 transition"
                >
                  {p.short} hostels
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   CONTACT / BOOKING MODAL
--------------------------------------------------------- */

// Group leaders keep a secret token in their own browser so they can come back later
// and send the owner one combined request. Wrapped in try/catch: storage can be
// blocked (private mode, in-app browsers).
const SAVED_GROUPS_KEY = "bookinn_groups";
function loadSavedGroups() {
  try { return JSON.parse(localStorage.getItem(SAVED_GROUPS_KEY) || "[]"); } catch { return []; }
}
function saveGroupLocally(g) {
  try {
    const list = loadSavedGroups().filter((x) => x.code !== g.code);
    list.push(g);
    localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(list.slice(-20)));
  } catch { /* storage unavailable — leader still sees the code on screen */ }
}

function ContactModal({ listing, roomType, onClose, initialGroupCode = "" }) {
   const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sentWaLink, setSentWaLink] = useState("");
  // Roommate group: "none" (just me), "create" (start one), or "join" (friend's code).
  const groupCapacity = GROUP_CAPACITY[roomType] || 0;
  const [groupMode, setGroupMode] = useState("none");
  const [groupCode, setGroupCode] = useState("");
  const [groupInfo, setGroupInfo] = useState(null); // verified summary of the code being joined
  const [groupChecking, setGroupChecking] = useState(false);
  const [groupResult, setGroupResult] = useState(null); // group returned by the server after sending
  const [leaderToken, setLeaderToken] = useState(""); // set only for the student who started the group
  const [sendingGroup, setSendingGroup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reopenContact, setReopenContact] = useState(""); // phone or email used when the group was started
  const [reopening, setReopening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", moveIn: "",
   message: `Hi, I saw ${listing.name}${roomType ? ` (${roomType})` : ""} on BookInn and I'm interested. Is it still available?`,
  });
  const ownerWhatsappDigits = toWhatsappDigits(listing.ownerWhatsapp);

  // Reopen where the student left off. A group this device already knows about
  // (leader or member) goes straight to its panel; a shared link (?group=CODE) with
  // no saved copy opens the "join" step with the code filled in and checked.
  useEffect(() => {
    const saved = loadSavedGroups().find((g) =>
      g.listingId === listing.id && g.roomType === roomType && (!initialGroupCode || g.code === initialGroupCode));
    if (saved) {
      setLeaderToken(saved.token || "");
      setGroupMode(saved.token ? "create" : "join");
      setGroupResult({ code: saved.code, capacity: saved.capacity, joined: 1, roomType, listingId: listing.id });
      setSent(true);
      api.getBookingGroup(saved.code)
        .then(({ group }) => setGroupResult((g) => (g ? { ...g, joined: group.joined, capacity: group.capacity } : g)))
        .catch(() => {});
      return;
    }
    if (initialGroupCode && GROUP_CAPACITY[roomType]) {
      setGroupMode("join");
      setGroupCode(initialGroupCode);
      api.getBookingGroup(initialGroupCode)
        .then(({ group }) => {
          if (group.listingId !== listing.id || group.roomType !== roomType) setSendError("That group code is for a different room.");
          else if (group.joined >= group.capacity) setSendError("This group is already full.");
          else setGroupInfo(group);
        })
        .catch((err) => setSendError(err.message));
    }
  }, [listing.id, roomType, initialGroupCode]);
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
      const payload = {
        listingId: listing.id, name: form.name, phone: form.phone, email: form.email,
        moveIn: form.moveIn,
        message: form.message,
        roomType,
      };
      if (groupMode === "create") payload.group = { action: "create" };
      if (groupMode === "join") payload.group = { action: "join", code: groupCode };
      const result = await api.sendInquiry(payload);
      const grp = result?.group || null;
      setGroupResult(grp);
      if (grp) {
        // Group requests do NOT message the owner one by one. Members just join;
        // the leader sends a single combined message once everyone is in.
        if (groupMode === "create" && grp.leaderToken) {
          setLeaderToken(grp.leaderToken);
          saveGroupLocally({ code: grp.code, token: grp.leaderToken, listingId: listing.id, roomType, capacity: grp.capacity });
        }
        if (groupMode === "join") {
          saveGroupLocally({ code: grp.code, token: "", listingId: listing.id, roomType, capacity: grp.capacity });
        }
        setSent(true);
        return;
      }
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

  const checkGroupCode = async () => {
    setSendError("");
    setGroupInfo(null);
    if (!groupCode.trim()) { setSendError("Enter the group code your friend shared."); return; }
    setGroupChecking(true);
    try {
      const { group } = await api.getBookingGroup(groupCode.trim());
      if (group.listingId !== listing.id || group.roomType !== roomType) {
        setSendError(`That code is for a different room. It's for "${group.roomType}" at another listing or room type.`);
      } else if (group.joined >= group.capacity) {
        setSendError("This group is already full.");
      } else {
        setGroupInfo(group);
      }
    } catch (err) {
      setSendError(err.message);
    } finally {
      setGroupChecking(false);
    }
  };

  // Leader on a new phone / cleared browser: code + the phone or email they used.
  const reopenGroup = async () => {
    setSendError("");
    if (!groupCode.trim() || !reopenContact.trim()) { setSendError("Enter your group code and the phone number or email you used."); return; }
    setReopening(true);
    try {
      const isEmail = reopenContact.includes("@");
      const { leaderToken: token, group } = await api.recoverGroup(
        groupCode.trim(), isEmail ? { email: reopenContact.trim() } : { phone: reopenContact.trim() });
      if (group.listingId !== listing.id || group.roomType !== roomType) {
        setSendError("That group is for a different room. Open that room's listing and try again.");
        return;
      }
      saveGroupLocally({ code: group.code, token, listingId: listing.id, roomType, capacity: group.capacity });
      setLeaderToken(token);
      setGroupResult({ code: group.code, capacity: group.capacity, joined: group.joined, roomType, listingId: listing.id });
      setGroupMode("create");
      setSent(true);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setReopening(false);
    }
  };

  // Re-reads how many students have joined so the leader knows when everyone is in.
  const refreshGroup = async () => {
    if (!groupResult) return;
    setSendError("");
    setRefreshing(true);
    try {
      const { group } = await api.getBookingGroup(groupResult.code);
      setGroupResult((g) => ({ ...g, joined: group.joined, capacity: group.capacity }));
    } catch (err) {
      setSendError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // The leader sends the owner ONE WhatsApp message listing every student in the
  // group, so the owner sees a single clear request instead of several separate ones.
  const sendGroupToOwner = async () => {
    if (!ownerWhatsappDigits) { setSendError("This owner hasn't added a WhatsApp number yet."); return; }
    setSendError("");
    setSendingGroup(true);
    // Same popup-blocker approach as the single-request flow above.
    const waTab = !isMobile ? window.open("", "_blank") : null;
    try {
      const { group } = await api.getGroupMembers(groupResult.code, leaderToken, true);
      setGroupResult((g) => ({ ...g, joined: group.members.length, capacity: group.capacity }));
      const lines = group.members.map((m, i) =>
        `${i + 1}. ${m.name}${i === 0 ? " (group leader)" : ""}${m.phone ? ` — ${m.phone}` : ""}${m.email ? ` — ${m.email}` : ""}`);
      const moveIns = [...new Set(group.members.map((m) => m.moveIn).filter(Boolean))];
      const text = [
        group.sentCount > 1
          ? `UPDATED BookInn GROUP booking request (#${group.sentCount}) for ${listing.name} — ${roomType}`
          : `New BookInn GROUP booking request for ${listing.name} — ${roomType}`,
        group.sentCount > 1 ? "This replaces my earlier message — more students have joined." : null,
        `Group ${group.code}: ${group.members.length} of ${group.capacity} students want to share one room`,
        "",
        ...lines,
        "",
        moveIns.length ? `Move-in: ${moveIns.join(", ")}` : null,
        "Please place these students together.",
      ].filter((x) => x !== null).join("\n");
      const link = `https://wa.me/${ownerWhatsappDigits}?text=${encodeURIComponent(text)}`;
      setSentWaLink(link);
      if (isMobile) window.location.href = link;
      else if (waTab && !waTab.closed) waTab.location.href = link;
      else window.open(link, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (waTab) waTab.close();
      setSendError(err.message);
    } finally {
      setSendingGroup(false);
    }
  };

  const groupLinkUrl = groupResult ? `${window.location.origin}/?group=${groupResult.code}` : "";
  const groupShareLink = groupResult
    ? `https://wa.me/?text=${encodeURIComponent(
        `Join my room group on BookInn! ${listing.name} — ${roomType}.\nTap to join: ${groupLinkUrl}\n(Group code: ${groupResult.code})`
      )}`
    : "";
  const copyGroupLink = async () => {
    try { await navigator.clipboard.writeText(groupLinkUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setSendError(`Copy this link: ${groupLinkUrl}`); }
  };

  const sendRequest = () => {
    if (!form.name) { setSendError("Enter your name so the property manager knows who's asking."); return; }
    if (!ownerWhatsappDigits && !mailLink) { setSendError("This owner hasn't added a WhatsApp number or email yet."); return; }
    if (groupMode === "join" && !groupInfo) { setSendError("Check your group code first, or choose \"Just me\"."); return; }
    if (groupMode !== "none" && !form.phone && !form.email) { setSendError("Add a phone number or email so your roommates and the owner can reach you."); return; }
    setSendError("");
    setBusy(true);
    // Open the tab now, synchronously inside this click handler, so the
    // browser's popup blocker treats it as user-initiated. It sits on
    // about:blank until submitBookingRequest redirects it later.
    // Skipped on mobile — see the comment above.
    const waTab = (ownerWhatsappDigits && !isMobile && groupMode === "none") ? window.open("", "_blank") : null;
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
              {leaderToken
                ? "Your group is ready. Once your friends have joined with your code, send ONE combined request to the owner."
                : groupResult
                  ? `You've joined group ${groupResult.code}. The group leader will send one combined request to the owner for all of you.`
                  : "Inquiry sent — we've also opened WhatsApp with your details ready to send to the owner."}
            </p>
            {groupResult && (
              <div style={{ background: C.white, borderColor: C.border }} className="border rounded-md p-3 mt-3 text-left">
                <p style={{ color: C.gray600 }} className="text-xs">Group code</p>
                <p style={{ color: C.navy }} className="text-2xl font-extrabold tracking-widest">{groupResult.code}</p>
                <p style={{ color: C.gray600 }} className="text-xs mt-1">
                  {groupResult.joined} of {groupResult.capacity} students have joined.
                  {groupResult.joined >= groupResult.capacity ? " The group is full." : ""}
                </p>
                {!leaderToken && (
                  <p style={{ color: C.gray600 }} className="text-xs mt-2">
                    Come back to this room's page any time to see who has joined. Your group leader sends the combined request to the owner.
                  </p>
                )}
                {leaderToken && (
                  <div className="flex flex-col gap-2 mt-3">
                    {groupResult.joined < groupResult.capacity && (
                      <a href={groupShareLink} target="_blank" rel="noopener noreferrer"
                        style={{ borderColor: C.border, color: C.navy }}
                        className="border text-sm font-semibold py-2 rounded-md flex items-center justify-center gap-1.5">
                        <MessageCircle size={16} /> Share code with friends
                      </a>
                    )}
                    <button type="button" onClick={copyGroupLink}
                      style={{ borderColor: C.border, color: C.navy }}
                      className="border text-sm font-semibold py-2 rounded-md bg-white flex items-center justify-center gap-1.5">
                      {copied ? "Link copied ✓" : "Copy group link"}
                    </button>
                    <button type="button" onClick={refreshGroup} disabled={refreshing}
                      style={{ borderColor: C.border, color: C.navy }}
                      className="border text-sm font-semibold py-2 rounded-md bg-white disabled:opacity-60 flex items-center justify-center gap-1.5">
                      <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Check who has joined
                    </button>
                    <PrimaryButton full onClick={sendGroupToOwner} disabled={sendingGroup}>
                      {sendingGroup ? "Opening WhatsApp…" : `Send group request to owner (${groupResult.joined} student${groupResult.joined === 1 ? "" : "s"})`}
                    </PrimaryButton>
                   
                    {sendError && <p style={{ color: "#b3261e" }} className="text-xs">{sendError}</p>}
                  </div>
                )}
              </div>
            )}
            {sentWaLink && (
              <a
                href={sentWaLink}
                target={isMobile ? undefined : "_blank"}
                rel="noopener noreferrer"
                style={{ background: C.blue }}
                className="mt-3 inline-flex items-center justify-center gap-1.5 text-white text-sm font-semibold py-2 px-4 rounded-md"
              >
                <MessageCircle size={16} /> {leaderToken ? "WhatsApp didn't open? Tap here to message the owner" : "WhatsApp didn't open? Tap here"}
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
                {groupMode === "none"
                  ? "Send your request — it goes straight to the owner's WhatsApp automatically."
                  : groupMode === "create"
                    ? "Create your group first. After your friends join, you'll send the owner one combined request."
                    : groupMode === "join"
                      ? "Join your friend's group. Your group leader will message the owner for all of you."
                      : "Get back into a group you started."}
              </p>
              <div className="flex flex-col gap-2.5">
                {groupMode !== "reopen" && (<>
                <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2" />
                <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
                <input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
                <div className="relative">
                  <input type="date" value={form.moveIn} onChange={(e) => setForm({ ...form, moveIn: e.target.value })}
                    aria-label="Move-in date"
                    style={{
                      borderColor: C.border, color: C.ink, background: "#fff",
                      WebkitAppearance: "none", appearance: "none",
                      display: "block", width: "100%", minHeight: 38, textAlign: "left",
                    }}
                    className="border rounded-md px-3 py-2 text-sm outline-none" />
                  {!form.moveIn && (
                    <span style={{ color: C.gray600 }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                      Move-in date (optional)
                    </span>
                  )}
                </div>
                </>)}
                {groupCapacity > 0 && (
                  <div style={{ borderColor: C.border, background: C.blueLight }} className="border rounded-md p-3">
                    <p style={{ color: C.ink }} className="text-sm font-semibold mb-0.5">Booking with friends?</p>
                    <p style={{ color: C.gray600 }} className="text-xs mb-2">
                      Request beds together in this {roomType.toLowerCase()} room so you end up with people you know.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[["none", "Just me"], ["create", "Start a group"], ["join", "I have a group code"], ["reopen", "Reopen my group"]].map(([mode, label]) => (
                        <button key={mode} type="button"
                          onClick={() => { setGroupMode(mode); setGroupInfo(null); setSendError(""); }}
                          style={groupMode === mode ? { background: C.blue, color: "#fff", borderColor: C.blue } : { background: C.white, color: C.ink, borderColor: C.border }}
                          className="border rounded-full px-3 py-1 text-xs font-semibold">
                          {label}
                        </button>
                      ))}
                    </div>
                    {groupMode === "create" && (
                      <p style={{ color: C.gray600 }} className="text-xs mt-2">
                        You'll get a code to share with up to {groupCapacity - 1} friend{groupCapacity - 1 === 1 ? "" : "s"}. When they've joined, you send the owner ONE message listing everyone.
                      </p>
                    )}
                    {groupMode === "reopen" && (
                      <div className="mt-2 flex flex-col gap-2">
                        <p style={{ color: C.gray600 }} className="text-xs">
                          Started a group earlier? Enter your code and the phone number or email you used, and you can send the owner the combined request.
                        </p>
                        <input placeholder="Group code" value={groupCode} maxLength={8}
                          onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                          style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none tracking-widest uppercase" />
                        <input placeholder="Your phone number or email" value={reopenContact}
                          onChange={(e) => setReopenContact(e.target.value)}
                          style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none" />
                        <PrimaryButton full onClick={reopenGroup} disabled={reopening}>
                          {reopening ? "Checking…" : "Reopen my group"}
                        </PrimaryButton>
                      </div>
                    )}
                    {groupMode === "join" && (
                      <div className="mt-2">
                        <div className="flex gap-2">
                          <input placeholder="Group code" value={groupCode} maxLength={8}
                            onChange={(e) => { setGroupCode(e.target.value.toUpperCase()); setGroupInfo(null); }}
                            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none flex-1 tracking-widest uppercase" />
                          <button type="button" onClick={checkGroupCode} disabled={groupChecking}
                            style={{ borderColor: C.border, color: C.navy }} className="border rounded-md px-3 text-sm font-semibold bg-white disabled:opacity-60">
                            {groupChecking ? "Checking…" : "Check"}
                          </button>
                        </div>
                        {groupInfo && (
                          <p style={{ color: C.navy }} className="text-xs mt-2 font-semibold">
                            ✓ Group found — {groupInfo.joined} of {groupInfo.capacity} beds taken. You'll be #{groupInfo.joined + 1}.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {groupMode !== "reopen" && (
                  <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none resize-none" />
                )}

                {sendError && (
                  <p style={{ color: "#b3261e" }} className="text-xs">{sendError}</p>
                )}
                {groupMode !== "reopen" && (
                  <p style={{ color: C.gray600 }} className="text-xs leading-relaxed">
                    By sending this request you agree that your name, contact details, move-in date and message will be shared with the property owner or agent
                    {groupMode !== "none" ? " and the other members of your roommate group" : ""}, and processed as described in our{" "}
                    <a href="/privacy-policy" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">Privacy Policy</a>{" "}
                    and <a href="/terms" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">Terms</a>.
                  </p>
                )}
                {groupMode !== "reopen" && (
                  <PrimaryButton full onClick={sendRequest} disabled={busy}>
                    {busy ? "Sending…" : groupMode === "none" ? "Send request & continue to WhatsApp" : groupMode === "create" ? "Create group" : "Join group"}
                  </PrimaryButton>
                )}
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
      <p style={{ color: C.gray600 }} className="text-xs leading-relaxed mb-2">
        Your name and review will be shown publicly on this listing. By submitting you agree to our{" "}
        <a href="/terms" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">Terms</a> and{" "}
        <a href="/privacy-policy" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">Privacy Policy</a>.
        Please keep it honest and don't include other people's private details.
      </p>
      {error && <p style={{ color: "#b3261e" }} className="text-xs mb-2">{error}</p>}
      <PrimaryButton onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}</PrimaryButton>
    </div>
  );
}

/* Share button: opens the phone's share sheet (WhatsApp etc.) or copies the property's link. */
function ShareLinkButton({ listing, className = "", iconSize = 16 }) {
  const [msg, setMsg] = useState("");
  const onClick = async () => {
    const r = await shareListingLink(listing);
    if (r === "copied") { setMsg("Link copied"); setTimeout(() => setMsg(""), 2000); }
  };
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={onClick} style={{ borderColor: C.border }} className={className} title="Share link" aria-label={`Share link to ${listing.name}`}>
        <Share2 size={iconSize} color={C.gray600} />
      </button>
      {msg && <span style={{ background: C.ink, color: "#fff" }} className="absolute top-full mt-1 right-0 text-xs rounded px-2 py-1 whitespace-nowrap z-10">{msg}</span>}
    </span>
  );
}

// Shown while a shared property link is loading, or when it can't be opened.
function DeepLinkNotice({ status, onBrowse }) {
  const text = {
    loading: "Loading property…",
    notfound: "This property is no longer available, or the link is wrong.",
    restricted: "This property is for a different university than the one on your account.",
  }[status] || "";
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p style={{ color: C.gray600 }} className="text-sm mb-4">{text}</p>
      {status !== "loading" && <PrimaryButton onClick={onBrowse}>Browse stays</PrimaryButton>}
    </div>
  );
}

  function DetailView({ listing, onBack, isFav, toggleFav, onReviewAdded, user, onRequireAuth, groupLink = null }) {
  const [showContact, setShowContact] = useState(!!groupLink); // a shared ?group= link opens the booking form straight away
  const [activeImg, setActiveImg] = useState(0);
  const [walkStep, setWalkStep] = useState(0);
  const roomOptions = listing.roomOptions?.length ? listing.roomOptions : [{ roomType: listing.roomType, price: listing.price }];
  const [selectedRoom, setSelectedRoom] = useState(groupLink?.roomType || roomOptions[0]?.roomType || "");
  const galleryImages = [listing.image, ...(listing.images || [])].filter(Boolean);
  const walkthroughStops = listing.virtualWalkthrough ? (listing.walkthrough || []) : [];

  React.useEffect(() => {
    setActiveImg(0);
    setWalkStep(0);
    setSelectedRoom(groupLink?.roomType || roomOptions[0]?.roomType || "");
    api.recordView(listing.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  const selectedPrice = roomOptions.find((r) => r.roomType === selectedRoom)?.price ?? listing.price;
  const priceHidden = !!listing.hidePrice || selectedPrice == null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <button onClick={onBack} style={{ color: C.blue }} className="text-sm font-semibold flex items-center gap-1 mb-4 hover:underline">
        <ChevronLeft size={16} /> Back to results
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 style={{ color: C.ink }} className="text-2xl font-extrabold">{listing.name}</h1>
          <p style={{ color: C.gray600 }} className="text-sm mt-1 flex items-center gap-1"><MapPin size={14} /> {listing.university}{distanceLabel(listing) && ` · ${distanceLabel(listing)}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge score={listing.rating} />
          <ShareLinkButton listing={listing} className="border w-10 h-10 rounded-md flex items-center justify-center" iconSize={18} />
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
            {listing.isPublic && <Badge tone="purple"><span className="flex items-center gap-1"><Building2 size={12} /> {listing.publicKind === "Hall" ? "Public Hall" : "Public Hostel"}</span></Badge>}
          {listing.listedByAgent && (listing.officialAgent ? <Badge tone="green"><span className="flex items-center gap-1"><BadgeCheck size={12} /> Official BookInn Agent</span></Badge> : <Badge tone="blue"><span className="flex items-center gap-1"><Briefcase size={12} /> Agent listing</span></Badge>)}
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
          {priceHidden ? (
            <>
              <p style={{ color: C.ink }} className="text-2xl font-extrabold">Contact for price</p>
              <p style={{ color: C.gray600 }} className="text-xs mt-1">Send a booking request and the {listing.listedByAgent ? "agent" : "owner"} will share the price with you.</p>
            </>
          ) : (
            <p style={{ color: C.ink }} className="text-2xl font-extrabold">GH₵{selectedPrice.toLocaleString()}<span className="text-sm font-medium" style={{ color: C.gray600 }}> · {listing.pricingPeriod || "Per semester"}</span></p>
          )}
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
                  <option key={r.roomType} value={r.roomType}>{r.roomType}{priceHidden || r.price == null ? "" : ` — GH₵${r.price.toLocaleString()}`}{r.availability ? ` (${r.availability})` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2.5 mb-4 text-sm" style={{ color: C.gray600 }}>
            <div className="flex items-center gap-2"><BedDouble size={15} /> {selectedRoom}</div>
            <div className="flex items-center gap-2"><Bath size={15} /> {listing.bath}</div>
            {distanceLabel(listing) && <div className="flex items-center gap-2"><MapPin size={15} /> {distanceLabel(listing)}</div>}
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

      {showContact && <ContactModal listing={listing} roomType={selectedRoom} initialGroupCode={groupLink?.code || ""} onClose={() => setShowContact(false)} />}
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
          {user.role === "Owner" || user.role === "Agent" ? (
            <PrimaryButton onClick={() => setView("admin")}>
              {user.role === "Agent" ? "Go to agent dashboard" : "Go to owner dashboard"}
            </PrimaryButton>
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
      <p style={{ color: C.gray600 }} className="text-sm mb-4">Only Owner and Agent accounts can list properties. Create a separate Owner or Agent account to get started.</p>
      <PrimaryButton onClick={() => setView("home")}>Back to home</PrimaryButton>
    </div>
  );
}

// publicMode: reused by the platform admin's "Public Hostels" tab. Same listing
// form/table, minus the owner-only parts (stats, inquiries, plan limits, student rosters).
function AdminView({ user, token, listings, maxListings, ownerStats, statsLoading, ownerInquiries, inquiriesLoading, addListing, updateListing, deleteListing, onConfirmResident, universities, publicMode = false }) {
  const emptyForm = {
    name: "", university: universities[0] || "", price: "", publicKind: "Hostel",
    type: "Hostel", roomType: HOSTEL_ROOM_TYPES[0], bath: "Shared bath",
    kitchen: false, featured: false, amenities: [], imageData: "", galleryData: [], videoData: "",
    walkthrough: [], uploadingImage: false, uploadingGallery: false, uploadingVideo: false, uploadingWalkthrough: {},
    desc: "", locationDescription: "", pin: null, travelKm: "", travelMinutes: "", travelMode: "walk", pricingPeriod: "Per semester",
    ownerEmail: "", ownerWhatsapp: "", availability: AVAILABILITY_STATUSES[0], hidePrice: false,
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
  const isUnlimited = maxListings == null;
  const atListingLimit = !isUnlimited && listings.length >= maxListings;
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
      publicKind: listing.publicKind === "Hall" ? "Hall" : "Hostel",
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
      pin: listing.lat != null && listing.lng != null ? { lat: Number(listing.lat), lng: Number(listing.lng) } : null,
      ownerEmail: listing.ownerEmail || "",
      ownerWhatsapp: listing.ownerWhatsapp || "",
      availability: listing.availability || AVAILABILITY_STATUSES[0],
      hidePrice: !!listing.hidePrice,
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
    if (!publicMode && !form.ownerEmail && !form.ownerWhatsapp) {
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
        name: form.name, type: publicMode ? "Hostel" : form.type, roomOptions, bath: form.bath,
        ...(publicMode ? { publicKind: form.publicKind } : {}),
        kitchen: form.kitchen, featured: form.featured, university: form.university,
        amenities: form.amenities, pricingPeriod: form.pricingPeriod,
        image: form.imageData || existing?.image || "hostel1",
        images: form.galleryData,
        video: form.videoData, desc: form.desc, locationDescription: form.locationDescription,
        lat: form.pin ? form.pin.lat : null, lng: form.pin ? form.pin.lng : null,
        walkthrough: form.walkthrough.filter((s) => s.image),
        ownerEmail: form.ownerEmail, ownerWhatsapp: form.ownerWhatsapp, availability: form.availability,
        hidePrice: !!form.hidePrice,
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
          <h1 style={{ color: C.ink }} className="text-xl sm:text-2xl font-extrabold">
            {publicMode ? "Public hostels & halls" : user.role === "Agent" ? "Agent dashboard" : "Owner dashboard"}
          </h1>
          <p style={{ color: C.gray600 }} className="text-sm">
            {publicMode
              ? "Add public hostels and halls for any university. They appear in search with a \"Public Hostel\" or \"Public Hall\" tag."
              : "Manage your listings and track inquiries."}
          </p>
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

      {hasListing && !publicMode && (
        <p style={{ color: C.gray600 }} className="text-xs -mt-4 mb-4">
          {isUnlimited
            ? `${listings.length} listing${listings.length === 1 ? "" : "s"} · unlimited plan`
            : `${listings.length}/${maxListings} listing${maxListings === 1 ? "" : "s"} used.`}
        </p>
      )}

      {!publicMode && (
      <>
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

      </>
      )}

      {showForm && (
        <div style={{ borderColor: C.border }} className="border rounded-lg p-4 sm:p-5 bg-white mb-6">
          <h3 style={{ color: C.ink }} className="font-bold text-sm mb-4">{editingId ? "Edit listing" : "New listing details"}</h3>

          {publicMode && (
            <div className="mb-4">
              <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Category</p>
              <select value={form.publicKind} aria-label="Public listing category" onChange={(e) => setForm({ ...form, publicKind: e.target.value })}
                style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none w-full sm:w-64">
                <option value="Hostel">Public Hostel</option>
                <option value="Hall">Public Hall</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input placeholder="Property name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0" />
            <select value={form.university} aria-label="University" onChange={(e) => setForm({ ...form, university: e.target.value })}
              style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0">
              {universities.map((u) => <option key={u}>{u}</option>)}
            </select>
            <select value={form.bath} aria-label="Bathroom type" onChange={(e) => setForm({ ...form, bath: e.target.value })}
              style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0">
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
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0" />
              <input type="number" min="1" placeholder="Minutes" value={form.travelMinutes} onChange={(e) => setForm({ ...form, travelMinutes: e.target.value })}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0" />
              <select value={form.travelMode} aria-label="Travel mode" onChange={(e) => setForm({ ...form, travelMode: e.target.value })}
                style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0">
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
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Pin on map</p>
            <React.Suspense fallback={<div style={{ color: C.gray600, borderColor: C.border }} className="border rounded-lg h-[280px] flex items-center justify-center text-sm">Loading map…</div>}>
              <LocationPicker value={form.pin} onChange={(pin) => setForm((f) => ({ ...f, pin }))} university={form.university} />
            </React.Suspense>
            <p style={{ color: C.gray600 }} className="text-xs mt-1.5">Optional — a pin lets students see exactly where the property is on the map. Without one, it shows near the campus only.</p>
          </div>

          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Contact for booking requests</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email" placeholder="Your email address" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0" />
              <input type="tel" placeholder="Your WhatsApp number, e.g. 0244000000" value={form.ownerWhatsapp} onChange={(e) => setForm({ ...form, ownerWhatsapp: e.target.value })}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0" />
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
                  className="border rounded-md px-3 py-2 text-sm font-semibold flex-1 min-w-0"
                >
                  {s}
                </button>
              ))}
            </div>
            <p style={{ color: C.gray600 }} className="text-xs mt-1.5">Let students know at a glance whether there's still room, before they reach out.</p>
          </div>

          {!publicMode && (
          <div className="mb-4">
            <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">Property type</p>
            <div className="flex gap-2">
              {["Hostel", "Apartment"].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t, roomType: t === "Hostel" ? HOSTEL_ROOM_TYPES[0] : APARTMENT_ROOM_TYPES[0] }))}
                  style={{ background: form.type === t ? C.blue : C.white, color: form.type === t ? C.white : C.ink, borderColor: C.border }}
                  className="border rounded-md px-4 py-2 text-sm font-semibold flex-1 min-w-0"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          )}

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
                        className="border rounded-md px-2 py-1.5 text-xs outline-none max-w-full"
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
                  style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0">
                  {roomTypeOptions.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input type="number" placeholder="Price (GH₵)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  style={{ borderColor: C.border }} className="border rounded-md px-3 py-2 text-sm outline-none w-full min-w-0" />
              </div>
            </div>
          )}

          <label
            style={{ borderColor: form.hidePrice ? C.blue : C.border, background: form.hidePrice ? C.blueLight : C.white }}
            className="border rounded-md p-3 mb-4 flex items-start gap-2.5 cursor-pointer"
          >
            <input type="checkbox" checked={!!form.hidePrice} onChange={(e) => setForm({ ...form, hidePrice: e.target.checked })} style={{ accentColor: C.blue }} className="mt-0.5" />
            <span>
              <span style={{ color: C.ink }} className="text-sm font-semibold block">Hide price — show "Contact for price"</span>
              <span style={{ color: C.gray600 }} className="text-xs block mt-0.5">Students won't see your price anywhere (listing, map or search results) and will ask you for it in their booking request. You still enter a price above, and you'll always see it in your dashboard.</span>
            </span>
          </label>

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
          <p style={{ color: C.gray600 }} className="text-xs leading-relaxed mb-3">
            By saving this listing you confirm you have the right to advertise this property and to use all photos, videos and text in it, that the details are accurate,
            and that your contact email and WhatsApp number may be shown to students. See our{" "}
            <a href="/terms" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">Terms</a> and{" "}
            <a href="/privacy-policy" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">Privacy Policy</a>.
          </p>
          <div className="flex gap-2">
            <PrimaryButton onClick={submit} disabled={submitting || stillUploading}>
              {submitting ? "Saving…" : stillUploading ? "Uploading…" : editingId ? "Update listing" : "Save listing"}
            </PrimaryButton>
            <GhostButton onClick={cancelForm}>Cancel</GhostButton>
          </div>
        </div>
      )}

      {/* Phones: one card per listing (a 6-column fixed table is too cramped) */}
      <div className="md:hidden flex flex-col gap-3">
        {listings.map((l) => (
          <div key={l.id} style={{ borderColor: C.border }} className="border rounded-lg bg-white p-3.5">
            <div className="flex items-start gap-3">
              <img src={img(l.image, 100)} alt={l.name} loading="lazy" className="w-12 h-12 rounded object-cover flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p style={{ color: C.ink }} className="font-semibold text-[15px] leading-snug break-words">{l.name}</p>
                <p style={{ color: C.gray600 }} className="text-xs mt-0.5 break-words">{l.university}</p>
              </div>
              <div className="shrink-0">
                {l.visible !== false ? <Badge tone="green">Active</Badge> : <Badge tone="red">Paused</Badge>}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              {(l.roomOptions || []).map((r) => (
                <div key={r.roomType} className="flex items-center justify-between gap-3 text-sm">
                  <span style={{ color: C.ink }} className="min-w-0 break-words">{r.roomType}</span>
                  <span style={{ color: C.ink }} className="font-semibold whitespace-nowrap">GH₵{Number(r.price).toLocaleString()}</span>
                </div>
              ))}
              <p style={{ color: C.gray600 }} className="text-xs">{l.pricingPeriod || "Per semester"}</p>
              {l.hidePrice && <p style={{ color: C.blue }} className="text-[11px] font-semibold">Hidden from students — shows "Contact for price"</p>}
              {l.photosOverLimit > 0 && (
                <p style={{ color: C.yellowDark }} className="text-[11px]">{l.photosOverLimit} photo{l.photosOverLimit > 1 ? "s" : ""} hidden over plan limit</p>
              )}
            </div>

            <div style={{ borderColor: C.border }} className="border-t mt-3 pt-3 flex items-center gap-2">
              {!publicMode && (
              <button
                onClick={() => setRosterListing(l)}
                style={{ color: C.blue, borderColor: C.border }}
                className="flex-1 border rounded-md py-2 text-sm font-semibold whitespace-nowrap"
              >
                View students
              </button>
              )}
              {publicMode && <span className="flex-1" />}
              <ShareLinkButton listing={l} className="border rounded-md w-11 h-10 flex items-center justify-center shrink-0" />
              <button
                onClick={() => startEdit(l)}
                aria-label={`Edit ${l.name}`}
                style={{ borderColor: C.border, color: C.ink }}
                className="border rounded-md w-11 h-10 flex items-center justify-center shrink-0"
              >
                <Pencil size={16} color={C.gray600} />
              </button>
              <button
                onClick={() => handleDelete(l.id)}
                disabled={deletingId === l.id}
                aria-label={`Delete ${l.name}`}
                style={{ borderColor: C.border }}
                className="border rounded-md w-11 h-10 flex items-center justify-center shrink-0 disabled:opacity-60"
              >
                <Trash2 size={16} color={deletingId === l.id ? C.gray400 : "#b3261e"} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderColor: C.border }} className="hidden md:block border rounded-lg bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: C.blueMist, color: C.gray600 }} className="text-left">
                <th className="py-2.5 px-4 font-semibold">Property</th>
                <th className="py-2.5 px-4 font-semibold">University</th>
                <th className="py-2.5 px-4 font-semibold">Room categories</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                {!publicMode && <th className="py-2.5 px-4 font-semibold">Students</th>}
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
                    {l.hidePrice && <span style={{ color: C.blue }} className="text-[11px] font-semibold block">Price hidden from students</span>}
                    <span style={{ color: C.gray600 }} className="text-xs block">{l.pricingPeriod || "Per semester"}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    {l.visible !== false ? <Badge tone="green">Active</Badge> : <Badge tone="red">Paused</Badge>}
                    {l.photosOverLimit > 0 && (
                      <p style={{ color: C.yellowDark }} className="text-[11px] mt-1">{l.photosOverLimit} photo{l.photosOverLimit > 1 ? "s" : ""} hidden over plan limit</p>
                    )}
                  </td>
                  {!publicMode && (
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => setRosterListing(l)}
                      style={{ color: C.blue }}
                      className="text-xs font-semibold hover:underline whitespace-nowrap"
                    >
                      View students
                    </button>
                  </td>
                  )}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-3">
                      <ShareLinkButton listing={l} className="" iconSize={15} />
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
   PASSWORD INPUT — reusable text field with a show/hide toggle and a
   tighter dot spacing (the default browser mask dots render quite large
   and widely spaced at our normal input font size).
--------------------------------------------------------- */
function PasswordInput({ placeholder, value, onChange, onKeyDown, className, style, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete}
        style={{ ...style, fontSize: visible ? style?.fontSize : "12px", letterSpacing: visible ? "normal" : "0.05em" }}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{ color: C.gray600 }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-70"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}


/* ---------------------------------------------------------
   SIGN-UP CONSENT — required Terms/Privacy agreement plus a SEPARATE,
   optional (unticked by default) marketing-email opt-in. Links open in a
   new tab so nobody loses what they've typed.
--------------------------------------------------------- */
function SignupConsent({ agreed, setAgreed, marketing, setMarketing }) {
  const link = { color: C.blue };
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: C.gray600 }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          style={{ accentColor: C.blue }} className="mt-0.5 shrink-0" />
        <span>
          I agree to the <a href="/terms" target="_blank" rel="noreferrer" style={link} className="font-semibold hover:underline">Terms &amp; Conditions</a> and
          have read the <a href="/privacy-policy" target="_blank" rel="noreferrer" style={link} className="font-semibold hover:underline">Privacy Policy</a>,
          and I consent to BookInn collecting and using my details as described there.
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: C.gray600 }}>
        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
          style={{ accentColor: C.blue }} className="mt-0.5 shrink-0" />
        <span>(Optional) Email me BookInn news, tips and offers. I can unsubscribe at any time.</span>
      </label>
    </div>
  );
}

/* ---------------------------------------------------------
   LOGIN VIEW
--------------------------------------------------------- */
function LoginView({ onAuthSuccess, onGuest, redirectNote, setView, universities, initialGooglePending = null }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [university, setUniversity] = useState("");
  const [agreed, setAgreed] = useState(false);          // Terms + Privacy consent (required to sign up)
  const [marketingOptIn, setMarketingOptIn] = useState(false); // optional, never pre-ticked
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
  // Set when someone picks a Google account that has no BookInn account yet —
  // we keep Google's token and ask for their account type (and campus) before
  // creating it.
  const [googlePending, setGooglePending] = useState(initialGooglePending); // { credential, name, email }

  const handleGoogleCredential = async (credential) => {
    setError("");
    setBusy(true);
    try {
      const data = await api.googleAuth(credential);
      if (data.status === "needs_signup") {
        setGooglePending({ credential, name: data.name, email: data.email });
      } else {
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const finishGoogleSignup = async () => {
    setError("");
    if (role === "Student" && !university) { setError("Select your university."); return; }
    if (!agreed) { setError("Please agree to the Terms & Conditions and Privacy Policy to create your account."); return; }
    setBusy(true);
    try {
      const data = await api.googleAuth(googlePending.credential, role, role === "Student" ? university : undefined, { acceptedTerms: true, marketingEmails: marketingOptIn });
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      // Google's token is short-lived — if it expired mid-way, start over.
      setError(err.message);
      if (/failed|try again/i.test(err.message)) setGooglePending(null);
    } finally {
      setBusy(false);
    }
  };

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
    if (!agreed) { setError("Please agree to the Terms & Conditions and Privacy Policy to create your account."); return; }
    setBusy(true);
    try {
      const data = await api.signup(name, email, password, role, role === "Student" ? university : undefined, { acceptedTerms: true, marketingEmails: marketingOptIn });
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => (mode === "signin" ? handleSignIn() : handleSignUp());

  if (googlePending) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div style={{ borderColor: C.border }} className="border rounded-lg p-6 bg-white">
          <img src={bookinnWordmark} alt="BookInn" className="h-8 mb-4" />
          <h1 style={{ color: C.ink }} className="text-xl font-extrabold mb-1">Almost done, {googlePending.name.split(" ")[0]}</h1>
          <p style={{ color: C.gray600 }} className="text-sm mb-4">
            Creating your BookInn account for <span className="font-semibold">{googlePending.email}</span>. Tell us how you'll use it.
          </p>
          {error && (
            <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-xs rounded-md px-3 py-2 mb-3">{error}</div>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <p style={{ color: C.ink }} className="text-xs font-semibold mb-1.5">I am a…</p>
              <div className="flex gap-2">
                {["Student", "Parent", "Owner", "Agent"].map((r) => (
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
                <p style={{ color: C.gray600 }} className="text-xs mt-1.5">You'll only see hostels and apartments near this campus.</p>
              </div>
            )}
            <SignupConsent agreed={agreed} setAgreed={setAgreed} marketing={marketingOptIn} setMarketing={setMarketingOptIn} />
            <PrimaryButton full onClick={finishGoogleSignup} disabled={busy}>
              {busy ? "Please wait…" : "Create account"}
            </PrimaryButton>
            <GhostButton full onClick={() => { setGooglePending(null); setError(""); }}>Use a different account</GhostButton>
          </div>
        </div>
      </div>
    );
  }

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

        {GOOGLE_CLIENT_ID && (
          <>
            <GoogleAuthButton
              onCredential={handleGoogleCredential}
              text={mode === "signin" ? "signin_with" : "signup_with"}
              oneTap={mode === "signin"}
            />
            <div className="flex items-center gap-3 my-4">
              <div style={{ background: C.border }} className="h-px flex-1" />
              <span style={{ color: C.gray600 }} className="text-xs">or use email</span>
              <div style={{ background: C.border }} className="h-px flex-1" />
            </div>
          </>
        )}

        <div className="flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none" />
              <div>
                <p style={{ color: C.ink }} className="text-xs font-semibold mb-1.5">I am a…</p>
                <div className="flex gap-2">
                  {["Student", "Parent", "Owner", "Agent"].map((r) => (
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
                {role === "Agent" && (
                  <p style={{ color: C.gray600 }} className="text-xs mt-1.5">
                    List hostels or apartments on behalf of landlords — unlimited listings, same free dashboard.
                  </p>
                )}
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
          <PasswordInput placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mode === "signin" && submit()}
            autoComplete="current-password"
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none w-full" />
          {mode === "signup" && (
            <PasswordInput placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete="new-password"
              style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none w-full" />
          )}
          {mode === "signin" && (
            <button type="button" onClick={() => setView("forgot-password")} style={{ color: C.blue }} className="text-xs font-semibold text-right hover:underline -mt-1">
              Forgot password?
            </button>
          )}
          {mode === "signup" && (
            <SignupConsent agreed={agreed} setAgreed={setAgreed} marketing={marketingOptIn} setMarketing={setMarketingOptIn} />
          )}
          <PrimaryButton full onClick={submit} disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </PrimaryButton>
          <GhostButton full onClick={onGuest}>Continue as guest</GhostButton>
        </div>
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
          <PasswordInput placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none w-full" />
          <PasswordInput placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="new-password"
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none w-full" />
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
      <div style={{ borderColor: "rgba(255,255,255,0.15)" }} className="border-t">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
          <p className="text-white text-sm font-semibold mb-2.5">Popular searches</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {SEO_PAGES.map((pg) => (
              <li key={pg.slug}>
                <a
                  href={seoPagePath(pg)}
                  onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); setView(`landing:${pg.slug}`); window.scrollTo(0, 0); }}
                  style={{ color: "rgba(255,255,255,0.65)" }}
                  className="text-xs hover:text-white hover:underline transition"
                >
                  Hostels {pg.kind === "campus" ? (pg.slug === "hostels-around-legon" ? "around" : "near") : "in"} {pg.short}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ borderColor: "rgba(255,255,255,0.15)" }} className="border-t py-4 text-center">
        <ul className="flex justify-center gap-x-4 gap-y-1 flex-wrap mb-2">
          <FooterLink onClick={() => setView("privacy-policy")}>Privacy Policy</FooterLink>
          <FooterLink onClick={() => setView("terms")}>Terms &amp; Conditions</FooterLink>
          <FooterLink onClick={() => setView("cookie-policy")}>Cookie Policy</FooterLink>
        </ul>
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
          {s.groupCode && <Badge>Group {s.groupCode}</Badge>}
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
        <p style={{ color: C.gray600 }} className="text-xs mt-0.5 mb-1">Students confirmed as actually living here.</p>
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

// Tidies a property name for the admin tables: collapses stray spaces around
// punctuation ("HOSTEL , BETHEL", "( NORTH LEGON)") and converts ALL-CAPS names
// to Title Case. Names an owner already typed in mixed case are left alone.
function prettyPropertyName(name) {
  const s = String(name || "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+,/g, ",")
    .trim();
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s(\-/])([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

// One property per line (instead of one long comma-joined string) so long lists
// stay readable in both the desktop table and the mobile cards.
function PropertyNameList({ names }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm leading-snug">
      {names.map((n, i) => (
        <li key={i} className="md:whitespace-nowrap">{prettyPropertyName(n)}</li>
      ))}
    </ul>
  );
}

function PlatformAdminView({ token, onManageOwner }) {
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "students", label: "Students" },
    { key: "parents", label: "Parents" },
    { key: "owners", label: "Owners" },
    { key: "agents", label: "Agents" },
    { key: "listings", label: "Listings" },
    { key: "inquiries", label: "Inquiries" },
    { key: "universities", label: "Universities" },
    { key: "publichostels", label: "Halls/Public Hostels" },
    { key: "emails", label: "Emails" },
  ];
  const [tab, setTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
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
        api.getAdminListings(token),
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

  const refreshListings = React.useCallback(async () => {
    const data = await api.getAdminListings(token);
    setListings(data.listings);
  }, [token]);

  React.useEffect(() => {
    if (tab === "overview" || tab === "listings" || tab === "universities" || tab === "publichostels") loadAll();
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

  // Admin can change the contact email booking requests for one listing go to.
  const [editingEmailId, setEditingEmailId] = useState(null);
  const editListingEmailAsAdmin = async (l) => {
    const input = window.prompt(
      `Contact email for "${l.name}":\n\nBooking requests for this listing will be sent here. Leave empty to remove it.`,
      l.ownerEmail || ""
    );
    if (input === null) return; // cancelled
    const email = input.trim();
    if (email === (l.ownerEmail || "")) return;
    setEditingEmailId(l.id);
    try {
      const { listing } = await api.adminUpdateListingEmail(l.id, email, token);
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, ownerEmail: listing.ownerEmail } : x)));
    } catch (err) {
      alert(err.message);
    } finally {
      setEditingEmailId(null);
    }
  };

  // Admin can delete any listing (owner or agent). Inquiries on it go with it.
  const [deletingListingId, setDeletingListingId] = useState(null);
  const deleteListingAsAdmin = async (l) => {
    const ok = window.confirm(
      `Delete "${l.name}" permanently?\n\nThis also removes its inquiries and reviews, and cannot be undone.`
    );
    if (!ok) return;
    setDeletingListingId(l.id);
    try {
      await api.adminDeleteListing(l.id, token);
      setListings((prev) => prev.filter((x) => x.id !== l.id));
      setInquiries((prev) => prev.filter((i) => i.listingId !== l.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingListingId(null);
    }
  };

  const overviewStats = stats ? [
    { label: "Total users", value: stats.totalUsers, icon: Users },
    { label: "Students", value: stats.usersByRole.Student || 0, icon: GraduationCap },
    { label: "Parents", value: stats.usersByRole.Parent || 0, icon: UserCog },
    { label: "Owners", value: stats.usersByRole.Owner || 0, icon: Building2 },
    { label: "Agents", value: stats.usersByRole.Agent || 0, icon: Briefcase },
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
  // Owner id -> names of the hostels/apartments they've listed, for the
  // extra column on the Owners tab.
  const listingNamesByOwnerId = useMemo(() => {
    const map = {};
    listings.forEach((l) => {
      (map[l.ownerId] ||= []).push(l.name);
    });
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
  // Delete any account (Student, Parent, Owner or Agent) plus its listings.
  const [deletingUserId, setDeletingUserId] = useState(null);
  const deleteUserAsAdmin = async ({ id, name, role, listingCount }) => {
    const listingsNote = listingCount > 0
      ? `\n\nThis also permanently deletes their ${listingCount} listing${listingCount === 1 ? "" : "s"}, along with the inquiries and reviews on ${listingCount === 1 ? "it" : "them"}.`
      : "";
    const ok = window.confirm(
      `Delete ${role} account "${name}" permanently?${listingsNote}\n\nThis cannot be undone.`
    );
    if (!ok) return;
    setDeletingUserId(id);
    try {
      await api.adminDeleteUser(id, token);
      const removedListingIds = new Set(listings.filter((l) => l.ownerId === id).map((l) => l.id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setListings((prev) => prev.filter((l) => l.ownerId !== id));
      setInquiries((prev) => prev.filter((i) => !removedListingIds.has(i.listingId)));
      api.getAdminStats(token).then(setStats).catch(() => {});
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingUserId(null);
    }
  };
  // Edit an account's login email / password (any non-admin role).
  const [editUser, setEditUser] = useState(null); // { id, name, role, email }
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const openEditUser = (u) => {
    setEditUser(u);
    setEditEmail(u.email || "");
    setEditPassword("");
    setShowEditPassword(false);
    setEditError("");
  };
  const closeEditUser = () => { if (!editBusy) setEditUser(null); };
  const saveEditUser = async () => {
    const email = editEmail.trim();
    const emailChanged = email !== (editUser.email || "");
    const passwordChanged = editPassword !== "";
    if (!emailChanged && !passwordChanged) { setEditError("Change the email or enter a new password."); return; }
    setEditBusy(true);
    setEditError("");
    try {
      const payload = {};
      if (emailChanged) payload.email = email;
      if (passwordChanged) payload.password = editPassword;
      const { user } = await api.adminUpdateUser(editUser.id, payload, token);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, email: user.email, emailVerified: user.emailVerified } : u)));
      api.getAdminStats(token).then(setStats).catch(() => {});
      setEditUser(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const deleteButton = (id, name, role, listingCount) => (
    <button
      onClick={() => deleteUserAsAdmin({ id, name, role, listingCount })}
      disabled={deletingUserId === id}
      style={{ color: "#b3261e" }}
      className="text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-60"
    >
      {deletingUserId === id ? "Deleting…" : "Delete"}
    </button>
  );
  // Edit + Delete buttons for one account. Returned as a fragment so each table
  // can lay them out: a simple row for students/parents, a tidy vertical list
  // (alongside "Manage listings") for owners and agents.
  const accountActions = (id, name, role, email, listingCount) => (
    <>
      <button
        onClick={() => openEditUser({ id, name, role, email })}
        style={{ color: C.blue }}
        className="text-xs font-semibold hover:underline whitespace-nowrap"
      >
        Edit account
      </button>
      {deleteButton(id, name, role, listingCount)}
    </>
  );
  // Stacked one-per-line on desktop, wrapping in a row inside the phone card footer.
  const actionsWrap = (children) => (
    <span className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1.5 md:flex-col md:items-start">{children}</span>
  );
  const manageButton = (id) => (
    <button
      onClick={() => handleManageOwner(id)}
      disabled={impersonatingId === id}
      style={{ color: C.blue }}
      className="text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-60"
    >
      {impersonatingId === id ? "Opening…" : "Manage listings →"}
    </button>
  );
  const personDeleteColumn = {
    key: "delete", label: "", headerLabel: "Actions", render: (u) => (
      <span className="flex items-center gap-4">
        {accountActions(u.id, u.name, u.role, u.email, (listingNamesByOwnerId[u.id] || []).length)}
      </span>
    ),
  };
  const ownerColumns = [
    personColumns[0], // Name
    {
      key: "hostels", label: "Hostels/Apartments", stacked: true, render: (u) => {
        const names = listingNamesByOwnerId[u.id] || [];
        if (names.length === 0) return <span style={{ color: C.gray400 }}>—</span>;
        return <PropertyNameList names={names} />;
      },
    },
    ...personColumns.slice(1), // Email, Role, Joined
    {
      key: "manage", label: "", headerLabel: "Actions", render: (u) => actionsWrap(
        <>
          {manageButton(u.id)}
          {accountActions(u.id, u.name, u.role, u.email, (listingNamesByOwnerId[u.id] || []).length)}
        </>
      ),
    },
  ];

  // Agents tab — driven by stats.agentsOverview (listing count + inquiries +
  // profile views per agent, computed server-side) rather than the plain
  // users list, since that's the analytics an admin actually wants to see.
  const agentsOverview = stats?.agentsOverview || [];
  const filteredAgents = agentsOverview.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return a.agentName.toLowerCase().includes(q) || a.agentEmail.toLowerCase().includes(q);
  });
  // Official BookInn Agent toggle — flips the flag on the server, then patches
  // local state so the table (and the Listings tab) update without a reload.
  const [officialBusyId, setOfficialBusyId] = useState(null);
  const toggleOfficialAgent = async (agent) => {
    const next = !agent.officialAgent;
    const ok = window.confirm(
      next
        ? `Mark ${agent.agentName} as an Official BookInn Agent? Their listings will show an "Official BookInn Agent" label to students.`
        : `Remove the Official BookInn Agent label from ${agent.agentName}?`
    );
    if (!ok) return;
    setOfficialBusyId(agent.agentId);
    try {
      await api.setOfficialAgent(agent.agentId, next, token);
      setStats((prev) => prev && ({
        ...prev,
        agentsOverview: prev.agentsOverview.map((a) => (a.agentId === agent.agentId ? { ...a, officialAgent: next } : a)),
      }));
      const agentListingIds = new Set((agent.listings || []).map((l) => l.id));
      setListings((prev) => prev.map((l) => (agentListingIds.has(l.id) ? { ...l, officialAgent: next } : l)));
    } catch (err) {
      alert(err.message);
    } finally {
      setOfficialBusyId(null);
    }
  };
  const agentColumns = [
    {
      key: "agentName", label: "Name", render: (a) => (
        <div className="min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            {a.agentName}
            {a.officialAgent && (
              <Badge tone="green"><span className="flex items-center gap-1"><BadgeCheck size={12} /> Official</span></Badge>
            )}
          </span>
          <span style={{ color: C.gray600 }} className="block text-xs font-normal mt-0.5 break-all">{a.agentEmail}</span>
        </div>
      ),
    },
    {
      key: "hostels", label: "Hostels/Apartments", stacked: true, render: (a) => {
        const names = (a.listings || []).map((l) => l.name);
        if (!names.length) return <span style={{ color: C.gray400 }}>—</span>;
        return <PropertyNameList names={names} />;
      },
    },
    { key: "listingsCount", label: "Listings" },
    { key: "totalInquiries", label: "Inquiries" },
    { key: "totalViews", label: "Views" },
    { key: "createdAt", label: "Joined", render: (a) => a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—" },
    {
      key: "manage", label: "", headerLabel: "Actions", render: (a) => actionsWrap(
        <>
          {manageButton(a.agentId)}
          <button
            onClick={() => toggleOfficialAgent(a)}
            disabled={officialBusyId === a.agentId}
            style={{ color: a.officialAgent ? "#b3261e" : C.blue }}
            className="text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-60"
          >
            {officialBusyId === a.agentId ? "Saving…" : a.officialAgent ? "Remove official status" : "Make official"}
          </button>
          {accountActions(a.agentId, a.agentName, "Agent", a.agentEmail, (a.listings || []).length)}
        </>
      ),
    },
  ];
  const agentSummaryStats = [
    { label: "Total agents", value: agentsOverview.length, icon: Briefcase },
    { label: "Agent listings", value: stats?.totalAgentListings ?? 0, icon: Building2 },
    { label: "Agent inquiries", value: stats?.totalAgentInquiries ?? 0, icon: Inbox },
  ];

  // Clicking "View students" on a listing opens this instead of jumping tabs —
  // a focused popup of just that property's students, by name.
  const [rosterListing, setRosterListing] = useState(null);

  const listingColumns = [
    { key: "name", label: "Property" },
    { key: "university", label: "University" },
    { key: "type", label: "Type" },
    {
      key: "listedBy", label: "Listed by", render: (l) => (
        l.isPublic
          ? <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#5b2ea6" }}><Building2 size={13} /> {l.publicKind === "Hall" ? "Public Hall" : "Public Hostel"}</span>
          : l.officialAgent
          ? <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#0a6b0f" }}><BadgeCheck size={13} /> Official BookInn Agent</span>
          : l.listedByAgent
          ? <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#7c3aed" }}><Briefcase size={13} /> Agent</span>
          : <span style={{ color: C.gray600 }} className="text-xs">Owner</span>
      ),
    },
    { key: "price", label: "Price", render: (l) => `GH₵${Number(l.price).toLocaleString()}${l.hidePrice ? " (hidden)" : ""}` },
    { key: "ownerEmail", label: "Contact email", render: (l) => l.ownerEmail || <span style={{ color: C.gray400 }}>—</span> },
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
    {
      key: "actions", label: "", render: (l) => (
        <span className="flex items-center gap-4">
          <button
            onClick={() => editListingEmailAsAdmin(l)}
            disabled={editingEmailId === l.id}
            style={{ color: C.blue }}
            className="text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-60"
          >
            {editingEmailId === l.id ? "Saving…" : "Edit email"}
          </button>
          <button
            onClick={() => deleteListingAsAdmin(l)}
            disabled={deletingListingId === l.id}
            style={{ color: "#b3261e" }}
            className="text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-60"
          >
            {deletingListingId === l.id ? "Deleting…" : "Delete"}
          </button>
        </span>
      ),
    },
  ];

  const inquiryColumns = [
    { key: "name", label: "Name" },
    { key: "listingId", label: "Property", render: (inq) => listingNameById[inq.listingId] || `#${inq.listingId}` },
    { key: "roomType", label: "Room type", render: (inq) => inq.roomType || "—" },
    { key: "groupCode", label: "Group", render: (inq) => inq.groupCode ? `${inq.groupCode} (of ${inq.groupCapacity})` : "—" },
    { key: "phone", label: "Phone", render: (inq) => inq.phone || "—" },
    { key: "email", label: "Email", render: (inq) => inq.email || "—" },
    { key: "moveIn", label: "Move-in", render: (inq) => inq.moveIn || "—" },
    { key: "createdAt", label: "Received", render: (inq) => inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : "—" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
      <div className="flex items-start justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-start gap-2 min-w-0">
          <Shield size={22} color={C.blue} className="shrink-0 mt-0.5 sm:mt-1" />
          <div className="min-w-0">
            <h1 style={{ color: C.ink }} className="text-xl sm:text-2xl font-extrabold leading-tight">Platform admin</h1>
            <p style={{ color: C.gray600 }} className="text-xs sm:text-sm mt-0.5">Users, listings & inquiries in one place.</p>
          </div>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          aria-label="Refresh"
          style={{ borderColor: C.border, color: C.ink }}
          className="border rounded-md w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 text-sm font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-60 shrink-0"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-sm rounded-md px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {/* Phones: hamburger menu that lists every section */}
      <div className="md:hidden relative mb-5">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close sections menu" : "Open sections menu"}
          aria-expanded={menuOpen}
          style={{ borderColor: C.border }}
          className="w-full flex items-center gap-3 border rounded-lg bg-white px-2.5 py-2 text-left"
        >
          <span style={{ borderColor: C.border, background: C.blueMist }} className="w-10 h-10 border rounded-lg flex items-center justify-center shrink-0">
            {menuOpen ? <X size={20} color={C.navy} /> : <Menu size={20} color={C.navy} />}
          </span>
          <span className="min-w-0">
            <span style={{ color: C.gray600 }} className="block text-[11px] leading-none mb-1">Section</span>
            <span style={{ color: C.ink }} className="block text-[15px] font-bold leading-none truncate">{TABS.find((t) => t.key === tab)?.label}</span>
          </span>
          <ChevronDown size={18} color={C.gray600} className={`ml-auto shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        {menuOpen && (
          <div style={{ borderColor: C.border }} className="absolute z-30 left-0 right-0 mt-2 border rounded-lg bg-white shadow-lg overflow-hidden">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setMenuOpen(false); }}
                style={{
                  background: tab === t.key ? C.blueLight : C.white,
                  color: tab === t.key ? C.blue : C.ink,
                  borderColor: C.border,
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left border-b last:border-0"
              >
                {t.label}
                {tab === t.key && <Check size={16} color={C.blue} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tablet/desktop: tab row */}
      <div className="hidden md:flex md:flex-wrap gap-2 mb-6">
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

          {tab !== "overview" && tab !== "emails" && tab !== "universities" && tab !== "publichostels" && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative sm:max-w-sm w-full sm:w-auto flex-1">
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
                  className="border rounded-md px-3 py-2 text-sm bg-white w-full sm:w-auto"
                >
                  <option value="All">All universities</option>
                  {universities.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              )}
            </div>
          )}

          {tab === "students" && (
            <DataTable columns={[...personColumns, personDeleteColumn]} rows={byRole("Student")} emptyLabel="No students found." />
          )}
          {tab === "parents" && (
            <DataTable columns={[...personColumns, personDeleteColumn]} rows={byRole("Parent")} emptyLabel="No parents found." />
          )}
         {tab === "owners" && (
            <DataTable columns={ownerColumns} rows={byRole("Owner")} emptyLabel="No property owners found." />
          )}
          {tab === "agents" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mb-4">
                {agentSummaryStats.map((s) => <AdminStatCard key={s.label} {...s} />)}
              </div>
              <DataTable columns={agentColumns} rows={filteredAgents} emptyLabel="No agents found." />
            </>
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
          {tab === "publichostels" && (
            loading && listings.length === 0 ? (
              <p style={{ color: C.gray600 }} className="text-sm py-10 text-center">Loading…</p>
            ) : (
              <AdminView
                publicMode
                user={{ role: "Admin" }}
                token={token}
                listings={listings.filter((l) => l.isPublic)}
                maxListings={null}
                ownerStats={null}
                statsLoading={false}
                ownerInquiries={[]}
                inquiriesLoading={false}
                onConfirmResident={() => {}}
                universities={universities.map((u) => u.name)}
                addListing={async (payload) => { await api.adminAddPublicListing(payload, token); await refreshListings(); }}
                updateListing={async (id, payload) => { await api.adminUpdatePublicListing(id, payload, token); await refreshListings(); }}
                deleteListing={async (id) => { await api.adminDeleteListing(id, token); await refreshListings(); }}
              />
            )
          )}
          {tab === "emails" && <PlatformAdminEmails token={token} />}
        </>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.55)" }} onClick={closeEditUser}>
          <div style={{ background: C.white }} className="rounded-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeEditUser} className="absolute top-4 right-4" aria-label="Close"><X size={20} color={C.gray600} /></button>
            <h3 style={{ color: C.ink }} className="font-bold text-lg mb-1">Edit account</h3>
            <p style={{ color: C.gray600 }} className="text-xs mb-4">{editUser.name} · {editUser.role}</p>

            <label style={{ color: C.ink }} className="text-sm font-semibold block mb-1.5">Login email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              autoComplete="off"
              style={{ borderColor: C.border }}
              className="border rounded-md px-3 py-2 text-sm outline-none w-full mb-1.5"
            />
            <p style={{ color: C.gray600 }} className="text-xs mb-4">
              The address they sign in with. It will need to be verified again. Contact emails on their listings are edited in the Listings tab.
            </p>

            <label style={{ color: C.ink }} className="text-sm font-semibold block mb-1.5">New password</label>
            <div className="relative mb-1.5">
              <input
                type={showEditPassword ? "text" : "password"}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave empty to keep the current password"
                autoComplete="new-password"
                style={{ borderColor: C.border }}
                className="border rounded-md pl-3 pr-16 py-2 text-sm outline-none w-full"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword((v) => !v)}
                style={{ color: C.blue }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
              >
                {showEditPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p style={{ color: C.gray600 }} className="text-xs mb-4">
              At least 8 characters. Changing it signs them out of any device where they're already logged in. Share the new password with them yourself.
            </p>

            {editError && <p style={{ color: "#b3261e" }} className="text-sm mb-3">{editError}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={closeEditUser}
                disabled={editBusy}
                style={{ borderColor: C.border, color: C.ink }}
                className="border rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={saveEditUser}
                disabled={editBusy}
                style={{ background: C.blue, color: C.white }}
                className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {editBusy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
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
          <PasswordInput placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="current-password"
            style={{ borderColor: C.border }} className="border rounded-md px-3 py-2.5 text-sm outline-none w-full" />
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
  account: "/account",
  admin: "/owner-dashboard",       // per-owner listings dashboard
  login: "/login",
  "forgot-password": "/forgot-password",
  "reset-password": "/reset-password",   // ?token=... appended separately, read from window.location.search
  "verify-email": "/verify-email",       // ?token=... appended separately, read from window.location.search
  "how-it-works": "/how-it-works",
  "help-center": "/help-center",
  "safety-tips": "/safety-tips",
  "privacy-policy": "/privacy-policy",
  terms: "/terms",
  "cookie-policy": "/cookie-policy",
  "platform-admin": "/platform-admin",
};
// SEO landing pages (campus / neighbourhood searches) — view name is "landing:<slug>".
SEO_PAGES.forEach((pg) => { VIEW_TO_PATH[`landing:${pg.slug}`] = seoPagePath(pg); });
const PATH_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_PATH).map(([v, p]) => [p, v]));
// Keep in sync with <title> / meta description in index.html.
const DEFAULT_PAGE_TITLE = "Student Hostels Near Legon, KNUST, UCC & UPSA | BookInn";
const DEFAULT_PAGE_DESC = "Find student hostels, self-contained rooms & apartments near Legon, KNUST, UCC, UPSA & UEW. Compare 1 to 4-in-a-room prices and WhatsApp owners directly.";
const isLandingView = (v) => typeof v === "string" && v.startsWith("landing:");
const seoPageForView = (v) => (isLandingView(v) ? SEO_PAGES.find((p) => p.slug === v.slice(8)) || null : null);

// Shareable property links: /listing/12-bae-dream  (only the leading number matters;
// the name part is just there so the link reads nicely in a chat).
const listingPath = (l) => {
  const slug = String(l?.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `/listing/${l.id}${slug ? `-${slug}` : ""}`;
};
const listingUrl = (l) => `${typeof window !== "undefined" ? window.location.origin : "https://bookinngh.com"}${listingPath(l)}`;
const listingIdFromPath = (pathname) => {
  const m = /^\/listing\/(\d+)(?:-[^/]*)?\/?$/.exec(pathname || "");
  return m ? Number(m[1]) : null;
};

// Opens the phone's share sheet (WhatsApp, Messages, etc.) when available, otherwise copies the link.
// Returns "shared" | "copied" | "failed".
async function shareListingLink(listing) {
  const url = listingUrl(listing);
  const title = `${listing.name} — BookInn`;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text: `Check out ${listing.name} on BookInn`, url });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "failed"; // person closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    window.prompt("Copy this link:", url);
    return "copied";
  }
}

function viewFromPath(pathname) {
  if (listingIdFromPath(pathname) != null) return "detail";
  return PATH_TO_VIEW[pathname.replace(/\/+$/, "") || "/"] || "home";
}

// Owner and Agent accounts share the same listing dashboard — this just
// centralizes the "is this account allowed in there" check.
const isListingManagerRole = (role) => role === "Owner" || role === "Agent";

/* ---------------------------------------------------------
   APP ROOT
--------------------------------------------------------- */
export default function App() {
  const [view, setViewState] = useState(() =>
    typeof window !== "undefined" ? viewFromPath(window.location.pathname) : "home"
  );
  // Wraps setView so every in-app navigation also updates the address bar —
  // this is what makes the admin panel reachable at its own /admin URL.
  const selectedListingRef = useRef(null); // kept in sync below; lets setView/popstate know which property is open
  const setView = React.useCallback((next) => {
    setViewState(next);
    if (typeof window !== "undefined") {
      const path = next === "detail" && selectedListingRef.current ? listingPath(selectedListingRef.current) : VIEW_TO_PATH[next];
      if (path && window.location.pathname !== path) {
        window.history.pushState({ view: next }, "", path);
      }
    }
  }, []);

  const [selectedListing, setSelectedListing] = useState(null);
  selectedListingRef.current = selectedListing;
  // null | "loading" | "notfound" | "restricted" — only used when a property is opened from a shared link.
  const [deepLink, setDeepLink] = useState(() =>
    typeof window !== "undefined" && listingIdFromPath(window.location.pathname) != null ? "loading" : null
  );
  const loadListingById = React.useCallback(async (id) => {
    if (selectedListingRef.current?.id === id) { setDeepLink(null); return; }
    setDeepLink("loading");
    try {
      const { listing } = await api.getListing(id);
      selectedListingRef.current = listing;
      setSelectedListing(listing);
      setDeepLink(null);
    } catch {
      setDeepLink("notfound");
    }
  }, []);
  // A shared group link (/?group=CODE) takes the student straight to that room's
  // booking form with the code filled in — also how a leader returns to their group.
  const [groupLink, setGroupLink] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [oneTapPending, setOneTapPending] = useState(null);
  const [showGoogleSheet, setShowGoogleSheet] = useState(false);
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
    const onPopState = () => {
      const p = window.location.pathname;
      setViewState(viewFromPath(p));
      const id = listingIdFromPath(p);
      if (id != null) loadListingById(id);
    };
    const firstId = listingIdFromPath(window.location.pathname);
    if (firstId != null) loadListingById(firstId); // someone opened a shared property link
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // A student's account is scoped to their own university, so a shared link to another
  // school's property shows a friendly notice instead of opening it (same rule as openListing).
  React.useEffect(() => {
    if (view !== "detail" || !selectedListing) return;
    if (studentUniversity && selectedListing.university !== studentUniversity) setDeepLink("restricted");
    else setDeepLink((d) => (d === "restricted" ? null : d));
  }, [view, selectedListing, studentUniversity]);

  // Keep <title> and the meta description in step with client-side navigation
  // (the server already sends the right ones on a fresh page load / for crawlers).
  React.useEffect(() => {
    if (view === "detail") return; // property pages get their own tags from the server
    const pg = seoPageForView(view);
    document.title = pg ? pg.title : DEFAULT_PAGE_TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute("content", pg ? pg.description : DEFAULT_PAGE_DESC);
  }, [view]);

  React.useEffect(() => {
    if (view !== "home" && !isLandingView(view)) return;
    setListingsLoading((prev) => (listings.length === 0 ? true : prev));
    api.getListings(studentUniversity)
      .then((data) => setListings(data.listings))
      .catch((err) => setListingsError(err.message))
      .finally(() => setListingsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, studentUniversity]);

  React.useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("group");
    if (!code) return;
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) return;
    (async () => {
      try {
        const { group } = await api.getBookingGroup(clean);
        const { listings: all } = await api.getListings();
        const target = all.find((l) => l.id === group.listingId);
        if (!target) return;
        setSelectedListing(target);
        setGroupLink({ code: group.code, roomType: group.roomType });
        setViewState("detail");
        window.history.replaceState({ view: "detail" }, "", listingPath(target));
      } catch { /* bad or expired link — just land on the homepage */ }
    })();
  }, []);

  // Restore a saved session (if any) and verify it's still valid.
  React.useEffect(() => {
    const savedToken = localStorage.getItem("bookinn_token");
    if (!savedToken) { setSessionChecked(true); return; }
    api.me(savedToken)
      .then((data) => { setToken(savedToken); setUser(data.user); })
      .catch(() => localStorage.removeItem("bookinn_token"))
      .finally(() => setSessionChecked(true));
  }, []);

  // Google One Tap (the account popup at the top right). Only offered once we
  // know nobody is signed in, and not on screens that run their own Google flow.
  const oneTapEnabled = sessionChecked && !user && !["login", "forgot-password", "reset-password", "verify-email", "platform-admin"].includes(view);
  const closeGoogleSheet = () => {
    setShowGoogleSheet(false);
    try { sessionStorage.setItem("bookinn:gsheet-dismissed", "1"); } catch { /* storage unavailable */ }
  };
  const handleOneTapUnavailable = () => {
    try { if (sessionStorage.getItem("bookinn:gsheet-dismissed")) return; } catch { /* storage unavailable */ }
    setShowGoogleSheet(true);
  };
  const handleOneTapCredential = async (credential) => {
    setShowGoogleSheet(false);
    try {
      const data = await api.googleAuth(credential);
      if (data.status === "needs_signup") {
        // Brand-new person: finish account creation (role/campus/terms) on the sign-in screen.
        setOneTapPending({ credential, name: data.name, email: data.email });
        setAuthRedirect(view === "detail" ? "detail" : null);
        setView("login");
      } else {
        // Existing account: sign in quietly and leave them on the page they're viewing.
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("bookinn_token", data.token);
      }
    } catch { /* ignore — they can still sign in manually */ }
  };

  const refreshOwnerStats = React.useCallback(() => {
    if (!token || !isListingManagerRole(user?.role)) { setOwnerStats(null); return; }
    setOwnerStatsLoading(true);
    api.getOwnerStats(token)
      .then((data) => setOwnerStats(data))
      .catch(() => {})
      .finally(() => setOwnerStatsLoading(false));
  }, [token, user?.role]);

  // Owner dashboard stats are fetched fresh whenever the dashboard is opened or the
  // owner's listings change, so they're always real numbers, never placeholders.
  React.useEffect(() => {
    if (view === "admin" && isListingManagerRole(user?.role)) refreshOwnerStats();
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
    if (!token || !isListingManagerRole(user?.role)) { setOwnerInquiries([]); return; }
    setOwnerInquiriesLoading(true);
    api.getInquiries(token)
      .then((data) => setOwnerInquiries(data.inquiries || []))
      .catch(() => {})
      .finally(() => setOwnerInquiriesLoading(false));
  }, [token, user?.role]);

  React.useEffect(() => {
    if (view === "admin" && isListingManagerRole(user?.role)) refreshOwnerInquiries();
  }, [view, user?.role, refreshOwnerInquiries]);

  const refreshMyListings = React.useCallback(() => {
    if (!token || !isListingManagerRole(user?.role)) { setMyListings([]); setMyMaxListings(1); return; }
    setMyListingsLoading(true);
    api.getMyListings(token)
     .then((data) => {
  setMyListings(data.listings);
  setMyMaxListings(data.maxListings === undefined ? 1 : data.maxListings);
})
      .catch(() => {})
      .finally(() => setMyListingsLoading(false));
  }, [token, user?.role]);

  React.useEffect(() => {
    if (view === "admin" && isListingManagerRole(user?.role)) refreshMyListings();
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
    setDeepLink(null);
    selectedListingRef.current = listing; // so setView puts this property's own link in the address bar
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

  // "List your property" drops any signed-in Owner/Agent straight into their dashboard.
  const goToListProperty = () => {
    if (!user) { setAuthRedirect("admin"); setView("login"); return; }
    setView("admin"); // non-Owner/Agent accounts see NotOwnerNotice there
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
    disableGoogleAutoSelect();
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
      <GoogleOneTap enabled={oneTapEnabled} onCredential={handleOneTapCredential} onUnavailable={handleOneTapUnavailable} />
      {oneTapEnabled && showGoogleSheet && <GoogleSignInSheet onCredential={handleOneTapCredential} onClose={closeGoogleSheet} />}
      <Header
        view={view} setView={(v) => { setView(v); setMobileOpen(false); }} favCount={favorites.size}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
        user={user} onOwnerDashboardClick={goToAdmin} onListPropertyClick={goToListProperty} onSignOut={handleSignOut}
        platformAdminUser={platformAdminUser} onAdminSignOut={handleAdminSignOut}
      />

      <main className="flex-1">
        {(view === "home" || isLandingView(view)) && (
          listingsError ? (
            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
              <p style={{ color: C.ink }} className="font-semibold mb-1">Couldn't load listings</p>
              <p style={{ color: C.gray600 }} className="text-sm">{listingsError} — is the backend server running? Try <code>npm run dev:all</code>.</p>
            </div>
          ) : (
            <HomeView favorites={favorites} toggleFav={toggleFav} onOpenListing={openListing} listings={listings} loading={listingsLoading} studentUniversity={studentUniversity} universities={universities} landingPage={seoPageForView(view)} goTo={setView} />
          )
        )}
       {view === "detail" && deepLink && (
          <DeepLinkNotice status={deepLink} onBrowse={() => { setDeepLink(null); setView("home"); }} />
        )}
        {view === "detail" && !deepLink && selectedListing && (
          <DetailView
            key={`${selectedListing.id}-${groupLink?.code || ""}`} groupLink={groupLink}
            listing={selectedListing} onBack={() => { setGroupLink(null); setView("home"); }} isFav={favorites.has(selectedListing.id)} toggleFav={toggleFav}
            onReviewAdded={(updated) => {
              setSelectedListing(updated);
              setListings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            }}
            user={user}
            onRequireAuth={() => { setAuthRedirect("detail"); setView("login"); }}
          />
        )}
        {view === "saved" && <SavedView listings={listings} favorites={favorites} toggleFav={toggleFav} onOpenListing={openListing} />}
        {view === "how-it-works" && <HowBookingWorksView setView={setView} />}
        {view === "help-center" && <HelpCenterView setView={setView} />}
        {view === "safety-tips" && <SafetyTipsView setView={setView} />}
        {view === "privacy-policy" && <PrivacyPolicyView setView={setView} />}
        {view === "terms" && <TermsView setView={setView} />}
        {view === "cookie-policy" && <CookiePolicyView setView={setView} />}
        {view === "account" && user && <AccountView user={user} favCount={favorites.size} setView={setView} />}
        {view === "admin" && (
          !user ? (
            <LoginView onAuthSuccess={handleAuthSuccess} onGuest={handleGuest} setView={setView} redirectNote="Sign in to manage your property listings." universities={universities} />
          ) : !isListingManagerRole(user.role) ? (
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
            initialGooglePending={oneTapPending}
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
