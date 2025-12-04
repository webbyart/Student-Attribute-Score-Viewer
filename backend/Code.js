
/**
 * BACKEND CODE FOR GOOGLE APPS SCRIPT
 * 
 * Instructions:
 * 1. Paste this code into Code.gs
 * 2. CRITICAL: Select function 'triggerAuth' and click Run to authorize LINE connection.
 * 3. Run 'setupSheet' to create database tables and sample users.
 * 4. Deploy as Web App (Anyone, Me).
 */

// --- CONFIGURATION ---
const DEFAULT_SHEET_ID = '1tidL2kyTpvyPktQjkD5ZTvLIKvWEaIOS6TTmvDVuY6s';
// Fallback Token from User Request
const DEFAULT_LINE_TOKEN = 'vlDItyJKpyGjw6V7TJvo14KcedwDLc+M3or5zXnx5zu4W6izTtA6W4igJP9sc6CParnR+9hXIZEUkjs6l0QjpN6zdb2fNZ06W29X7Mw7YtXdG2/A04TrcDT6SuZq2oFJLE9Ah66iyWAAKQe2aWpCYQdB04t89/1O/w1cDnyilFU=';
const DEFAULT_GROUP_ID = 'C43845dc7a6bc2eb304ce0b9967aef5f5';

// --- AUTH HELPER ---
/**
 * ⚠️ IMPORTANT: RUN THIS FUNCTION MANUALLY IN SCRIPT EDITOR
 * This forces Google to ask for permission to connect to external services (LINE API).
 */
function triggerAuth() {
  Logger.log("Attempting to authorize external requests...");
  try {
    // This dummy call forces the authorization prompt for the scope: https://www.googleapis.com/auth/script.external_request
    UrlFetchApp.fetch("https://www.google.com");
    Logger.log("✅ Authorization Successful! You can now Deploy.");
  } catch (e) {
    Logger.log("❌ Error during auth check: " + e.toString());
  }
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  let isWrite = false;

  try {
    const params = e ? e.parameter : {};
    let payload = {};
    let action = params.action;
    let sheetId = params.sheet_id || DEFAULT_SHEET_ID;

    // 1. Try to parse POST body
    if (e && e.postData && e.postData.contents) {
      try {
        const parsedBody = JSON.parse(e.postData.contents);
        payload = parsedBody.payload || parsedBody;
        if (parsedBody.action) action = parsedBody.action;
        if (parsedBody.sheet_id) sheetId = parsedBody.sheet_id;
      } catch (err) {
        // failed to parse json
      }
    }

    if (!payload || Object.keys(payload).length === 0) {
      payload = params;
    }

    if (!action) {
      return createJSONOutput({ 
        status: 'ok', 
        message: 'API is running. Action parameter missing.',
        timestamp: new Date().toISOString()
      });
    }

    const writeActions = [
      'registerStudent', 'registerTeacher', 'createTask', 'updateTask', 
      'deleteTask', 'toggleTaskStatus', 'saveSystemSettings'
    ];
    
    isWrite = writeActions.includes(action);

    if (isWrite) {
      const success = lock.tryLock(5000); // Wait up to 5 seconds
      if (!success) {
        return createJSONOutput({ error: 'Server is busy (Lock Timeout). Please try again.' });
      }
    }

    let ss;
    try {
        ss = SpreadsheetApp.openById(sheetId);
    } catch(err) {
        return createJSONOutput({ error: 'Could not open Spreadsheet. Check ID.' });
    }

    let result = {};

    switch (action) {
      case 'checkHealth':
        result = checkHealth(ss);
        break;
      case 'getSystemSettings':
        result = getSettings(ss);
        break;
      case 'saveSystemSettings':
        result = saveSettings(ss, payload);
        break;
      case 'sendLineMessage':
        result = sendLineMessage(ss, payload.to, payload.messages, payload.token);
        break;
      case 'lineLogin':
        result = handleLineLogin(ss, payload.code, payload.redirectUri);
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
      case 'getTaskCompletions':
        result = getTaskCompletions(ss, payload.studentId || params.studentId);
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
        result = { error: 'Invalid Action: ' + action };
    }

    return createJSONOutput(result);

  } catch (error) {
    return createJSONOutput({ 
      success: false, 
      error: 'Server Error: ' + error.toString(), 
      stack: error.stack 
    });
  } finally {
    if (isWrite) {
      lock.releaseLock();
    }
  }
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- DATA OPERATIONS ---

function getData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; 
  
  const headers = data[0];
  const rows = data.slice(1).filter(r => r.some(c => c !== '')); 
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      if (!header) return; 
      const key = String(header).trim().toLowerCase().replace(/\s/g, '_');
      if (key) {
        obj[key] = row[i];
      }
    });
    return obj;
  });
}

function getTaskCompletions(ss, studentId) {
  const sheet = ss.getSheetByName('TaskCompletions');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const completions = [];
  const targetId = String(studentId).trim();
  
  if (!targetId) return [];

  for(let i=1; i<data.length; i++) {
    if (String(data[i][0]).trim() === targetId) {
      const val = data[i][2];
      if (val === true || String(val).toLowerCase() === 'true') {
         completions.push({ task_id: data[i][1], is_completed: true });
      }
    }
  }
  return completions;
}

function addRow(ss, sheetName, dataObj, uniqueKey) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet creation failed' };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (uniqueKey) {
    const existingData = getData(ss, sheetName);
    const searchKey = uniqueKey.toLowerCase();
    const dataObjKey = Object.keys(dataObj).find(k => k.toLowerCase() === searchKey);
    const searchValue = dataObjKey ? dataObj[dataObjKey] : null;
    
    if (searchValue) {
      const exists = existingData.find(d => String(d[searchKey]) == String(searchValue));
      if (exists) {
           return updateRow(ss, sheetName, searchValue, dataObj, uniqueKey);
      }
    }
  }

  const row = headers.map(header => {
    const key = Object.keys(dataObj).find(k => k.toLowerCase() === String(header).trim().toLowerCase().replace(/\s/g, '_'));
    return key && dataObj[key] !== undefined ? dataObj[key] : '';
  });

  sheet.appendRow(row);
  return { success: true, message: 'Added successfully', data: dataObj };
}

function updateRow(ss, sheetName, id, updates, idField) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s/g, '_'));
  const idIndex = headers.indexOf(idField.toLowerCase());
  
  if (idIndex === -1) return { success: false, message: 'ID field not found in headers' };

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { success: false, message: 'Record not found to update' };

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  currentHeaders.forEach((header, colIndex) => {
    const key = Object.keys(updates).find(k => k.toLowerCase() === String(header).trim().toLowerCase().replace(/\s/g, '_'));
    if (key && updates[key] !== undefined) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(updates[key]);
    }
  });

  return { success: true, message: 'Updated successfully' };
}

function deleteRow(ss, sheetName, id, idField) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s/g, '_'));
  const idIndex = headers.indexOf(idField.toLowerCase());

  if (idIndex === -1) return { success: false, message: 'ID field not found' };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Deleted successfully' };
    }
  }

  return { success: false, message: 'Record not found' };
}

function toggleTaskCompletion(ss, studentId, taskId, isCompleted) {
  const sheetName = 'TaskCompletions';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['student_id', 'task_id', 'is_completed', 'updated_at']);
  }
  
  const data = sheet.getDataRange().getValues();
  let found = false;
  
  const sId = String(studentId).trim();
  const tId = String(taskId).trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === sId && String(data[i][1]).trim() === tId) {
      sheet.getRange(i + 1, 3).setValue(isCompleted);
      sheet.getRange(i + 1, 4).setValue(new Date());
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow([sId, tId, isCompleted, new Date()]);
  }
  
  return { success: true, message: 'Status updated' };
}

function checkHealth(ss) {
  const tables = ['Students', 'Teachers', 'Tasks', 'Timetable', 'SystemSettings'];
  const status = tables.map(t => {
    const sheet = ss.getSheetByName(t);
    return { name: t, status: sheet ? 'ok' : 'missing' };
  });
  return { tables: status };
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('SystemSettings');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) settings[data[i][0]] = data[i][1];
  }
  
  if (!settings['line_channel_access_token']) settings['line_channel_access_token'] = DEFAULT_LINE_TOKEN;
  if (!settings['test_group_id']) settings['test_group_id'] = DEFAULT_GROUP_ID;

  return settings;
}

function saveSettings(ss, newSettings) {
  let sheet = ss.getSheetByName('SystemSettings');
  if (!sheet) {
    sheet = ss.insertSheet('SystemSettings');
    sheet.appendRow(['key', 'value']);
  }
  
  const data = sheet.getDataRange().getValues();
  const existingKeys = {};
  for(let i=1; i<data.length; i++) {
    existingKeys[data[i][0]] = i + 1; 
  }
  
  Object.keys(newSettings).forEach(key => {
    if (existingKeys[key]) {
      sheet.getRange(existingKeys[key], 2).setValue(newSettings[key]);
    } else {
      sheet.appendRow([key, newSettings[key]]);
      existingKeys[key] = sheet.getLastRow();
    }
  });
  
  return { success: true, message: 'Settings saved' };
}

// --- LINE ---

function handleLineLogin(ss, code, redirectUri) {
  const settings = getSettings(ss);
  const clientId = settings['line_login_channel_id'];
  const clientSecret = settings['line_channel_secret'];

  if (!clientId || !clientSecret) return { success: false, message: 'Line Login Config Missing in Sheet (SystemSettings)' };

  try {
    const tokenUrl = 'https://api.line.me/oauth2/v2.1/token';
    const payload = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    };

    const response = UrlFetchApp.fetch(tokenUrl, { method: 'post', payload: payload });
    const tokenData = JSON.parse(response.getContentText());
    
    const profileResponse = UrlFetchApp.fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    });
    const profile = JSON.parse(profileResponse.getContentText());
    
    // Check Students
    const students = getData(ss, 'Students');
    const student = students.find(s => s.line_user_id === profile.userId);
    if (student) {
      if (profile.pictureUrl && student.profile_image !== profile.pictureUrl) {
         updateRow(ss, 'Students', student.student_id, { profile_image: profile.pictureUrl }, 'student_id');
         student.profile_image = profile.pictureUrl; 
      }
      return { success: true, role: 'student', user: student, lineProfile: profile };
    }

    // Check Teachers
    const teachers = getData(ss, 'Teachers');
    const teacher = teachers.find(t => t.line_user_id === profile.userId);
    if (teacher) {
      return { success: true, role: 'teacher', user: teacher, lineProfile: profile };
    }

    return { success: false, message: 'User not registered', lineUserId: profile.userId, lineProfile: profile };
  } catch (e) {
    return { success: false, message: 'Line API Error: ' + e.toString() };
  }
}

function sendLineMessage(ss, to, messages, tokenOverride) {
  const settings = getSettings(ss);
  const token = tokenOverride || settings['line_channel_access_token'] || DEFAULT_LINE_TOKEN;
  
  if (!token) return { success: false, message: 'Line Token missing' };

  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify({ to: to, messages: messages }),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code >= 400) {
       Logger.log("LINE API Error: " + body);
       return { success: false, message: `LINE API Error (${code}): ${body}` };
    }

    return { success: true, message: 'Sent' };
  } catch (e) {
    return { success: false, message: 'Exception: ' + e.toString() };
  }
}

function setupSheet() {
  const ss = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
  
  const schema = {
    'Students': ['student_id', 'student_name', 'email', 'grade', 'classroom', 'password', 'line_user_id', 'profile_image'],
    'Teachers': ['teacher_id', 'name', 'email', 'password', 'line_user_id'],
    'Tasks': ['id', 'title', 'subject', 'description', 'due_date', 'category', 'priority', 'target_grade', 'target_classroom', 'target_student_id', 'created_by', 'created_at', 'attachments'],
    'Timetable': ['id', 'grade', 'classroom', 'day_of_week', 'period_index', 'period_time', 'subject', 'teacher', 'room'],
    'SystemSettings': ['key', 'value'],
    'TaskCompletions': ['student_id', 'task_id', 'is_completed', 'updated_at']
  };

  Object.keys(schema).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schema[sheetName]);
    } else {
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(schema[sheetName]);
      }
    }
  });
  
  const tSheet = ss.getSheetByName('Teachers');
  const tData = tSheet.getDataRange().getValues();
  
  // ADD ADMIN & TEACHERS DATA
  const teachersToAdd = [
    {id: 'T01', name: 'ART', email: 'admin@admin.com', pass: '123456', line: 'U37fa32592d34d55aa4d7190667e8d18d'},
    {id: 'T02', name: 'ครูอิ๋ม', email: 't02@email.com', pass: '123456', line: ''}
  ];

  teachersToAdd.forEach(t => {
      let exists = false;
      for(let i=1; i<tData.length; i++) {
        if(String(tData[i][0]) === t.id) exists = true;
      }
      if(!exists) {
          tSheet.appendRow([t.id, t.name, t.email, t.pass, t.line]);
      }
  });

  // ADD STUDENTS DATA
  const sSheet = ss.getSheetByName('Students');
  const sData = sSheet.getDataRange().getValues();
  const studentsToAdd = [
      {id: 'std001', name: 'สมชาย รักเรียน', email: 'somchai@school.ac.th', grade: 'ม.3', class: '3', pass: '123456', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai'},
      {id: 'std002', name: 'สมหญิง จริงใจ', email: 'somying@school.ac.th', grade: 'ม.3', class: '3', pass: '123456', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somying'}
  ];

  studentsToAdd.forEach(s => {
      let exists = false;
      for(let i=1; i<sData.length; i++) {
        if(String(sData[i][0]) === s.id) exists = true;
      }
      if(!exists) {
          sSheet.appendRow([s.id, s.name, s.email, s.grade, s.class, s.pass, '', s.img]);
      }
  });

  const sysSheet = ss.getSheetByName('SystemSettings');
  const sysData = sysSheet.getDataRange().getValues();
  const existingKeys = new Set();
  for(let i=1; i<sysData.length; i++) {
     existingKeys.add(sysData[i][0]);
  }
  
  if (!existingKeys.has('line_channel_access_token')) sysSheet.appendRow(['line_channel_access_token', DEFAULT_LINE_TOKEN]);
  if (!existingKeys.has('test_group_id')) sysSheet.appendRow(['test_group_id', DEFAULT_GROUP_ID]);
  if (!existingKeys.has('line_login_channel_id')) sysSheet.appendRow(['line_login_channel_id', '2008618173']);
}
