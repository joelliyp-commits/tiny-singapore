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
    // YouTube videos jump the queue: take the oldest approved yt_ row first, else the oldest approved row.
    var order = [];
    for (var j = 1; j < rows.length; j++) if (String(rows[j][1]).trim().toLowerCase() === 'approved' && /^yt_/.test(String(rows[j][0]))) order.push(j);
    for (var k = 1; k < rows.length; k++) if (order.indexOf(k) < 0) order.push(k);
    for (var n = 0; n < order.length; n++) {
      var i = order[n], r = rows[i];
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

// ---------- YouTube: new videos on Joel's channel go into the queue automatically ----------
// Script Property YT_CHANNEL_ID = the channel id (UC...). Run setupYouTube once.
function setupYouTube() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkYouTube') ScriptApp.deleteTrigger(t);
  });
  // Mark every video already on the channel as seen, so only new uploads are posted.
  var vids = latestVideos_();
  var seen = vids.map(function (v) { return v.id; });
  var store = PropertiesService.getScriptProperties();
  store.setProperty('YT_SEEN', JSON.stringify(seen));
  // The 3 most recent full videos already on the channel are re-shared one at a time, every 3 days.
  var recentFull = vids.filter(function (v) { return !v.short; }).slice(0, 3).reverse();
  store.setProperty('YT_BACKLOG', JSON.stringify(recentFull.map(function (v) { return v.id; })));
  store.setProperty('YT_BACKLOG_LAST', '0');
  // Twice a day, shortly before the 11am and 3pm posting slots (Singapore time).
  [10, 14].forEach(function (h) {
    ScriptApp.newTrigger('checkYouTube').timeBased().atHour(h).nearMinute(15).everyDays(1).inTimezone('Asia/Singapore').create();
  });
  Logger.log('Watching YouTube twice daily (about 10.15am and 2.15pm). Already on the channel: ' + seen.length + ' videos.');
}

function latestVideos_() {
  // Uses the YouTube Data API advanced service (Services > YouTube Data API v3), signed in as Joel.
  var id = PropertiesService.getScriptProperties().getProperty('YT_CHANNEL_ID') || 'UCr1Ob6OOREGZQQ7C0daQGdw';
  var ch = YouTube.Channels.list('contentDetails', { id: id });
  if (!ch.items || !ch.items.length) throw new Error('YouTube channel not found: ' + id);
  var uploads = ch.items[0].contentDetails.relatedPlaylists.uploads;
  var items = YouTube.PlaylistItems.list('snippet', { playlistId: uploads, maxResults: 25 }).items || [];
  if (!items.length) return [];
  var ids = items.map(function (it) { return it.snippet.resourceId.videoId; });
  var info = {};
  (YouTube.Videos.list('statistics,contentDetails', { id: ids.join(',') }).items || []).forEach(function (v) {
    info[v.id] = { views: Number(v.statistics.viewCount || 0), secs: isoSecs_(v.contentDetails.duration) };
  });
  return items.map(function (it) {
    var vid = it.snippet.resourceId.videoId, x = info[vid] || { views: 0, secs: 0 };
    return { id: vid, title: it.snippet.title, desc: it.snippet.description || '', views: x.views, short: x.secs > 0 && x.secs <= 180 };
  });
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
         '\n\n\u25B6 Watch the full video: https://youtu.be/' + v.id;
}

// Re-share one of the 3 most recent existing full videos every 3 days, in normal queue order.
function releaseBacklog_(vids, sh, store) {
  var backlog = JSON.parse(store.getProperty('YT_BACKLOG') || '[]');
  var last = Number(store.getProperty('YT_BACKLOG_LAST') || 0);
  if (!backlog.length || Date.now() - last < 3 * 24 * 3600 * 1000) return;
  var id = backlog.shift(), v = vids.filter(function (x) { return x.id === id; })[0];
  if (v) sh.appendRow(['ytold_' + v.id, 'approved', 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg', videoPost_(v, 'Worth a watch: '), '', '', '', 'youtube']);
  store.setProperty('YT_BACKLOG', JSON.stringify(backlog));
  store.setProperty('YT_BACKLOG_LAST', String(Date.now()));
}

function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function checkYouTube() {
  var store = PropertiesService.getScriptProperties();
  var seen = JSON.parse(store.getProperty('YT_SEEN') || '[]');
  var vids = latestVideos_().reverse(); // oldest first
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  vids.forEach(function (v) {
    if (seen.indexOf(v.id) >= 0) return;
    seen.push(v.id);
    if (v.short) return; // Shorts are clips of the main video; only full videos go to Telegram
    sh.appendRow(['yt_' + v.id, 'approved', 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg', videoPost_(v, 'New video: '), '', '', '', 'youtube']);
  });
  store.setProperty('YT_SEEN', JSON.stringify(seen.slice(-200)));
  releaseBacklog_(vids, sh, store);
  boostShorts_(vids, sh, store);
}

// Shorts that pass BOOST_MIN_VIEWS are shortlisted (status "pending") for Joel's one tap approval,
// at most BOOST_PER_WEEK a week, each Short only once. The post points viewers to the full video.
var BOOST_MIN_VIEWS = 300, BOOST_PER_WEEK = 2;
function boostShorts_(vids, sh, store) {
  var boosted = JSON.parse(store.getProperty('YT_BOOSTED') || '[]'); // [{id, t}]
  var weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  var recent = boosted.filter(function (b) { return b.t > weekAgo; }).length;
  var done = boosted.map(function (b) { return b.id; });
  var cands = vids.filter(function (v) { return v.views >= BOOST_MIN_VIEWS && done.indexOf(v.id) < 0; })
                  .sort(function (a, b) { return b.views - a.views; });
  for (var i = 0; i < cands.length && recent < BOOST_PER_WEEK; i++) {
    var v = cands[i];
    if (!v.short) { boosted.push({ id: v.id, t: 0 }); continue; } // full videos are posted on upload, not boosted
    var full = (v.desc.match(/https?:\/\/(?:youtu\.be\/|www\.youtube\.com\/watch\?v=)[\w-]+/) || [])[0];
    var chan = 'https://www.youtube.com/channel/' + (store.getProperty('YT_CHANNEL_ID') || 'UCr1Ob6OOREGZQQ7C0daQGdw') + '/videos';
    var text = '<b>' + esc_(v.title) + '</b>\n\nOne of our most watched clips. ' +
               'If it got you thinking, the full video goes deeper into the numbers and the reasoning.\n\n' +
               '\u25B6 Watch the clip: https://youtube.com/shorts/' + v.id + '\n' +
               '\u25B6 Full video: ' + (full || chan);
    sh.appendRow(['ytshort_' + v.id, 'pending', 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg', text, '', '', v.views + ' views', 'youtube_short']);
    boosted.push({ id: v.id, t: Date.now() }); recent++;
  }
  store.setProperty('YT_BOOSTED', JSON.stringify(boosted.slice(-300)));
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

// Probe: lists the channel's playlists and its Shorts, to work out the series.
function listSeries() {
  var id = PropertiesService.getScriptProperties().getProperty('YT_CHANNEL_ID') || 'UCr1Ob6OOREGZQQ7C0daQGdw';
  var out = [];
  var tok = null;
  do {
    var r = YouTube.Playlists.list('snippet,contentDetails', { channelId: id, maxResults: 50, pageToken: tok });
    (r.items || []).forEach(function (p) { out.push('PL ' + p.id + ' | ' + p.snippet.title + ' | ' + p.contentDetails.itemCount); });
    tok = r.nextPageToken;
  } while (tok);
  var mine = YouTube.Channels.list('snippet', { mine: true }).items || [];
  mine.forEach(function (c) { out.push('MINE ' + c.id + ' | ' + c.snippet.title); });
  var ch = YouTube.Channels.list('contentDetails', { id: id });
  var uploads = ch.items[0].contentDetails.relatedPlaylists.uploads, all = [];
  tok = null;
  do {
    var p2 = YouTube.PlaylistItems.list('snippet', { playlistId: uploads, maxResults: 50, pageToken: tok });
    all = all.concat(p2.items || []); tok = p2.nextPageToken;
  } while (tok && all.length < 500);
  for (var i = 0; i < all.length; i += 50) {
    var ids = all.slice(i, i + 50).map(function (it) { return it.snippet.resourceId.videoId; });
    (YouTube.Videos.list('snippet,contentDetails,statistics', { id: ids.join(',') }).items || []).forEach(function (v) {
      var s = isoSecs_(v.contentDetails.duration);
      out.push((s <= 180 ? 'SHORT ' : 'FULL ') + v.id + ' | ' + s + 's | ' + v.statistics.viewCount + 'v | ' + v.snippet.publishedAt.slice(0, 10) + ' | ' + v.snippet.title);
    });
  }
  Logger.log(out.join('\n'));
}
