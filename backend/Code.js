
/**
 * BACKEND CODE FOR GOOGLE APPS SCRIPT
 * Version: 5.0 (Fail-safe JSON)
 * 
 * Instructions:
 * 1. Paste this code into Code.gs
 * 2. Run 'setupSheet' to create database tables.
 * 3. Deploy as Web App (Who has access: Anyone).
 */

// --- CONFIGURATION ---
const DEFAULT_SHEET_ID = '1Az2q3dmbbQBHOwZbjH8gk3t2THGYUbWvW82CFI1x2cE';
const DEFAULT_LINE_TOKEN = 'vlDItyJKpyGjw6V7TJvo14KcedwDLc+M3or5zXnx5zu4W6izTtA6W4igJP9sc6CParnR+9hXIZEUkjs6l0QjpN6zdb2fNZ06W29X7Mw7YtXdG2/A04TrcDT6SuZq2oFJLE9Ah66iyWAAKQe2aWpCYQdB04t89/1O/w1cDnyilFU=';
const DEFAULT_GROUP_ID = 'C43845dc7a6bc2eb304ce0b9967aef5f5';

function triggerAuth() {
  Logger.log("Attempting to authorize external requests...");
  try {
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

    // Robust Body Parsing
    if (e && e.postData && e.postData.contents) {
      try {
        const parsedBody = JSON.parse(e.postData.contents);
        payload = parsedBody.payload || parsedBody;
        if (parsedBody.action) action = parsedBody.action;
        if (parsedBody.sheet_id) sheetId = parsedBody.sheet_id;
      } catch (err) {
        // Fallback to parameters if JSON parse fails
      }
    }

    if (!payload || Object.keys(payload).length === 0) {
      payload = params;
    }

    if (!action) {
      return createJSONOutput({ status: 'ok', message: 'API is running. Action missing.', version: '5.0' });
    }

    const writeActions = [
      'registerStudent', 'registerTeacher', 'createTask', 'updateTask', 
      'deleteTask', 'toggleTaskStatus', 'saveSystemSettings', 
      'addPortfolioItem', 'deletePortfolioItem'
    ];
    
    isWrite = writeActions.includes(action);

    if (isWrite) {
      const success = lock.tryLock(5000);
      if (!success) return createJSONOutput({ error: 'Server busy. Try again.' });
    }

    let ss;
    try {
        ss = SpreadsheetApp.openById(sheetId);
    } catch(err) {
        return createJSONOutput({ error: 'Invalid Sheet ID: ' + sheetId });
    }

    let result = {};

    switch (action) {
      case 'checkHealth': result = checkHealth(ss); break;
      case 'getSystemSettings': result = getSettings(ss); break;
      case 'saveSystemSettings': result = saveSettings(ss, payload); break;
      case 'sendLineMessage': result = sendLineMessage(ss, payload.to, payload.messages, payload.token); break;
      case 'lineLogin': result = handleLineLogin(ss, payload.code, payload.redirectUri); break;
      case 'getStudents': result = getData(ss, 'Students'); break;
      case 'getTeachers': result = getData(ss, 'Teachers'); break;
      case 'getTasks': result = getData(ss, 'Tasks'); break;
      case 'getTaskCompletions': result = getTaskCompletions(ss, payload.studentId || params.studentId); break;
      case 'getTimetable': result = getData(ss, 'Timetable'); break;
      case 'registerStudent': result = addRow(ss, 'Students', payload, 'student_id'); break;
      case 'registerTeacher': result = addRow(ss, 'Teachers', payload, 'email'); break;
      case 'createTask': result = addRow(ss, 'Tasks', payload, 'id'); break;
      case 'updateTask': result = updateRow(ss, 'Tasks', payload.id, payload.payload, 'id'); break;
      case 'deleteTask': result = deleteRow(ss, 'Tasks', payload.id, 'id'); break;
      case 'toggleTaskStatus': result = toggleTaskCompletion(ss, payload.studentId, payload.taskId, payload.isCompleted); break;
      case 'getPortfolio': 
        const allP = getData(ss, 'Portfolio');
        const sId = payload.studentId || params.studentId;
        result = sId ? allP.filter(p => String(p.student_id).toLowerCase() === String(sId).toLowerCase()) : [];
        break;
      case 'addPortfolioItem': result = addRow(ss, 'Portfolio', payload, 'id'); break;
      case 'deletePortfolioItem': result = deleteRow(ss, 'Portfolio', payload.id, 'id'); break;
      default: result = { error: 'Invalid Action: ' + action };
    }

    return createJSONOutput(result);

  } catch (error) {
    return createJSONOutput({ success: false, error: 'Server Error: ' + String(error) });
  } finally {
    if (isWrite) lock.releaseLock();
  }
}

function createJSONOutput(data) {
  var jsonString = "{}";
  try {
    // Force conversion to standard JS objects to avoid Java wrapper issues
    var cleanData = JSON.parse(JSON.stringify(data === undefined ? null : data));
    jsonString = JSON.stringify(cleanData);
  } catch (e) {
    jsonString = JSON.stringify({ 
      error: "JSON Stringify Error", 
      details: String(e),
      message: "Data could not be serialized"
    });
  }
  return ContentService.createTextOutput(jsonString).setMimeType(ContentService.MimeType.JSON);
}

function getData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const range = sheet.getDataRange();
  const data = range.getValues(); 
  
  if (data.length < 2) return []; 
  
  const headers = data[0];
  const rows = data.slice(1).filter(r => r.some(c => c !== '')); 
  
  // Explicitly map to new plain objects
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      if (!header) return; 
      const key = String(header).trim().toLowerCase().replace(/\s/g, '_');
      if (key) {
        let cellValue = row[i];
        if (cellValue instanceof Date) {
            try {
               cellValue = cellValue.toISOString();
            } catch(e) {
               cellValue = String(cellValue);
            }
        } else if (cellValue === undefined || cellValue === null) {
            cellValue = "";
        } else {
            // Force string for IDs or mixed types to be safe
            if (key.includes('id') || key === 'password') {
                cellValue = String(cellValue);
            }
        }
        obj[key] = cellValue;
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
  const targetId = String(studentId).trim().toLowerCase();
  
  for(let i=1; i<data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === targetId) {
      const val = data[i][2];
      // Handle various boolean representations
      const isCompleted = (val === true || String(val).toLowerCase() === 'true');
      if (isCompleted) {
         completions.push({ task_id: String(data[i][1]), is_completed: true });
      }
    }
  }
  return completions;
}

function addRow(ss, sheetName, dataObj, uniqueKey) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupSheet(); sheet = ss.getSheetByName(sheetName); }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (uniqueKey) {
    const existingData = getData(ss, sheetName);
    const searchKey = uniqueKey.toLowerCase();
    const dataObjKey = Object.keys(dataObj).find(k => k.toLowerCase() === searchKey);
    const searchValue = dataObjKey ? dataObj[dataObjKey] : null;
    
    if (searchValue && existingData.find(d => String(d[searchKey]) == String(searchValue))) {
        return updateRow(ss, sheetName, searchValue, dataObj, uniqueKey);
    }
  }

  const row = headers.map(header => {
    const key = Object.keys(dataObj).find(k => k.toLowerCase() === String(header).trim().toLowerCase().replace(/\s/g, '_'));
    let val = (key && dataObj[key] !== undefined) ? dataObj[key] : '';
    if (val instanceof Date) val = val.toISOString();
    return val;
  });

  sheet.appendRow(row);
  return { success: true, message: 'Added', id: dataObj.id };
}

function updateRow(ss, sheetName, id, updates, idField) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s/g, '_'));
  const idIndex = headers.indexOf(idField.toLowerCase());
  
  if (idIndex === -1) return { success: false, message: 'ID not found' };

  const targetId = String(id).trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      currentHeaders.forEach((header, colIndex) => {
        const key = Object.keys(updates).find(k => k.toLowerCase() === String(header).trim().toLowerCase().replace(/\s/g, '_'));
        if (key && updates[key] !== undefined) {
          let val = updates[key];
          if (val instanceof Date) val = val.toISOString();
          sheet.getRange(i + 1, colIndex + 1).setValue(val);
        }
      });
      return { success: true, message: 'Updated' };
    }
  }
  return { success: false, message: 'Record not found' };
}

function deleteRow(ss, sheetName, id, idField) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s/g, '_'));
  const idIndex = headers.indexOf(idField.toLowerCase());
  const targetId = String(id).trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Deleted' };
    }
  }
  return { success: false, message: 'Record not found' };
}

function toggleTaskCompletion(ss, studentId, taskId, isCompleted) {
  const sheetName = 'TaskCompletions';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); sheet.appendRow(['student_id', 'task_id', 'is_completed', 'updated_at']); }
  
  const data = sheet.getDataRange().getValues();
  const sId = String(studentId).trim();
  const tId = String(taskId).trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === sId && String(data[i][1]).trim() === tId) {
      sheet.getRange(i + 1, 3).setValue(isCompleted);
      sheet.getRange(i + 1, 4).setValue(new Date());
      return { success: true };
    }
  }
  sheet.appendRow([sId, tId, isCompleted, new Date()]);
  return { success: true };
}

function checkHealth(ss) {
  const tables = ['Students', 'Teachers', 'Tasks', 'Timetable', 'SystemSettings', 'Portfolio'];
  const status = tables.map(t => ({ name: t, status: ss.getSheetByName(t) ? 'ok' : 'missing' }));
  return { tables: status, version: '5.0' };
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('SystemSettings');
  if (!sheet) return { 'line_channel_access_token': DEFAULT_LINE_TOKEN, 'test_group_id': DEFAULT_GROUP_ID };
  
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
  if (!sheet) { sheet = ss.insertSheet('SystemSettings'); sheet.appendRow(['key', 'value']); }
  
  const data = sheet.getDataRange().getValues();
  const existingKeys = {};
  for(let i=1; i<data.length; i++) existingKeys[data[i][0]] = i + 1;
  
  Object.keys(newSettings).forEach(key => {
    if (existingKeys[key]) sheet.getRange(existingKeys[key], 2).setValue(newSettings[key]);
    else { sheet.appendRow([key, newSettings[key]]); existingKeys[key] = sheet.getLastRow(); }
  });
  return { success: true, message: 'Settings saved' };
}

function handleLineLogin(ss, code, redirectUri) {
  const settings = getSettings(ss);
  const clientId = settings['line_login_channel_id'];
  const clientSecret = settings['line_channel_secret'];
  if (!clientId || !clientSecret) return { success: false, message: 'Line Login Config Missing' };

  try {
    const response = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'post', payload: {
        grant_type: 'authorization_code', code: code, redirect_uri: redirectUri,
        client_id: clientId, client_secret: clientSecret
      }
    });
    const tokenData = JSON.parse(response.getContentText());
    
    const profileResponse = UrlFetchApp.fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    });
    const profile = JSON.parse(profileResponse.getContentText());
    
    const students = getData(ss, 'Students');
    const student = students.find(s => String(s.line_user_id) === String(profile.userId));
    if (student) {
      if (profile.pictureUrl && student.profile_image !== profile.pictureUrl) {
         updateRow(ss, 'Students', student.student_id, { profile_image: profile.pictureUrl }, 'student_id');
         student.profile_image = profile.pictureUrl; 
      }
      return { success: true, role: 'student', user: student, lineProfile: profile };
    }

    const teachers = getData(ss, 'Teachers');
    const teacher = teachers.find(t => String(t.line_user_id) === String(profile.userId));
    if (teacher) return { success: true, role: 'teacher', user: teacher, lineProfile: profile };

    return { success: false, message: 'User not registered', lineUserId: profile.userId, lineProfile: profile };
  } catch (e) {
    return { success: false, message: 'Line API Error: ' + e.toString() };
  }
}

function sendLineMessage(ss, to, messages, token) {
  const accessToken = token || getSettings(ss)['line_channel_access_token'];
  if (!accessToken) return { success: false, message: 'Line Token missing' };

  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      payload: JSON.stringify({ to: to, messages: messages }),
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code >= 400) return { success: false, message: `LINE Error (${code}): ${response.getContentText()}` };
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
    'Tasks': ['id', 'title', 'subject', 'description', 'due_date', 'category', 'priority', 'target_grade', 'target_classroom', 'target_student_id', 'created_by', 'attachments', 'is_completed', 'created_at'],
    'Timetable': ['id', 'grade', 'classroom', 'day_of_week', 'period_index', 'period_time', 'subject', 'teacher', 'room'],
    'SystemSettings': ['key', 'value'],
    'TaskCompletions': ['student_id', 'task_id', 'is_completed', 'updated_at'],
    'Portfolio': ['id', 'student_id', 'title', 'description', 'category', 'image_url', 'date']
  };

  Object.keys(schema).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(schema[name]); }
  });
  
  // Seed initial data if empty
  const tSheet = ss.getSheetByName('Teachers');
  if (tSheet.getLastRow() <= 1) tSheet.appendRow(['T01', 'ART (Admin)', 'admin@admin.com', '123456', '']);
  
  // Seed std002 if missing
  const sSheet = ss.getSheetByName('Students');
  if (sSheet.getLastRow() <= 1) {
    sSheet.appendRow(['std001', 'สมชาย รักเรียน', 'somchai@school.ac.th', 'ม.3', '3', '123456', '', '']);
    sSheet.appendRow(['std002', 'สมหญิง จริงใจ', 'somying@school.ac.th', 'ม.3', '3', '123456', '', '']);
  }
}
