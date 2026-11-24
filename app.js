/* ==========================================================
 * 走遍美国 · 口语跟读
 * 功能：视频/字幕导入 · 逐句同步高亮 · 单句循环 · 逐句朗读
 *      跟读录音 · 原声/录音 A-B 对比 · 进度记录
 * ========================================================== */
(function () {
  'use strict';

  /* ---------------- 图标 ---------------- */

  var SVG = function (inner, size, extra) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 19) + '" height="' + (size || 19) +
      '" fill="' + (extra && extra.fill || 'none') + '" stroke="' +
      (extra && extra.stroke || 'currentColor') + '" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + inner + '</svg>';
  };

  var ICON = {
    play: SVG('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', 20, { fill: 'currentColor' }),
    pause: SVG('<path d="M6.5 5h3.5v14H6.5zM14 5h3.5v14H14z" fill="currentColor" stroke="none"/>', 20, { fill: 'currentColor' }),
    prevEp: SVG('<path d="M11.2 5.6v12.8L5 12zM19.6 5.6v12.8L13.4 12z" fill="currentColor" stroke="none"/>', 18),
    nextEp: SVG('<path d="M4.4 5.6v12.8L10.6 12zM12.8 5.6v12.8L19 12z" fill="currentColor" stroke="none"/>', 18),
    loop: SVG('<path d="M4 10.5V9a3.5 3.5 0 0 1 3.5-3.5H18"/><path d="M15.5 2.5 18 5.5l-2.5 3"/><path d="M20 13.5V15a3.5 3.5 0 0 1-3.5 3.5H6"/><path d="M8.5 21.5 6 18.5l2.5-3"/>', 19),
    mic: SVG('<rect x="9" y="2.6" width="6" height="10.4" rx="3"/><path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0"/><path d="M12 17.8V21"/>', 19),
    speaker: SVG('<path d="M4 9.6h3.2L12 5.2v13.6L7.2 14.4H4z"/><path d="M15.6 9.2a3.9 3.9 0 0 1 0 5.6"/><path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>', 19),
    ab: SVG('<path d="M3.5 6.5h8M3.5 11h13M3.5 15.5h6"/><circle cx="18" cy="17" r="2.6"/><path d="M18 10.5v3.9"/>', 19),
    cc: SVG('<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M10.2 10.4a2.3 2.3 0 1 0 0 3.2M17 10.4a2.3 2.3 0 1 0 0 3.2"/>', 19),
    full: SVG('<path d="M4 9.5V4.5h5M20 9.5V4.5h-5M4 14.5v5h5M20 14.5v5h-5"/>', 19)
  };

  /* ---------------- 状态 ---------------- */

  var S = {
    lines: [],          // [{start,end,en,zh}]
    activeIdx: -1,
    virtualIdx: 0,
    hasVideo: false,
    virtualPlaying: false,
    oneshot: false,
    loopLine: false,
    speed: 1,
    zhMode: 'both',     // both | en | zh
    showCaption: true,  // 是否在画面上叠字幕
    showLines: true,    // 右侧台词栏是否展开
    mediaOverride: '',  // 用户手动设置的视频源地址（覆盖清单里的 mediaBase）
    filterUndone: false,
    query: '',
    done: {},           // 当前集 idx -> true
    recs: {},           // 当前集 idx -> objectURL
    recording: false,
    recIdx: -1,
    epNo: null,         // 当前集号
    allDone: {},        // 集号 -> done
    allRecs: {}         // 集号 -> recs
  };

  var SPEEDS = [0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5];
  var LS_KEY = 'fa-usa-followreading-v1';

  /* ---------------- DOM ---------------- */

  var $ = function (id) { return document.getElementById(id); };

  var el = {
    stage: $('stage'),
    collapseBtn: $('collapseBtn'),
    expandBtn: $('expandBtn'),
    video: $('video'),
    videoWrap: $('videoWrap'),
    placeholder: $('placeholder'),
    phText: $('phText'),
    phSub: $('phSub'),
    setMediaBtn: $('setMediaBtn'),
    mediaDialog: $('mediaDialog'),
    mediaInput: $('mediaInput'),
    mediaCancel: $('mediaCancel'),
    mediaSave: $('mediaSave'),
    caption: $('caption'),
    capEn: $('capEn'),
    capZh: $('capZh'),
    ccBtn: $('ccBtn'),
    progress: $('progress'),
    marks: $('progressMarks'),
    fill: $('progressFill'),
    handle: $('progressHandle'),
    playBtn: $('playBtn'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),
    loopBtn: $('loopBtn'),
    recBtn: $('recBtn'),
    ttsBtn: $('ttsBtn'),
    abBtn: $('abBtn'),
    fullBtn: $('fullBtn'),
    zhSeg: $('zhSeg'),
    speedUp: $('speedUp'),
    speedDown: $('speedDown'),
    speedLabel: $('speedLabel'),
    timeLabel: $('timeLabel'),
    linesList: $('linesList'),
    searchInput: $('searchInput'),
    filterUndone: $('filterUndone'),
    clearDone: $('clearDone'),
    doneCount: $('doneCount'),
    totalCount: $('totalCount'),
    modeTag: $('modeTag'),
    epLabel: $('epLabel'),
    videoInput: $('videoInput'),
    subInput: $('subInput'),
    toast: $('toast'),
    pickerBtn: $('pickerBtn'),
    pickerBtnText: $('pickerBtnText'),
    picker: $('picker'),
    pickerCount: $('pickerCount'),
    pickerSearch: $('pickerSearch'),
    pickerBody: $('pickerBody'),
    pickerClose: $('pickerClose'),
    pickerNow: $('pickerNow'),
    prevEp: $('prevEp'),
    nextEp: $('nextEp')
  };

  /* ---------------- 工具 ---------------- */

  function fmt(t) {
    t = Math.max(0, t || 0);
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2400);
  }

  function virtualDuration() {
    if (!S.lines.length) return 1;
    return S.lines[S.lines.length - 1].end + 1.2;
  }

  function isPlaying() {
    return S.hasVideo ? !el.video.paused && !el.video.ended : S.virtualPlaying;
  }

  /* ---------------- 持久化 ---------------- */

  function persistEp() {
    if (S.epNo == null) return;
    S.allDone[S.epNo] = S.done;
    S.allRecs[S.epNo] = S.recs;
  }

  function save() {
    try {
      persistEp();
      localStorage.setItem(LS_KEY, JSON.stringify({
        allDone: S.allDone, speed: S.speed, zhMode: S.zhMode,
        showCaption: S.showCaption, showLines: S.showLines,
        mediaOverride: S.mediaOverride, epNo: S.epNo
      }));
    } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.allDone && typeof d.allDone === 'object') S.allDone = d.allDone;
      if (typeof d.speed === 'number') S.speed = d.speed;
      if (d.zhMode === 'both' || d.zhMode === 'en' || d.zhMode === 'zh') {
        S.zhMode = d.zhMode;
      }
      if (typeof d.showCaption === 'boolean') S.showCaption = d.showCaption;
      if (typeof d.showLines === 'boolean') S.showLines = d.showLines;
      if (typeof d.mediaOverride === 'string') S.mediaOverride = d.mediaOverride;
      if (typeof d.epNo === 'number') S.epNo = d.epNo;
    } catch (e) { /* ignore */ }
  }

  /* ---------------- 语音合成 ---------------- */

  var voices = [];

  function loadVoices() {
    if (!window.speechSynthesis) return;
    voices = window.speechSynthesis.getVoices() || [];
  }

  function pickVoice() {
    if (!voices.length) loadVoices();
    var pref = [
      /Samantha/i, /Aria/i, /Jenny/i, /Google US English/i,
      /Zira/i, /Natural/i, /Guy/i
    ];
    var en = voices.filter(function (v) { return /^en(-|_)/i.test(v.lang); });
    if (!en.length) return null;
    for (var i = 0; i < pref.length; i++) {
      for (var j = 0; j < en.length; j++) {
        if (pref[i].test(en[j].name)) return en[j];
      }
    }
    var us = en.filter(function (v) { return /en[-_]US/i.test(v.lang); });
    return us[0] || en[0];
  }

  var speakToken = 0;

  function speak(text, onend) {
    if (!window.speechSynthesis || !text) return false;
    var token = ++speakToken;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = Math.min(2, Math.max(0.1, S.speed));
      u.pitch = 1;
      var v = pickVoice();
      if (v) u.voice = v;

      var fired = false;
      var fire = function () {
        if (fired || token !== speakToken) return;
        fired = true;
        if (onend) onend();
      };
      u.onend = fire;
      u.onerror = fire;
      window.speechSynthesis.speak(u);

      // 兜底：部分浏览器不触发 onend
      var words = text.split(/\s+/).length;
      var est = (words / 2.4) * 1000 / Math.max(0.5, S.speed) + 1500;
      setTimeout(fire, est);

      return true;
    } catch (e) {
      return false;
    }
  }

  function stopSpeak() {
    speakToken++;
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
  }

  /* ---------------- 列表渲染 ---------------- */

  function renderList() {
    var keepScroll = el.linesList.scrollTop;
    var html = '';
    for (var i = 0; i < S.lines.length; i++) {
      var ln = S.lines[i];
      var cls = 'line';
      if (i === S.activeIdx) cls += ' active';

      // 语言模式：双语 / 仅英文 / 仅中文。没中文的句子在「仅中文」下仍显示英文，避免空行
      var hasZh = !!(ln.zh && ln.zh.trim());
      var hideEn = (S.zhMode === 'zh' && hasZh);
      var hideZh = (S.zhMode === 'en') || !hasZh;

      html += '<div class="' + cls + '" data-idx="' + i + '">' +
        '<div class="line-top">' +
          '<span class="idx">' + ('0' + (i + 1)).slice(-2) + '</span>' +
          '<span class="ts">' + fmt(ln.start) + '</span>' +
          (S.done[i] ? '<span class="badge">已跟读</span>' : '') +
        '</div>' +
        '<div class="line-en' + (hideEn ? ' hide' : '') + '">' + esc(ln.en) + '</div>' +
        '<div class="line-zh' + (hideZh ? ' hide' : '') + '">' + esc(ln.zh) + '</div>' +
        '<div class="line-actions">' +
          '<button class="mini" data-act="play" title="只播这一句">&#9654;</button>' +
          '<button class="mini" data-act="rec" title="跟读录音">录</button>' +
          (S.recs[i] ? '<button class="mini mine" data-act="mine" title="听我的录音">我</button>' : '') +
        '</div>' +
      '</div>';
    }
    el.linesList.innerHTML = html;
    el.linesList.scrollTop = keepScroll;
    applyFilter();
    updateStats();
  }

  function applyFilter() {
    var q = S.query.trim().toLowerCase();
    var nodes = el.linesList.children;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var idx = +node.dataset.idx;
      var ln = S.lines[idx];
      var ok = true;
      if (q) {
        ok = (ln.en + ' ' + (ln.zh || '')).toLowerCase().indexOf(q) >= 0;
      }
      if (ok && S.filterUndone && S.done[idx]) ok = false;
      if (ok) node.classList.remove('hidden');
      else node.classList.add('hidden');
    }
  }

  function updateStats() {
    var n = 0;
    for (var k in S.done) { if (S.done[k]) n++; }
    el.doneCount.textContent = n;
    el.totalCount.textContent = '/ ' + S.lines.length;
  }

  /* ---------------- 高亮 / 字幕 ---------------- */

  var userScrollTs = 0;

  function setActive(i, forceScroll) {
    if (i === S.activeIdx) {
      if (forceScroll) scrollToLine(i);
      return;
    }
    var prev = el.linesList.querySelector('.line.active');
    if (prev) prev.classList.remove('active');

    S.activeIdx = i;

    var cur = el.linesList.querySelector('.line[data-idx="' + i + '"]');
    if (cur) {
      cur.classList.add('active');
      if (forceScroll || Date.now() - userScrollTs > 2200) scrollToLine(i);
    }
    updateCaption();
    updateAB();
  }

  function scrollToLine(i) {
    var cur = el.linesList.querySelector('.line[data-idx="' + i + '"]');
    if (!cur) return;
    var box = el.linesList;
    var cr = cur.getBoundingClientRect();
    var br = box.getBoundingClientRect();
    // 目标：让这句落在列表可视区垂直中央
    var delta = (cr.top - br.top) - (box.clientHeight - cr.height) / 2;
    box.scrollTo({ top: Math.max(0, box.scrollTop + delta), behavior: 'smooth' });
  }

  function updateCaption() {
    var ln = S.lines[S.activeIdx];
    var on = S.showCaption && S.hasVideo && S.activeIdx >= 0 && ln;
    if (!on) {
      el.caption.classList.remove('show');
      return;
    }

    var hasZh = !!(ln.zh && ln.zh.trim());
    var hideEn = (S.zhMode === 'zh' && hasZh);
    var hideZh = (S.zhMode === 'en') || !hasZh;

    el.capEn.textContent = ln.en;
    el.capEn.classList.toggle('hide', hideEn);
    el.capZh.textContent = ln.zh || '';
    el.capZh.classList.toggle('hide', hideZh);

    el.caption.classList.add('show');
  }

  function setLinesVisible(v) {
    S.showLines = !!v;
    el.stage.classList.toggle('hide-lines', !S.showLines);
    el.expandBtn.hidden = S.showLines;
    save();
  }

  function findIdx(t) {
    var last = -1;
    for (var i = 0; i < S.lines.length; i++) {
      var ln = S.lines[i];
      if (t >= ln.start && t <= ln.end) return i;
      if (ln.end < t) last = i;
    }
    return last;
  }

  /* ---------------- 进度条 ---------------- */

  var dragging = false;

  function renderMarks() {
    el.marks.innerHTML = '';
    if (S.lines.length > 160) return;
    var total = S.hasVideo && el.video.duration ? el.video.duration : virtualDuration();
    if (!total || total <= 0) return;
    var frag = '';
    for (var i = 0; i < S.lines.length; i++) {
      var pct = (S.lines[i].start / total) * 100;
      if (pct < 0.5 || pct > 99.5) continue;
      frag += '<i style="left:' + pct.toFixed(2) + '%"></i>';
    }
    el.marks.innerHTML = frag;
  }

  function updateProgress(cur, total) {
    var pct = total > 0 ? Math.min(100, (cur / total) * 100) : 0;
    el.fill.style.width = pct + '%';
    el.handle.style.left = pct + '%';
    el.timeLabel.textContent = fmt(cur) + ' / ' + fmt(total);
  }

  function seekByRatio(ratio) {
    ratio = Math.min(1, Math.max(0, ratio));
    if (S.hasVideo && el.video.duration) {
      stopSpeak();
      el.video.currentTime = ratio * el.video.duration;
      var i = findIdx(el.video.currentTime);
      if (i >= 0) setActive(i, true);
      updateProgress(el.video.currentTime, el.video.duration);
    } else {
      var d = virtualDuration();
      var t = ratio * d;
      var idx = findIdx(t);
      if (idx < 0) idx = 0;
      S.virtualIdx = idx;
      setActive(idx, true);
      updateProgress(S.lines[idx] ? S.lines[idx].start : 0, d);
    }
  }

  function ratioFromEvent(e) {
    var r = el.progress.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  }

  el.progress.addEventListener('pointerdown', function (e) {
    dragging = true;
    el.progress.classList.add('dragging');
    el.progress.setPointerCapture(e.pointerId);
    seekByRatio(ratioFromEvent(e));
  });
  el.progress.addEventListener('pointermove', function (e) {
    if (dragging) seekByRatio(ratioFromEvent(e));
  });
  el.progress.addEventListener('pointerup', function (e) {
    dragging = false;
    el.progress.classList.remove('dragging');
    try { el.progress.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  el.progress.addEventListener('pointercancel', function () {
    dragging = false;
    el.progress.classList.remove('dragging');
  });

  /* ---------------- 播放位置同步 ---------------- */

  // 用 timeupdate 而不是 requestAnimationFrame：
  // rAF 在窗口不可见/被遮挡时会被节流甚至暂停，字幕就会越拖越慢；
  // timeupdate 由媒体引擎驱动，稳定在 4Hz 左右，不受影响。
  function syncToVideo() {
    var v = el.video;
    var t = v.currentTime;
    var i = findIdx(t);
    if (i >= 0) setActive(i);
    updateProgress(t, v.duration || 0);

    if (S.loopLine && !S.oneshot && S.activeIdx >= 0) {
      var ln = S.lines[S.activeIdx];
      if (ln && t >= ln.end - 0.02) {
        v.currentTime = ln.start;
      }
    }
  }

  /* ---------------- 播放控制 ---------------- */

  function updatePlayIcon() {
    el.playBtn.innerHTML = isPlaying() ? ICON.pause : ICON.play;
  }

  function togglePlay() {
    if (S.hasVideo) {
      if (el.video.paused || el.video.ended) {
        if (el.video.ended) el.video.currentTime = 0;
        el.video.play().catch(function () {
          toast('这个视频浏览器解不了，试试 H.264 编码的 mp4');
        });
      } else {
        el.video.pause();
      }
      updatePlayIcon();
    } else {
      if (S.virtualPlaying) stopVirtual();
      else startVirtual();
    }
  }

  function toggleFullscreen() {
    var v = el.video;
    var wrap = el.videoWrap;

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) ex.call(document);
      return;
    }

    // 优先让整个播放容器全屏，这样叠在上面的字幕能一起进全屏
    var reqWrap = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
    if (reqWrap) {
      var p = reqWrap.call(wrap);
      if (p && p.catch) p.catch(function () { /* ignore */ });
      return;
    }

    // iPad / iPhone 不支持元素全屏，只能用视频自带的全屏播放器
    // （注意：这种方式是全屏 <video>，字幕叠层不会显示）
    if (typeof v.webkitEnterFullscreen === 'function' && v.currentSrc) {
      try { v.webkitEnterFullscreen(); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- 朗读模式（无视频） ---------- */

  function startVirtual() {
    if (!S.lines.length) return;
    if (S.virtualIdx >= S.lines.length) S.virtualIdx = 0;
    if (S.activeIdx >= 0 && S.activeIdx !== S.virtualIdx) S.virtualIdx = S.activeIdx;
    S.virtualPlaying = true;
    updatePlayIcon();
    speakStep();
  }

  function stopVirtual() {
    S.virtualPlaying = false;
    stopSpeak();
    updatePlayIcon();
  }

  function speakStep() {
    if (!S.virtualPlaying) return;
    var i = S.virtualIdx;
    if (i < 0 || i >= S.lines.length) { stopVirtual(); return; }

    setActive(i, true);
    updateProgress(S.lines[i].start, virtualDuration());

    var ln = S.lines[i];
    var advanced = false;

    var goNext = function () {
      if (advanced) return;
      advanced = true;
      if (!S.virtualPlaying) return;

      if (S.loopLine) {
        setTimeout(function () { if (S.virtualPlaying) speakStep(); }, 320);
        return;
      }
      if (S.virtualIdx + 1 >= S.lines.length) {
        S.virtualIdx = S.lines.length - 1;
        stopVirtual();
        toast('这一段读完了 · 空格重头再来');
        return;
      }
      S.virtualIdx++;
      setTimeout(function () { if (S.virtualPlaying) speakStep(); }, 240);
    };

    var ok = speak(ln.en, goNext);
    if (!ok) {
      // 没有 TTS：按句子长度走时钟
      var dur = Math.max(1600, (ln.end - ln.start) * 1000);
      setTimeout(goNext, dur);
      toast('当前环境不支持语音朗读，已切到时序模式');
    }
  }

  /* ---------------- 句子跳转 ---------------- */

  function gotoLine(i, autoPlay) {
    if (i < 0 || i >= S.lines.length) return;
    if (S.hasVideo) {
      stopVirtual();
      el.video.currentTime = S.lines[i].start + 0.01;
      setActive(i, true);
      updateProgress(el.video.currentTime, el.video.duration || 0);
      if (autoPlay) el.video.play().catch(function () {});
      updatePlayIcon();
    } else {
      var was = S.virtualPlaying;
      stopVirtual();
      S.virtualIdx = i;
      setActive(i, true);
      updateProgress(S.lines[i].start, virtualDuration());
      if (was || autoPlay) startVirtual();
    }
  }

  function stepLine(delta) {
    var base = S.activeIdx < 0 ? 0 : S.activeIdx;
    var i = Math.min(S.lines.length - 1, Math.max(0, base + delta));
    gotoLine(i);
  }

  /* ---------------- 录音 / 跟读 ---------------- */

  var mediaRecorder = null, mediaStream = null, chunks = [], recTimer = null;

  function pickMime() {
    if (!window.MediaRecorder) return '';
    var cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < cands.length; i++) {
      try { if (MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch (e) { /* ignore */ }
    }
    return '';
  }

  function startRec() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('当前环境拿不到麦克风，请用 http(s) 或 localhost 打开页面');
      return;
    }
    var idx = S.activeIdx >= 0 ? S.activeIdx : 0;

    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then(function (stream) {
        mediaStream = stream;
        chunks = [];
        var mime = pickMime();
        mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

        mediaRecorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = function () {
          var type = mediaRecorder.mimeType || 'audio/webm';
          var blob = new Blob(chunks, { type: type });
          if (S.recs[idx]) { try { URL.revokeObjectURL(S.recs[idx]); } catch (e) { /* ignore */ } }
          S.recs[idx] = URL.createObjectURL(blob);
          S.done[idx] = true;
          save();
          renderList();
          var cur = el.linesList.querySelector('.line[data-idx="' + idx + '"]');
          if (cur) {
            cur.classList.add('active');
            if (Date.now() - userScrollTs > 1200) scrollToLine(idx);
          }
          updateAB();
          toast('第 ' + (idx + 1) + ' 句录好了 · 按 A 和原声对比');
          cleanupStream();
        };

        mediaRecorder.start();
        S.recording = true;
        S.recIdx = idx;
        el.recBtn.classList.add('recording');
        el.recBtn.innerHTML = ICON.pause;

        var sec = 0;
        recTimer = setInterval(function () {
          sec++;
          el.recBtn.title = '录音中 ' + sec + 's · 点击停止 (R)';
        }, 1000);
        toast('录音中…读完再按一次停止');
      })
      .catch(function (err) {
        toast('麦克风打不开：' + (err && err.name ? err.name : '权限被拒绝'));
      });
  }

  function stopRec() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) { /* ignore */ }
    }
    S.recording = false;
    clearInterval(recTimer);
    el.recBtn.classList.remove('recording');
    el.recBtn.innerHTML = ICON.mic;
    el.recBtn.title = '跟读录音 / 停止 (R)';
  }

  function cleanupStream() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(function (t) { t.stop(); });
      mediaStream = null;
    }
  }

  function toggleRec() {
    if (S.recording) stopRec();
    else startRec();
  }

  function playRec(i) {
    if (!S.recs[i]) return;
    var a = new Audio(S.recs[i]);
    a.play().catch(function () { toast('录音播放失败'); });
  }

  function updateAB() {
    el.abBtn.disabled = !(S.activeIdx >= 0 && S.recs[S.activeIdx]);
  }

  /* ---------------- A/B 对比 ---------------- */

  function playLineOnce(idx, done) {
    var ln = S.lines[idx];
    if (!ln) { if (done) done(); return; }

    if (S.hasVideo && el.video.duration) {
      S.oneshot = true;
      el.video.currentTime = ln.start;
      el.video.play().catch(function () { S.oneshot = false; if (done) done(); });
      var handler = function () {
        if (el.video.currentTime >= ln.end - 0.02 || el.video.paused) {
          el.video.removeEventListener('timeupdate', handler);
          el.video.pause();
          S.oneshot = false;
          if (done) done();
        }
      };
      el.video.addEventListener('timeupdate', handler);
      updatePlayIcon();
    } else {
      speak(ln.en, function () { if (done) done(); });
    }
  }

  function compareAB() {
    var i = S.activeIdx;
    if (i < 0 || !S.recs[i]) { toast('这句还没录音，先按 R 跟读'); return; }
    stopVirtual();
    toast('先听原声，再听你的');
    playLineOnce(i, function () {
      setTimeout(function () { playRec(i); }, 420);
    });
  }

  /* ---------------- 字幕解析 ---------------- */

  // "54" -> 540ms, "540" -> 540ms（SRT 里两种写法都常见）
  function fracToMs(ms) {
    var s = String(ms);
    if (s.length === 1) return (+s) * 100;
    if (s.length === 2) return (+s) * 10;
    return +s;
  }

  function toSeconds(h, m, s, ms) {
    return (+h) * 3600 + (+m) * 60 + (+s) + fracToMs(ms) / 1000;
  }

  var TIME_RE = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;
  var CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

  function packCue(cue) {
    var en = cue.enParts.join(' ').replace(/\s+/g, ' ').trim();
    var zh = cue.zhParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!en && zh) en = zh;          // 单语字幕：中文当主文本
    if (!en) return null;
    return {
      start: cue.start,
      end: cue.end > cue.start ? cue.end : cue.start + 1.5,
      en: en,
      zh: zh
    };
  }

  // 逐行扫描：比按空行分块稳，双语之间空行也不会丢句
  function parseSubtitle(text) {
    var t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
    t = t.replace(/^WEBVTT[^\n]*(\n|$)/, '');

    var rows = t.split('\n');
    var out = [];
    var cur = null;

    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i].trim();
      var m = raw.match(TIME_RE);

      if (m) {
        if (cur) { var p = packCue(cur); if (p) out.push(p); }
        cur = {
          start: toSeconds(m[1], m[2], m[3], m[4]),
          end: toSeconds(m[5], m[6], m[7], m[8]),
          enParts: [],
          zhParts: []
        };
        continue;
      }

      if (!cur || !raw) continue;

      // 序号行：紧跟下一行是时间轴，属于下一个 cue 的编号，丢弃
      if (/^\d+$/.test(raw) && TIME_RE.test((rows[i + 1] || '').trim())) continue;

      var line = raw.replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim();
      if (!line) continue;

      if (CJK_RE.test(line)) cur.zhParts.push(line);
      else cur.enParts.push(line);
    }
    if (cur) { var last = packCue(cur); if (last) out.push(last); }

    // 兜底：自定义格式  起始秒|英文|中文
    if (!out.length) {
      for (var r = 0; r < rows.length; r++) {
        var line2 = rows[r].trim();
        if (!line2 || line2.indexOf('|') < 0) continue;
        var cells = line2.split('|');
        var st = parseFloat(cells[0]);
        if (isNaN(st) || cells.length < 2) continue;
        out.push({ start: st, end: st + 4, en: (cells[1] || '').trim(), zh: (cells[2] || '').trim() });
      }
    }

    out.sort(function (a, b) { return a.start - b.start; });

    // 修掉重叠：后一句起点不许早于前一句终点
    for (var q = 1; q < out.length; q++) {
      if (out[q].start < out[q - 1].end) {
        out[q].start = out[q - 1].end;
        if (out[q].end <= out[q].start) out[q].end = out[q].start + 1.2;
      }
    }
    return out;
  }

  /* ---------------- 导入 ---------------- */

  function loadLines(lines, label, resetProgress) {
    stopVirtual();
    stopSpeak();

    if (resetProgress) {
      // 换了一集，旧索引的进度和录音全部作废
      Object.keys(S.recs).forEach(function (k) {
        try { URL.revokeObjectURL(S.recs[k]); } catch (e) { /* ignore */ }
      });
      S.recs = {};
      S.done = {};
      save();
    }

    S.lines = lines;
    S.activeIdx = -1;
    S.virtualIdx = 0;
    if (label) el.epLabel.textContent = label;
    renderList();
    renderMarks();
    if (lines.length) {
      setActive(0, true);
      updateProgress(lines[0].start, S.hasVideo && el.video.duration ? el.video.duration : virtualDuration());
    }
    updateAB();
  }

  var currentBlobUrl = null;

  function loadVideoSrc(url, isBlob) {
    if (currentBlobUrl) {
      try { URL.revokeObjectURL(currentBlobUrl); } catch (e) { /* ignore */ }
      currentBlobUrl = null;
    }
    if (isBlob) currentBlobUrl = url;

    el.video.src = url;
    el.video.playbackRate = S.speed;
    S.hasVideo = true;
    S.oneshot = false;
    el.placeholder.classList.add('hide');
    el.modeTag.textContent = '视频跟读';
    updateProgress(0, 0);

    // 没有 controls 的元素，浏览器会消极对待 preload，必须主动 load() 才会取元数据
    try { el.video.load(); } catch (e) { /* ignore */ }

    updateCaption();
  }

  function handleVideoFile(file) {
    if (!file) return;
    loadVideoSrc(URL.createObjectURL(file), true);
    toast(S.lines.length <= 12
      ? '视频已载入 · 再导入这一集的 SRT，台词时间轴才能对上'
      : '视频已载入');
  }

  function handleSubFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var lines = parseSubtitle(String(reader.result || ''));
      if (!lines.length) {
        toast('没解析出字幕，确认是 SRT / VTT 格式');
        return;
      }
      var name = file.name.replace(/\.(srt|vtt|txt)$/i, '');
      loadLines(lines, name + ' · ' + lines.length + ' 句', true);
      renderMarks();
      toast('导入 ' + lines.length + ' 句 · 开始跟读吧');
    };
    reader.readAsText(file, 'utf-8');
  }

  /* ---------------- 剧集库 ---------------- */

  var LIB = null;
  var epReqToken = 0;
  var SUBS = null;          // {集号: srt 原文}
  var subsLoading = null;

  function mediaBase() {
    if (S.mediaOverride) return S.mediaOverride;
    if (LIB && LIB.mediaBase) return LIB.mediaBase;
    return (LIB && LIB.root) || '';
  }

  function openMediaDialog() {
    el.mediaInput.value = S.mediaOverride || (LIB && LIB.mediaBase) || '';
    el.mediaDialog.hidden = false;
    try { el.mediaInput.focus(); } catch (e) { /* ignore */ }
  }

  function closeMediaDialog() {
    el.mediaDialog.hidden = true;
  }

  function ensureSubs() {
    if (SUBS) return Promise.resolve(SUBS);
    if (subsLoading) return subsLoading;
    if (!LIB || !LIB.subtitlesInline) {
      SUBS = {};
      return Promise.resolve(SUBS);
    }
    subsLoading = fetch('data/subtitles.json', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (j) {
        SUBS = j || {};
        return SUBS;
      })
      .catch(function () {
        SUBS = {};
        return SUBS;
      });
    return subsLoading;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function actName(no) { return ['I', 'II', 'III'][(no - 1) % 3] || String(no); }

  function findEp(no) {
    if (!LIB || no == null) return null;
    for (var i = 0; i < LIB.episodes.length; i++) {
      if (LIB.episodes[i].no === no) return LIB.episodes[i];
    }
    return null;
  }

  function loadLibrary() {
    return fetch('data/library.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (lib) {
        if (!lib || !lib.episodes || !lib.episodes.length) throw new Error('empty');
        LIB = lib;
        return lib;
      })
      .catch(function () { LIB = null; return null; });
  }

  function renderPicker() {
    if (!LIB) return;

    el.pickerCount.textContent = LIB.count + ' 集 · ' + LIB.lessons.length + ' 课';
    el.pickerBtnText.textContent = S.epNo ? ('选集 · ' + pad2(S.epNo)) : '选集';

    var html = '';
    for (var i = 0; i < LIB.lessons.length; i++) {
      var ls = LIB.lessons[i];
      html += '<div class="lesson" data-title="' + esc(ls.title) + '">' +
        '<div class="lesson-title"><i>' + pad2(ls.lesson) + '</i>' + esc(ls.title) + '</div>' +
        '<div class="lesson-acts">';
      for (var j = 0; j < ls.episodes.length; j++) {
        var no = ls.episodes[j];
        html += '<button class="ep' + (no === S.epNo ? ' current' : '') +
          '" data-no="' + no + '" title="第 ' + no + ' 集">' + actName(no) + '</button>';
      }
      html += '</div></div>';
    }
    el.pickerBody.innerHTML = html;

    var cur = findEp(S.epNo);
    el.pickerNow.textContent = cur
      ? ('第 ' + pad2(cur.no) + ' 集 · ' + cur.title + ' ACT ' + cur.act)
      : '未选择';

    applyPickerFilter(el.pickerSearch.value);
  }

  function applyPickerFilter(q) {
    q = (q || '').trim().toLowerCase();
    var nodes = el.pickerBody.querySelectorAll('.lesson');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].dataset.title || '').toLowerCase();
      nodes[i].classList.toggle('hidden', !!q && t.indexOf(q) < 0);
    }
  }

  function openPicker() {
    if (!LIB) return;
    el.picker.hidden = false;
    renderPicker();
    try { el.pickerSearch.focus(); el.pickerSearch.select(); } catch (e) { /* ignore */ }
  }

  function closePicker() {
    el.picker.hidden = true;
  }

  function stepEpisode(delta) {
    if (!LIB || S.epNo == null) return;
    var idx = -1;
    for (var i = 0; i < LIB.episodes.length; i++) {
      if (LIB.episodes[i].no === S.epNo) { idx = i; break; }
    }
    var n = idx + delta;
    if (n < 0) { toast('已经是第一集'); return; }
    if (n >= LIB.episodes.length) { toast('已经是最后一集'); return; }
    loadEpisode(LIB.episodes[n].no);
  }

  function loadEpisode(no) {
    if (!LIB) return;
    var ep = findEp(no);
    if (!ep) return;

    persistEp();
    S.epNo = no;
    if (!S.allDone[no]) S.allDone[no] = {};
    if (!S.allRecs[no]) S.allRecs[no] = {};
    S.done = S.allDone[no];
    S.recs = S.allRecs[no];

    S.lines = [];
    var vBase = mediaBase();
    var sBase = LIB.root || '';

    if (vBase) {
      el.setMediaBtn.hidden = true;
      loadVideoSrc(vBase + encodeURIComponent(ep.video), false);
    } else {
      // 没有视频源：视频区给个提示，字幕照常加载
      S.hasVideo = false;
      el.video.removeAttribute('src');
      try { el.video.load(); } catch (e) { /* ignore */ }
      el.placeholder.classList.remove('hide');
      el.phText.textContent = '这一集的视频还没配置';
      el.phSub.textContent = '点下面的按钮填一个视频源地址，或用右上角「导入视频」选本地文件';
      el.setMediaBtn.hidden = false;
    }

    el.epLabel.textContent = '第 ' + pad2(no) + ' 集 · ' + ep.title + ' ACT ' + ep.act;
    el.modeTag.textContent = '剧集跟读';

    var token = ++epReqToken;

    ensureSubs().then(function () {
      if (token !== epReqToken) return;   // 已经切到别的集，丢弃这次结果

      var txt = SUBS[no];

      if (txt) {
        loadLines(parseSubtitle(txt), null, false);
        return;
      }

      if (!ep.srt) {
        loadLines([], null, false);
        toast('第 ' + no + ' 集没有字幕文件');
        return;
      }

      // 没有内联字幕包时，退回按需拉单个 srt
      fetch(sBase + encodeURIComponent(ep.srt), { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.text();
        })
        .then(function (s) {
          if (token !== epReqToken) return;
          var lines = parseSubtitle(s);
          if (lines.length) {
            loadLines(lines, null, false);
          } else {
            loadLines([], null, false);
            toast('第 ' + no + ' 集字幕解析为空');
          }
        })
        .catch(function () {
          if (token !== epReqToken) return;
          toast('第 ' + no + ' 集字幕加载失败');
        });
    });

    save();
    renderPicker();
    closePicker();
  }

  /* ---------------- 事件绑定 ---------------- */

  el.pickerBtn.addEventListener('click', openPicker);
  el.pickerClose.addEventListener('click', closePicker);
  el.picker.addEventListener('click', function (e) {
    if (e.target === el.picker) closePicker();
  });
  el.pickerBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.ep');
    if (btn) loadEpisode(+btn.dataset.no);
  });
  el.pickerSearch.addEventListener('input', function (e) {
    applyPickerFilter(e.target.value);
  });
  el.prevEp.addEventListener('click', function () { stepEpisode(-1); });
  el.nextEp.addEventListener('click', function () { stepEpisode(1); });

  el.videoInput.addEventListener('change', function (e) {
    handleVideoFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  el.subInput.addEventListener('change', function (e) {
    handleSubFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  // 拖拽
  ['dragenter', 'dragover'].forEach(function (ev) {
    el.videoWrap.addEventListener(ev, function (e) {
      e.preventDefault();
      el.videoWrap.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    el.videoWrap.addEventListener(ev, function (e) {
      e.preventDefault();
      if (ev === 'dragleave' && e.target !== el.videoWrap) return;
      el.videoWrap.classList.remove('dragover');
    });
  });
  el.videoWrap.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (/^video\//.test(f.type)) handleVideoFile(f);
    else if (/\.(srt|vtt|txt)$/i.test(f.name)) handleSubFile(f);
    else toast('拖视频或字幕文件（srt / vtt）');
  });

  el.playBtn.addEventListener('click', togglePlay);
  el.prevBtn.addEventListener('click', function () { stepEpisode(-1); });
  el.nextBtn.addEventListener('click', function () { stepEpisode(1); });
  el.recBtn.addEventListener('click', toggleRec);
  el.abBtn.addEventListener('click', compareAB);
  el.fullBtn.addEventListener('click', toggleFullscreen);

  el.loopBtn.addEventListener('click', function () {
    S.loopLine = !S.loopLine;
    el.loopBtn.classList.toggle('active', S.loopLine);
    toast(S.loopLine ? '单句循环：开' : '单句循环：关');
  });

  // 字幕语言：中英 / 英 / 中
  function setZhMode(mode, rerender) {
    if (mode !== 'both' && mode !== 'en' && mode !== 'zh') return;
    S.zhMode = mode;
    document.body.dataset.zhmode = mode;
    Array.prototype.forEach.call(el.zhSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    if (rerender !== false) {
      renderList();
      if (S.activeIdx >= 0) scrollToLine(S.activeIdx);
    }
    updateCaption();
    save();
  }

  function cycleZhMode() {
    var order = ['both', 'en', 'zh'];
    var i = order.indexOf(S.zhMode);
    setZhMode(order[(i + 1) % order.length]);
  }

  el.zhSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('.seg-btn');
    if (btn) setZhMode(btn.dataset.mode);
  });

  el.setMediaBtn.addEventListener('click', openMediaDialog);
  el.mediaCancel.addEventListener('click', closeMediaDialog);
  el.mediaDialog.addEventListener('click', function (e) {
    if (e.target === el.mediaDialog) closeMediaDialog();
  });
  el.mediaInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') el.mediaSave.click();
  });
  el.mediaSave.addEventListener('click', function () {
    var v = el.mediaInput.value.trim();
    if (v && !/^https?:\/\//i.test(v)) {
      toast('地址要以 http:// 或 https:// 开头');
      return;
    }
    if (v && !/\/$/.test(v)) v += '/';
    S.mediaOverride = v;
    save();
    closeMediaDialog();
    if (LIB && S.epNo != null) loadEpisode(S.epNo);
    toast(v ? '视频源已保存' : '视频源已清空');
  });

  el.collapseBtn.addEventListener('click', function () { setLinesVisible(false); });
  el.expandBtn.addEventListener('click', function () { setLinesVisible(true); });

  el.ccBtn.addEventListener('click', function () {
    S.showCaption = !S.showCaption;
    el.ccBtn.classList.toggle('active', S.showCaption);
    updateCaption();
    save();
    toast(S.showCaption ? '画面字幕：开' : '画面字幕：关');
  });

  el.ttsBtn.addEventListener('click', function () {
    var i = S.activeIdx >= 0 ? S.activeIdx : 0;
    if (!S.lines[i]) return;
    setActive(i);
    speak(S.lines[i].en);
  });

  function speedText(v) {
    var s = v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    if (s.indexOf('.') < 0) s += '.0';
    return s + '×';
  }

  function setSpeed(delta) {
    var i = SPEEDS.indexOf(S.speed);
    if (i < 0) i = SPEEDS.indexOf(1);
    i = Math.min(SPEEDS.length - 1, Math.max(0, i + delta));
    S.speed = SPEEDS[i];
    el.speedLabel.textContent = speedText(S.speed);
    if (S.hasVideo) el.video.playbackRate = S.speed;
    save();
  }

  el.speedUp.addEventListener('click', function () { setSpeed(1); });
  el.speedDown.addEventListener('click', function () { setSpeed(-1); });

  el.searchInput.addEventListener('input', function (e) {
    S.query = e.target.value || '';
    applyFilter();
  });

  el.filterUndone.addEventListener('click', function () {
    S.filterUndone = !S.filterUndone;
    el.filterUndone.classList.toggle('on', S.filterUndone);
    applyFilter();
  });

  el.clearDone.addEventListener('click', function () {
    S.done = {};
    Object.keys(S.recs).forEach(function (k) {
      try { URL.revokeObjectURL(S.recs[k]); } catch (e) { /* ignore */ }
    });
    S.recs = {};
    save();
    renderList();
    updateAB();
    toast('进度已清空');
  });

  // 列表交互
  el.linesList.addEventListener('click', function (e) {
    var btn = e.target.closest('.mini');
    var row = e.target.closest('.line');
    if (!row) return;
    var idx = +row.dataset.idx;

    if (btn) {
      e.stopPropagation();
      var act = btn.dataset.act;
      if (act === 'play') { setActive(idx); playLineOnce(idx); }
      else if (act === 'rec') { gotoLine(idx); setTimeout(startRec, 60); }
      else if (act === 'mine') { playRec(idx); }
      return;
    }
    gotoLine(idx);
  });

  el.linesList.addEventListener('wheel', function () { userScrollTs = Date.now(); }, { passive: true });
  el.linesList.addEventListener('touchmove', function () { userScrollTs = Date.now(); }, { passive: true });

  // 键盘
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case ' ':
        e.preventDefault(); togglePlay(); break;
      case 'ArrowUp':
        e.preventDefault(); stepLine(-1); break;
      case 'ArrowDown':
        e.preventDefault(); stepLine(1); break;
      case 'ArrowLeft':
        e.preventDefault(); seekByRatio((currentTime() - 3) / totalDuration()); break;
      case 'ArrowRight':
        e.preventDefault(); seekByRatio((currentTime() + 3) / totalDuration()); break;
      case 'r': case 'R':
        toggleRec(); break;
      case 'l': case 'L':
        el.loopBtn.click(); break;
      case 'c': case 'C':
        cycleZhMode(); break;
      case 'v': case 'V':
        el.ccBtn.click(); break;
      case 'h': case 'H':
        setLinesVisible(!S.showLines); break;
      case 's': case 'S':
        el.ttsBtn.click(); break;
      case 'a': case 'A':
        if (!el.abBtn.disabled) compareAB(); break;
      case '[':
        stepEpisode(-1); break;
      case ']':
        stepEpisode(1); break;
      case 'Escape':
        if (!el.picker.hidden) { closePicker(); break; }
        if (S.recording) stopRec();
        if (S.virtualPlaying) stopVirtual();
        break;
    }
  });

  function currentTime() {
    if (S.hasVideo) return el.video.currentTime;
    var ln = S.lines[S.activeIdx];
    return ln ? ln.start : 0;
  }
  function totalDuration() {
    if (S.hasVideo && el.video.duration) return el.video.duration;
    return virtualDuration();
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    load();
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    el.playBtn.innerHTML = ICON.play;
    el.prevBtn.innerHTML = ICON.prevEp;
    el.nextBtn.innerHTML = ICON.nextEp;
    el.loopBtn.innerHTML = ICON.loop;
    el.recBtn.innerHTML = ICON.mic;
    el.ttsBtn.innerHTML = ICON.speaker;
    el.abBtn.innerHTML = ICON.ab;
    el.abBtn.disabled = true;
    el.fullBtn.innerHTML = ICON.full;
    el.ccBtn.innerHTML = ICON.cc;
    el.ccBtn.classList.toggle('active', S.showCaption);

    el.speedLabel.textContent = speedText(S.speed);
    el.modeTag.textContent = '朗读模式';

    // 视频元素事件只绑一次
    el.video.addEventListener('loadedmetadata', function () {
      renderMarks();
      var ln = S.lines[S.activeIdx];
      updateProgress(ln ? ln.start : 0, el.video.duration || 0);
    });
    el.video.addEventListener('timeupdate', syncToVideo);
    el.video.addEventListener('seeked', syncToVideo);
    el.video.addEventListener('error', function () {
      if (!el.video.getAttribute('src')) return;   // 主动清空 src 时不算错误
      toast('这个视频浏览器解不了，换 H.264 编码的 mp4 试试');
    });
    el.video.addEventListener('play', updatePlayIcon);
    el.video.addEventListener('pause', updatePlayIcon);
    el.video.addEventListener('ended', updatePlayIcon);

    setZhMode(S.zhMode, false);
    setLinesVisible(S.showLines);

    // ?video=<直链> 可直接加载网络视频，优先级最高
    var direct = '';
    try {
      direct = new URLSearchParams(location.search).get('video') || '';
    } catch (e) { /* ignore */ }

    if (direct) {
      loadVideoSrc(direct, false);
      var demo = window.EPISODE_DEMO;
      if (demo && demo.lines && demo.lines.length) {
        loadLines(demo.lines, demo.episode || '演示片段');
      }
      toast('已按地址加载视频 · 导入同名 SRT 可对齐台词');
      renderMarks();
    } else {
      // 有剧集库就用剧集库，没有就退回内置演示数据
      loadLibrary().then(function (lib) {
        if (lib) {
          el.pickerBtn.hidden = false;
          el.prevBtn.disabled = false;
          el.nextBtn.disabled = false;
          renderPicker();
          var no = findEp(S.epNo) ? S.epNo : LIB.episodes[0].no;
          loadEpisode(no);
        } else {
          var d = window.EPISODE_DEMO;
          if (d && d.lines && d.lines.length) {
            loadLines(d.lines, d.episode || '演示片段');
          } else {
            toast('没有台词数据，先导入字幕');
          }
          renderMarks();
        }
      });
    }

    // 朗读模式（无视频）时位置由 TTS 驱动，不需要额外循环
  }

  init();
})();
