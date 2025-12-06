# AI Survival Guide for Finland 🇫🇮

This is a submission for the coding assignment. It is a lightweight web app that uses Google Gemini to help international students navigate Finnish bureaucracy.

## Structure

- **Backend/**: Flask application handling API requests and Gemini integration.
- **Frontend/**: Next.js application providing the user interface.

## Prerequisites

- Python 3.8+
- Node.js 18+
- Google Gemini API Key

## Setup Instructions

### 1. Backend Setup

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure API Key:
   - Open `.env` file.
   - Replace `your_api_key_here` with your actual Google Gemini API key.
5. Run the server:
   ```bash
   python Server.py
   ```
   The backend will run on `http://127.0.0.1:5000`.

### 2. Frontend Setup

1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`.

## Features

- **Smart Q&A**: Ask questions about residence permits, Kela, etc. Sources are cited.
- **Document Scanner**: Upload documents (e.g., admission letters) to get a personalized checklist.
- **Seeded Knowledge**: Includes pre-loaded context for Metropolia, Migri, and Kela.

## Tech Stack

- **Backend**: Flask, Google Generative AI SDK, SQLite
- **Frontend**: Next.js, Tailwind CSS, TypeScript
