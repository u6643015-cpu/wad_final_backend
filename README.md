# Online Course Service Backend

## Student Information

- **Student Name:** Yan Naing Lin Aung
- **Student ID:** 6643015

## Setup

1. Install Node.js 20 or newer and npm.
2. Install the dependencies:

   ```bash
   npm ci
   ```

3. Create `.env.local` in the repository root:

   ```env
   MONGODB_URI=mongodb+srv://u6643015_db_user:wadfinalexam@cluster0.dcqeinw.mongodb.net/
   MONGODB_DB=cx4107_courses
   JWT_SECRET=e56099e397633aecabbf4ea376428fd9075f3d41339eb5b8a668d2b1b3a082fe
   FRONTEND_URL=http://localhost:5173
   ```

4. Seed the test users and courses, then start the server:

   ```bash
   npm run seed
   npm run dev
   ```

5. The backend API runs at `http://localhost:3000`.

## Test Credentials

All test accounts use the password `Demo123!`.

| Role | Username | Email |
| --- | --- | --- |
| Student | student1 | student1@example.com |
| Student | student2 | student2@example.com |
| Student | student3 | student3@example.com |
| Teacher | teacher1 | teacher1@example.com |
| Teacher | teacher2 | teacher2@example.com |
| Teacher | teacher3 | teacher3@example.com |

## Deployment

- Backend repository: https://github.com/u6643015-cpu/wad_final_backend
- Frontend repository: https://github.com/u6643015-cpu/wad_final_frontend
- Deployed backend: https://wad-final-backend-two.vercel.app
- Deployed frontend: https://wad-final-frontend-six.vercel.app

