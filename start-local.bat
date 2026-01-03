@echo off
REM Local development startup script for Metropolia AI Advisor
REM Starts both Next.js frontend and Flask backend simultaneously

echo ========================================
echo Metropolia AI Advisor - Local Development
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing Node.js dependencies...
    call npm install
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo [INFO] Creating from .env.example...
    if exist ".env.example" (
        copy .env.example .env
        echo [ACTION REQUIRED] Edit .env and add your GEMINI_API_KEY
        echo.
        pause
    ) else (
        echo [ERROR] .env.example not found. Create .env manually with GEMINI_API_KEY
        pause
        exit /b 1
    )
)

REM Check if GEMINI_API_KEY is set
findstr /C:"GEMINI_API_KEY=your_api_key_here" .env >nul
if %errorlevel% equ 0 (
    echo [ERROR] GEMINI_API_KEY not configured in .env
    echo [ACTION REQUIRED] Edit .env and replace 'your_api_key_here' with your actual API key
    pause
    exit /b 1
)

echo [INFO] Starting Next.js development server...
echo [INFO] Frontend: http://localhost:3000
echo [INFO] API: http://localhost:3000/api/*
echo.
echo [TIP] Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start Next.js (it will handle both frontend and API routes in dev mode)
npm run dev
