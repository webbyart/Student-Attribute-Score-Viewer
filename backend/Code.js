
/**
 * BACKEND CODE FOR GOOGLE APPS SCRIPT
 * Version: 17.0 (Line Login Supported)
 */

const DEFAULT_SHEET_ID = '1Az2q3dmbbQBHOwZbjH8gk3t2THGYUbWvW82CFI1x2cE';

function triggerAuth() {
  UrlFetchApp.fetch("https://www.google.com");
}

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
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

    if (!action) return createJSONOutput({ status: 'ok', version: '17.0' });

    let ss;
    try { ss = SpreadsheetApp.openById(sheetId); } 
    catch(err) { return createJSONOutput({ error: 'Invalid Sheet ID' }); }

    let result = {};
    switch (action) {
      case 'checkHealth': result = checkHealth(ss); break;
      case 'getSystemSettings': result = getSettings(ss); break;
      case 'saveSystemSettings': result = saveSettings(ss, payload); break;
      case 'sendLineMessage': result = sendLineMessage(ss, payload.to, payload.messages, payload.token); break;
      case 'loginWithLine': result = loginWithLine(ss, payload.code, payload.redirectUri); break;
      case 'getStudents': result = getData(ss, 'Students'); break;
      case 'getTeachers': result = getData(ss, 'Teachers'); break;
      case 'getTasks': result = getData(ss, 'Tasks'); break;
      case 'getTaskCompletions': result = getTaskCompletions(ss, payload.studentId || params.studentId); break;
      case 'getTimetable': result = getData(ss, 'Timetable'); break;
      case 'getPortfolio': result = getPortfolio(ss, payload.studentId || params.studentId); break;
      case 'registerStudent': result = addRow(ss, 'Students', payload, 'student_id'); break;
      case 'registerTeacher': result = addRow(ss, 'Teachers', payload, 'email'); break;
      case 'createTask': result = addRow(ss, 'Tasks', payload, 'id'); break;
      case 'updateTask': result = updateRow(ss, 'Tasks', payload.id, payload.payload, 'id'); break;
      case 'deleteTask': result = deleteRow(ss, 'Tasks', payload.id, 'id'); break;
      case 'toggleTaskStatus': result = toggleTaskCompletion(ss, payload.studentId, payload.taskId, payload.isCompleted); break;
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
    safeData['_backendVersion'] = '17.0';
  }
  var jsonString = JSON.stringify(safeData);
  return ContentService.createTextOutput(jsonString).setMimeType(ContentService.MimeType.JSON);
}

function sanitize(data) {
  if (data === null || data === undefined) return null;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) {
    var newArr = [];
    for (var i = 0; i < data.length; i++) {
      newArr.push(sanitize(data[i]));
    }
    return newArr;
  }
  if (typeof data === 'object') {
    var newObj = {};
    for (var key in data) {
      newObj[key] = sanitize(data[key]);
    }
    return newObj;
  }
  return data;
}

// === AUTH HELPER ===

function loginWithLine(ss, code, redirectUri) {
  const settings = getSettings(ss);
  const clientId = settings['line_login_channel_id'];
  const clientSecret = settings['line_channel_secret']; 
  
  if (!clientId || !clientSecret) return { success: false, message: 'LINE Login not configured in System Settings' };

  try {
    const tokenUrl = 'https://api.line.me/oauth2/v2.1/token';
    const payload = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    };
    
    const tokenOptions = {
      method: 'post',
      payload: payload
    };
    
    const tokenReq = UrlFetchApp.fetch(tokenUrl, tokenOptions);
    const tokenRes = JSON.parse(tokenReq.getContentText());
    
    if (!tokenRes.access_token) return { success: false, message: 'Failed to obtain access token from LINE' };
    
    // Get Profile
    const profileUrl = 'https://api.line.me/v2/profile';
    const profileOptions = {
      headers: { 'Authorization': 'Bearer ' + tokenRes.access_token }
    };
    const profileReq = UrlFetchApp.fetch(profileUrl, profileOptions);
    const profile = JSON.parse(profileReq.getContentText());
    
    if (!profile.userId) return { success: false, message: 'Failed to get user profile from LINE' };
    
    const lineUserId = profile.userId;
    
    // Check Students
    const students = getData(ss, 'Students');
    for (var i=0; i<students.length; i++) {
      if (String(students[i].line_user_id) === String(lineUserId)) {
         return { success: true, role: 'student', user: students[i], lineProfile: profile };
      }
    }
    
    // Check Teachers
    const teachers = getData(ss, 'Teachers');
    for (var i=0; i<teachers.length; i++) {
      if (String(teachers[i].line_user_id) === String(lineUserId)) {
         return { success: true, role: 'teacher', user: teachers[i], lineProfile: profile };
      }
    }
    
    return { success: false, message: 'User not found', lineUserId: lineUserId, lineProfile: profile };
    
  } catch (e) {
    return { success: false, message: 'LINE Login Error: ' + e.message };
  }
}

// === DB OPERATIONS ===

function getData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  
  const headers = rows[0].map(function(h) { 
    return String(h).trim().toLowerCase().replace(/\s/g, '_'); 
  });
  
  const result = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var isEmpty = row.every(function(c) { return String(c) === ""; });
    if (isEmpty) continue;
    
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

function getPortfolio(ss, studentId) {
  const all = getData(ss, 'Portfolio');
  if (!studentId) return all;
  const target = String(studentId).toLowerCase();
  const filtered = [];
  for(var i=0; i<all.length; i++) {
    if (String(all[i].student_id).toLowerCase() === target) {
      filtered.push(all[i]);
    }
  }
  return filtered;
}

function getTaskCompletions(ss, studentId) {
  const sheet = ss.getSheetByName('TaskCompletions');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];
  const target = String(studentId).toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === target && String(data[i][2]).toLowerCase() === 'true') {
      list.push({ task_id: String(data[i][1]), is_completed: true });
    }
  }
  return list;
}

function addRow(ss, sheetName, data, keyField) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupSheet(); sheet = ss.getSheetByName(sheetName); }
  
  // Check dupes
  if (keyField && data[keyField]) {
    const existing = getData(ss, sheetName);
    const target = String(data[keyField]).toLowerCase();
    for(var k=0; k<existing.length; k++) {
       if (String(existing[k][keyField]).toLowerCase() === target) {
         return updateRow(ss, sheetName, data[keyField], data, keyField);
       }
    }
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim().toLowerCase().replace(/\s/g, '_');
    var val = data[h] !== undefined ? data[h] : '';
    if (Array.isArray(val) || typeof val === 'object') val = JSON.stringify(val);
    row.push(val);
  }
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateRow(ss, sheetName, id, updates, keyField) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s/g, '_'); });
  const keyIdx = headers.indexOf(keyField);
  
  if (keyIdx === -1) return { success: false, message: 'Key not found' };
  
  const target = String(id).toLowerCase();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]).toLowerCase() === target) {
      for (var k in updates) {
        var colIdx = headers.indexOf(k);
        if (colIdx > -1) {
          var val = updates[k];
          if (Array.isArray(val) || typeof val === 'object') val = JSON.stringify(val);
          sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      }
      return { success: true };
    }
  }
  return { success: false };
}

function deleteRow(ss, sheetName, id, keyField) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s/g, '_'); });
  const keyIdx = headers.indexOf(keyField);
  const target = String(id).toLowerCase();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]).toLowerCase() === target) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

function toggleTaskCompletion(ss, sId, tId, isComp) {
  var sheet = ss.getSheetByName('TaskCompletions');
  if (!sheet) { sheet = ss.insertSheet('TaskCompletions'); sheet.appendRow(['student_id','task_id','is_completed','updated_at']); }
  
  const data = sheet.getDataRange().getValues();
  const tsId = String(sId).toLowerCase();
  const ttId = String(tId).toLowerCase();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === tsId && String(data[i][1]).toLowerCase() === ttId) {
      sheet.getRange(i+1, 3).setValue(String(isComp));
      return { success: true };
    }
  }
  sheet.appendRow([sId, tId, String(isComp), new Date()]);
  return { success: true };
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('SystemSettings');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const conf = {};
  for(var i=1; i<data.length; i++) conf[data[i][0]] = data[i][1];
  return conf;
}

function saveSettings(ss, payload) {
  var sheet = ss.getSheetByName('SystemSettings');
  if (!sheet) { sheet = ss.insertSheet('SystemSettings'); sheet.appendRow(['key','value']); }
  const data = sheet.getDataRange().getValues();
  const map = {};
  for(var i=1; i<data.length; i++) map[data[i][0]] = i+1;
  
  for(var k in payload) {
    if(map[k]) sheet.getRange(map[k], 2).setValue(payload[k]);
    else { sheet.appendRow([k, payload[k]]); map[k] = sheet.getLastRow(); }
  }
  return { success: true };
}

function sendLineMessage(ss, to, messages, token) {
  const settings = getSettings(ss);
  const accToken = token || settings['line_channel_access_token'];
  if (!accToken) return { success: false, message: 'No Token' };
  
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accToken },
      payload: JSON.stringify({ to: to, messages: messages })
    });
    return { success: true };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

function checkHealth(ss) {
  return { version: '17.0', tables: [] };
}

// === SETUP (PURE SHEET - NO MOCK DATA) ===

function setupSheet() {
  const ss = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
  
  const defineSheet = (name, cols) => {
    let s = ss.getSheetByName(name);
    if (!s) { s = ss.insertSheet(name); s.appendRow(cols); }
    return s;
  };
  
  // Only Create Headers
  defineSheet('Students', ['student_id', 'student_name', 'email', 'grade', 'classroom', 'password', 'line_user_id', 'profile_image']);
  defineSheet('Teachers', ['teacher_id', 'name', 'email', 'password', 'line_user_id']);
  defineSheet('Tasks', ['id', 'title', 'subject', 'description', 'due_date', 'category', 'priority', 'target_grade', 'target_classroom', 'target_student_id', 'created_by', 'attachments', 'is_completed', 'created_at']);
  defineSheet('Timetable', ['id', 'grade', 'classroom', 'day_of_week', 'period_index', 'period_time', 'subject', 'teacher', 'room']);
  defineSheet('SystemSettings', ['key', 'value']);
  defineSheet('TaskCompletions', ['student_id', 'task_id', 'is_completed', 'updated_at']);
  defineSheet('Portfolio', ['id', 'student_id', 'title', 'description', 'category', 'image_url', 'date']);
}
