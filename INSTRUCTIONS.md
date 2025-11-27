# คู่มือการติดตั้งและใช้งานระบบดูคะแนนคุณลักษณะนักเรียน (เวอร์ชัน Google Sheets)

เอกสารนี้อธิบายสถาปัตยกรรม, การตั้งค่า, และการติดตั้งโปรเจกต์ทั้งหมด เพื่อให้คุณสามารถรันแอปพลิเคชันและเชื่อมต่อกับ Google Sheets ได้จริง

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture)

ระบบนี้แบ่งออกเป็น 2 ส่วนหลัก:

1.  **Frontend (Client-Side):**
    *   สร้างด้วย **React (Vite)** และ **TailwindCSS**
    *   ทำหน้าที่แสดงผล UI ทั้งหมด, จัดการสถานะของแอปพลิเคชัน (State Management), และเรียกใช้งาน API จากฝั่ง Backend
    *   โค้ดที่ให้มาคือส่วนนี้ทั้งหมด ซึ่งทำงานได้สมบูรณ์แบบโดยจำลองการทำงานของ Backend (Mock API)

2.  **Backend (Server-Side):**
    *   สร้างด้วย **Node.js** และ **Express.js**
    *   ทำหน้าที่เป็นตัวกลางในการเชื่อมต่อกับ **Google Sheets API**
    *   รับคำสั่งจาก Frontend (เช่น ขอข้อมูลนักเรียน, บันทึกคะแนน) แล้วไปดำเนินการอ่าน/เขียนข้อมูลใน Google Sheets
    *   **ส่วนนี้คุณจะต้องสร้างขึ้นมาเองตามคำแนะนำในเอกสารนี้**

**Workflow การทำงาน:**
`Frontend (React App) <--> Backend (Node.js API) <--> Google Sheets API <--> Google Sheet`

---

## 2. การตั้งค่า Google Sheets (Database)

1.  **สร้าง Google Sheet:**
    *   ไปที่ [sheets.google.com](https://sheets.google.com) และสร้าง Spreadsheet ใหม่
    *   **Sheet ID ที่แนะนำ:** `1SX726zHfE1M6P4AbHp2Qhk8YORgCwot2FOpy79gYg6o` (คุณสามารถใช้ Sheet ของคุณเองได้ แต่ต้องคัดลอกข้อมูลตัวอย่างไปใส่)
    *   **Sheet ID คืออะไร?** คือส่วนหนึ่งของ URL ของชีต: `https://docs.google.com/spreadsheets/d/`**[SHEET_ID]**`/edit`

2.  **สร้างชีตย่อย (Tabs) 4 ชีต:**
    *   ตั้งชื่อชีตย่อยให้ตรงกับนี้: `Students`, `Attributes`, `Scores`, `Teachers`

3.  **ใส่หัวข้อ (Headers) และข้อมูลตัวอย่าง:**
    *   คัดลอกข้อมูลด้านล่างไปวางในแต่ละชีต (แถวแรกคือ Header)

    **ชีต `Students`**
    | grade | classroom | student_id | student_name  |
    | :---- | :-------- | :--------- | :------------ |
    | ม.4   | 2         | std001     | สมศรี ใจดี    |
    | ม.4   | 2         | std002     | มานะ อดทน     |
    | ม.5   | 1         | std003     | ปิติ ยินดี     |


    **ชีต `Attributes`**
    | attribute_id | attribute_name                 | description                           |
    | :----------- | :----------------------------- | :------------------------------------ |
    | attr01       | ความรับผิดชอบ                     | รับผิดชอบต่องานที่ได้รับมอบหมาย        |
    | attr02       | ความมีระเบียบวินัย                  | ปฏิบัติตามกฎระเบียบของโรงเรียน        |
    | attr03       | ความซื่อสัตย์สุจริต                 | มีความซื่อสัตย์ ไม่ลอกการบ้าน           |
    | attr04       | ความมีน้ำใจช่วยเหลือผู้อื่น          | มีน้ำใจและให้ความช่วยเหลือเพื่อน       |
    | attr05       | ความคิดสร้างสรรค์                 | มีความคิดริเริ่มและสร้างสรรค์ผลงาน     |
    | attr06       | การทำงานเป็นทีม                    | ทำงานร่วมกับผู้อื่นได้ดี             |
    | attr07       | ความพยายามและความมุ่งมั่น          | มีความมุ่งมั่นตั้งใจในการเรียน         |
    | attr08       | มารยาทและกิริยาวาจา             | มีกิริยาวาจาสุภาพเรียบร้อย            |


    **ชีต `Scores`**
    | score_id | grade | classroom | student_id | attribute_id | score | comment                  | date                 |
    | :------- | :---- | :-------- | :--------- | :----------- | :---- | :----------------------- | :------------------- |
    | s01      | ม.4   | 2         | std001     | attr01       | 85    | ส่งงานตรงเวลาเสมอ        | 2023-10-15T10:00:00Z |
    | s02      | ม.4   | 2         | std001     | attr02       | 95    | แต่งกายถูกระเบียบทุกวัน | 2023-10-20T09:00:00Z |


    **ชีต `Teachers`**
    | teacher_id | name        | email           | password_hash  | created_at           |
    | :--------- | :---------- | :-------------- | :------------- | :------------------- |
    | t001       | ครูแอดมิน   | admin@admin.com | (hashed_pass)  | 2023-01-01T00:00:00Z |


---

## 3. การตั้งค่า Google Cloud & API Credentials

เพื่อให้ Backend ของเราสามารถเข้าถึง Google Sheet นี้ได้ เราต้องสร้าง "Service Account" ซึ่งเปรียบเสมือนบัญชีผู้ใช้ของโปรแกรม

1.  **สร้างโปรเจกต์ใน Google Cloud:**
    *   ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
    *   สร้างโปรเจกต์ใหม่ (New Project)

2.  **เปิดใช้งาน Google Sheets API:**
    *   ในโปรเจกต์ที่สร้าง, ไปที่ "APIs & Services" > "Library"
    *   ค้นหา "Google Sheets API" แล้วกด "Enable"

3.  **สร้าง Service Account:**
    *   ไปที่ "APIs & Services" > "Credentials"
    *   กด "Create Credentials" > "Service account"
    *   ตั้งชื่อ Service Account (เช่น `sheets-editor`) แล้วกด "Create and Continue"
    *   **Role:** ไม่ต้องเลือกก็ได้ กด "Continue"
    *   กด "Done"

4.  **สร้าง Key สำหรับ Service Account:**
    *   ในหน้า Credentials, ค้นหา Service Account ที่เพิ่งสร้าง แล้วคลิกเข้าไป
    *   ไปที่แท็บ "KEYS"
    *   กด "Add Key" > "Create new key"
    *   เลือก "JSON" แล้วกด "Create"
    *   ไฟล์ `credentials.json` (ชื่ออาจแตกต่างกัน) จะถูกดาวน์โหลดลงมา **เก็บไฟล์นี้ไว้ให้ดีและห้ามเปิดเผยต่อสาธารณะ**

5.  **แชร์ Google Sheet ให้ Service Account:**
    *   เปิดไฟล์ `credentials.json` ที่ดาวน์โหลดมา
    *   หาค่า `client_email` (เช่น `sheets-editor@....gserviceaccount.com`)
    *   กลับไปที่ Google Sheet ของคุณ, กดปุ่ม "Share" (มุมขวาบน)
    *   นำอีเมลจาก `client_email` ไปใส่ในช่องแชร์ แล้วให้สิทธิ์เป็น **"Editor"** จากนั้นกด "Share"

ตอนนี้ Backend ของเราก็พร้อมที่จะเข้าถึงและแก้ไขข้อมูลใน Google Sheet นี้แล้ว

---

## 4. การสร้าง Backend (Node.js)

**โครงสร้างไฟล์ Backend (ตัวอย่าง):**

```
/backend
  - node_modules/
  - index.js          // ไฟล์หลักของเซิร์ฟเวอร์
  - googleSheets.js   // โค้ดเชื่อมต่อ Google Sheets
  - credentials.json  // ไฟล์ key ที่ดาวน์โหลดมา
  - package.json
```

**ขั้นตอน:**

1.  **ติดตั้ง Dependencies:**
    ```bash
    mkdir backend
    cd backend
    npm init -y
    npm install express googleapis bcryptjs cors dotenv
    ```

2.  **วางไฟล์ `credentials.json`** ในโฟลเดอร์ `backend`

3.  **สร้างไฟล์ `googleSheets.js` (สำหรับเชื่อมต่อชีต):**
    ```javascript
    // googleSheets.js
    const { google } = require('googleapis');
    const path = require('path');

    const KEYFILEPATH = path.join(__dirname, 'credentials.json');
    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });

    const spreadsheetId = 'YOUR_SHEET_ID_HERE'; // <--- ใส่ Sheet ID ของคุณตรงนี้

    async function getSheetData(sheetName) {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName,
      });
      return response.data.values;
    }

    async function appendSheetData(sheetName, values) {
      const sheets = google.sheets({ version: 'v4', auth });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [values],
        },
      });
    }

    module.exports = { getSheetData, appendSheetData };
    ```

4.  **สร้างไฟล์ `index.js` (สร้าง API Endpoints):**
    ```javascript
    // index.js
    const express = require('express');
    const cors = require('cors');
    const bcrypt = require('bcryptjs');
    const { getSheetData, appendSheetData } = require('./googleSheets');

    const app = express();
    app.use(cors());
    app.use(express.json());

    // --- Student API ---
    app.get('/student/:studentId', async (req, res) => {
        try {
            const studentId = req.params.studentId;
            const students = await getSheetData('Students');
            const scores = await getSheetData('Scores');
            const attributes = await getSheetData('Attributes');

            const studentData = students.find(row => row[2] === studentId); // คอลัมน์ student_id
            if (!studentData) return res.status(404).send('Student not found');
            
            const studentScores = scores.filter(row => row[3] === studentId); // คอลัมน์ student_id
            
            // ... (แปลงข้อมูลให้อยู่ในรูปแบบที่ Frontend ต้องการ)
            // res.json({ student, scores, attributes });

            res.send(`Found student: ${studentData[3]}`); // ตัวอย่าง
        } catch (error) {
            res.status(500).send(error.toString());
        }
    });

    // --- Teacher API ---
    app.post('/teacher/register', async (req, res) => {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // ... (เพิ่มข้อมูลครูใหม่ลงในชีต 'Teachers')
        // await appendSheetData('Teachers', [newTeacherData]);
        
        res.status(201).send('Teacher registered');
    });

    // ... สร้าง API อื่นๆ ที่เหลือ (login, updateScore)

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    ```
    *นี่เป็นเพียงโค้ดตัวอย่าง คุณต้องเขียน Logic เพิ่มเติมเพื่อจัดการข้อมูลให้สมบูรณ์*

---

## 5. การตั้งค่า Frontend และเชื่อมต่อ Backend

1.  **รัน Frontend:**
    *   ในโฟลเดอร์โปรเจกต์ Frontend ที่คุณได้รับ, รันคำสั่ง:
        ```bash
        npm install
        npm run dev
        ```

2.  **เปลี่ยน API Endpoint:**
    *   ในไฟล์ `frontend/src/services/api.ts`, คุณจะต้องเปลี่ยนจากการเรียกใช้ข้อมูล Mock ไปเป็นการ `fetch` ข้อมูลจาก Backend (Node.js) ที่คุณสร้างขึ้น
    *   **ตัวอย่าง (แก้ไข `getStudentDataById`):**
        ```typescript
        // frontend/src/services/api.ts

        const API_URL = 'http://localhost:3001'; // URL ของ Backend

        export const getStudentDataById = async (studentId: string): Promise<StudentData | null> => {
            try {
                const response = await fetch(`${API_URL}/student/${studentId}`);
                if (!response.ok) {
                    return null;
                }
                const data = await response.json();
                return data;
            } catch (error) {
                console.error("API Error:", error);
                return null;
            }
        };

        // ... แก้ไขฟังก์ชันอื่นๆ ให้เรียก API จริง
        ```

---

## 6. การ Deploy

1.  **Frontend (React):**
    *   **Vercel (แนะนำ):** เชื่อมต่อ GitHub repository ของคุณกับ Vercel, มันจะทำการ build และ deploy ให้โดยอัตโนมัติ
    *   **Firebase Hosting:** รัน `npm run build`, จากนั้น deploy โฟลเดอร์ `dist` ที่ได้ขึ้น Firebase Hosting

2.  **Backend (Node.js):**
    *   **Vercel (Serverless Functions):** คุณสามารถแปลงไฟล์ `index.js` ของคุณให้เป็น Serverless Function และ deploy บน Vercel ได้
    *   **Google Cloud Run:** สร้าง Docker image จากโปรเจกต์ Node.js ของคุณ แล้วนำไป deploy บน Cloud Run ซึ่งเป็นบริการที่ปรับขนาดได้ดีเยี่ยม
    *   **Heroku, Render.com:** เป็นทางเลือกอื่นๆ ที่ง่ายต่อการ deploy แอปพลิเคชัน Node.js

**ข้อควรจำ:** เมื่อ Deploy, อย่าลืมตั้งค่า Environment Variables (เช่น `SHEET_ID`) และจัดการไฟล์ `credentials.json` อย่างปลอดภัย (อย่า commit ขึ้น Git)
