/**
 * Save With Property: Telegram auto poster (Google Apps Script, free).
 *
 * Reads the "SWP Telegram Queue" sheet. Every row whose status is "approved"
 * is posted to the channel as its card image with the text as the caption,
 * then marked "posted" (or "error" with the reason).
 *
 * Setup (once):
 * 1. Project Settings (gear icon) > Script Properties > add:
 *      TELEGRAM_TOKEN = the token from @BotFather
 *      CHANNEL        = @yourchannelusername  (or the numeric id for a private channel)
 * 2. Run testConnection once and approve the Google permissions.
 * 3. Run installTrigger once. From then on it checks the sheet every 5 minutes.
 */

var SHEET_ID = '196WLBgCtJ7qQ2Pu69-29eefUOMIARwE4qjtOvmx06no';
var SHEET_NAME = 'Sheet1';
var CAPTION_LIMIT = 1024;

function props_() {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('TELEGRAM_TOKEN');
  var channel = p.getProperty('CHANNEL');
  if (!token || !channel) throw new Error('Set TELEGRAM_TOKEN and CHANNEL in Script Properties first.');
  return { token: token, channel: channel };
}

function tg_(method, payload) {
  var p = props_();
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + p.token + '/' + method, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var body = JSON.parse(res.getContentText());
  if (!body.ok) throw new Error(method + ' failed: ' + body.description);
  return body.result;
}

function postApproved() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var channel = props_().channel;
    var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[1]).trim().toLowerCase() !== 'approved') continue;
      var photo = r[2], text = String(r[3]), source = String(r[4] || '');
      if (source) text += '\n\nSource: <a href="' + source + '">read the article</a>';
      try {
        var msg;
        if (photo && text.length <= CAPTION_LIMIT) {
          msg = tg_('sendPhoto', { chat_id: channel, photo: photo, caption: text, parse_mode: 'HTML' });
        } else {
          if (photo) tg_('sendPhoto', { chat_id: channel, photo: photo });
          msg = tg_('sendMessage', { chat_id: channel, text: text, parse_mode: 'HTML' });
        }
        sh.getRange(i + 1, 2).setValue('posted');
        sh.getRange(i + 1, 6).setValue(new Date());
        sh.getRange(i + 1, 7).setValue('message ' + msg.message_id);
      } catch (e) {
        sh.getRange(i + 1, 2).setValue('error');
        sh.getRange(i + 1, 7).setValue(String(e.message || e));
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function testConnection() {
  var me = tg_('getMe', {});
  var chat = tg_('getChat', { chat_id: props_().channel });
  Logger.log('Bot: @' + me.username + ' | Channel: ' + chat.title + ' (id ' + chat.id + ')');
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'postApproved') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('postApproved').timeBased().everyMinutes(5).create();
  Logger.log('Checking the queue every 5 minutes.');
}

function findChannelId() {
  Logger.log('CHANNEL currently set to: ' + PropertiesService.getScriptProperties().getProperty('CHANNEL'));
  var ups = tg_('getUpdates', { allowed_updates: ['my_chat_member', 'channel_post'] });
  var seen = {};
  ups.forEach(function (u) {
    var c = (u.my_chat_member || u.channel_post || {}).chat;
    if (c && !seen[c.id]) { seen[c.id] = 1; if (c.type === 'channel' && c.title.indexOf('Save With Property') === 0) { PropertiesService.getScriptProperties().setProperty('CHANNEL', String(c.id)); Logger.log('CHANNEL saved as ' + c.id); } Logger.log(c.type + ' | ' + c.title + ' | id ' + c.id + (c.username ? ' | @' + c.username : '')); }
  });
  if (!ups.length) Logger.log('No updates yet. Post any message in the channel, then run this again.');
}
