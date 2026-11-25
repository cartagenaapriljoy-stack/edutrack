import os
import json
from pathlib import Path
from threading import RLock

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

_db = None
_lock = RLock()


def get_db():
    global _db

    with _lock:

        if _db is not None:
            return _db

        try:
            firebase_app = firebase_admin.get_app()

        except ValueError:

            firebase_json = os.getenv(
                "FIREBASE_SERVICE_ACCOUNT", ""
            ).strip()

            if firebase_json:
                # Vercel connection
                service_account = json.loads(firebase_json)
                cred = credentials.Certificate(service_account)

            else:
                # Local PyCharm connection
                path = os.getenv(
                    "GOOGLE_APPLICATION_CREDENTIALS",
                    "ServiceAccountKey.json"
                ).strip()

                file = Path(path)

                if not file.is_absolute():
                    file = BASE_DIR / file

                if not file.is_file():
                    raise RuntimeError(
                        f"Firebase service account not found: {file}"
                    )

                cred = credentials.Certificate(str(file))

            firebase_app = firebase_admin.initialize_app(cred)

        _db = firestore.client(app=firebase_app)

        return _db
