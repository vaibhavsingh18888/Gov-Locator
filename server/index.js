const express = require("express");
const cors = require("cors");
const path = require("path");
const offices = require("./data/offices");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve static client files ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../client")));

// ── Helper: fuzzy search ─────────────────────────────────────────────────────
function normalize(str) {
  return str.toLowerCase().trim();
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/offices
 * Returns all offices.
 * Query params:
 *   - category (string)  : filter by category slug
 *   - city     (string)  : filter by city name
 *   - q        (string)  : search by name / address / type / services
 */
app.get("/api/offices", (req, res) => {
  try {
    let result = [...offices];
    const { category, city, q } = req.query;

    if (category && category !== "all") {
      result = result.filter(
        (o) => normalize(o.category) === normalize(category)
      );
    }

    if (city) {
      result = result.filter((o) =>
        normalize(o.city).includes(normalize(city))
      );
    }

    if (q) {
      const term = normalize(q);
      result = result.filter(
        (o) =>
          normalize(o.name).includes(term) ||
          normalize(o.address).includes(term) ||
          normalize(o.type).includes(term) ||
          normalize(o.city).includes(term) ||
          normalize(o.state).includes(term) ||
          o.services.some((s) => normalize(s).includes(term))
      );
    }

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /api/offices/:id
 * Returns a single office by ID.
 */
app.get("/api/offices/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const office = offices.find((o) => o.id === id);

    if (!office) {
      return res.status(404).json({ success: false, message: "Office not found" });
    }

    res.json({ success: true, data: office });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /api/categories
 * Returns distinct category list.
 */
app.get("/api/categories", (req, res) => {
  try {
    const categories = [
      { slug: "all",         label: "All Offices",         icon: "🏛️" },
      { slug: "collectorate",label: "District Collector",  icon: "🏢" },
      { slug: "tehsil",      label: "Tehsil / SDM",        icon: "📋" },
      { slug: "rto",         label: "RTO",                 icon: "🚗" },
      { slug: "municipal",   label: "Municipal Corp.",      icon: "🏙️" },
      { slug: "block",       label: "Block Office",         icon: "🌾" },
      { slug: "police",      label: "Police",              icon: "👮" },
      { slug: "passport",    label: "Passport Service",    icon: "🛂" },
      { slug: "court",       label: "Court",               icon: "⚖️" },
      { slug: "incometax",   label: "Income Tax",          icon: "💰" },
      { slug: "postoffice",  label: "Post Office",         icon: "📮" },
      { slug: "labour",      label: "Labour Office",       icon: "👷" },
      { slug: "food_supply", label: "Food & Civil Supply", icon: "🌾" },
      { slug: "electricity", label: "Electricity Board",   icon: "⚡" },
      { slug: "health",      label: "Health Dept.",        icon: "🏥" },
      { slug: "land",        label: "Land Records",        icon: "📜" },
    ];
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /api/cities
 * Returns distinct cities available.
 */
app.get("/api/cities", (req, res) => {
  try {
    const cities = [...new Set(offices.map((o) => o.city))].sort();
    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /api/stats
 * Summary stats for front page counters.
 */
app.get("/api/stats", (req, res) => {
  try {
    const categoryCount = [...new Set(offices.map((o) => o.category))].length;
    const cityCount = [...new Set(offices.map((o) => o.city))].length;
    res.json({
      success: true,
      data: {
        total_offices: offices.length,
        categories: categoryCount,
        cities: cityCount,
        states: [...new Set(offices.map((o) => o.state))].length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── Fallback: serve index.html for unmatched non-API routes ──────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: "Route not found" });
  }
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Government Office Locator API running on port ${PORT}`);
  console.log(`   ➜ http://localhost:${PORT}/api/offices`);
  console.log(`   ➜ http://localhost:${PORT}/api/categories`);
  console.log(`   ➜ http://localhost:${PORT}/api/cities\n`);
});
