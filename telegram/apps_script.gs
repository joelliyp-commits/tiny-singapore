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

// Short slots: 3pm on Monday, Wednesday and Friday (ISO weekday 1, 3, 5).
var SHORT_DAYS = [1, 3, 5], SHORT_TIME = '15:00';
function isShortSlot_(slot) {
  if (!slot || slot.slice(-5) !== SHORT_TIME) return false;
  var d = new Date(slot.slice(0, 10) + 'T12:00:00+08:00');
  return SHORT_DAYS.indexOf(Number(Utilities.formatDate(d, 'Asia/Singapore', 'u'))) >= 0;
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
    // Column J (optional) = the slot a row is booked for, 'yyyy-MM-dd HH:mm' Singapore time.
    // Booked rows never post before their slot. Mon, Wed and Fri 3pm belong to YouTube Shorts.
    var nowKey = Utilities.formatDate(new Date(), 'Asia/Singapore', 'yyyy-MM-dd HH:mm');
    var shortSlot = isShortSlot_(slot);
    var isShort = function (r) { return /^ytshort_/.test(String(r[0])); };
    var when = function (r) {
      var v = r[9];
      if (!v) return '';
      return v instanceof Date ? Utilities.formatDate(v, 'Asia/Singapore', 'yyyy-MM-dd HH:mm') : String(v).trim().replace(/^'/, '');
    };
    // Order: the row booked for this slot, then Shorts (in a Short slot), then new YouTube videos, then oldest first.
    var order = [];
    var add = function (test) { for (var x = 1; x < rows.length; x++) if (order.indexOf(x) < 0 && test(rows[x])) order.push(x); };
    if (slot) add(function (r) { return when(r) === slot; });
    if (shortSlot) add(isShort);
    add(function (r) { return /^yt_/.test(String(r[0])); });
    add(function () { return true; });
    for (var n = 0; n < order.length; n++) {
      var i = order[n], r = rows[i];
      if (String(r[1]).trim().toLowerCase() !== 'approved') continue;
      if (when(r) && when(r) > nowKey) continue;            // booked for later
      if (slot && !shortSlot && isShort(r)) continue;       // Shorts only in Short slots
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

// ---------- YouTube: one weekly run (Sunday about 8pm Singapore time) ----------
// 1. New full videos go into the queue (approved) and post in the next slot.
// 2. One of the 3 most recent full videos is re-shared each week until all 3 are done.
// 3. Shorts are booked (approved, column J) for Mon, Wed and Fri at 3pm, 3 in a row from one series.
//    Series rotate weekly (least recently used first); a Short is never posted twice.
// Series = the channel's playlists. Shorts in no playlist are grouped by title.
// Run setupWeeklyYouTube once to switch from the old twice daily check.
var YT_DEFAULT_CHANNEL = 'UCr1Ob6OOREGZQQ7C0daQGdw';
var SHORTS_PER_WEEK = 3;

function ytChannel_() { return PropertiesService.getScriptProperties().getProperty('YT_CHANNEL_ID') || YT_DEFAULT_CHANNEL; }

function setupWeeklyYouTube() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'checkYouTube' || f === 'weeklyYouTube') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('weeklyYouTube').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(20).nearMinute(0)
    .inTimezone('Asia/Singapore').create();
  Logger.log('Weekly YouTube run set for Sundays about 8pm. Twice daily check removed.');
}

// All uploads (up to 500), newest first.
function allVideos_() {
  var ch = YouTube.Channels.list('contentDetails', { id: ytChannel_() });
  if (!ch.items || !ch.items.length) throw new Error('YouTube channel not found: ' + ytChannel_());
  var uploads = ch.items[0].contentDetails.relatedPlaylists.uploads, items = [], tok = null;
  do {
    var r = YouTube.PlaylistItems.list('snippet', { playlistId: uploads, maxResults: 50, pageToken: tok });
    items = items.concat(r.items || []); tok = r.nextPageToken;
  } while (tok && items.length < 500);
  var vids = [];
  for (var i = 0; i < items.length; i += 50) {
    var ids = items.slice(i, i + 50).map(function (it) { return it.snippet.resourceId.videoId; });
    (YouTube.Videos.list('snippet,statistics,contentDetails', { id: ids.join(',') }).items || []).forEach(function (v) {
      var secs = isoSecs_(v.contentDetails.duration);
      vids.push({ id: v.id, title: v.snippet.title, desc: v.snippet.description || '', published: v.snippet.publishedAt,
                  views: Number(v.statistics.viewCount || 0), short: secs > 0 && secs <= 180 });
    });
  }
  return vids.sort(function (a, b) { return a.published < b.published ? 1 : -1; });
}

// { videoId: [series names] } from the channel's playlists.
function seriesMap_() {
  var map = {}, tok = null, lists = [];
  do {
    var r = YouTube.Playlists.list('snippet', { channelId: ytChannel_(), maxResults: 50, pageToken: tok });
    lists = lists.concat(r.items || []); tok = r.nextPageToken;
  } while (tok);
  lists.forEach(function (pl) {
    var t2 = null;
    do {
      var r2 = YouTube.PlaylistItems.list('snippet', { playlistId: pl.id, maxResults: 50, pageToken: t2 });
      (r2.items || []).forEach(function (it) {
        var id = it.snippet.resourceId.videoId;
        (map[id] = map[id] || []).push(pl.snippet.title);
      });
      t2 = r2.nextPageToken;
    } while (t2);
  });
  return map;
}

// Fallback series name from a title: drop "Part 2", "Ep 3", hashtags, and anything after | or :
function titleSeries_(t) {
  return String(t).replace(/#\S+/g, '').split(/[|:]/)[0].replace(/\b(part|pt|ep|episode)\.?\s*\d+.*$/i, '').trim() || 'Other clips';
}

// Picks this week's Shorts: the least recently used series with unposted Shorts, oldest clip first.
function planShorts_(vids, smap, store) {
  var posted = JSON.parse(store.getProperty('YT_SHORTS_POSTED') || '[]');
  var used = JSON.parse(store.getProperty('YT_SERIES_USED') || '{}'); // {series: timestamp}
  var groups = {};
  vids.filter(function (v) { return v.short && posted.indexOf(v.id) < 0; }).forEach(function (v) {
    (smap[v.id] || [titleSeries_(v.title)]).forEach(function (sname) { (groups[sname] = groups[sname] || []).push(v); });
  });
  var names = Object.keys(groups).sort(function (a, b) {
    return ((used[a] || 0) - (used[b] || 0)) || (groups[b].length - groups[a].length);
  });
  var pick = [], from = [];
  for (var i = 0; i < names.length && pick.length < SHORTS_PER_WEEK; i++) {
    var clips = groups[names[i]].slice().reverse(); // oldest first, so a series plays in order
    var took = 0;
    clips.forEach(function (v) {
      if (pick.length < SHORTS_PER_WEEK && pick.every(function (p) { return p.v.id !== v.id; })) { pick.push({ v: v, series: names[i] }); took++; }
    });
    if (took) from.push(names[i]);
  }
  var log = 'Series with unposted Shorts: ' + names.map(function (n) { return n + ' (' + groups[n].length + ')'; }).join(', ') +
            '\nNext week: ' + pick.map(function (p) { return p.series + ': ' + p.v.title; }).join(' / ');
  return { pick: pick, from: from, log: log };
}

function shortPost_(p, n) {
  var v = p.v;
  var full = (v.desc.match(/https?:\/\/(?:youtu\.be\/|www\.youtube\.com\/watch\?v=)[\w-]+/) || [])[0];
  var chan = 'https://www.youtube.com/channel/' + ytChannel_() + '/videos';
  return '<b>' + esc_(v.title.replace(/#\S+/g, '').trim()) + '</b>\n\n' +
         'This week\'s clips: ' + esc_(p.series) + ' (' + n + ' of ' + SHORTS_PER_WEEK + ').\n\n' +
         '▶ Watch the clip: https://youtube.com/shorts/' + v.id + '\n' +
         '▶ Full video: ' + (full || chan);
}

function isoSecs_(d) {
  var m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '') || [];
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

// Post text for a full video: bold title, first paragraph of the description (before the contact block), link.
function videoPost_(v, prefix) {
  var intro = v.desc.split(/\n\s*\n/)[0].replace(/#\S+/g, '').trim();
  if (intro.length > 500) intro = intro.slice(0, 500).replace(/\s+\S*$/, '') + '...';
  return '<b>' + prefix + esc_(v.title) + '</b>' + (intro ? '\n\n' + esc_(intro) : '') +
         '\n\n▶ Watch the full video: https://youtu.be/' + v.id;
}

function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function weeklyYouTube() {
  var store = PropertiesService.getScriptProperties();
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var vids = allVideos_();
  // 1. New full videos.
  var seen = JSON.parse(store.getProperty('YT_SEEN') || '[]');
  vids.slice().reverse().forEach(function (v) {
    if (seen.indexOf(v.id) >= 0) return;
    seen.push(v.id);
    if (!v.short) sh.appendRow(['yt_' + v.id, 'approved', 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg', videoPost_(v, 'New video: '), '', '', '', 'youtube']);
  });
  store.setProperty('YT_SEEN', JSON.stringify(seen.slice(-500)));
  // 2. One recent full video re-shared per week.
  var backlog = JSON.parse(store.getProperty('YT_BACKLOG') || '[]');
  if (backlog.length) {
    var id = backlog.shift(), old = vids.filter(function (x) { return x.id === id; })[0];
    if (old) sh.appendRow(['ytold_' + old.id, 'approved', 'https://i.ytimg.com/vi/' + old.id + '/hqdefault.jpg', videoPost_(old, 'Worth a watch: '), '', '', '', 'youtube']);
    store.setProperty('YT_BACKLOG', JSON.stringify(backlog));
  }
  // 3. Shorts: book every free Mon/Wed/Fri 3pm slot in the next 9 days, 3 at a time from one series.
  Logger.log(fillShorts_(Date.now() + 9 * 24 * 3600 * 1000, vids));
}

// One off: book Shorts for every free Mon/Wed/Fri 3pm slot up to and including a date, e.g. fillShortsUntil('2026-11-30').
function fillShortsUntil(day) {
  Logger.log(fillShorts_(new Date((day || '2026-11-30') + 'T23:59:00+08:00').getTime(), allVideos_()));
}

function fillShorts_(untilMs, vids) {
  var store = PropertiesService.getScriptProperties();
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var rows = sh.getDataRange().getValues(), taken = {};
  rows.forEach(function (r) {
    if (!/^ytshort_/.test(String(r[0])) || !r[9]) return;
    taken[r[9] instanceof Date ? Utilities.formatDate(r[9], 'Asia/Singapore', 'yyyy-MM-dd HH:mm') : String(r[9]).trim().replace(/^'/, '')] = 1;
  });
  // Free Short slots from now until untilMs.
  var free = [], nowKey = Utilities.formatDate(new Date(), 'Asia/Singapore', 'yyyy-MM-dd HH:mm');
  for (var t = Date.now(); t <= untilMs; t += 24 * 3600 * 1000) {
    var key = Utilities.formatDate(new Date(t), 'Asia/Singapore', 'yyyy-MM-dd') + ' ' + SHORT_TIME;
    if (key > nowKey && isShortSlot_(key) && !taken[key] && free.indexOf(key) < 0) free.push(key);
  }
  var smap = seriesMap_(), out = [];
  while (free.length) {
    var plan = planShorts_(vids, smap, store);
    if (!plan.pick.length) { out.push('No unposted Shorts left.'); break; }
    var posted = JSON.parse(store.getProperty('YT_SHORTS_POSTED') || '[]');
    var used = JSON.parse(store.getProperty('YT_SERIES_USED') || '{}');
    plan.pick.forEach(function (p, i) {
      if (!free.length) return;
      var when = free.shift();
      // Media column left blank so Telegram shows the playable YouTube preview.
      sh.appendRow(['ytshort_' + p.v.id, 'approved', '', shortPost_(p, i + 1), '', '', p.v.views + ' views', 'youtube_short', '', when]);
      posted.push(p.v.id);
      out.push(when + ' | ' + p.series + ' | ' + p.v.title);
    });
    plan.from.forEach(function (n) { used[n] = Date.now(); });
    store.setProperty('YT_SHORTS_POSTED', JSON.stringify(posted));
    store.setProperty('YT_SERIES_USED', JSON.stringify(used));
  }
  return out.join('\n') || 'All Short slots already booked.';
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

