"""
Error handlers for Flask API endpoints.
Provides consistent error responses across all routes.
"""

from flask import jsonify
from functools import wraps
import os


def handle_api_error(f):
    """
    Decorator for consistent error handling across API endpoints.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({"error": str(e), "type": "validation"}), 400
        except FileNotFoundError as e:
            return jsonify({"error": "Resource not found", "type": "not_found"}), 404
        except Exception as e:
            # Log error in production
            if os.getenv("VERCEL"):
                print(f"Unexpected error in {f.__name__}: {str(e)}")
            
            return jsonify({
                "error": "An unexpected error occurred",
                "type": "internal",
                "message": str(e) if not os.getenv("VERCEL") else "Please try again"
            }), 500
    
    return decorated_function


def validate_request_data(required_fields):
    """
    Decorator to validate required fields in request JSON.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask import request
            
            if not request.json:
                return jsonify({"error": "No JSON data provided"}), 400
            
            missing_fields = [field for field in required_fields if field not in request.json]
            
            if missing_fields:
                return jsonify({
                    "error": f"Missing required fields: {', '.join(missing_fields)}"
                }), 400
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator
