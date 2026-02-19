# Metropolia AI International Student Advisor 🌍🇫🇮 (UNOFFICIAL)

A specialized AI assistant designed to guide international students through the complexities of Finnish bureaucracy and student life. Built for Metropolia University of Applied Sciences.

## Features

- **Grounded Intelligence**: Uses Google Search Grounding to provide real-time, fact-checked answers from **selected sources** (Migri, Kela, YTHS, HUS, Metropolia).
- **Document Analysis**: Upload official letters or forms to receive instant summaries and actionable checklists.
- **Transparent Citations**: Every claim is cross-checked on the official institutional sites and backed by clickable sources.
- **Modern UI**: Responsive interface built with Next.js.

## Benefits for Metropolia Students

- **Reduced Workload**: Automates repetitive questions about permits, housing, and healthcare.
- **Student stress reduction**: Helps alleviate anxiety by providing clear, reliable information. There's no stupid questions!
- **24/7 Availability**: Provides instant support to students regardless of the time of the day or customer service availability.
- **Consistent Information**: Ensures all students receive standardized, up-to-date guidance based on official sources.
- **Language Support**: Breaks down language barriers by explaining bureocracy and student life in the language of the user.

## ⚠️ Disclaimer
This is a UNOFFICIAL tool and is unaffiliated with the actual Metropolia. This tool is still in the prototyping phase. It may produce inaccurate results. Users are solely responsible for verifying facts with official sources (migri.fi, kela.fi, metropolia.fi). The developer assumes no liability for actions taken based on this information.

## Tech Stack

- **AI**: Google Gemini API with Search Grounding
- **Backend `/api`**: Python / Flask
- **Frontend `/app`**: Next.js 16 / TypeScript + Tailwind CSS 4

## Quick Start

### Prerequisites
* Node.js 18+
* Python 3.10+
* GEMINI_API_KEY`

### Backend (Flask under `/api`)
1. Install dependencies: `pip install -r requirements.txt`.
2. Set `GEMINI_API_KEY` in `.env`. You can generate a free key at [Google AI Studio](https://aistudio.google.com/api-keys)
3. Run the API locally: `python -m flask --app api.index run --port 5000 --debug`.

### Frontend (Next.js)
1. Install dependencies: `npm install`.
2. Start the app: `npm run dev` (opens on http://localhost:3000).

### One-command local dev (Windows)
- `local-dev-start.bat` starts both servers in two terminals. Be sure `GEMINI_API_KEY` are set before running it.

### Alternative: Vercel-style local run
- If you have the Vercel CLI installed, `vercel dev` will run the Next.js frontend and the Python serverless functions together so `/api/*` routes are automatically proxied.

---

**Thank you for checking out my Metropolia AI International Student Advisor!** 🌍🇫🇮

If you have any questions or need further assistance, feel free to reach out.

— **Veikka Liukkonen**
