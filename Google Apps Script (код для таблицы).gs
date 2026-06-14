/**
 * Выпускной 2026 — приём заявок в Google Таблицу (версия с диагностикой)
 * Скопируйте ВЕСЬ этот код в редактор Apps Script (заменив старый).
 */

// Приём заявок со страницы (POST)
function doPost(e) {
  return handle_(e, false);
}

// Открытие ссылки /exec в браузере (GET) — добавит ТЕСТОВУЮ строку для проверки
function doGet(e) {
  return handle_(e, true);
}

function handle_(e, isTest) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Дата заявки', 'Имя', 'Кто', 'Кол-во человек', 'Сумма (₸)', 'Гости']);
    }

    var d;
    if (isTest) {
      // тестовая запись при открытии ссылки в браузере
      d = { ts: new Date().toISOString(), name: '✅ ТЕСТ из браузера', role: 'Ученик', people: 1, total: 5000, guests: '' };
    } else {
      d = JSON.parse(e.postData.contents);
    }

    sheet.appendRow([
      new Date(d.ts),
      d.name || '',
      d.role || '',
      d.people || '',
      d.total || '',
      d.guests || ''
    ]);

    return ContentService
      .createTextOutput(isTest
        ? '✅ Работает! Откройте таблицу — там появилась тестовая строка. Эту строку можно удалить.'
        : JSON.stringify({ ok: true }))
      .setMimeType(isTest ? ContentService.MimeType.TEXT : ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput('Ошибка: ' + String(err))
      .setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}
