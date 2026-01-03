#!/usr/bin/env python3
"""
Pre-deployment verification script for Vercel serverless deployment.
Run this before deploying to catch common configuration issues.
"""

import os
import sys
import json

def check_file_exists(filepath, required=True):
    """Check if a file exists."""
    exists = os.path.isfile(filepath)
    status = "✓" if exists else "✗"
    print(f"{status} {filepath}")
    
    if required and not exists:
        print(f"  ERROR: Required file missing!")
        return False
    return True

def check_requirements_txt():
    """Validate requirements.txt has all necessary packages."""
    required_packages = ['flask', 'flask-cors', 'google-generativeai', 'pypdf']
    
    try:
        with open('requirements.txt', 'r') as f:
            content = f.read().lower()
            
        missing = []
        for pkg in required_packages:
            if pkg not in content:
                missing.append(pkg)
        
        if missing:
            print(f"✗ requirements.txt - Missing packages: {', '.join(missing)}")
            return False
        else:
            print(f"✓ requirements.txt - All required packages present")
            return True
    except FileNotFoundError:
        print("✗ requirements.txt - File not found")
        return False

def check_vercel_json():
    """Validate vercel.json configuration."""
    try:
        with open('vercel.json', 'r') as f:
            config = json.load(f)
        
        # Check for rewrites
        if 'rewrites' not in config:
            print("✗ vercel.json - Missing 'rewrites' configuration")
            return False
        
        # Check for Python build configuration
        has_python_build = False
        if 'builds' in config:
            for build in config['builds']:
                if build.get('use') == '@vercel/python':
                    has_python_build = True
                    break
        
        if not has_python_build:
            print("⚠ vercel.json - No explicit Python build config (may auto-detect)")
        
        print("✓ vercel.json - Valid configuration")
        return True
        
    except FileNotFoundError:
        print("✗ vercel.json - File not found")
        return False
    except json.JSONDecodeError:
        print("✗ vercel.json - Invalid JSON")
        return False

def check_api_structure():
    """Validate API directory structure."""
    required_files = [
        'api/__init__.py',
        'api/index.py',
        'api/gemini.py',
        'api/system_prompt.txt'
    ]
    
    all_exist = True
    for filepath in required_files:
        if not check_file_exists(filepath, required=True):
            all_exist = False
    
    # Check for Flask app export in index.py
    try:
        with open('api/index.py', 'r') as f:
            content = f.read()
            
        if 'app = Flask(' not in content:
            print("✗ api/index.py - Flask app not properly exported")
            return False
            
        if 'app.run(' in content:
            print("⚠ api/index.py - Contains app.run() (should be removed for serverless)")
            
        print("✓ api/index.py - Flask app properly configured")
    except FileNotFoundError:
        return False
    
    return all_exist

def check_env_example():
    """Check for .env.example as documentation."""
    if os.path.isfile('.env.example'):
        print("✓ .env.example - Environment variable template exists")
        return True
    else:
        print("⚠ .env.example - Missing (optional but recommended)")
        return True

def main():
    print("=" * 60)
    print("Vercel Serverless Deployment Pre-flight Check")
    print("=" * 60)
    print()
    
    checks = []
    
    print("📁 File Structure:")
    print("-" * 60)
    checks.append(check_api_structure())
    checks.append(check_file_exists('next.config.ts'))
    checks.append(check_file_exists('package.json'))
    print()
    
    print("⚙️  Configuration Files:")
    print("-" * 60)
    checks.append(check_vercel_json())
    checks.append(check_requirements_txt())
    checks.append(check_env_example())
    print()
    
    print("=" * 60)
    if all(checks):
        print("✅ All checks passed! Ready for Vercel deployment.")
        print()
        print("Next steps:")
        print("1. Set GEMINI_API_KEY in Vercel Dashboard")
        print("2. Connect your GitHub repository to Vercel")
        print("3. Deploy with: vercel --prod")
        return 0
    else:
        print("❌ Some checks failed. Fix the issues above before deploying.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
