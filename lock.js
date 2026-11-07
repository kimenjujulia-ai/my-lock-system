(() => {
  if (window.__mylock) return;
  window.__mylock = true;
  const S = chrome.storage.local;
  const IMG = chrome.runtime.getURL('hero.webp');
  let host = null, raf = 0, timers = [], cleanups = [], tries = 0, until = 0, prevOverflow = '', curTheme = null;

  const TEXT = {
    cute: {
      hello: ['Heyyy! Weka password tafadhali ✌️', 'Mwenye nyumba hayuko, ila mimi niko 💅', 'Sema neno la siri, rafiki 🎀', 'Usiguse! Hii ni ya mwenyewe 🙈'],
      bad: ['Eeh! Hiyo si password 😂', 'Jaribu tena... lakini hii si yako 👀', 'Nakuona! Toka hapo 😏', 'Mmmh, wewe si mwenyewe 🕵️'],
      ph: 'Weka password hapa...', btn: 'Fungua 🔓', wait: s => 'Pole sana, tulia ' + s + 's kwanza 😅', again: 'Jaribu tena 💖'
    },
    cyber: {
      hello: ['> SYSTEM LOCKED_', '> IDENTITY CHECK REQUIRED_', '> ENTER PASSCODE_', '> INTRUDER? NOT TODAY_'],
      bad: ['ACCESS DENIED ✖ Nakuona!', '✖ WRONG CODE. Toka hapo.', '✖ INTRUDER DETECTED 👁️', 'ACCESS DENIED. Wewe si mwenyewe.'],
      ph: 'passcode_', btn: 'ACCESS ⚡', wait: s => '✖ LOCKDOWN ' + s + 's', again: '> READY_'
    }
  };

  const CSS = `
  *{box-sizing:border-box}
  .wrap{--h:min(56vh,480px);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:system-ui,Segoe UI,Roboto,sans-serif;animation:rise .7s cubic-bezier(.2,.9,.3,1.1)}
  @keyframes rise{from{transform:translateY(100%);opacity:0}}
  @keyframes bg{50%{background-position:100% 50%}}
  .cute{color:#4a2c4a;background:linear-gradient(135deg,#ffd6e8,#ffe3c2,#e6d6ff,#d6f5e3);background-size:300% 300%;animation:rise .7s cubic-bezier(.2,.9,.3,1.1),bg 14s ease infinite}
  .cyber{color:#d8f6ff;font-family:'Courier New',monospace;background:#04060f}
  .cyber::before{content:'';position:absolute;inset:0;background:linear-gradient(rgba(0,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,.07) 1px,transparent 1px);background-size:44px 44px}
  canvas{position:absolute;inset:0;width:100%;height:100%}
  .cyber canvas{opacity:.55}
  .scan{display:none;position:absolute;inset:0;z-index:3;pointer-events:none}
  .cyber .scan{display:block;background:repeating-linear-gradient(0deg,rgba(0,255,255,.05) 0 1px,transparent 1px 3px)}
  .cyber .scan::after{content:'';position:absolute;left:0;right:0;height:90px;background:linear-gradient(transparent,rgba(0,255,255,.12),transparent);animation:sweep 5s linear infinite}
  @keyframes sweep{from{top:-90px}to{top:100%}}

  .tog{position:absolute;top:14px;right:14px;z-index:5;display:flex;gap:6px}
  .tog button{padding:7px 13px;border-radius:20px;border:1px solid rgba(0,0,0,.2);background:rgba(255,255,255,.5);color:inherit;font:600 13px system-ui,sans-serif;cursor:pointer}
  .cyber .tog button{background:rgba(0,0,0,.5);border-color:#0ff;color:#0ff;border-radius:3px;font-family:'Courier New',monospace}
  .tog button.on{background:#fff;box-shadow:0 0 0 2px #ff7eb6}
  .cyber .tog button.on{background:#0ff;color:#000;box-shadow:0 0 12px #0ff}

  .stage{position:relative;z-index:2;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:34px;width:100%;padding:70px 20px 20px}
  .hero{position:relative;height:var(--h);width:calc(var(--h)*.547)}
  .char{position:absolute;inset:0;transform-origin:50% 100%}
  .char img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
  .cute .char{animation:bob 2.4s ease-in-out infinite;filter:drop-shadow(0 0 0 #fff) drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff) drop-shadow(0 12px 16px rgba(255,100,160,.35))}
  @keyframes bob{0%,100%{transform:translateY(0) rotate(-3deg) scale(1.03,.97)}50%{transform:translateY(-28px) rotate(3deg) scale(.98,1.03)}}
  .cyber .char{animation:flo 3s ease-in-out infinite,flick 6s infinite;filter:drop-shadow(0 0 2px #0ff) drop-shadow(0 0 16px rgba(255,0,200,.6))}
  @keyframes flo{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
  @keyframes flick{0%,92%,96%,100%{opacity:1}93%{opacity:.55}95%{opacity:.8}}
  .char.no{animation:nope .5s}
  @keyframes nope{20%,60%{transform:translateX(-16px) rotate(-5deg)}40%,80%{transform:translateX(16px) rotate(5deg)}}
  .shadow{position:absolute;left:10%;right:10%;bottom:-16px;height:18px;border-radius:50%;background:rgba(90,40,90,.3);filter:blur(5px);animation:shad 2.4s ease-in-out infinite}
  .cyber .shadow{background:rgba(0,255,255,.45);animation-duration:3s}
  @keyframes shad{0%,100%{transform:scaleX(1);opacity:.4}50%{transform:scaleX(.65);opacity:.18}}

  .g{display:none;opacity:0;mix-blend-mode:screen}
  .cyber .g{display:block}
  .g1{filter:drop-shadow(-7px 0 0 rgba(255,0,80,.95));animation:gl 3.2s infinite steps(1)}
  .g2{filter:drop-shadow(7px 0 0 rgba(0,255,255,.95));animation:gl 4.1s infinite steps(1) .7s}
  @keyframes gl{0%,88%,100%{opacity:0}89%{opacity:1;clip-path:inset(20% 0 60% 0);transform:translateX(-10px)}91%{opacity:1;clip-path:inset(55% 0 25% 0);transform:translateX(12px)}94%{opacity:1;clip-path:inset(75% 0 8% 0);transform:translateX(-6px)}96%{opacity:0}}
  .burst .g1,.burst .g2{animation:glb .25s infinite steps(1)}
  @keyframes glb{0%{opacity:1;clip-path:inset(10% 0 70% 0);transform:translateX(-14px)}25%{opacity:1;clip-path:inset(40% 0 40% 0);transform:translateX(14px)}50%{opacity:1;clip-path:inset(70% 0 10% 0);transform:translateX(-10px)}75%{opacity:1;clip-path:inset(25% 0 55% 0);transform:translateX(10px)}}

  .bubble{position:absolute;top:-58px;left:50%;transform:translateX(-50%);width:max-content;max-width:min(300px,86vw);text-align:center;padding:10px 16px;font-size:15px;font-weight:600;z-index:4;animation:pop .35s cubic-bezier(.2,1.6,.4,1)}
  @keyframes pop{from{transform:translateX(-50%) scale(.6);opacity:0}}
  .cute .bubble{background:#fff;border-radius:18px;box-shadow:0 6px 18px rgba(255,100,160,.3)}
  .cute .bubble::after{content:'';position:absolute;left:50%;bottom:-9px;margin-left:-9px;border:9px solid transparent;border-bottom:0;border-top-color:#fff}
  .cyber .bubble{background:rgba(0,16,26,.85);border:1px solid #0ff;color:#0ff;box-shadow:0 0 16px rgba(0,255,255,.4);text-shadow:0 0 8px #0ff}
  .bubble.bad{color:#e0245e}.cyber .bubble.bad{color:#ff3b6e;border-color:#ff3b6e;box-shadow:0 0 16px rgba(255,59,110,.5);text-shadow:0 0 8px #ff3b6e}

  .panel{display:flex;flex-direction:column;align-items:center;gap:14px;width:min(340px,100%)}
  .clock{font-size:64px;font-weight:200;letter-spacing:2px;line-height:1}
  .cyber .clock{color:#0ff;text-shadow:0 0 14px #0ff;font-weight:400}
  .box{width:100%;display:flex;flex-direction:column;gap:12px;padding:20px}
  .cute .box{background:rgba(255,255,255,.65);border:2px solid #fff;border-radius:22px;box-shadow:0 10px 30px rgba(255,100,160,.25)}
  .cyber .box{background:rgba(0,10,20,.72);border:1px solid #0ff;border-radius:4px;box-shadow:0 0 18px rgba(0,255,255,.35),inset 0 0 12px rgba(0,255,255,.15)}
  .shake{animation:sh .45s}@keyframes sh{20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}
  input{width:100%;padding:13px;font-size:16px;text-align:center;outline:none}
  .cute input{border:2px solid #ffb3d1;border-radius:14px;background:#fff;color:#4a2c4a}
  .cute input:focus{border-color:#ff7eb6}
  .cyber input{border:1px solid #0ff;border-radius:2px;background:#000;color:#0ff;letter-spacing:3px;font-family:'Courier New',monospace}
  .cyber input:focus{box-shadow:0 0 12px #0ff}
  .go{padding:12px;font-size:16px;font-weight:700;cursor:pointer;transition:transform .15s}
  .go:hover{transform:scale(1.03)}
  .cute .go{border:0;border-radius:14px;background:linear-gradient(90deg,#ff7eb6,#ffa94d);color:#fff}
  .cyber .go{border:1px solid #f0f;border-radius:2px;background:rgba(255,0,255,.12);color:#f0f;text-shadow:0 0 8px #f0f;letter-spacing:2px;font-family:'Courier New',monospace}
  .go:disabled,input:disabled{opacity:.5}
  .msg{min-height:20px;font-size:14px;opacity:.8}
  @media (max-width:760px){.wrap{--h:min(38vh,330px)}.clock{font-size:44px}.stage{gap:48px;padding-top:80px}}
  `;

  function build(theme) {
    const T = TEXT[theme];
    host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
    ['keydown', 'keyup', 'keypress'].forEach(e => host.addEventListener(e, ev => ev.stopPropagation()));
    const r = host.attachShadow({ mode: 'open' });
    r.innerHTML = `<style>${CSS}</style>
    <div class="wrap ${theme}">
      <canvas></canvas><div class="scan"></div>
      <div class="tog"><button data-t="cute" class="${theme === 'cute' ? 'on' : ''}">🎀 Cute</button><button data-t="cyber" class="${theme === 'cyber' ? 'on' : ''}">🤖 Cyber</button></div>
      <div class="stage">
        <div class="hero">
          <div class="bubble"></div><div class="shadow"></div>
          <div class="char"><img class="m" src="${IMG}"><img class="g g1" src="${IMG}"><img class="g g2" src="${IMG}"></div>
        </div>
        <div class="panel">
          <div class="clock"></div>
          <div class="box"><input type="password" placeholder="${T.ph}" autocomplete="off"><button class="go">${T.btn}</button><div class="msg"></div></div>
        </div>
      </div>
    </div>`;

    const $ = s => r.querySelector(s);
    const wrap = $('.wrap'), input = $('input'), btn = $('.go'), msg = $('.msg'), box = $('.box'), bubble = $('.bubble'), ch = $('.char'), clock = $('.clock');

    // theme switch
    r.querySelectorAll('.tog button').forEach(b => b.onclick = () => S.set({ theme: b.dataset.t }));

    // speech bubble
    function say(text, bad) {
      bubble.textContent = text; bubble.classList.toggle('bad', !!bad);
      bubble.style.animation = 'none'; void bubble.offsetWidth; bubble.style.animation = '';
    }
    let hi = 0; say(T.hello[0]);
    timers.push(setInterval(() => { hi = (hi + 1) % T.hello.length; say(T.hello[hi]); }, 4000));

    // unlock
    async function go() {
      if (Date.now() < until || !input.value) return;
      let res;
      try { res = await chrome.runtime.sendMessage({ type: 'check', pw: input.value }); } catch (e) { return; }
      if (res && res.ok) { tries = 0; return; } // storage change hides the lock everywhere
      tries++; input.value = '';
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      ch.classList.add('no'); wrap.classList.add('burst');
      setTimeout(() => { ch.classList.remove('no'); wrap.classList.remove('burst'); }, 550);
      say(T.bad[Math.floor(Math.random() * T.bad.length)], true);
      if (tries >= 3) {
        tries = 0; until = Date.now() + 30000;
        input.disabled = btn.disabled = true;
        const t = setInterval(() => {
          const s = Math.ceil((until - Date.now()) / 1000);
          if (s <= 0) { clearInterval(t); input.disabled = btn.disabled = false; msg.textContent = T.again; input.focus(); }
          else msg.textContent = T.wait(s);
        }, 250);
        timers.push(t);
      } else msg.textContent = '(' + (3 - tries) + ' left)';
    }
    btn.onclick = go;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });

    // clock
    const tick = () => clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    tick(); timers.push(setInterval(tick, 1000));

    // background effects
    const c = $('canvas'), x = c.getContext('2d'); let W, H;
    const size = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    size(); addEventListener('resize', size); cleanups.push(() => removeEventListener('resize', size));

    if (theme === 'cute') {
      const E = ['💖', '✨', '⭐', '🌸', '💚', '🎀'];
      const P = Array.from({ length: 28 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 14 + Math.random() * 22, v: .4 + Math.random() * .9, ph: Math.random() * 6.3, c: E[Math.random() * E.length | 0] }));
      (function draw() {
        x.clearRect(0, 0, W, H);
        P.forEach(p => {
          p.y -= p.v; p.ph += .02;
          if (p.y < -40) { p.y = H + 40; p.x = Math.random() * W; }
          x.globalAlpha = .85; x.font = p.s + 'px serif'; x.fillText(p.c, p.x + Math.sin(p.ph) * 20, p.y);
        });
        raf = requestAnimationFrame(draw);
      })();
    } else {
      const fs = 16, cols = Math.ceil(Math.max(innerWidth, screen.width) / fs);
      const drops = Array.from({ length: cols }, () => Math.random() * H / fs);
      const CH = 'アカサタナハマヤラワ0123456789ABCDEF<>/|=+*';
      let last = 0;
      (function draw(t) {
        if (t - last > 55) {
          last = t;
          x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, 0, W, H);
          x.globalCompositeOperation = 'source-over'; x.font = fs + 'px monospace';
          drops.forEach((d, i) => {
            x.fillStyle = Math.random() > .97 ? '#fff' : '#00ffc8';
            x.fillText(CH[Math.random() * CH.length | 0], i * fs, d * fs);
            if (d * fs > H && Math.random() > .975) drops[i] = 0;
            drops[i]++;
          });
        }
        raf = requestAnimationFrame(draw);
      })(0);
    }
    setTimeout(() => input.focus(), 100);
  }

  function show(theme) {
    if (host && host.isConnected) return;
    curTheme = theme; build(theme);
    const root = document.documentElement || document;
    prevOverflow = root.style ? root.style.overflow : '';
    if (root.style) root.style.overflow = 'hidden';
    root.appendChild(host);
  }
  function hide() {
    if (!host) return;
    cancelAnimationFrame(raf); timers.forEach(clearInterval); timers = [];
    cleanups.forEach(f => f()); cleanups = [];
    host.remove(); host = null;
    if (document.documentElement) document.documentElement.style.overflow = prevOverflow;
  }
  async function refresh() {
    try {
      const { hash, locked, theme } = await S.get(['hash', 'locked', 'theme']);
      const t = theme === 'cyber' ? 'cyber' : 'cute';
      if (hash && locked) { if (host && curTheme !== t) hide(); show(t); } else hide();
    } catch (e) { /* extension was reloaded */ }
  }

  chrome.storage.onChanged.addListener(refresh);
  refresh();
  new MutationObserver(() => { if (host && !host.isConnected) refresh(); }).observe(document, { childList: true, subtree: true });
})();
