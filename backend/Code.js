
/**
 * BACKEND CODE FOR GOOGLE APPS SCRIPT
 * Version: 25.13 (Add Created At & Description to Flex)
 */

const DEFAULT_SHEET_ID = '1Az2q3dmbbQBHOwZbjH8gk3t2THGYUbWvW82CFI1x2cE';
const DEFAULT_LINE_TOKEN = 'vlDItyJKpyGjw6V7TJvo14KcedwDLc+M3or5zXnx5zu4W6izTtA6W4igJP9sc6CParnR+9hXIZEUkjs6l0QjpN6zdb2fNZ06W29X7Mw7YtXdG2/A04TrcDT6SuZq2oFJLE9Ah66iyWAAKQe2aWpCYQdB04t89/1O/w1cDnyilFU=';
const DEFAULT_GROUP_ID = 'C43845dc7a6bc2eb304ce0b9967aef5f5';

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

    if (!action) return createJSONOutput({ status: 'ok', version: '25.13' });

    let ss;
    try { ss = SpreadsheetApp.openById(sheetId); } 
    catch(err) { return createJSONOutput({ error: 'Invalid Sheet ID: ' + sheetId }); }

    let result = {};
    switch (action) {
      case 'checkHealth': result = checkHealth(ss); break;
      case 'getSystemSettings': result = getSettings(ss); break;
      case 'saveSystemSettings': result = saveSettings(ss, payload); break;
      case 'getStudents': result = getData(ss, 'Students'); break;
      case 'getTeachers': result = getData(ss, 'Teachers'); break;
      case 'getTasks': result = getData(ss, 'Tasks'); break;
      case 'getTaskCompletions': result = getTaskCompletions(ss, payload.studentId || params.studentId); break;
      case 'getTimetable': result = getData(ss, 'Timetable'); break;
      case 'getPortfolio': result = getPortfolio(ss, payload.studentId || params.studentId); break;
      case 'registerStudent': result = addRow(ss, 'Students', payload, 'student_id'); break;
      case 'bulkRegisterStudents': result = bulkAddRows(ss, 'Students', payload.students, 'student_id'); break;
      case 'registerTeacher': result = addRow(ss, 'Teachers', payload, 'teacher_id'); break; 
      case 'deleteStudent': result = deleteRow(ss, 'Students', payload.id, 'student_id'); break;
      case 'deleteTeacher': result = deleteRow(ss, 'Teachers', payload.id, 'teacher_id'); break;
      case 'createTask': 
          result = addRow(ss, 'Tasks', payload, 'id'); 
          // Send LINE Notification
          broadcastTaskLineMessage(ss, payload);
          break;
      case 'updateTask': result = updateRow(ss, 'Tasks', payload.id, payload.payload, 'id'); break;
      case 'deleteTask': result = deleteRow(ss, 'Tasks', payload.id, 'id'); break;
      case 'createTimetableEntry': result = addRow(ss, 'Timetable', payload, 'id'); break; 
      case 'deleteTimetableEntry': result = deleteRow(ss, 'Timetable', payload.id, 'id'); break;
      case 'toggleTaskStatus': result = toggleTaskCompletion(ss, payload.studentId, payload.taskId, payload.isCompleted); break;
      case 'addPortfolioItem': result = addRow(ss, 'Portfolio', payload, 'id'); break;
      case 'deletePortfolioItem': result = deleteRow(ss, 'Portfolio', payload.id, 'id'); break;
      case 'testLineMessage': result = testLineMessage(ss); break; 
      default: result = { error: 'Unknown Action: ' + action };
    }

    return createJSONOutput(result);

  } catch (error) {
    return createJSONOutput({ success: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function createJSONOutput(data) {
  var safeData = sanitize(data);
  return ContentService.createTextOutput(JSON.stringify(safeData)).setMimeType(ContentService.MimeType.JSON);
}

function sanitize(data) {
  if (data === null || data === undefined) return null;
  if (Object.prototype.toString.call(data) === '[object Date]' || data instanceof Date) {
    return data.toISOString();
  }
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
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = sanitize(data[key]);
      }
    }
    return newObj;
  }
  return data;
}

function getData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function(h) { 
    return String(h).trim().toLowerCase().replace(/\s/g, '_'); 
  });
  const result = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var isEmpty = true;
    for(var k=0; k<row.length; k++) { if(String(row[k]) !== "") { isEmpty = false; break; } }
    if (isEmpty) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      var cellVal = row[j];
      
      if (typeof cellVal === 'string' && cellVal.indexOf('Ljava.lang.Object') !== -1) {
          if (headers[j] === 'attachments') {
             obj[headers[j]] = '[]'; 
          } else {
             obj[headers[j]] = '';
          }
      } else if (cellVal instanceof Date) { 
          obj[headers[j]] = cellVal.toISOString(); 
      } else { 
          obj[headers[j]] = cellVal; 
      }
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
    if (String(all[i].student_id).toLowerCase() === target) filtered.push(all[i]);
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
    if (Array.isArray(val) || (typeof val === 'object' && val !== null)) val = JSON.stringify(val);
    row.push(val);
  }
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function bulkAddRows(ss, sheetName, studentsArray, keyField) {
  if (!Array.isArray(studentsArray) || studentsArray.length === 0) return { success: false, message: "No data provided" };
  
  let successCount = 0;
  let errors = [];

  for (var i = 0; i < studentsArray.length; i++) {
    try {
      var res = addRow(ss, sheetName, studentsArray[i], keyField);
      if (res.success) successCount++;
      else errors.push(studentsArray[i][keyField] + ": failed");
    } catch(e) {
      errors.push(studentsArray[i][keyField] + ": " + e.toString());
    }
  }
  
  return { success: true, count: successCount, errors: errors };
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
          if (Array.isArray(val) || (typeof val === 'object' && val !== null)) val = JSON.stringify(val);
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

function checkHealth(ss) { return { version: '25.13', tables: [] }; }

function setupSheet() {
  const ss = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
  
  const defineSheet = (name, cols) => {
    let s = ss.getSheetByName(name);
    if (!s) { s = ss.insertSheet(name); s.appendRow(cols); }
    return s;
  };
  
  defineSheet('Students', ['student_id', 'student_name', 'email', 'grade', 'classroom', 'password', 'profile_image']);
  defineSheet('Teachers', ['teacher_id', 'name', 'email', 'password']);
  defineSheet('Tasks', ['id', 'title', 'subject', 'description', 'due_date', 'category', 'priority', 'target_grade', 'target_classroom', 'target_student_id', 'created_by', 'attachments', 'is_completed', 'created_at']);
  defineSheet('Timetable', ['id', 'grade', 'classroom', 'day_of_week', 'period_index', 'period_time', 'subject', 'teacher', 'room']);
  defineSheet('SystemSettings', ['key', 'value']);
  defineSheet('TaskCompletions', ['student_id', 'task_id', 'is_completed', 'updated_at']);
  defineSheet('Portfolio', ['id', 'student_id', 'title', 'description', 'category', 'image_url', 'date']);
  
  // Set default settings if not exists
  saveSettings(ss, {
    'line_channel_access_token': DEFAULT_LINE_TOKEN,
    'test_group_id': DEFAULT_GROUP_ID
  });
}

// --- LINE FLEX MESSAGE LOGIC ---

function sendLineMessage(token, groupId, messages) {
  if (!token || !groupId) return { success: false, message: 'Missing token or group ID' };
  
  try {
    const options = {
      'method': 'post',
      'headers': {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      'payload': JSON.stringify({
        'to': groupId,
        'messages': messages
      })
    };
    
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function createTaskFlexMessage(task) {
  // 1. Determine Colors & Labels based on Category
  let headerColor = "#1DB446"; // Default Green
  let categoryLabel = "กิจกรรม";
  
  switch(task.category) {
    case 'HOMEWORK': 
      headerColor = "#FF6B00"; // Orange
      categoryLabel = "การบ้าน";
      break;
    case 'EXAM_SCHEDULE':
      headerColor = "#D32F2F"; // Red
      categoryLabel = "ตารางสอบ";
      break;
    case 'CLASS_SCHEDULE':
      headerColor = "#0288D1"; // Blue
      categoryLabel = "ตารางเรียน";
      break;
    case 'ACTIVITY_OUTSIDE':
      headerColor = "#9C27B0"; // Purple
      categoryLabel = "กิจกรรมภายนอก";
      break;
    case 'ACTIVITY_INSIDE':
      headerColor = "#43A047"; // Green
      categoryLabel = "กิจกรรมเสริม";
      break;
  }
  
  // 2. Format Dates
  const dueDateObj = new Date(task.due_date || task.dueDate);
  const dueDateStr = dueDateObj.toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'});
  const dueTimeStr = dueDateObj.toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'});

  const createdDateObj = new Date(task.created_at || new Date());
  const createdDateStr = createdDateObj.toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});

  // 3. Attachments Logic
  const attachments = task.attachments ? (Array.isArray(task.attachments) ? task.attachments : JSON.parse(task.attachments)) : [];
  const fileCount = attachments.length;

  // 4. Construct Flex Bubble Body
  const bubbleBodyContents = [
      {
        "type": "text",
        "text": task.title,
        "weight": "bold",
        "size": "xl",
        "wrap": true,
        "margin": "none"
      },
      {
        "type": "text",
        "text": "วิชา " + (task.subject || '-'),
        "size": "sm",
        "color": "#888888",
        "margin": "sm"
      },
      {
        "type": "separator",
        "margin": "md"
      },
      // Date Row
      {
        "type": "box",
        "layout": "baseline",
        "margin": "md",
        "spacing": "sm",
        "contents": [
          {
            "type": "text",
            "text": "📅 กำหนด:",
            "color": "#aaaaaa",
            "size": "sm",
            "flex": 2
          },
          {
            "type": "text",
            "text": `${dueDateStr} ${dueTimeStr} น.`,
            "wrap": true,
            "color": "#D32F2F",
            "size": "sm",
            "flex": 5,
            "weight": "bold"
          }
        ]
      },
      // Target Row
      {
        "type": "box",
        "layout": "baseline",
        "spacing": "sm",
        "contents": [
          {
            "type": "text",
            "text": "👥 สำหรับ:",
            "color": "#aaaaaa",
            "size": "sm",
            "flex": 2
          },
          {
            "type": "text",
            "text": `ชั้น ${task.targetGrade || task.target_grade || '-'}/${task.targetClassroom || task.target_classroom || '-'}`,
            "wrap": true,
            "color": "#666666",
            "size": "sm",
            "flex": 5
          }
        ]
      },
      // Creator Row
      {
        "type": "box",
        "layout": "baseline",
        "spacing": "sm",
        "contents": [
          {
            "type": "text",
            "text": "👤 ผู้แจ้ง:",
            "color": "#aaaaaa",
            "size": "sm",
            "flex": 2
          },
          {
            "type": "text",
            "text": task.createdBy || task.created_by || 'Admin',
            "wrap": true,
            "color": "#666666",
            "size": "sm",
            "flex": 5
          }
        ]
      },
      // Created At Row
      {
        "type": "box",
        "layout": "baseline",
        "spacing": "sm",
        "contents": [
          {
            "type": "text",
            "text": "🕒 สร้างเมื่อ:",
            "color": "#aaaaaa",
            "size": "sm",
            "flex": 2
          },
          {
            "type": "text",
            "text": createdDateStr + " น.",
            "wrap": true,
            "color": "#888888",
            "size": "sm",
            "flex": 5
          }
        ]
      },
      {
        "type": "separator",
        "margin": "md"
      },
      // Description Section
      {
        "type": "text",
        "text": "รายละเอียดเพิ่มเติม:",
        "size": "xs",
        "color": "#aaaaaa",
        "margin": "md",
        "weight": "bold"
      },
      {
        "type": "text",
        "text": task.description || '-',
        "wrap": true,
        "color": "#333333",
        "size": "sm",
        "margin": "sm"
      }
  ];

  // 5. Add Attachment Indicator if exists
  if (fileCount > 0) {
     bubbleBodyContents.push({
         "type": "separator",
         "margin": "md"
     });
     bubbleBodyContents.push({
         "type": "box",
         "layout": "horizontal",
         "margin": "md",
         "spacing": "md",
         "alignItems": "center",
         "backgroundColor": "#F1F8E9",
         "cornerRadius": "md",
         "paddingAll": "10px",
         "contents": [
             { "type": "text", "text": "📎", "size": "lg" },
             { "type": "text", "text": `มีไฟล์แนบ ${fileCount} รายการ`, "size": "sm", "color": "#33691E", "weight": "bold", "flex": 1 },
             { "type": "text", "text": "✔", "color": "#1DB446", "weight": "bold", "size": "lg" }
         ]
     });
  }

  // 6. Build Final Flex Object
  const flexMessage = {
    "type": "flex",
    "altText": `[ใหม่] ${categoryLabel}: ${task.title}`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": categoryLabel,
            "color": "#ffffff",
            "weight": "bold",
            "size": "lg"
          }
        ],
        "backgroundColor": headerColor,
        "paddingAll": "15px"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": bubbleBodyContents
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
           {
            "type": "button",
            "style": "primary",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "ดูรายละเอียดในเว็บ",
              "uri": "https://student-homework.netlify.app/" 
            },
            "color": headerColor
          }
        ],
        "paddingAll": "20px"
      }
    }
  };

  return flexMessage;
}

function broadcastTaskLineMessage(ss, task) {
  const settings = getSettings(ss);
  const token = settings['line_channel_access_token'] || DEFAULT_LINE_TOKEN;
  const groupId = settings['test_group_id'] || DEFAULT_GROUP_ID;

  if (!token) return;

  const flexMessage = createTaskFlexMessage(task);
  sendLineMessage(token, groupId, [flexMessage]);
}

function testLineMessage(ss) {
  const settings = getSettings(ss);
  const token = settings['line_channel_access_token'] || DEFAULT_LINE_TOKEN;
  const groupId = settings['test_group_id'] || DEFAULT_GROUP_ID;
  
  // Create Mock Task with full details
  const mockTask = {
      title: "ทดสอบส่งเข้า กลุ่ม",
      subject: "วิชาวิทยาการคำนวณ",
      description: "นี่คือตัวอย่างการแสดงผลแบบ Flex Message บน LINE (แสดงเวลาสร้างและรายละเอียดครบถ้วน)",
      due_date: new Date(new Date().getTime() + 86400000).toISOString(), // Tomorrow
      created_at: new Date().toISOString(), // Now
      category: "HOMEWORK",
      target_grade: "ม.3",
      target_classroom: "3",
      created_by: "ART",
      attachments: ["file1.pdf"]
  };
  
  const flexMessage = createTaskFlexMessage(mockTask);
  return sendLineMessage(token, groupId, [flexMessage]);
}
