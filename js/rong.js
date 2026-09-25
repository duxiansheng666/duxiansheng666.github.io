/* ==========================================================================
   RONG 首页交互脚本
   文件：source/js/rong.js
   引入：_config.butterfly.yml → inject.bottom
   职责：
     1. 黑胶唱片音乐播放器（纯 UI，不加载任何音频文件）
     2. 「网站信息」里的运行天数计算
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. 黑胶唱片音乐播放器（UI 演示，无音频）                            */
  /* ------------------------------------------------------------------ */
  var TRACKS = [
    { title: '夏夜的风', artist: 'RONG 的歌单', duration: 214 },
    { title: '睡前的第 3 分钟', artist: 'RONG 的歌单', duration: 187 },
    { title: '写代码的时候听', artist: 'RONG 的歌单', duration: 246 }
  ];

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function initMusic() {
    var root = document.getElementById('rongMusic');
    if (!root || root.dataset.rongInit === '1') return;
    root.dataset.rongInit = '1';

    var elTitle = document.getElementById('rongTrackTitle');
    var elArtist = document.getElementById('rongTrackArtist');
    var elCur = document.getElementById('rongTimeCur');
    var elDur = document.getElementById('rongTimeDur');
    var elBar = document.getElementById('rongProgress');
    var elFill = document.getElementById('rongProgressFill');
    var elKnob = document.getElementById('rongProgressKnob');
    var btnPlay = document.getElementById('rongPlay');
    var btnPrev = document.getElementById('rongPrev');
    var btnNext = document.getElementById('rongNext');

    var index = 0;
    var current = 0;
    var playing = false;
    var lastTs = 0;
    var rafId = null;

    function render() {
      var track = TRACKS[index];
      var pct = track.duration ? (current / track.duration) * 100 : 0;
      if (pct > 100) pct = 100;
      if (elFill) elFill.style.width = pct + '%';
      if (elKnob) elKnob.style.left = pct + '%';
      if (elCur) elCur.textContent = formatTime(current);
      if (elDur) elDur.textContent = formatTime(track.duration);
    }

    function loadTrack(i) {
      index = (i + TRACKS.length) % TRACKS.length;
      current = 0;
      var track = TRACKS[index];
      if (elTitle) elTitle.textContent = track.title;
      if (elArtist) elArtist.textContent = track.artist;
      render();
    }

    function setPlaying(next) {
      playing = next;
      root.dataset.playing = next ? 'true' : 'false';
      if (btnPlay) btnPlay.setAttribute('aria-label', next ? '暂停' : '播放');
      lastTs = 0;
      if (next) {
        rafId = requestAnimationFrame(tick);
      } else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function tick(ts) {
      if (!playing) return;
      if (!lastTs) lastTs = ts;
      var dt = (ts - lastTs) / 1000;
      lastTs = ts;
      current += dt;

      var track = TRACKS[index];
      if (current >= track.duration) {
        current = 0;
        // 唱完自动下一首
        loadTrack(index + 1);
      }
      render();
      rafId = requestAnimationFrame(tick);
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', function () {
        setPlaying(!playing);
      });
    }
    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        loadTrack(index - 1);
        if (playing) { lastTs = 0; }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        loadTrack(index + 1);
        if (playing) { lastTs = 0; }
      });
    }
    if (elBar) {
      elBar.addEventListener('click', function (e) {
        var rect = elBar.getBoundingClientRect();
        if (!rect.width) return;
        var ratio = (e.clientX - rect.left) / rect.width;
        ratio = Math.min(1, Math.max(0, ratio));
        current = ratio * TRACKS[index].duration;
        render();
      });
    }

    loadTrack(0);
    setPlaying(false);
  }

  /* ------------------------------------------------------------------ */
  /* 2. 网站信息：运行天数                                              */
  /* ------------------------------------------------------------------ */
  function initRuntime() {
    var host = document.querySelector('.rong-info-item[data-since]');
    if (!host) return;
    var out = host.querySelector('#rongRuntimeDays');
    if (!out) return;

    var raw = (host.getAttribute('data-since') || '').trim();
    var m = raw.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!m) {
      out.textContent = '—';
      return;
    }

    var start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    if (!isFinite(days) || days < 1) days = 1;
    out.textContent = String(days);
  }

  /* ------------------------------------------------------------------ */
  /* 启动                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    initMusic();
    initRuntime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // 主题若开启 pjax，切页后重新初始化（当前配置为关闭，保留兼容）
  document.addEventListener('pjax:complete', boot);
})();