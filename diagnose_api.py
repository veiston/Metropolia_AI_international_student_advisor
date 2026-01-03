"""
Vercel API diagnostic tool.
Helps debug backend issues on Vercel.
"""

import os
import sys
from pathlib import Path

def diagnose():
    """Run diagnostic checks for Vercel deployment."""
    
    print("=" * 60)
    print("Vercel Backend Diagnostic Report")
    print("=" * 60)
    print()
    
    # Check environment
    print("🔧 Environment:")
    print(f"  Python Version: {sys.version}")
    print(f"  Working Directory: {os.getcwd()}")
    print(f"  Platform: {sys.platform}")
    print()
    
    # Check environment variables
    print("🔐 Environment Variables:")
    gemini_key = os.getenv("GEMINI_API_KEY")
    vercel_env = os.getenv("VERCEL")
    print(f"  GEMINI_API_KEY: {'✅ SET' if gemini_key else '❌ MISSING'}")
    if gemini_key:
        print(f"    Length: {len(gemini_key)} chars")
        print(f"    Starts with: {gemini_key[:10]}...")
    print(f"  VERCEL: {vercel_env or 'not set (local environment)'}")
    print()
    
    # Check files
    print("📁 File Structure:")
    critical_files = [
        'api/index.py',
        'api/gemini.py',
        'api/pdfutils.py',
        'api/system_prompt.txt',
        'api/__init__.py',
        'requirements.txt'
    ]
    
    for filepath in critical_files:
        exists = os.path.isfile(filepath)
        status = "✅" if exists else "❌"
        print(f"  {status} {filepath}")
    print()
    
    # Test imports
    print("🔌 Module Imports:")
    
    try:
        import google.genai
        print("  ✅ google.genai")
    except ImportError as e:
        print(f"  ❌ google.genai - {e}")
    
    try:
        import flask
        print("  ✅ flask")
    except ImportError as e:
        print(f"  ❌ flask - {e}")
    
    try:
        import flask_cors
        print("  ✅ flask_cors")
    except ImportError as e:
        print(f"  ❌ flask_cors - {e}")
    
    try:
        import pypdf
        print("  ✅ pypdf")
    except ImportError as e:
        print(f"  ❌ pypdf - {e}")
    
    try:
        from dotenv import load_dotenv
        print("  ✅ python-dotenv")
    except ImportError as e:
        print(f"  ❌ python-dotenv - {e}")
    print()
    
    # Test API imports
    print("🎯 API Module Tests:")
    try:
        # Add current directory to path
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from api import gemini
        print("  ✅ api.gemini imports successfully")
        
        if gemini.API_KEY:
            print(f"    API_KEY loaded: {gemini.API_KEY[:10]}...")
        else:
            print("    ⚠️  API_KEY is None/empty")
            
    except Exception as e:
        print(f"  ❌ api.gemini - {e}")
    
    try:
        from api import pdfutils
        print("  ✅ api.pdfutils imports successfully")
    except Exception as e:
        print(f"  ❌ api.pdfutils - {e}")
    
    try:
        from api.error_handlers import handle_api_error
        print("  ✅ api.error_handlers imports successfully")
    except Exception as e:
        print(f"  ❌ api.error_handlers - {e}")
    
    try:
        from api.index import app
        print("  ✅ api.index (Flask app) imports successfully")
    except Exception as e:
        print(f"  ❌ api.index - {e}")
    print()
    
    print("=" * 60)
    print("Diagnostic Complete")
    print("=" * 60)
    print()
    print("✅ Deployment Ready" if gemini_key else "❌ MISSING: Set GEMINI_API_KEY environment variable")

if __name__ == "__main__":
    diagnose()
