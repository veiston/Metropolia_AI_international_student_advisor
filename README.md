# AI Metropolia Student Advisor 🌍🇫🇮

A specialized AI assistant designed to guide students through the complexities of Finnish bureaucracy and student life. Built for Metropolia University of Applied Sciences.

## 🚀 Features

- **Grounded Intelligence**: Uses Google Search Grounding to provide real-time, fact-checked answers from **selected sources** (Migri, Kela, YTHS, HUS, Metropolia).
- **Document Analysis**: Upload official letters or forms to receive instant summaries and actionable checklists.
- **Transparent Citations**: Every claim is backed by clickable sources.
- **Modern UI**: Responsive interface built with Next.js.

## 🎓 Benefits for Metropolia Students

- **Reduced Workload**: Automates repetitive questions about permits, housing, and healthcare.
- **Student stress reduction**: Helps alleviate anxiety by providing clear, reliable information. There's no stupid questions!
- **24/7 Availability**: Provides instant support to students regardless of office hours or time zones.
- **Consistent Information**: Ensures all students receive standardized, up-to-date guidance based on official sources.
- **Language Support**: Breaks down language barriers by explaining bureocracy and student life in the language of the user.

## 🛠️ Tech Stack

- **AI Engine**: Google Gemini API with Search Grounding
- **Backend**: Python / Flask (Vercel serverless-compatible under `/api`)
- **Frontend**: Next.js 16 / TypeScript + Tailwind CSS 4

## ⚡ Quick Start

Prerequisites: Node 18+, Python 3.10+, a `GEMINI_API_KEY`, and (optional) the Vercel CLI if you prefer `vercel dev`.

### Backend (Flask under `/api`)
1. Install dependencies: `pip install -r requirements.txt`.
2. Set `GEMINI_API_KEY` in your shell (or `.env`).
3. Run the API locally: `python -m flask --app api.index run --port 5000 --debug`.

### Frontend (Next.js)
1. Install dependencies: `npm install`.
2. When running the Flask server separately, point the UI to it: `set NEXT_PUBLIC_API_BASE=http://localhost:5000` (Windows) or `export NEXT_PUBLIC_API_BASE=http://localhost:5000` (macOS/Linux).
3. Start the app: `npm run dev` (opens on http://localhost:3000).

### One-command local dev (Windows)
- `local-dev-start.bat` starts both servers in two terminals. Be sure `GEMINI_API_KEY` (and `NEXT_PUBLIC_API_BASE` if you override the default) are set before running it.

### Alternative: Vercel-style local run
- If you have the Vercel CLI installed, `vercel dev` will run the Next.js frontend and the Python serverless functions together so `/api/*` routes are automatically proxied.

---

**Thank you for checking out my Metropolia AI Student Advisor!** 🌍🇫🇮

If you have any questions or need further assistance, feel free to reach out.

— **Veikka Liukkonen**
