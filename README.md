# Metropolia AI International Student Advisor 🌍🇫🇮

A specialized AI assistant designed to guide international students through the complexities of Finnish bureaucracy and student life. Built for Metropolia University of Applied Sciences.

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

- **AI Engine**: Google Gemini API
- **Backend**: Python / Flask
- **Frontend**: Next.js / TypeScript

## ⚡ Quick Start

### Backend (Flask)
1. Install dependencies: `pip install -r requirements.txt`
2. Create a `.env` (or set env vars) with your `GEMINI_API_KEY`.
3. Run Flask using the Vercel-compatible entrypoint:
	- `python -m flask --app api.index run --port 5000 --debug`

### Frontend (Next.js)
1. Install dependencies: `npm install`
2. Run: `npm run dev`

Note: the frontend calls the API via relative paths like `/api/ask` and `/api/upload-doc`.

---

**Thank you for checking out my Metropolia AI International Student Advisor!** 🌍🇫🇮

If you have any questions or need further assistance, feel free to reach out.

— **Veikka Liukkonen**
