from app import get_db, validate
from datetime import datetime, timezone

def add(kind, key, data):
    db = get_db()
    ref = db.collection(kind).document(key)
    if ref.get().exists:
        return key
    unique = {'students':'student_id','courses':'course_code'}.get(kind)
    if unique:
        existing = next(db.collection(kind).where(unique, '==', data[unique]).limit(1).stream(), None)
        if existing:
            return existing.id
    data = validate(kind, data)
    ref.create(dict(data, created_at=datetime.now(timezone.utc).isoformat()))
    print('Added', kind, key)
    return key

def seed():
    courses = []
    for code, name, dept in [('BSIT','Information Technology','CICI'),('BSED','Secondary Education','COED'),('BSHM','Hospitality Management','CBMSD')]:
        courses.append(add('courses','demo-'+code,dict(course_code=code,course_name=name,department=dept,description='Sample undergraduate program',duration='4')))
    for i, name in enumerate(['Alex Reyes','Jamie Cruz','Sam Santos','Taylor Garcia','Casey Flores','Robin Mendoza'],1):
        key = add('students',f'demo-student-{i}',dict(student_id=f'DEMO-2026-{i:03}',full_name=name,email=f'student{i}@example.com',gender='Prefer not to say',birth_date='',phone='',address='Sample address',status='Active'))
        add('enrollments',f'demo-enrollment-{i}',dict(student_ref=key,course_ref=courses[(i-1)%3],year_level='1',section='A',school_year='2026-2027',status='Enrolled'))
    print('Sample data ready. Existing records were not overwritten.')

if __name__ == '__main__':
    seed()
