/* =============================================================================
   GOV LOCATOR — app.js
   Supports both Home page (index.html) and Map page (map.html)
   ============================================================================= */

"use strict";

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = "/api";

// Category → emoji map (used for markers & cards)
const CAT_EMOJI = {
  collectorate: "🏢", tehsil: "📋", rto: "🚗",
  municipal: "🏙️", block: "🌾", police: "👮",
  passport: "🛂", court: "⚖️", incometax: "💰",
  postoffice: "📮", labour: "👷", food_supply: "🥛",
  electricity: "⚡", health: "🏥", land: "📜", default: "🏛️"
};

// ─── Page Detection ──────────────────────────────────────────────────────────
const IS_MAP_PAGE = !!document.getElementById("map");

// ─── App State ────────────────────────────────────────────────────────────────
const state = {
  offices: [],
  filtered: [],
  activeCategory: "all",
  searchQuery: "",
  cityFilter: "",
  selectedId: null,
  map: null,
  markers: [],
  infoWindow: null,
  categories: [],
  cities: [],
  mapReady: false,
  dataReady: false,
};

// ─── DOM refs (conditional — may be null on home page) ────────────────────────
const $ = id => document.getElementById(id);
const sideSearch   = $("sideSearch");
const clearBtn     = $("clearSearch");
const cityFilter   = $("cityFilter");
const catGrid      = $("catGrid");
const officeList   = $("officeList");
const listLoader   = $("listLoader");
const resultCount  = $("resultCount");
const mapLoading   = $("mapLoading");
const detailPanel  = $("detailPanel");
const detailOverlay= $("detailOverlay");
const detailContent= $("detailContent");

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavScroll();
  initHamburger();

  // Theme toggle button
  const toggleBtn = $("themeToggle");
  if (toggleBtn) toggleBtn.addEventListener("click", toggleTheme);

  if (IS_MAP_PAGE) {
    // ── MAP PAGE INIT ──
    loadData();

    // Wait for Google Maps
    if (window.GOOGLE_MAPS_LOADED) {
      initMap();
    } else if (window.pendingMapsInit) {
      window.pendingMapsInit.push(initMap);
    }

    // Sidebar search
    if (sideSearch) {
      sideSearch.addEventListener("input", () => {
        state.searchQuery = sideSearch.value.trim();
        if (clearBtn) clearBtn.classList.toggle("visible", state.searchQuery.length > 0);
        applyFilters();
      });
      sideSearch.addEventListener("keydown", e => {
        if (e.key === "Escape") clearSearch();
      });
    }

    // Read URL params for category/search pre-filter
    const params = new URLSearchParams(window.location.search);
    if (params.get("cat")) {
      state.activeCategory = params.get("cat");
    }
    if (params.get("q")) {
      state.searchQuery = params.get("q");
      if (sideSearch) {
        sideSearch.value = state.searchQuery;
        if (clearBtn) clearBtn.classList.add("visible");
      }
    }

  } else {
    // ── HOME PAGE INIT ──
    loadHomeStats();
    initHeroSearch();
  }
});

// ─── Home Page: Stats ─────────────────────────────────────────────────────────
async function loadHomeStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    if (data.success) updateStats(data.data);
  } catch {}
}

// ─── Home Page: Hero Search → redirect to map ─────────────────────────────────
function initHeroSearch() {
  const heroSearch = $("heroSearch");
  const heroBtn = $("heroSearchBtn");

  function doSearch() {
    const q = heroSearch ? heroSearch.value.trim() : "";
    if (!q) {
      window.location.href = "map.html";
      return;
    }
    window.location.href = `map.html?q=${encodeURIComponent(q)}`;
  }

  if (heroSearch) {
    heroSearch.addEventListener("keydown", e => {
      if (e.key === "Enter") doSearch();
    });
  }
  if (heroBtn) {
    heroBtn.addEventListener("click", doSearch);
  }
}

// ─── Data Loading ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [officesRes, catsRes, citiesRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/offices`),
      fetch(`${API_BASE}/categories`),
      fetch(`${API_BASE}/cities`),
      fetch(`${API_BASE}/stats`),
    ]);

    if (!officesRes.ok) throw new Error("Offices API failed");

    const officesData = await officesRes.json();
    const catsData    = await catsRes.json();
    const citiesData  = await citiesRes.json();
    const statsData   = await statsRes.json();

    state.offices    = officesData.data;
    state.filtered   = [...state.offices];
    state.categories = catsData.data;
    state.cities     = citiesData.data;

    if (catGrid) renderCategories(state.categories);
    if (cityFilter) renderCities(state.cities);
    updateStats(statsData.data);

    state.dataReady = true;
    applyFilters(); // applies URL params too

  } catch (err) {
    console.error("API Error:", err);
    showToast("⚠️ Backend offline — using fallback data");
    loadFallback();
  }
}

// ─── Fallback (offline / no backend) ─────────────────────────────────────────
function loadFallback() {
  state.offices = FALLBACK_OFFICES;
  state.filtered = [...state.offices];
  state.categories = FALLBACK_CATEGORIES;
  state.cities = [...new Set(state.offices.map(o => o.city))];

  if (catGrid) renderCategories(state.categories);
  if (cityFilter) renderCities(state.cities);
  state.dataReady = true;
  applyFilters();
}

// ─── Google Map ───────────────────────────────────────────────────────────────
function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  state.map = new google.maps.Map(mapEl, {
    center: { lat: 23.2599, lng: 77.4126 },
    zoom: 6,
    styles: isLight ? LIGHT_MAP_STYLES : DARK_MAP_STYLES,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    gestureHandling: "greedy",
  });
  state.infoWindow = new google.maps.InfoWindow();
  state.mapReady = true;
  if (mapLoading) mapLoading.style.display = "none";

  if (state.dataReady) placeMarkers(state.filtered);
}

// ─── Markers ─────────────────────────────────────────────────────────────────
function placeMarkers(offices) {
  state.markers.forEach(m => m.setMap(null));
  state.markers = [];
  if (state.infoWindow) state.infoWindow.close();

  if (!offices.length) return;

  const bounds = new google.maps.LatLngBounds();

  offices.forEach(office => {
    const pos = { lat: office.coordinates.lat, lng: office.coordinates.lng };
    const emoji = CAT_EMOJI[office.category] || CAT_EMOJI.default;

    const marker = new google.maps.Marker({
      position: pos,
      map: state.map,
      title: office.name,
      icon: {
        url: makeSvgPin(emoji),
        scaledSize: new google.maps.Size(48, 56),
        anchor: new google.maps.Point(24, 56),
      },
      animation: google.maps.Animation.DROP,
    });

    marker.officeId = office.id;
    marker.addListener("click", () => onMarkerClick(office, marker));
    state.markers.push(marker);
    bounds.extend(pos);
  });

  if (offices.length === 1) {
    state.map.setCenter(offices[0].coordinates);
    state.map.setZoom(15);
  } else if (offices.length > 1) {
    state.map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 60 });
  }
}

function makeSvgPin(emoji) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>
  <path d="M24 0C13.5 0 5 8.5 5 19c0 14.2 19 37 19 37s19-22.8 19-37C43 8.5 34.5 0 24 0z"
    fill="#1a6ef7" filter="url(#shadow)"/>
  <circle cx="24" cy="19" r="13" fill="rgba(255,255,255,0.15)"/>
  <text x="24" y="25" text-anchor="middle" font-size="15">${emoji}</text>
</svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function onMarkerClick(office, marker) {
  const emoji = CAT_EMOJI[office.category] || CAT_EMOJI.default;
  const iwContent = `
    <div class="iw-wrap">
      <div class="iw-name">${emoji} ${office.name}</div>
      <div class="iw-type">${office.type}</div>
      <div class="iw-addr">📍 ${office.address}</div>
      <button class="iw-btn" onclick="openDetail(${office.id})">View Details →</button>
    </div>`;
  state.infoWindow.setContent(iwContent);
  state.infoWindow.open(state.map, marker);
  setActiveCard(office.id);
  state.map.panTo(office.coordinates);
}

// ─── Filters & Search ─────────────────────────────────────────────────────────
function applyFilters() {
  const q   = state.searchQuery.toLowerCase();
  const cat = state.activeCategory;
  const city= state.cityFilter.toLowerCase();

  state.filtered = state.offices.filter(o => {
    const matchCat  = cat === "all" || o.category === cat;
    const matchCity = !city || o.city.toLowerCase().includes(city);
    const matchQ    = !q ||
      o.name.toLowerCase().includes(q) ||
      o.address.toLowerCase().includes(q) ||
      o.type.toLowerCase().includes(q) ||
      o.city.toLowerCase().includes(q) ||
      (o.services && o.services.some(s => s.toLowerCase().includes(q)));

    return matchCat && matchCity && matchQ;
  });

  if (officeList) renderOfficeList(state.filtered);
  if (resultCount) updateResultCount(state.filtered.length);
  if (state.mapReady) placeMarkers(state.filtered);
}

function setCategory(slug) {
  state.activeCategory = slug;
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.slug === slug);
  });
  applyFilters();
}

function clearSearch() {
  if (sideSearch) sideSearch.value = "";
  state.searchQuery = "";
  if (clearBtn) clearBtn.classList.remove("visible");
  applyFilters();
}

// ─── Render: Category buttons ─────────────────────────────────────────────────
function renderCategories(cats) {
  if (!catGrid) return;
  catGrid.innerHTML = "";
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-btn" + (cat.slug === state.activeCategory ? " active" : "");
    btn.dataset.slug = cat.slug;
    btn.textContent = `${cat.icon} ${cat.label}`;
    btn.onclick = () => setCategory(cat.slug);
    catGrid.appendChild(btn);
  });
}

// ─── Render: City dropdown ────────────────────────────────────────────────────
function renderCities(cities) {
  if (!cityFilter) return;
  cityFilter.innerHTML = `<option value="">All Cities</option>`;
  cities.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    cityFilter.appendChild(opt);
  });
  cityFilter.onchange = () => {
    state.cityFilter = cityFilter.value;
    applyFilters();
  };
}

// ─── Render: Office list ──────────────────────────────────────────────────────
function renderOfficeList(offices) {
  if (!officeList) return;
  if (listLoader) listLoader.remove();

  officeList.innerHTML = "";

  if (!offices.length) {
    officeList.innerHTML = `
      <div class="no-results">
        <div class="nr-icon">🔍</div>
        <p>No offices found.<br/>Try a different search or category.</p>
      </div>`;
    return;
  }

  offices.forEach(office => {
    const emoji = CAT_EMOJI[office.category] || CAT_EMOJI.default;
    const card = document.createElement("div");
    card.className = "office-card" + (office.id === state.selectedId ? " active" : "");
    card.id = `card-${office.id}`;
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", office.name);
    card.innerHTML = `
      <div class="card-top">
        <span class="card-emoji">${emoji}</span>
        <div>
          <div class="card-title">${office.name}</div>
          <div class="card-type">${office.type}</div>
        </div>
      </div>
      <div class="card-meta">
        <div class="card-addr">📍 ${office.city}, ${office.state}</div>
        <div class="card-hours">${office.working_hours}</div>
      </div>`;

    card.onclick = () => {
      openDetail(office.id);
      if (state.mapReady) {
        const marker = state.markers.find(m => m.officeId === office.id);
        if (marker) {
          state.map.panTo(office.coordinates);
          state.map.setZoom(15);
          google.maps.event.trigger(marker, "click");
        }
      }
    };
    officeList.appendChild(card);
  });
}

function setActiveCard(id) {
  document.querySelectorAll(".office-card").forEach(c => c.classList.remove("active"));
  const card = $(`card-${id}`);
  if (card) {
    card.classList.add("active");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  state.selectedId = id;
}

// ─── Office Detail Panel ──────────────────────────────────────────────────────
function openDetail(officeId) {
  const office = state.offices.find(o => o.id === officeId) ||
                 FALLBACK_OFFICES.find(o => o.id === officeId);
  if (!office || !detailContent) return;

  setActiveCard(officeId);
  const emoji = CAT_EMOJI[office.category] || CAT_EMOJI.default;

  const servicesHTML = office.services && office.services.length
    ? `<div class="dp-services">
        ${office.services.map(s => `<span class="dp-service-tag">${s}</span>`).join("")}
      </div>`
    : `<p style="font-size:12px;color:var(--text-muted)">No service data available.</p>`;

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${office.coordinates.lat},${office.coordinates.lng}`;
  const websiteBtn = office.website
    ? `<a class="dp-btn dp-btn-outline" href="${office.website}" target="_blank" rel="noopener">🌐 Website</a>`
    : `<button class="dp-btn dp-btn-outline" disabled style="opacity:0.4">🌐 No Website</button>`;

  detailContent.innerHTML = `
    <div class="dp-header">
      <button class="dp-close" onclick="closeDetail()" title="Close">✕</button>
      <span class="dp-emoji">${emoji}</span>
      <h2 class="dp-name">${office.name}</h2>
      <span class="dp-type-tag">${office.type}</span>
    </div>
    <div class="dp-body">
      <div class="dp-section">
        <div class="dp-section-label">Location</div>
        <div class="dp-row"><span class="dp-row-icon">📍</span><span class="dp-row-text">${office.address}</span></div>
        <div class="dp-row"><span class="dp-row-icon">🏙️</span><span class="dp-row-text">${office.city}, ${office.state} – ${office.pincode}</span></div>
      </div>
      <div class="dp-section">
        <div class="dp-section-label">Contact</div>
        <div class="dp-row"><span class="dp-row-icon">📞</span><span class="dp-row-text">${office.phone || "N/A"}</span></div>
        ${office.email ? `<div class="dp-row"><span class="dp-row-icon">✉️</span><span class="dp-row-text">${office.email}</span></div>` : ""}
      </div>
      <div class="dp-section">
        <div class="dp-section-label">Working Hours</div>
        <div class="dp-row"><span class="dp-row-icon">🕐</span><span class="dp-row-text"><strong>${office.working_hours}</strong></span></div>
        <div class="dp-row"><span class="dp-row-icon">🔴</span><span class="dp-row-text">Closed: ${office.closed_on}</span></div>
      </div>
      ${office.landmark ? `
      <div class="dp-section">
        <div class="dp-section-label">Landmark</div>
        <div class="dp-row"><span class="dp-row-icon">🗺️</span><span class="dp-row-text">${office.landmark}</span></div>
      </div>` : ""}
      <div class="dp-section">
        <div class="dp-section-label">Services Offered</div>
        ${servicesHTML}
      </div>
    </div>
    <div class="dp-actions">
      <a class="dp-btn dp-btn-primary" href="${navUrl}" target="_blank" rel="noopener">🗺️ Get Directions</a>
      ${websiteBtn}
    </div>
    <div style="padding:0 24px 24px">
      <a class="dp-btn dp-btn-primary" href="office-detail.html?id=${office.id}" style="width:100%;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6)">📋 View Full Details Page</a>
    </div>`;

  if (detailPanel) detailPanel.classList.add("open");
  if (detailOverlay) detailOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDetail(evt) {
  if (evt && evt.target !== detailOverlay) return;
  if (detailPanel) detailPanel.classList.remove("open");
  if (detailOverlay) detailOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

// ─── Map Controls ─────────────────────────────────────────────────────────────
function locateMe() {
  if (!navigator.geolocation) { showToast("⚠️ Geolocation not supported"); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    state.map.setCenter({ lat, lng });
    state.map.setZoom(13);
    new google.maps.Marker({
      position: { lat, lng }, map: state.map,
      title: "You are here",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: "#1a6ef7", fillOpacity: 1,
        strokeColor: "#fff", strokeWeight: 2
      }
    });
    showToast("📍 Location found!");
  }, () => showToast("⚠️ Could not get location"));
}

function resetMapView() {
  if (state.map) {
    state.infoWindow.close();
    if (state.filtered.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      state.filtered.forEach(o => bounds.extend(o.coordinates));
      state.map.fitBounds(bounds, 50);
    } else {
      state.map.setCenter({ lat: 23.2599, lng: 77.4126 });
      state.map.setZoom(6);
    }
  }
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function updateResultCount(n) {
  if (resultCount) resultCount.textContent = `${n} office${n !== 1 ? "s" : ""}`;
}

function updateStats(data) {
  anime($("statOffices"), data.total_offices);
  anime($("statCategories"), data.categories);
  anime($("statCities"), data.cities);
  anime($("statStates"), data.states);
}

function anime(el, target) {
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

function showToast(msg) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem("gov-locator-theme") || "dark";
  applyTheme(saved, false);
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") !== "light";
  const next = isDark ? "light" : "dark";

  const btn = $("themeToggle");
  if (btn) {
    btn.classList.add("spinning");
    setTimeout(() => btn.classList.remove("spinning"), 420);
  }

  applyTheme(next, true);
  localStorage.setItem("gov-locator-theme", next);
}

function applyTheme(theme, animated) {
  const html = document.documentElement;
  const icon = $("themeIcon");

  if (theme === "light") {
    html.setAttribute("data-theme", "light");
    if (icon) icon.textContent = "🌙";
  } else {
    html.removeAttribute("data-theme");
    if (icon) icon.textContent = "☀️";
  }

  if (state.map) {
    state.map.setOptions({
      styles: theme === "light" ? LIGHT_MAP_STYLES : DARK_MAP_STYLES,
    });
  }
  
  if (window.odMapInstance) {
    window.odMapInstance.setOptions({
      styles: theme === "light" ? LIGHT_MAP_STYLES : DARK_MAP_STYLES,
    });
  }

  if (animated) showToast(theme === "light" ? "☀️ Light theme on" : "🌙 Dark theme on");
}

// Navbar scroll
function initNavScroll() {
  window.addEventListener("scroll", () => {
    const nb = $("navbar");
    if (nb) nb.classList.toggle("scrolled", window.scrollY > 20);
  });
}

// Hamburger
function initHamburger() {
  const btn = $("hamburger");
  const menu = $("navMobile");
  btn && btn.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}
function closeMobile() { const m = $("navMobile"); if (m) m.classList.remove("open"); }

// Intersection Observer for stat counter animation
const statsSection = $("stats-section");
if (statsSection) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { loadStats(); observer.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  observer.observe(statsSection);
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    if (data.success) updateStats(data.data);
  } catch {}
}

// ════════════════════════════════════════════════════════════════════
// LIGHT MAP STYLES
// ════════════════════════════════════════════════════════════════════
const LIGHT_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f5f7ff" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f7ff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#1a6ef7" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#cfe8d0" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#2d7a3a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fde68a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#fbbf24" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#1a6ef7" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfdbfe" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b82f6" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#dbeafe" }] },
];

// ════════════════════════════════════════════════════════════════════
// DARK MAP STYLES
// ════════════════════════════════════════════════════════════════════
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0a1628" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a1628" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ab4f8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#132236" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1b384c" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#071e34" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

// ════════════════════════════════════════════════════════════════════
// FALLBACK DATA
// ════════════════════════════════════════════════════════════════════
const FALLBACK_CATEGORIES = [
  { slug:"all",         label:"All Offices",        icon:"🏛️" },
  { slug:"collectorate",label:"District Collector",  icon:"🏢" },
  { slug:"tehsil",      label:"Tehsil / SDM",        icon:"📋" },
  { slug:"rto",         label:"RTO",                 icon:"🚗" },
  { slug:"municipal",   label:"Municipal Corp.",     icon:"🏙️" },
  { slug:"block",       label:"Block Office",        icon:"🌾" },
  { slug:"police",      label:"Police",              icon:"👮" },
  { slug:"passport",    label:"Passport Service",   icon:"🛂" },
  { slug:"court",       label:"Court",              icon:"⚖️" },
  { slug:"incometax",   label:"Income Tax",         icon:"💰" },
  { slug:"postoffice",  label:"Post Office",        icon:"📮" },
  { slug:"labour",      label:"Labour Office",      icon:"👷" },
  { slug:"food_supply", label:"Food & Civil Supply",icon:"🥛" },
  { slug:"electricity", label:"Electricity Board",  icon:"⚡" },
  { slug:"health",      label:"Health Dept.",        icon:"🏥" },
  { slug:"land",        label:"Land Records",        icon:"📜" },
];

const FALLBACK_OFFICES = [
  { id:1, name:"District Collector Office - Bhopal", type:"District Collector", category:"collectorate", address:"Arera Hills, Bhopal, Madhya Pradesh 462011", city:"Bhopal", state:"Madhya Pradesh", pincode:"462011", phone:"0755-2441500", email:"collector.bpl@mp.gov.in", website:"https://bhopal.nic.in", coordinates:{lat:23.2599,lng:77.4126}, working_hours:"Mon–Sat: 10:00 AM – 5:00 PM", closed_on:"Sunday & Public Holidays", services:["Revenue Records","Caste Certificate","Income Certificate","Domicile Certificate"], landmark:"Near Bharat Mata Chowk" },
  { id:2, name:"District Collector Office - Indore", type:"District Collector", category:"collectorate", address:"Residency Area, Indore, Madhya Pradesh 452001", city:"Indore", state:"Madhya Pradesh", pincode:"452001", phone:"0731-2537200", email:"collector.ind@mp.gov.in", website:"https://indore.nic.in", coordinates:{lat:22.7196,lng:75.8577}, working_hours:"Mon–Sat: 10:00 AM – 5:00 PM", closed_on:"Sunday & Public Holidays", services:["Revenue Records","Caste Certificate"], landmark:"Near MB Palace" },
  { id:8, name:"Regional Transport Office - Bhopal", type:"RTO", category:"rto", address:"Paryavaran Parisar, E-5, Arera Colony, Bhopal, MP 462016", city:"Bhopal", state:"Madhya Pradesh", pincode:"462016", phone:"0755-2466200", email:"rto.bhopal@mp.gov.in", website:"https://transport.mp.gov.in", coordinates:{lat:23.2095,lng:77.4400}, working_hours:"Mon–Sat: 10:00 AM – 5:00 PM", closed_on:"Sunday & Public Holidays", services:["Driving Licence","Vehicle Registration","NOC","Permit","Road Tax"], landmark:"Near Ayodhya Bypass" },
  { id:17, name:"Police Commissioner Office - Bhopal", type:"Police Station", category:"police", address:"Sultania Road, Bhopal, Madhya Pradesh 462001", city:"Bhopal", state:"Madhya Pradesh", pincode:"462001", phone:"0755-2443444", email:"sp.bhopal@mppolice.gov.in", website:"https://bhopalpolice.mp.gov.in", coordinates:{lat:23.2652,lng:77.4012}, working_hours:"24 × 7", closed_on:"No Holiday", services:["FIR","Police Verification","Passport Verification"], landmark:"Near TT Nagar" },
  { id:19, name:"Passport Seva Kendra - Bhopal", type:"Passport Office", category:"passport", address:"Plot No. 2, Zone-B, MP Nagar, Bhopal, MP 462011", city:"Bhopal", state:"Madhya Pradesh", pincode:"462011", phone:"1800-258-1800", email:"", website:"https://passportindia.gov.in", coordinates:{lat:23.2330,lng:77.4295}, working_hours:"Mon–Sat: 9:00 AM – 5:00 PM", closed_on:"Sunday & Public Holidays", services:["Fresh Passport","Passport Renewal","Tatkal Passport"], landmark:"MP Nagar Zone-B" },
];
