# EduTrack — Student Information Management System

**A modern academic management platform powered by Python Flask and Firebase Cloud Firestore.**

EduTrack is a web-based Student Information Management System developed for the Advanced Database Final Practical Activity. It provides a centralized platform for managing student information, courses, and enrollments through an elegant Plum & Champagne interface.

## Live Website

**Vercel Deployment:** [Open EduTrack Website](https://edutrack-plum-five.vercel.app/)

**Website URL:** https://edutrack-plum-five.vercel.app/

## System Features

- Interactive academic dashboard
- Student information management
- Course management
- Enrollment management
- Complete CRUD operations (Create, Read, Update, Delete)
- Individual record viewing
- Search and filtering functionality
- Input validation and confirmation dialogs
- Connected Firestore collections
- Responsive Plum & Champagne interface
- Cloud database integration
- Vercel website deployment

## Technologies Used

| Technology | Purpose |
|---|---|
| Python | Programming language |
| Flask | Backend framework |
| Firebase Cloud Firestore | NoSQL cloud database |
| HTML5 | Website structure |
| CSS3 | Styling and animations |
| JavaScript | Interactive functionality |
| PyCharm | Development environment |
| GitHub | Source code management |
| Vercel | Website hosting and deployment |

## Project Structure

```text
EduTrack/
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── app.py
├── firebase_config.py
├── seed_data.py
├── requirements.txt
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

## System Requirements

- Python 3.10 or higher
- Python 3.11 or 3.12 recommended
- PyCharm IDE
- Firebase account
- Cloud Firestore database
- Firebase service account credentials
- Internet connection

## Local Installation and Setup

1. Clone or download the GitHub repository.
2. Open the EduTrack project in PyCharm.
3. Create a Python virtual environment.
4. Install the required dependencies:

```powershell
python -m pip install -r requirements.txt
```

5. Create the environment configuration file:

```powershell
Copy-Item .env.example .env
```

6. Open Firebase Console and select your Firebase project.
7. Navigate to Project Settings → Service Accounts → Generate New Private Key.
8. Save the downloaded JSON file as `ServiceAccountKey.json` inside the project folder.
9. Configure the `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=ServiceAccountKey.json
FLASK_DEBUG=false
PORT=5000
```

10. Enable Cloud Firestore in your Firebase project.
11. Run the application:

```powershell
python app.py
```

12. Open the local website:

http://127.0.0.1:5000/

13. Check the Firestore connection:

http://127.0.0.1:5000/api/health

## Firebase Cloud Firestore Database

EduTrack uses three connected Firestore collections.

### 1. Students Collection

Collection name: `students`

| Field | Description |
|---|---|
| student_id | Unique student identification number |
| full_name | Complete student name |
| email | Student email address |
| gender | Student gender |
| birth_date | Date of birth |
| phone | Contact number |
| address | Residential address |
| status | Student status |
| created_at | Record creation timestamp |

### 2. Courses Collection

Collection name: `courses`

| Field | Description |
|---|---|
| course_code | Unique course code |
| course_name | Complete course name |
| department | Academic department |
| description | Course description |
| duration | Course duration |
| created_at | Record creation timestamp |

### 3. Enrollments Collection

Collection name: `enrollments`

| Field | Description |
|---|---|
| student_ref | Reference to student document ID |
| course_ref | Reference to course document ID |
| year_level | Student year level |
| section | Assigned section |
| school_year | Academic school year |
| status | Enrollment status |
| created_at | Record creation timestamp |

## Database Relationships

```text
Students ──────┐
               ├── Enrollments
Courses ───────┘
```

The enrollments collection connects student records with course records through Firestore document IDs.

Students and courses must be created before adding enrollments. Linked student and course records cannot be deleted until their associated enrollments are removed.

Collections are automatically created when the first record is successfully added.

## CRUD Operations

| Operation | Function |
|---|---|
| Create | Add new students, courses, and enrollments |
| Read | Display and view existing records |
| Update | Modify existing information |
| Delete | Remove eligible records |
| Search | Find specific records |

## API Endpoints

The students, courses, and enrollments collections support the following REST API operations:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/<collection>` | Retrieve all records |
| POST | `/api/<collection>` | Create a new record |
| GET | `/api/<collection>/<document_id>` | Retrieve an individual record |
| PUT | `/api/<collection>/<document_id>` | Update a record |
| DELETE | `/api/<collection>/<document_id>` | Delete a record |
| GET | `/api/health` | Check database connectivity |

API responses use JSON, success indicators, and appropriate HTTP status codes. Input validation is performed on the client and server.

## Sample Data

To populate Firestore with fictional sample records, run:

```powershell
python seed_data.py
```

The sample data includes:

- 6 fictional student records
- 3 course records
- 6 connected enrollment records

The seed script skips existing demo records when executed again.

## Vercel Deployment

EduTrack is configured for cloud deployment using Vercel.

### Deployment Instructions

1. Upload the project source code to GitHub.
2. Sign in to Vercel.
3. Import the EduTrack GitHub repository.
4. Navigate to Settings → Environment Variables.
5. Add the following environment variable:

| Variable | Value |
|---|---|
| FIREBASE_SERVICE_ACCOUNT | Complete Firebase service account JSON |

6. Save the environment variable.
7. Deploy or redeploy the application.

### Deployed Website

https://edutrack-plum-five.vercel.app/

### Firestore Connectivity Test

https://edutrack-plum-five.vercel.app/api/health

## Security and Data Privacy

- Firebase credentials are stored securely through environment variables.
- Service account JSON files must not be committed to GitHub.
- The `.env` file must remain private.
- Firestore operations are handled through the Firebase Admin SDK.
- Input validation helps prevent invalid database records.
- Linked record restrictions help maintain database consistency.

This project is intended for classroom demonstration purposes. It does not include user authentication. Only fictional sample records should be used, and public access should be restricted until authentication, authorization, CSRF protection, and other production security measures are implemented.

## Academic Submission

**Activity:** Advanced Database Final Practical Activity

**Project Title:** EduTrack — Student Information Management System

**Database:** Firebase Cloud Firestore

**Backend Framework:** Python Flask

**Deployment Platform:** Vercel

**Submission Requirements:**

- Private GitHub repository
- Complete project source code
- README documentation
- Three connected Firestore collections
- Functional CRUD operations
- Search and record viewing
- Input validation
- Instructor GitHub collaborator: `kidlat14`

**Submission Deadline:** December 7, 2026

**Full Timeliness Points:** Submit on or before December 6, 2026.

## Project Objective

EduTrack aims to simplify academic record management by providing an organized, accessible, and user-friendly platform for maintaining student information, managing courses, and monitoring enrollments using modern web technologies and a cloud-based NoSQL database.

## Acknowledgment

This project was developed as part of the Advanced Database Final Practical Activity to demonstrate practical knowledge of database management, web development, REST API integration, CRUD operations, and cloud deployment.

---

**EduTrack — Organize. Manage. Achieve.**

Powered by Python Flask, Firebase Cloud Firestore, and Vercel.
