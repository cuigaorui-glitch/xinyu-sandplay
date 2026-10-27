/* Xiaoyu's optional age recommendation and first-use tour. */
(() => {
  'use strict';
  const home = document.body.classList.contains('home-page');
  const online = document.body.classList.contains('online-mode');
  const store = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key, value) { try { localStorage.setItem(key, value); } catch {} } };
  const art = '/static/core/images/guide-';
  const dialog = document.createElement('dialog');
  dialog.className = 'xy-guide';
  dialog.setAttribute('aria-labelledby', 'xy-title');
  document.body.append(dialog);
  let returnFocus, index = 0, audio, controller, audioURL, generation = 0, voice = false, resumeScene;
  function clearResume() { if (resumeScene) document.querySelector('#scene-list')?.removeEventListener('click', resumeScene); resumeScene = null; }
  function stopVoice() { generation++; controller?.abort(); audio?.pause(); audio = null; if (audioURL) URL.revokeObjectURL(audioURL); audioURL = null; }
  function close() { stopVoice(); dialog.close(); document.querySelector('.xy-spotlight')?.remove(); returnFocus?.focus(); }
  function open() { returnFocus = document.activeElement; if (!dialog.open) dialog.showModal(); }
  const voiceControls = '<div class="xy-voice"><button type="button" data-action="voice">♫ 听小语说</button><button type="button" data-action="mute" hidden>关闭声音</button><span class="xy-voice-status" role="status"></span></div><p class="xy-disclosure">点击听小语说，会将本段固定教程文字发送给 MiniMax 合成语音；不发送年龄或作品。声音为 AI 合成。</p>';
  function frame(pose, content) {
    dialog.innerHTML = `<button class="xy-close" type="button" data-action="close" aria-label="关闭引导">×</button><img class="xy-guide-art" src="${art}${pose}.webp" alt="小语陪你一起探索"><div class="xy-bubble">${content}</div>`;
  }
  async function speak() {
    stopVoice();
    if (!voice) return;
    const token = generation;
    const status = dialog.querySelector('.xy-voice-status');
    const text = [...dialog.querySelectorAll('#xy-title,.xy-copy')].map(el => el.textContent).join(' ');
    status.textContent = '小语在准备声音啦…';
    const activeController = new AbortController(); controller = activeController;
    const timeout = setTimeout(() => activeController.abort(), 35000);
    try {
      const response = await fetch('/api/speech/synthesize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, consent: true }), signal: activeController.signal });
      if (!response.ok) throw Error('语音暂时不可用，先看看文字吧～');
      const blob = await response.blob();
      if (token !== generation) return;
      audioURL = URL.createObjectURL(blob); audio = new Audio(audioURL); await audio.play();
      status.textContent = '小语正在说话 · AI 合成';
      audio.onended = () => { if (token === generation) status.textContent = '听完啦，再点一次可以重听'; };
    } catch { if (token === generation) status.textContent = '语音暂时不可用，先看看文字吧～'; }
    finally { clearTimeout(timeout); }
  }
  function agePicker() {
    dialog.classList.remove('xy-tour', 'xy-tour-positioned'); dialog.removeAttribute('style');
    frame('welcome', '<span class="xy-eyebrow">和小语认识一下 · 1 / 2</span><h2 id="xy-title">嗨，小小创造家！<br>你今年几岁啦？</h2><p class="xy-copy">我是小语，想陪你搭一个小世界。告诉我年龄，我来帮你挑一种玩法～</p><form id="xy-age-form"><label for="xy-age">我的年龄</label><div class="xy-age-row"><select id="xy-age" required><option value="">选一选</option>' + Array.from({ length: 18 }, (_, i) => `<option value="${i + 1}">${i + 1} 岁</option>`).join('') + '</select><button class="xy-primary" type="submit">帮我选一选 →</button></div></form><button class="xy-link" data-action="no-age">先不告诉你，我自己选</button><p class="xy-note">年龄仅用于这次推荐，不保存，也不上传。</p>');
    open();
    dialog.querySelector('form').onsubmit = event => { event.preventDefault(); modePicker(Number(dialog.querySelector('select').value)); };
  }
  function modePicker(age) {
    stopVoice(); dialog.classList.remove('xy-tour', 'xy-tour-positioned'); dialog.removeAttribute('style');
    const recommended = age ? age <= 6 ? 'physical' : 'online' : null;
    frame('teacher', `<span class="xy-eyebrow">挑选今天的冒险 · 2 / 2</span><h2 id="xy-title">${recommended ? '小语帮你选好啦！' : '今天想怎么玩呢？'}</h2><p class="xy-copy">${recommended === 'physical' ? '先用小手摸一摸、摆一摆吧！推荐你从实体沙盘开始。' : recommended === 'online' ? '来当小世界的设计师吧！推荐你试试线上沙盘。' : '桌上搭一搭，或屏幕里摆一摆，两种玩法都很棒！'}</p><div class="xy-mode-grid">${['physical', 'online'].map(mode => `<button class="xy-mode ${recommended === mode ? 'is-recommended' : ''}" data-mode="${mode}"><span class="xy-tag">${recommended === mode ? '小语推荐 ✦' : '也可以选我'}</span><strong>${mode === 'physical' ? '▣ 实体沙盘' : '✦ 线上沙盘'}</strong><span>${mode === 'physical' ? '拿起真实小摆件，用摄像头看见你的搭建。' : '不用摄像头，点击、拖动小摆件，自由创造。'}</span><b>选这个，出发 →</b></button>`).join('')}</div><p class="xy-note">推荐只是小建议，喜欢哪种就选哪种，进入后也能切换。</p><button class="xy-link" data-action="age">← 重新选年龄</button>`);
    open();
  }
  const steps = [
    ...(!online ? [{ target: '.camera-window', title: '让小语看见你的沙盘', text: '把真实沙盘放在镜头前，请大人帮忙点击“连接摄像头”。先读一读数据说明；也可以只在本机预览哦。', pose: 'teacher' }] : []),
    { target: '#scene-picker, #change-scene', title: '给故事找个小天地', text: '森林、海洋，还是星空？这里可以挑选喜欢的场景。以后想换个背景，点“更换场景”就好啦！', pose: 'welcome' },
    { target: '.simulation', title: '打开沙具小口袋', text: online ? '这里住着好多小摆件！按分类找一找，点一下放进沙盘，也可以拖进去。' : '没有实体摆件也没关系！暂停摄像头识别后，可以在这里挑沙具，手动搭一搭。', pose: 'point' },
    { target: '#world-canvas', title: '把想象轻轻放进来', text: '这就是你的小世界！点中摆件，拖一拖换位置；选中后还能用方向键微调。想拿走时，点“移除选中沙具”就好啦。', pose: 'teacher' },
    { target: '.mascot-friends', title: '小语一直陪着你', text: '看到粉色的小伙伴了吗？点点我，就能聊聊你的故事。可以打字，也可以在了解说明后，用“说一说”告诉我。', pose: 'happy' },
    { target: '#save-world', title: '把小世界收进口袋', text: '喜欢现在的样子，就点“保存”！作品会留在这台设备的当前浏览器里，回到首页点“查看我的记录”就能找到。', pose: 'point' },
    { target: '#finish-session', title: '给今天的故事一个拥抱', text: '搭好啦？点“完成并回顾”，和小语一起回看创作。AI回顾需要联网并同意说明，也可以只保存本机记录。每个小世界都值得被珍惜！', pose: 'happy' }
  ];
  function visibleTarget(step) { return [...document.querySelectorAll(step.target)].find(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden') || null; }
  function position() {
    const spot = document.querySelector('.xy-spotlight'); if (!spot || !dialog.open) return;
    const el = visibleTarget(steps[index]);
    if (!el) spot.hidden = true;
    const r = el ? el.getBoundingClientRect() : { left: 0, top: innerHeight / 2, bottom: innerHeight / 2, width: innerWidth, height: 0 };
    spot.hidden = !el;
    Object.assign(spot.style, { left: `${Math.max(4, r.left - 7)}px`, top: `${Math.max(4, r.top - 7)}px`, width: `${Math.min(r.width + 14, innerWidth - 8)}px`, height: `${Math.min(r.height + 14, innerHeight - 8)}px` });
    const bubble = dialog.querySelector('.xy-bubble');
    const box = bubble.getBoundingClientRect();
    const below = r.bottom + box.height + 35 < innerHeight;
    const top = below ? r.bottom + 25 : Math.max(12, r.top - box.height - 25);
    dialog.classList.add('xy-tour-positioned');
    const left = Math.max(16, Math.min(innerWidth - box.width - 16, r.left + r.width / 2 - box.width / 2));
    const bubbleTop = Math.max(72, Math.min(innerHeight - box.height - 70, top));
    bubble.style.left = `${left}px`; bubble.style.top = `${bubbleTop}px`;
    const character = dialog.querySelector('.xy-guide-art');
    const charWidth = innerWidth < 600 ? 100 : 170;
    const charLeft = left >= charWidth ? left - charWidth + 12 : Math.min(innerWidth - charWidth - 12, left + box.width - charWidth);
    character.style.left = `${charLeft}px`; character.style.top = `${Math.max(10, bubbleTop - (left >= charWidth ? 0 : charWidth * .8))}px`;
    const arrow = dialog.querySelector('.xy-arrow');
    arrow.textContent = below ? '↑' : '↓';
    Object.assign(arrow.style, { position: 'fixed', left: `${Math.max(12, Math.min(innerWidth - 40, r.left + r.width / 2 - 15))}px`, top: `${below ? r.bottom + 2 : Math.max(4, r.top - 38)}px` });
  }
  function tour() {
    clearResume();
    stopVoice();
    const step = steps[index];
    const target = visibleTarget(step);
    target?.scrollIntoView({ block: 'center', behavior: 'instant' });
    frame(step.pose, `<span class="xy-eyebrow">小语的探索地图 · ${index + 1} / ${steps.length}</span><span class="xy-arrow" aria-hidden="true">↗</span><h2 id="xy-title">${step.title}</h2><p class="xy-copy">${step.text}</p>${!target ? '<p class="xy-note">这个功能会在选择场景后出现哦。</p>' : ''}${voiceControls}<div class="xy-tour-actions"><button data-action="prev" ${index === 0 ? 'disabled' : ''}>上一步</button><button data-action="skip">先去玩啦</button><button class="xy-primary" data-action="next">${index === steps.length - 1 ? '我会啦，出发！' : step.target.includes('#scene-picker') && document.querySelector('#digital-view').hidden ? '去选场景 →' : '下一步 →'}</button></div>`);
    dialog.classList.add('xy-tour'); open();
    const hint = document.createElement('p'); hint.className = 'xy-blank-hint'; hint.textContent = '轻点页面空白处，听小语说下一步 ✦'; dialog.append(hint);
    if (!document.querySelector('.xy-spotlight')) { const spot = document.createElement('div'); spot.className = 'xy-spotlight'; dialog.append(spot); }
    position();
    dialog.querySelector('[data-action=voice]').textContent = voice ? '♫ 重听这一段' : '♫ 听小语说';
    dialog.querySelector('[data-action=mute]').hidden = !voice;
    if (voice) void speak();
  }
  function complete() { store.set(`xy-tour-${online ? 'online' : 'physical'}-v1`, 'done'); close(); }
  dialog.addEventListener('click', event => {
    if (dialog.classList.contains('xy-tour') && (event.target === dialog || event.target.classList.contains('xy-blank-hint') || event.target.classList.contains('xy-guide-art'))) { dialog.querySelector('[data-action=next]').click(); return; }
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.mode) { store.set('xy-mode', button.dataset.mode); location.href = `${button.dataset.mode === 'online' ? '/sandbox/' : '/build/'}?tour=1`; return; }
    switch (button.dataset.action) {
      case 'close': close(); break;
      case 'no-age': modePicker(null); break;
      case 'age': agePicker(); break;
      case 'voice': voice = true; dialog.querySelector('[data-action=mute]').hidden = false; void speak(); break;
      case 'mute': voice = false; stopVoice(); button.hidden = true; dialog.querySelector('.xy-voice-status').textContent = '声音已关闭'; break;
      case 'skip': complete(); break;
      case 'prev': if (index > 0) { index--; tour(); } break;
      case 'next':
        if (steps[index].target.includes('#scene-picker') && document.querySelector('#digital-view').hidden) {
          close();
          clearResume();
          resumeScene = event => { if (event.target.closest('button')) { clearResume(); index++; requestAnimationFrame(tour); } };
          document.querySelector('#scene-list').addEventListener('click', resumeScene);
        } else if (index < steps.length - 1) { index++; tour(); } else complete();
        break;
    }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  addEventListener('resize', position); addEventListener('scroll', position, true); addEventListener('pagehide', stopVoice);
  if (home) {
    const start = document.querySelector('.cover-start');
    start.addEventListener('click', event => { event.preventDefault(); agePicker(); });
  } else {
    const toolbar = document.createElement('div'); toolbar.className = 'xy-tools';
    toolbar.innerHTML = `<button type="button" id="xy-replay">✦ 小语教程</button><button type="button" id="xy-switch">⇄ 切换玩法</button>`;
    // Keep the existing workspace's three grid rows untouched.
    document.body.append(toolbar);
    document.querySelector('#xy-replay').onclick = () => { index = 0; tour(); };
    document.querySelector('#xy-switch').onclick = () => { dialog.classList.remove('xy-tour', 'xy-tour-positioned'); modePicker(null); };
    if (!new URLSearchParams(location.search).has('record') && (new URLSearchParams(location.search).has('tour') || !store.get(`xy-tour-${online ? 'online' : 'physical'}-v1`))) tour();
  }
})();
