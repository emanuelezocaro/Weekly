// Backend minimo per Weekly: salva un unico blob JSON (tutto ciò che l'app
// manda, tranne il token) in una cella del foglio Google. Vedi README.md per
// le istruzioni di pubblicazione.

var SHEET_NAME = 'WeeklyData'
var TOKEN = 'CHANGE_ME' // sostituisci con una password a tua scelta

function doGet(e) {
  if (!isTokenValid(e.parameter && e.parameter.token)) {
    return jsonResponse({ error: 'Token non valido' })
  }
  var sheet = getSheet()
  var raw = sheet.getRange('A1').getValue()
  var data = raw ? JSON.parse(raw) : {}
  return jsonResponse(data)
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents)
  if (!isTokenValid(body.token)) {
    return jsonResponse({ error: 'Token non valido' })
  }
  var payload = {}
  for (var key in body) {
    if (key !== 'token') payload[key] = body[key]
  }
  var sheet = getSheet()
  sheet.getRange('A1').setValue(JSON.stringify(payload))
  return jsonResponse({ ok: true })
}

function isTokenValid(token) {
  return token === TOKEN
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME)
  return sheet
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
