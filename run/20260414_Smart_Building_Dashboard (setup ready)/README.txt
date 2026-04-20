================================================================
  SMART BUILDING DASHBOARD  |  Setup-Ready Package
  One-Click Setup & Launch for Any Windows Device
================================================================

QUICK START
-----------
1. Make sure Node.js 18+ is installed  →  https://nodejs.org
2. Double-click  LAUNCH.cmd
3. On first run, setup takes 3-5 minutes (downloads packages + builds)
4. Browser opens automatically at  http://localhost:5001

That's it.

----------------------------------------------------------------
FILES IN THIS FOLDER
----------------------------------------------------------------

  LAUNCH.cmd                ← MAIN ENTRY POINT — run this
  STOP.cmd                  ← Stop all running services
  BUNDLE-DEPS.cmd           ← Embed all dependencies (run once, then offline)
  PACK-FOR-SHARING.cmd      ← ZIP (slim, ~50 MB, needs internet on target)
  PACK-FOR-SHARING-FULL.cmd ← ZIP (full offline, ~400-800 MB, no internet)
  README.txt                ← This file

----------------------------------------------------------------
SERVICES STARTED BY LAUNCH.cmd
----------------------------------------------------------------

  Web Dashboard   http://localhost:5001
  Backend API     http://localhost:5000/api/v1/health

----------------------------------------------------------------
LOGIN ACCOUNTS (Demo Mode)
----------------------------------------------------------------

  admin@smartbuilding.com  /  admin123   — System Admin (full access)
  cfo@smartbuilding.com    /  cfo123     — CFO / Executive (reports)
  tech@smartbuilding.com   /  tech123    — Technician (ops view)

----------------------------------------------------------------
DEPLOYING TO ANOTHER DEVICE
----------------------------------------------------------------

TWO OPTIONS — pick based on internet availability on target:

Option A — Offline bundle (recommended, no internet needed)
  1. Run BUNDLE-DEPS.cmd on THIS machine  (one time, ~5-10 min)
     → Copies all node_modules + pre-built frontend into this folder
  2. Run PACK-FOR-SHARING-FULL.cmd
     → Creates a large ZIP (~400-800 MB) on your Desktop
  3. Copy ZIP to target device
  4. Unzip → double-click LAUNCH.cmd
  5. Starts in seconds. No npm, no build, no internet needed.

Option B — Slim package (needs internet on target, ~50 MB)
  1. Run PACK-FOR-SHARING.cmd
     → Creates a small ZIP on your Desktop
  2. Copy ZIP to target device (must have internet + Node.js 18+)
  3. Unzip → double-click LAUNCH.cmd
  4. First launch auto-installs packages and builds (~5 min)

----------------------------------------------------------------
REQUIREMENTS
----------------------------------------------------------------

  Node.js 18 or higher   https://nodejs.org/en/download
  Windows 10/11
  Internet connection    (only needed on first run for npm install)
  ~500 MB free disk space

No Docker, PostgreSQL, Redis, or MQTT needed.
The demo server runs entirely in Node.js with no external services.

----------------------------------------------------------------
PORTS USED
----------------------------------------------------------------

  5000  Backend API / Demo Server
  5001  Web Dashboard (Next.js)

----------------------------------------------------------------
TROUBLESHOOTING
----------------------------------------------------------------

  "Port already in use"
    → Run STOP.cmd first, then LAUNCH.cmd again.

  "npm install failed"
    → Check internet connection. Run LAUNCH.cmd again.

  "Build failed"
    → Delete the folder  src\frontend\.next  and run LAUNCH.cmd again.

  "Node.js not found"
    → Install from https://nodejs.org, restart your PC, then try again.

  Browser doesn't open
    → Manually navigate to  http://localhost:5001  after 15 seconds.

================================================================
