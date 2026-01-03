@echo off

REM Starts Flask (API) and Next.js (frontend) for local development.
REM Flask entrypoint is api/index.py (Vercel serverless-compatible).

start "flask-api" cmd /k "python -m flask --app api.index run --port 5000 --debug"
start "nextjs" cmd /k "npm run dev"
