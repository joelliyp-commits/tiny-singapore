/**
 * Save With Property: Telegram auto poster (Google Apps Script, free).
 *
 * Reads the "SWP Telegram Queue" sheet (media column: one image, one .mp4, or several
 * image URLs one per line for an album). Approved rows are posted one at a time,
 * oldest first, at 11:00 and 15:00 Singapore time (max 2 a day), as the card
 * image with the text as the caption, then marked "posted" (or "error").
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

// Posting slots (Singapore time). One approved row goes out per slot, oldest first.
var SLOTS = ['11:00', '15:00'];
var SLOT_WINDOW_MIN = 20;

function dueSlot_() {
  var now = new Date();
  var day = Utilities.formatDate(now, 'Asia/Singapore', 'yyyy-MM-dd');
  var mins = Number(Utilities.formatDate(now, 'Asia/Singapore', 'H')) * 60 + Number(Utilities.formatDate(now, 'Asia/Singapore', 'm'));
  for (var k = 0; k < SLOTS.length; k++) {
    var p = SLOTS[k].split(':'), start = Number(p[0]) * 60 + Number(p[1]);
    if (mins >= start && mins < start + SLOT_WINDOW_MIN) return day + ' ' + SLOTS[k];
  }
  return null;
}

function postApproved() {
  var slot = dueSlot_();
  if (!slot) return;
  var store = PropertiesService.getScriptProperties();
  if (store.getProperty('LAST_SLOT') === slot) return;
  postNext_(slot);
}

// Posts the oldest approved row right now, ignoring the slot times (for testing or urgent items).
function postNextNow() {
  postNext_(null);
}

function postNext_(slot) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var store = PropertiesService.getScriptProperties();
    var channel = props_().channel;
    var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[1]).trim().toLowerCase() !== 'approved') continue;
      var photo = r[2], text = String(r[3]), source = String(r[4] || '');
      if (source) text += '\n\nSource: <a href="' + source + '">read the article</a>';
      try {
        var msg = sendMedia_(channel, String(photo || ''), text);
        sh.getRange(i + 1, 2).setValue('posted');
        sh.getRange(i + 1, 6).setValue(new Date());
        sh.getRange(i + 1, 7).setValue('message ' + msg.message_id);
      } catch (e) {
        sh.getRange(i + 1, 2).setValue('error');
        sh.getRange(i + 1, 7).setValue(String(e.message || e));
      }
      if (slot) store.setProperty('LAST_SLOT', slot);
      return; // one post per slot
    }
  } finally {
    lock.releaseLock();
  }
}

// Media column (photo_url): one PNG/JPG URL = photo, one .mp4 URL = video,
// several URLs (one per line) = album (carousel), first item carries the caption.
function sendMedia_(channel, media, text) {
  var urls = media.split(/\s+/).filter(function (u) { return u; });
  var fits = text.length <= CAPTION_LIMIT;
  var isVid = function (u) { return /\.mp4(\?|$)/i.test(u); };
  if (!urls.length) return tg_('sendMessage', { chat_id: channel, text: text, parse_mode: 'HTML' });
  if (urls.length === 1) {
    var m = isVid(urls[0]) ? 'sendVideo' : 'sendPhoto', key = isVid(urls[0]) ? 'video' : 'photo';
    var p = { chat_id: channel }; p[key] = urls[0];
    if (fits) { p.caption = text; p.parse_mode = 'HTML'; return tg_(m, p); }
    tg_(m, p);
    return tg_('sendMessage', { chat_id: channel, text: text, parse_mode: 'HTML' });
  }
  var group = urls.slice(0, 10).map(function (u, i) {
    var it = { type: isVid(u) ? 'video' : 'photo', media: u };
    if (i === 0 && fits) { it.caption = text; it.parse_mode = 'HTML'; }
    return it;
  });
  var res = tg_('sendMediaGroup', { chat_id: channel, media: group });
  if (!fits) return tg_('sendMessage', { chat_id: channel, text: text, parse_mode: 'HTML' });
  return res[0];
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

// Creates a channel invite link (bot needs "Add Subscribers") and writes it to cell I2 of the queue sheet.
function createInviteLink() {
  var r = tg_('createChatInviteLink', { chat_id: props_().channel, name: 'WhatsApp nurture' });
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  sh.getRange('I1').setValue('invite_link');
  sh.getRange('I2').setValue(r.invite_link);
  Logger.log('Invite link saved to the sheet, cell I2.');
}
