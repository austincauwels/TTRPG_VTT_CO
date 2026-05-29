# Candela Obscura Virtual Tabletop (VTT)

A real-time, custom VTT built for the Candela Obscura roleplaying game.

## Tech Stack
- **Backend:** Python, FastAPI, WebSockets, SQLAlchemy (SQLite / PostgreSQL)
- **Frontend:** React (Vite), Zustand, Tailwind CSS
- **Aesthetic:** Dark Academia (Parchment, Emerald Green, Gold)

## Prerequisites
- Python 3.10+
- Node.js 18+ & npm

---

## Local Development Setup

### 1. Backend — Environment Variables

The server requires a `SECRET_KEY` environment variable at startup. Copy the example file and fill it in:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set a secret key. For local dev any string works, but use a strong random value:

```bash
# Generate a secure key (paste the output into backend/.env)
openssl rand -hex 32
```

Your `backend/.env` should look like:

```
SECRET_KEY=your-generated-key-here
DATABASE_URL=sqlite:///./candela_obscura.db
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

### 2. Backend — Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Backend — Run the Server

```bash
cd backend
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. The SQLite database (`backend/candela_obscura.db`) is created automatically on first run.

> **Note:** The server reads environment variables from the shell. If you use a `.env` file, load it first:
> ```bash
> export $(grep -v '^#' backend/.env | xargs) && uvicorn main:app --reload
> ```
> Or use a tool like [`python-dotenv`](https://pypi.org/project/python-dotenv/) / [`direnv`](https://direnv.net/).

### 4. Frontend — Install Dependencies

```bash
cd frontend
npm install
```

### 5. Frontend — Run the Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`. The Vite dev server automatically proxies `/api`, `/campaign`, and `/ws` requests to the backend at `localhost:8000`.

---

## Running Both Servers Together

Open two terminal tabs from the project root:

**Terminal 1 — Backend:**
```bash
export $(grep -v '^#' backend/.env | xargs)
cd backend && uvicorn main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Key Features
- **Real-time Synchronization:** Game state updates instantly across all connected clients via WebSockets.
- **Role & Specialty Abilities:** Ability modifiers (Behind Me, Premonitions, Well-Read, etc.) are resolved server-side and factored into every roll.
- **Automated Marks/Scars:** Taking a 4th mark automatically triggers the scarring sequence and Action Point Shift modal.
- **Dice Engine:** Supports standard rolls, zero-rating (2d6 take lowest), gilded dice with Drive recovery logic, and group rolls.
- **Circle Creation:** Collaborative voting flow for circle name, ability, insignia, and relationship setup.
- **Notebook:** Per-campaign field log with player pen styles, GM entries, images, and visibility controls.
- **Dark Academia UI:** High-quality aesthetic designed to look like an investigator's ledger.
