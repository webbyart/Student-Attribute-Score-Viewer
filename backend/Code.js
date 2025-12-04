
/**
 * BACKEND CODE FOR GOOGLE APPS SCRIPT
 * Version: 20.0 (User Management & LINE Login)
 */

const DEFAULT_SHEET_ID = '1Az2q3dmbbQBHOwZbjH8gk3t2THGYUbWvW82CFI1x2cE';

function triggerAuth() {
  UrlFetchApp.fetch("https://www.google.com");
}

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // 10 sec lock
  
  try {
    const params = e ? e.parameter : {};
    let payload = {};
    let action = params.action;
    let sheetId = params.sheet_id || DEFAULT_SHEET_ID;

    if (e && e.postData && e.postData.contents) {
      try {
        const json = JSON.parse(e.postData.contents);
        payload = json.payload || json;
        if (json.action) action = json.action;
        if (json.sheet_id) sheetId = json.sheet_id;
      } catch (err) {}
    }

    if (!payload || Object.keys(payload).length === 0) payload = params;

    // Ping
    if (!action) return createJSONOutput({ status: 'ok', version: '20.0', message: 'Backend is running' });

    let ss;
    try { ss = SpreadsheetApp.openById(sheetId); } 
    catch(err) { return createJSONOutput({ error: 'Invalid Sheet ID' }); }

    let result = {};
    switch (action) {
      // --- READ ---
      case 'checkHealth': result = checkHealth(ss); break;
      case 'getSystemSettings': result = getSettings(ss); break;
      case 'getStudents': result = getData(ss, 'Students'); break;
      case 'getTeachers': result = getData(ss, 'Teachers'); break;
      case 'getTasks': result = getData(ss, 'Tasks'); break;
      case 'getTaskCompletions': result = getTaskCompletions(ss, payload.studentId || params.studentId); break;
      case 'getTimetable': result = getData(ss, 'Timetable'); break;
      case 'getPortfolio': result = getPortfolio(ss, payload.studentId || params.studentId); break;
      
      // --- WRITE ---
      case 'saveSystemSettings': result = saveSettings(ss, payload); break;
      case 'sendLineMessage': result = sendLineMessage(ss, payload.to, payload.messages, payload.token); break;
      case 'loginWithLine': result = loginWithLine(ss, payload.code, payload.redirectUri); break;
      
      // --- USER MANAGEMENT ---
      case 'registerStudent': result = addRow(ss, 'Students', payload, 'student_id'); break;
      case 'registerTeacher': result = addRow(ss, 'Teachers', payload, 'email'); break;
      case 'deleteStudent': result = deleteRow(ss, 'Students', payload.id, 'id'); break; // Using UUID 'id'
      case 'deleteTeacher': result = deleteRow(ss, 'Teachers', payload.teacher_id, 'teacher_id'); break;

      // --- TASK MANAGEMENT ---
      case 'createTask': result = addRow(ss, 'Tasks', payload, 'id'); break;
      case 'updateTask': result = updateRow(ss, 'Tasks', payload.id, payload.payload, 'id'); break;
      case 'deleteTask': result = deleteRow(ss, 'Tasks', payload.id, 'id'); break;
      case 'toggleTaskStatus': result = toggleTaskCompletion(ss, payload.studentId, payload.taskId, payload.isCompleted); break;
      
      // --- PORTFOLIO ---
      case 'addPortfolioItem': result = addRow(ss, 'Portfolio', payload, 'id'); break;
      case 'deletePortfolioItem': result = deleteRow(ss, 'Portfolio', payload.id, 'id'); break;
      
      default: result = { error: 'Unknown Action: ' + action };
    }

    return createJSONOutput(result);

  } catch (error) {
    return createJSONOutput({ success: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

// === STRICT JSON OUTPUT ===
function createJSONOutput(data) {
  var safeData = sanitize(data);
  if (typeof safeData === 'object' && safeData !== null && !Array.isArray(safeData)) {
    safeData['_backendVersion'] = '20.0';
  }
  return ContentService.createTextOutput(JSON.stringify(safeData)).setMimeType(ContentService.MimeType.JSON);
}

function sanitize(data) {
  if (data === null || data === undefined) return null;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data === 'object') {
    var newObj = {};
    for (var key in data) newObj[key] = sanitize(data[key]);
    return newObj;
  }
  return String(data); // Force string for safety
}

// === OPERATIONS ===

function setupSheet() {
  const ss = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
  
  // Exact columns as requested + essential system cols
  const tables = {
    'Tasks': ['id', 'title', 'subject', 'description', 'due_date', 'category', 'priority', 'target_grade', 'target_classroom', 'target_student_id', 'created_by', 'attachments', 'is_completed', 'created_at'],
    'Students': ['id', 'student_id', 'student_name', 'email', 'grade', 'classroom', 'password', 'profile_image', 'line_user_id'],
    'Teachers': ['teacher_id', 'name', 'email', 'password', 'line_user_id'],
    'TaskCompletions': ['student_id', 'task_id', 'completed_at'],
    'SystemSettings': ['key', 'value'],
    'Timetable': ['id', 'grade', 'classroom', 'day_of_week', 'period_index', 'period_time', 'subject', 'teacher', 'room'],
    'Portfolio': ['id', 'student_id', 'title', 'description', 'category', 'image_url', 'date']
  };

  for (let name in tables) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(tables[name]);
    } else {
      // Optional: Check if headers match, but avoiding destructive changes
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (headers.length === 0) sheet.appendRow(tables[name]);
    }
  }
  
  // Create default admin if Teachers is empty
  const teacherSheet = ss.getSheetByName('Teachers');
  if (teacherSheet.getLastRow() < 2) {
    // teacher_id, name, email, password, line_user_id
    teacherSheet.appendRow(['T01', 'Admin Master', 'admin@admin.com', '123456', '']);
  }
}

function getData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim().replace(/ /g, '_'));
  const result = [];
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = row[j];
    result.push(obj);
  }
  return result;
}

function addRow(ss, sheetName, data, idField) {
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim().replace(/ /g, '_'));
  
  // Auto ID
  if (idField && !data[idField]) {
     data[idField] = Utilities.getUuid();
  }

  const newRow = headers.map(h => data[h] || '');
  sheet.appendRow(newRow);
  return { success: true, data: data };
}

function updateRow(ss, sheetName, id, data, idField) {
  const sheet = ss.getSheetByName(sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0].map(h => String(h).toLowerCase().trim().replace(/ /g, '_'));
  const idIdx = headers.indexOf(idField);
  
  if (idIdx === -1) return { success: false, message: 'ID col not found' };
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(id)) {
      const rowToUpdate = [];
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        rowToUpdate.push(data[key] !== undefined ? data[key] : allData[i][j]);
      }
      sheet.getRange(i + 1, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
      return { success: true };
    }
  }
  return { success: false, message: 'Row not found' };
}

function deleteRow(ss, sheetName, id, idField) {
  const sheet = ss.getSheetByName(sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0].map(h => String(h).toLowerCase().trim().replace(/ /g, '_'));
  const idIdx = headers.indexOf(idField);
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Row not found' };
}

function getTaskCompletions(ss, studentId) {
  const data = getData(ss, 'TaskCompletions');
  if (!studentId) return data;
  return data.filter(r => String(r.student_id) === String(studentId));
}

function toggleTaskCompletion(ss, studentId, taskId, isCompleted) {
  const sheet = ss.getSheetByName('TaskCompletions');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(studentId) && String(data[i][1]) === String(taskId)) {
      if (!isCompleted) sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  if (isCompleted) sheet.appendRow([studentId, taskId, new Date().toISOString()]);
  return { success: true };
}

function getPortfolio(ss, studentId) {
  const data = getData(ss, 'Portfolio');
  if (!studentId) return data;
  return data.filter(r => String(r.student_id) === String(studentId));
}

function getSettings(ss) {
  const data = getData(ss, 'SystemSettings');
  const settings = {};
  data.forEach(r => { if(r.key) settings[r.key] = r.value; });
  return settings;
}

function saveSettings(ss, newSettings) {
  const sheet = ss.getSheetByName('SystemSettings');
  const data = sheet.getDataRange().getValues();
  for (let key in newSettings) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(newSettings[key]);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, newSettings[key]]);
  }
  return { success: true, message: 'Saved' };
}

function sendLineMessage(ss, to, messages, token) {
  const settings = getSettings(ss);
  const accessToken = token || settings['line_channel_access_token'];
  if (!accessToken) return { success: false, message: 'No Token' };
  
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      payload: JSON.stringify({ to: to, messages: messages }),
      muteHttpExceptions: true
    });
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function loginWithLine(ss, code, redirectUri) {
  const settings = getSettings(ss);
  const clientId = settings['line_login_channel_id'];
  const clientSecret = settings['line_channel_secret'];
  if (!clientId) return { success: false, message: 'LINE Login not configured' };

  try {
    const tokenRes = JSON.parse(UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'post',
      payload: { grant_type: 'authorization_code', code: code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret },
      muteHttpExceptions: true
    }).getContentText());
    
    if (!tokenRes.access_token) return { success: false, message: 'Token Error' };

    const profile = JSON.parse(UrlFetchApp.fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': 'Bearer ' + tokenRes.access_token },
      muteHttpExceptions: true
    }).getContentText());

    if (!profile.userId) return { success: false, message: 'Profile Error' };

    const s = getData(ss, 'Students').find(x => x.line_user_id === profile.userId);
    const t = getData(ss, 'Teachers').find(x => x.line_user_id === profile.userId);

    if (s) return { success: true, role: 'student', user: s, lineProfile: profile };
    if (t) return { success: true, role: 'teacher', user: t, lineProfile: profile };
    return { success: false, message: 'Unregistered', lineUserId: profile.userId, lineProfile: profile };
  } catch(e) { return { success: false, message: e.toString() }; }
}
