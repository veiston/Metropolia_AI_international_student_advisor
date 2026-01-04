"""Error handling decorator for Flask API endpoints."""

from flask import jsonify
from functools import wraps
import os


def handle_api_error(f):
    """Decorator for consistent error handling across API endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({"error": str(e), "type": "validation"}), 400
        except FileNotFoundError as e:
            return jsonify({"error": "Resource not found", "type": "not_found"}), 404
        except Exception as e:
            if os.getenv("VERCEL"):
                print(f"Error in {f.__name__}: {str(e)}")
            
            return jsonify({
                "error": "An unexpected error occurred",
                "type": "internal",
                "message": str(e) if not os.getenv("VERCEL") else "Please try again"
            }), 500
    
    return decorated_function
