import os
import re
from datetime import datetime, timezone
from pathlib import Path
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from google.cloud.exceptions import GoogleCloudError
from firebase_config import get_db

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / '.env')
app = Flask(__name__)
SCHEMAS = {
    'students': ['student_id', 'full_name', 'email', 'gender', 'birth_date', 'phone', 'address', 'status'],
    'courses': ['course_code', 'course_name', 'department', 'description', 'duration'],
    'enrollments': ['student_ref', 'course_ref', 'year_level', 'section', 'school_year', 'status']
}

def fail(message, code=400):
    return jsonify(success=False, message=message), code

def serialize(snapshot):
    return {'id': snapshot.id, **(snapshot.to_dict() or {})}

def validate(kind, raw, current_id=None):
    if not isinstance(raw, dict):
        raise ValueError('Send a JSON object')
    fields = SCHEMAS[kind]
    data = {key: str(raw.get(key, '')).strip() for key in fields}
    required = {'students': ['student_id', 'full_name', 'email', 'status'],
                'courses': ['course_code', 'course_name', 'department', 'duration'],
                'enrollments': fields}[kind]
    for field in required:
        if not data[field]:
            raise ValueError(f'{field.replace("_", " ").title()} is required')
    if kind == 'students':
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', data['email']):
            raise ValueError('Enter a valid email address')
        if data['birth_date']:
            try:
                datetime.strptime(data['birth_date'], '%Y-%m-%d')
            except ValueError:
                raise ValueError('Birth date must be YYYY-MM-DD')
        if data['gender'] and data['gender'] not in ('Female', 'Male', 'Other', 'Prefer not to say'):
            raise ValueError('Invalid gender')
        if data['status'] not in ('Active', 'Inactive'):
            raise ValueError('Invalid student status')
    if kind == 'enrollments':
        if data['status'] not in ('Enrolled', 'Pending', 'Completed', 'Dropped'):
            raise ValueError('Invalid enrollment status')
        for field, collection in [('student_ref', 'students'), ('course_ref', 'courses')]:
            if not get_db().collection(collection).document(data[field]).get().exists:
                raise ValueError(f'Selected {collection[:-1]} no longer exists')
    if kind == 'courses':
        try:
            if int(data['duration']) < 1 or int(data['duration']) > 12:
                raise ValueError()
        except ValueError:
            raise ValueError('Duration must be 1–12 years')
    unique = {'students': 'student_id', 'courses': 'course_code'}.get(kind)
    if unique:
        for doc in get_db().collection(kind).where(unique, '==', data[unique]).stream():
            if doc.id != current_id:
                raise ValueError(f'{unique.replace("_", " ").title()} already exists')
    return data

@app.get('/')
def index():
    return render_template('index.html')

@app.get('/api/health')
def health():
    try:
        list(get_db().collection('students').limit(1).stream())
        return jsonify(success=True, message='Firestore connected')
    except Exception:
        app.logger.exception('Firestore connection failed')
        return fail('Firestore connection failed. Check credentials and network.', 503)

@app.route('/api/<kind>', methods=['GET', 'POST'])
def collection(kind):
    if kind not in SCHEMAS:
        return fail('Unknown collection', 404)
    try:
        ref = get_db().collection(kind)
        if request.method == 'GET':
            query = request.args.get('q', '').strip().casefold()
            docs = [serialize(doc) for doc in ref.stream()]
            if query:
                docs = [doc for doc in docs if any(query in str(v).casefold() for v in doc.values())]
            docs.sort(key=lambda d: str(d.get('created_at', '')), reverse=True)
            return jsonify(success=True, records=docs)
        data = validate(kind, request.get_json(silent=True))
        data['created_at'] = datetime.now(timezone.utc).isoformat()
        doc = ref.document()
        doc.set(data)
        return jsonify(success=True, message='Record created', record={'id': doc.id, **data}), 201
    except ValueError as exc:
        return fail(str(exc))
    except Exception:
        app.logger.exception('Collection operation failed')
        return fail('Database operation failed. Check Firestore configuration.', 503)

@app.route('/api/<kind>/<record_id>', methods=['GET', 'PUT', 'DELETE'])
def item(kind, record_id):
    if kind not in SCHEMAS:
        return fail('Unknown collection', 404)
    try:
        ref = get_db().collection(kind).document(record_id)
        doc = ref.get()
        if not doc.exists:
            return fail('Record not found', 404)
        if request.method == 'GET':
            return jsonify(success=True, record=serialize(doc))
        if request.method == 'DELETE':
            if kind in ('students', 'courses'):
                link_field = 'student_ref' if kind == 'students' else 'course_ref'
                if next(get_db().collection('enrollments').where(link_field, '==', record_id).limit(1).stream(), None):
                    return fail('Remove linked enrollments before deleting this record', 409)
            ref.delete()
            return jsonify(success=True, message='Record deleted')
        data = validate(kind, request.get_json(silent=True), record_id)
        data['updated_at'] = datetime.now(timezone.utc).isoformat()
        ref.update(data)
        return jsonify(success=True, message='Record updated', record={'id': record_id, **(ref.get().to_dict() or {})})
    except ValueError as exc:
        return fail(str(exc))
    except Exception:
        app.logger.exception('Item operation failed')
        return fail('Database operation failed. Check Firestore configuration.', 503)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.getenv('PORT', '5000')), debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')
