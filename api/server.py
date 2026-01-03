"""Compatibility wrapper.

Vercel expects the serverless entrypoint in `api/index.py`.
Importing `app` from here keeps older imports working.
"""

from api.index import app  # noqa: F401
