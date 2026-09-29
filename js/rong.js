/* ==========================================================================
   RONG 首页交互脚本
   文件：source/js/rong.js
   引入：_config.butterfly.yml → inject.bottom
   职责：
     1. 黑胶唱片音乐播放器（HTML5 Audio 驱动，单曲）
     2. 「网站信息」里的运行天数计算

   音频文件：source/music/ishikari-lore.mp3（部署后路径为 /music/ishikari-lore.mp3）
   音乐版权：Kevin MacLeod（https://incompetech.com）的作品，
             以 CC BY 4.0 授权免费使用（可商用），署名已写在页面上。
             想换成自己的音乐：把 mp3 放进 source/music/，再改下面的 TRACK。
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. 黑胶唱片音乐播放器                                              */
  /* ------------------------------------------------------------------ */
  var TRACK = {
    title: '石狩民谣',
    artist: 'Kevin MacLeod',
    src: '/music/ishikari-lore.mp3'
  };

  // 播放器下方那行提示的四种状态文案（避免播放中仍显示「点击我开始播放」）
  var NOTE_IDLE = '点击我开始播放';
  var NOTE_PLAYING = '正在播放';
  var NOTE_PAUSED = '已暂停，点击继续';
  var NOTE_ERROR = '音频加载失败，请刷新页面重试';

  var audio = null;      // 全局单例，避免切页时叠出多个播放实例
  var el = {};           // 当前页面的 DOM 引用
  var bound = false;     // audio 的事件是否已绑定（只绑一次）

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function setNote(text) {
    if (el.note) el.note.textContent = text;
  }

  function setPlaying(next) {
    if (el.root) el.root.dataset.playing = next ? 'true' : 'false';
    if (el.btnPlay) el.btnPlay.setAttribute('aria-label', next ? '暂停' : '播放');
    if (next) {
      setNote(NOTE_PLAYING);
    } else {
      // 播到 0 秒说明是待播状态，中途停下才算暂停
      setNote(audio && audio.currentTime > 0 ? NOTE_PAUSED : NOTE_IDLE);
    }
  }

  function paintProgress() {
    var dur = audio && isFinite(audio.duration) ? audio.duration : 0;
    var cur = (audio && audio.currentTime) || 0;
    var pct = dur ? (cur / dur) * 100 : 0;
    if (pct > 100) pct = 100;
    if (el.fill) el.fill.style.width = pct + '%';
    if (el.knob) el.knob.style.left = pct + '%';
    if (el.cur) el.cur.textContent = formatTime(cur);
    if (el.dur) el.dur.textContent = formatTime(dur);
  }

  function play() {
    var p = audio.play();
    // 浏览器可能拒绝播放（需用户交互），静默把状态退回暂停
    if (p && typeof p.catch === 'function') {
      p.catch(function () { setPlaying(false); });
    }
  }

  function bindAudioEvents() {
    if (bound) return;
    bound = true;

    audio.addEventListener('loadedmetadata', paintProgress);
    audio.addEventListener('timeupdate', paintProgress);
    audio.addEventListener('play', function () { setPlaying(true); });
    audio.addEventListener('playing', function () { setPlaying(true); });
    audio.addEventListener('pause', function () { setPlaying(false); });
    audio.addEventListener('ended', function () {
      // 单曲：播完回到开头并停下，不自动重播
      audio.currentTime = 0;
      paintProgress();
      setPlaying(false);
    });
    audio.addEventListener('error', function () {
      setPlaying(false);
      setNote(NOTE_ERROR);
    });
  }

  function initMusic() {
    var root = document.getElementById('rongMusic');
    if (!root || root.dataset.rongInit === '1') return;
    root.dataset.rongInit = '1';

    el = {
      root: root,
      title: document.getElementById('rongTrackTitle'),
      artist: document.getElementById('rongTrackArtist'),
      cur: document.getElementById('rongTimeCur'),
      dur: document.getElementById('rongTimeDur'),
      bar: document.getElementById('rongProgress'),
      fill: document.getElementById('rongProgressFill'),
      knob: document.getElementById('rongProgressKnob'),
      note: root.querySelector('.rong-music-note'),
      btnPlay: document.getElementById('rongPlay')
    };

    if (!audio) {
      audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = 0.7;
    }
    audio.pause();
    bindAudioEvents();

    // 曲目信息是固定的，每次进页面直接写入，不依赖音频加载
    if (el.title) el.title.textContent = TRACK.title;
    if (el.artist) el.artist.textContent = TRACK.artist;

    if (el.btnPlay) {
      el.btnPlay.addEventListener('click', function () {
        if (audio.paused) { play(); } else { audio.pause(); }
      });
    }
    if (el.bar) {
      el.bar.addEventListener('click', function (e) {
        var dur = audio.duration;
        if (!isFinite(dur) || dur <= 0) return;
        var rect = el.bar.getBoundingClientRect();
        if (!rect.width) return;
        var ratio = (e.clientX - rect.left) / rect.width;
        ratio = Math.min(1, Math.max(0, ratio));
        audio.currentTime = ratio * dur;
        paintProgress();
      });
    }

    // 只在首次进入时设置音源：同一 src 重复赋值不会触发重新加载
    if (!audio.src) {
      audio.src = TRACK.src;
    }
    paintProgress();
    setPlaying(!audio.paused);
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
