# Candela Obscura Virtual Tabletop (VTT)

A real-time, custom VTT built for the Candela Obscura roleplaying game.

## Tech Stack
- **Backend:** Python, FastAPI, WebSockets, SQLAlchemy (SQLite)
- **Frontend:** React (Vite), Zustand, Tailwind CSS
- **Aesthetic:** Dark Academia (Parchment, Emerald Green, Gold)

## Prerequisites
- Python 3.10+
- Node.js & npm

## Setup & Running

### 1. Backend Setup
Navigate to the root directory and install Python dependencies:
```bash
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart "bcrypt==4.0.1"
```

Run the backend server:
```bash
uvicorn backend.main:app --reload
```
The server will start at `http://localhost:8000`. The SQLite database (`candela_obscura.db`) will be created automatically.

### 2. Frontend Setup
Navigate to the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```

Run the frontend development server:
```bash
npm run dev
```
The application will be available at the URL provided by Vite (usually `http://localhost:5173`).

## Key Features
- **Real-time Synchronization:** Game state updates instantly across all connected clients via WebSockets.
- **Automated Marks/Scars:** Taking a 4th mark automatically triggers the scarring sequence and Action Point Shift modal.
- **Dice Engine:** Supports standard rolls, zero-rating (2d6 take lowest), and gilded dice with Drive recovery logic.
- **Action Point Shift:** Enforces rules-compliant redistribution of stats during character scarring.
- **Dark Academia UI:** High-quality aesthetic designed to look like an investigator's ledger.

## Bug Fixes
- **ActionModule Stability:** Fixed the "Invalid array length" error by implementing safe rendering guards for action ratings and drive points.
