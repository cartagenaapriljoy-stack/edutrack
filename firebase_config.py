import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    global _db
    if _db is not None:
        return _db
    path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '').strip()
    if not path:
        raise RuntimeError('Set GOOGLE_APPLICATION_CREDENTIALS in .env')
    file = Path(path)
    if not file.is_absolute():
        file = Path(__file__).resolve().parent / file
    if not file.is_file():
        raise RuntimeError(f'Firebase service account not found: {file}')
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(str(file)))
    _db = firestore.client()
    return _db
