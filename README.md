# EduTrack — Student Information Management System

Plum & Champagne Flask + Firebase Cloud Firestore CRUD application for the Advanced Database Final Practical Activity.

## Requirements
- Python 3.10+ (Python 3.11 or 3.12 recommended)
- PyCharm
- Firebase project with Cloud Firestore enabled
- Firebase service account JSON downloaded from Firebase Console > Project settings > Service accounts > Generate new private key

## Setup in PyCharm
1. Open this folder as a PyCharm project.
2. Create a virtual environment using Python 3.11 or newer.
3. In the PyCharm terminal run `pip install -r requirements.txt`.
4. Copy `.env.example` to `.env`.
5. Put your Firebase service account JSON in the project folder as `Serviceaccountkey.json` (or change the path in `.env`). **Never commit this file.**
6. Enable Cloud Firestore in your Firebase project. Use production mode; the Admin SDK uses server-side service account authorization and does not require public client access.
7. Run `python app.py` in PyCharm.
8. Visit `http://127.0.0.1:5000`.
9. Visit `http://127.0.0.1:5000/api/health` to check Firestore connectivity.

## Firestore collections
- `students`: student_id, full_name, email, gender, birth_date, phone, address, status, created_at
- `courses`: course_code, course_name, department, description, duration, created_at
- `enrollments`: student_ref (Firestore student document ID), course_ref (course document ID), year_level, section, school_year, status, created_at

Collections appear automatically when you create the first record in each module. Add students and courses before adding enrollments. Linked student/course records cannot be deleted until their enrollments are removed.

## API
Each collection (`students`, `courses`, `enrollments`) supports:
- `GET /api/<collection>` (optional `?q=search`)
- `POST /api/<collection>`
- `GET /api/<collection>/<document_id>`
- `PUT /api/<collection>/<document_id>`
- `DELETE /api/<collection>/<document_id>`

Responses are JSON with success flags and HTTP status codes. Forms validate inputs in browser and server. Searches filter loaded records. This is a **local classroom demonstration application without user authentication**; do not expose it publicly without authentication, authorization, CSRF protection, and production hardening.

## Submission
Push source files and README to a **private GitHub repository**. Add instructor account `kidlat14` as collaborator. Do not commit `.env` or service account JSON. Activity due December 7, 2026; rubric awards full timeliness points for submitting on or before December 6.

## Sample data
Run `python seed_data.py` to insert six fictional students, three courses and six linked enrollments. Re-running skips existing demo records.
