# 🏛️ GOV Locator — Government Office Locator Web Application

A premium, map-based web application that helps Indian citizens instantly find government administrative offices — District Collector, RTO, Municipal Corporation, Tehsil, Passport Seva Kendra, Police, Courts, and 30+ more.

---

## 🖼️ Features

- 🗺️ **Interactive Google Maps** with custom emoji markers per office type
- 🔍 **Real-time search** by office name, city, or service
- 📂 **15 category filters** — Collector, RTO, Municipal, Tehsil, Police, Passport, Court, etc.
- 🏙️ **City-based filtering**
- 📋 **Office Detail Panel** — address, phone, email, working hours, landmark, services, directions
- 📍 **Get Directions** button (Google Maps navigation)
- 📊 **Live stats counter** — 32 offices, 15 categories, 7 cities, 3 states
- 🌙 **Premium dark-mode UI** with glassmorphism, gradients, and micro-animations
- ⚡ **Offline-resilient** — works without backend using built-in fallback data
- 📱 **Fully responsive** — mobile, tablet, desktop

---

## 📁 Project Structure

```
gov locator 1/
├── client/                  # Frontend (HTML + CSS + JS)
│   ├── index.html           # Main HTML page
│   ├── style.css            # Premium dark-mode stylesheet
│   └── app.js               # App logic (map, search, filters, detail panel)
│
└── server/                  # Backend (Node.js + Express)
    ├── index.js             # Express server with all API routes
    ├── package.json         # Dependencies
    └── data/
        └── offices.js       # 32 government offices dataset
```

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** v16+ — https://nodejs.org/

---

### Step 1: Start the Backend Server

Open **Terminal / PowerShell** and run:

```powershell
# Navigate to the server folder
cd "c:\Users\HP\Downloads\gov locator 1\server"

# Install dependencies (only needed once)
npm install

# Start the server
node index.js
```

You should see:
```
🚀 Government Office Locator API running on port 5000
   ➜ http://localhost:5000/api/offices
   ➜ http://localhost:5000/api/categories
   ➜ http://localhost:5000/api/cities
```

> ✅ Keep this terminal window open while using the app.

---

### Step 2: Open the Frontend

Open the file directly in your browser:

```
c:\Users\HP\Downloads\gov locator 1\client\index.html
```

Or drag the `index.html` file into Chrome / Edge.

---

### ✅ That's it! The app is running.

> **Note:** If the backend is not running, the app automatically uses built-in fallback data (15 offices) — the map and all features still work.

---

## 🌐 API Endpoints

| Method | Endpoint                   | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/api/offices`            | Get all offices                      |
| GET    | `/api/offices?category=rto` | Filter by category                 |
| GET    | `/api/offices?city=Bhopal` | Filter by city                      |
| GET    | `/api/offices?q=passport` | Search by keyword                   |
| GET    | `/api/offices/:id`        | Get single office by ID              |
| GET    | `/api/categories`         | Get all category definitions         |
| GET    | `/api/cities`             | Get distinct cities                  |
| GET    | `/api/stats`              | Get summary stats                    |

**Example:**
```
http://localhost:5000/api/offices?category=rto&city=Bhopal
```

---

## 🗂️ Office Categories Available

| Category         | Label                | Emoji |
|-----------------|----------------------|-------|
| collectorate    | District Collector   | 🏢    |
| tehsil          | Tehsil / SDM         | 📋    |
| rto             | RTO                  | 🚗    |
| municipal       | Municipal Corp.      | 🏙️    |
| block           | Block Office         | 🌾    |
| police          | Police               | 👮    |
| passport        | Passport Service     | 🛂    |
| court           | Court                | ⚖️    |
| incometax       | Income Tax           | 💰    |
| postoffice      | Post Office          | 📮    |
| labour          | Labour Office        | 👷    |
| food_supply     | Food & Civil Supply  | 🥛    |
| electricity     | Electricity Board    | ⚡    |
| health          | Health Dept.         | 🏥    |
| land            | Land Records         | 📜    |

---

## 🔑 Google Maps API Key

The app uses:
```
AIzaSyCHxy_LtS2Bi8JG16IfJ_s2cDTeTRtMFe8
```
This key is already embedded in `client/index.html`.

---

## 🏗️ Tech Stack

| Layer     | Technology                              |
|-----------|----------------------------------------|
| Frontend  | HTML5, Vanilla CSS, Vanilla JavaScript  |
| Map       | Google Maps JavaScript API              |
| Backend   | Node.js + Express                       |
| Database  | In-memory JS array (no DB setup needed) |
| Design    | Dark Mode, Glassmorphism, CSS Animations|
| Fonts     | Inter + Plus Jakarta Sans (Google Fonts)|

---

## 👥 Agent Division of Work

| Agent | Role | Deliverables |
|-------|------|-------------|
| **Agent 1** | System Designer | Architecture, tech stack, DB schema, folder structure, API plan |
| **Agent 2** | Backend Developer | Express server, REST API, office data model, all 5 endpoints |
| **Agent 3** | Frontend Developer | HTML/CSS/JS, Google Maps, filters, search, device panel, animations |
| **Agent 4** | Integrator & Tester | API integration, fallback logic, filter testing, marker sync, RTO filter verified ✅ |

---

## 🧪 Tested Features

- [x] Map loads with all 32 markers
- [x] Category filter (e.g., RTO → 3 offices shown correctly)
- [x] City filter works
- [x] Search by name, city, service
- [x] Office detail panel (address, hours, services, directions)
- [x] Hero search bar triggers map filter
- [x] Offline fallback when backend is not running
- [x] "My Location" button
- [x] "Get Directions" opens Google Maps navigation
- [x] Responsive on mobile & desktop

---

## 🎯 Digital India Mission

GOV Locator supports Digital India & e-Governance by making government office information instantly accessible to every citizen, reducing confusion, saving time, and improving transparency.
