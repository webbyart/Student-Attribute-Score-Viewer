
/**
 * BACKEND CODE FOR GOOGLE APPS SCRIPT
 * 
 * Instructions:
 * 1. Go to https://script.google.com/
 * 2. Create a new project.
 * 3. Paste this code into Code.gs.
 * 4. Run the 'setupSheet' function once to initialize your sheet (it will create tabs if missing).
 * 5. Deploy as Web App:
 *    - Click "Deploy" > "New deployment"
 *    - Select type: "Web app"
 *    - Description: "API v1"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (IMPORTANT)
 * 6. Copy the "Web app URL" and paste it into services/api.ts as API_URL.
 */

// --- CONFIGURATION ---
// You can hardcode your sheet ID here if you want, or pass it from the frontend.
// The frontend currently passes it as a parameter 'sheet_id'.
const DEFAULT_SHEET_ID = '1tidL2kyTpvyPktQjkD5ZTvLIKvWEaIOS6TTmvDVuY6s';

// --- HELPERS ---

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = e.parameter;
    const action = params.action || (e.postData && JSON.parse(e.postData.contents).action);
    const sheetId = params.sheet_id || (e.postData && JSON.parse(e.postData.contents).sheet_id) || DEFAULT_SHEET_ID;
    
    let result = {};
    
    // Parse Payload for POST
    let payload = {};
    if (e.postData && e.postData.contents) {
      const parsedBody = JSON.parse(e.postData.contents);
      payload = parsedBody.payload || parsedBody;
    }

    const ss = SpreadsheetApp.openById(sheetId);

    switch (action) {
      case 'checkHealth':
        result = checkHealth(ss);
        break;
      case 'getStudents':
        result = getData(ss, 'Students');
        break;
      case 'getTeachers':
        result = getData(ss, 'Teachers');
        break;
      case 'getTasks':
        result = getData(ss, 'Tasks');
        break;
      case 'getTimetable':
        result = getData(ss, 'Timetable');
        break;
      case 'registerStudent':
        result = addRow(ss, 'Students', payload, 'student_id');
        break;
      case 'registerTeacher':
        result = addRow(ss, 'Teachers', payload, 'email');
        break;
      case 'createTask':
        result = addRow(ss, 'Tasks', payload, 'id');
        break;
      case 'updateTask':
        result = updateRow(ss, 'Tasks', payload.id, payload.payload, 'id');
        break;
      case 'deleteTask':
        result = deleteRow(ss, 'Tasks', payload.id, 'id');
        break;
      case 'toggleTaskStatus':
        result = toggleTaskCompletion(ss, payload.studentId, payload.taskId, payload.isCompleted);
        break;
      default:
        result = { error: 'Invalid Action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString(), 
      stack: error.stack 
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- CORE FUNCTIONS ---

function getData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // Only header or empty
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function addRow(ss, sheetName, dataObj, uniqueKey) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Create headers based on keys
    const headers = Object.keys(dataObj);
    sheet.appendRow(headers);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Check uniqueness if required
  if (uniqueKey) {
    const existingData = getData(ss, sheetName);
    const exists = existingData.find(d => d[uniqueKey] == dataObj[uniqueKey]);
    if (exists) return { success: false, message: 'Duplicate entry found' };
  }

  const row = headers.map(header => {
    return dataObj[header] !== undefined ? dataObj[header] : '';
  });

  sheet.appendRow(row);
  return { success: true, message: 'Added successfully', data: dataObj };
}

function updateRow(ss, sheetName, id, updates, idField) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idField);
  
  if (idIndex === -1) return { success: false, message: 'ID field not found in headers' };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(id)) {
      // Found row, update cols
      Object.keys(updates).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          // +1 because rows/cols are 1-based in GAS
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
        }
      });
      return { success: true, message: 'Updated successfully' };
    }
  }
  return { success: false, message: 'ID not found' };
}

function deleteRow(ss, sheetName, id, idField) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: 'Sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idField);
  
  if (idIndex === -1) return { success: false, message: 'ID field not found' };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Deleted successfully' };
    }
  }
  return { success: false, message: 'ID not found' };
}

function toggleTaskCompletion(ss, studentId, taskId, isCompleted) {
  // This is a bit complex in a flat sheet. We'll use a 'TaskCompletions' sheet.
  // Columns: task_id, student_id, completed_at
  
  let sheet = ss.getSheetByName('TaskCompletions');
  if (!sheet) {
    sheet = ss.insertSheet('TaskCompletions');
    sheet.appendRow(['task_id', 'student_id', 'completed_at', 'status']);
  }
  
  const data = sheet.getDataRange().getValues();
  // Try to find existing entry
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(taskId) && String(data[i][1]) === String(studentId)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex !== -1) {
    if (isCompleted) {
       sheet.getRange(rowIndex, 3).setValue(new Date().toISOString());
       sheet.getRange(rowIndex, 4).setValue('true');
    } else {
       sheet.deleteRow(rowIndex); // Remove completion record implies incomplete
    }
  } else if (isCompleted) {
    sheet.appendRow([taskId, studentId, new Date().toISOString(), 'true']);
  }
  
  return { success: true };
}

function checkHealth(ss) {
  const tables = ['Students', 'Teachers', 'Tasks', 'Timetable', 'TaskCompletions'];
  const status = tables.map(t => {
    const sheet = ss.getSheetByName(t);
    return { name: t, status: sheet ? 'ok' : 'missing' };
  });
  return { tables: status };
}

// --- SETUP UTILS ---
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Define Schemas
  const schemas = {
    'Students': ['student_id', 'student_name', 'email', 'grade', 'classroom', 'password', 'profile_image', 'line_user_id'],
    'Teachers': ['teacher_id', 'name', 'email', 'password', 'line_user_id'],
    'Tasks': ['id', 'title', 'subject', 'description', 'due_date', 'category', 'priority', 'target_grade', 'target_classroom', 'target_student_id', 'created_by', 'created_at', 'attachments', 'is_completed'],
    'Timetable': ['id', 'grade', 'classroom', 'day_of_week', 'period_index', 'period_time', 'subject', 'teacher', 'room']
  };

  Object.keys(schemas).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
    }
  });
}
