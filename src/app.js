(function () {
  const LABEL = { cachy: 'CachyOS', mint: 'Linux Mint', all: 'Oba systemy' };
  const $ = (s) => document.querySelector(s);

  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  const state = {
    d: store.get('sciaga.d', 'all'),
    q: '',
    favs: new Set(store.get('sciaga.favs', [])),
    done: new Set(store.get('sciaga.done', [])),
  };

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') el.className = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  function svg(path) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '17'); s.setAttribute('height', '17'); s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = path;
    return s;
  }
  const ICON_COPY = '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>';
  const ICON_OK = '<path d="M5 12l5 5L20 7"/>';
  const ICON_STAR = '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>';

  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1400);
  }

  function copy(text, codeEl, btn) {
    const ok = () => {
      toast('Skopiowano');
      if (btn) { btn.replaceChildren(svg(ICON_OK)); btn.classList.add('ok');
        setTimeout(() => { btn.replaceChildren(svg(ICON_COPY)); btn.classList.remove('ok'); }, 1200); }
    };
    const fallback = () => {
      const r = document.createRange(); r.selectNodeContents(codeEl);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      toast('Zaznaczono. Naciśnij Ctrl+C');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l'); }
  function matches(q, ...parts) { return !q || q.split(/\s+/).every((w) => norm(parts.join(' ')).includes(w)); }

  function visibleSection(s) {
    if (state.d === 'cachy' || state.d === 'mint') return s.d === state.d || s.d === 'all';
    return true;
  }

  function renderItem(s, it, i) {
    const key = s.id + '|' + i;
    const children = [];
    if (s.kind === 'steps') {
      const isDone = state.done.has(key);
      children.push(h('button', {
        class: 'num', 'aria-pressed': String(isDone), title: isDone ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione',
        onclick: () => { isDone ? state.done.delete(key) : state.done.add(key); store.set('sciaga.done', [...state.done]); render(); },
      }, isDone ? '✓' : String(i + 1)));
    }
    let codeEl = null;
    const cmd = h('div', { class: 'cmd' });
    if (it.c) {
      codeEl = h('code', { title: 'Kliknij, żeby skopiować' }, it.c);
      cmd.append(codeEl);
    }
    if (it.g) cmd.append(h('div', { class: 'gui' + (it.c ? '' : ' solo') }, it.c ? 'GUI: ' : '', h('b', null, it.g)));
    children.push(cmd);
    children.push(h('div', { class: 'desc' }, h('p', null, it.x), it.w ? h('p', { class: 'warn' }, '⚠ ' + it.w) : null));

    const acts = h('div', { class: 'acts' });
    if (it.c) {
      const b = h('button', { class: 'ic', title: 'Kopiuj', 'aria-label': 'Kopiuj komendę' }, svg(ICON_COPY));
      b.addEventListener('click', () => copy(it.c, codeEl, b));
      codeEl.addEventListener('click', () => copy(it.c, codeEl, b));
      acts.append(b);
    }
    const fav = state.favs.has(key);
    const star = h('button', {
      class: 'ic' + (fav ? ' on' : ''), title: fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych', 'aria-pressed': String(fav),
      onclick: () => { fav ? state.favs.delete(key) : state.favs.add(key); store.set('sciaga.favs', [...state.favs]); render(); toast(fav ? 'Usunięto z ulubionych' : 'Dodano do ulubionych'); },
    }, svg(ICON_STAR));
    if (fav) star.querySelector('svg').setAttribute('fill', 'currentColor');
    acts.append(star);
    children.push(acts);
    return h('li', { class: 'item' + (s.kind === 'steps' && state.done.has(key) ? ' done' : '') }, ...children);
  }

  function render() {
    const q = norm(state.q.trim());
    const main = $('#main'); const chips = $('#chips');
    main.replaceChildren(); chips.replaceChildren();
    let shown = 0;

    for (const s of SECTIONS) {
      if (!visibleSection(s)) continue;
      const titleHit = q && matches(q, s.t, LABEL[s.d]);
      let body;
      if (s.kind === 'table') {
        if (state.d === 'fav') continue;
        const rows = s.rows.filter((r) => titleHit || matches(q, ...r));
        if (!rows.length) continue;
        body = h('div', { class: 'tbl' }, h('table', null,
          h('thead', null, h('tr', null, ...s.head.map((c) => h('th', null, c)))),
          h('tbody', null, ...rows.map((r) => h('tr', null, h('td', null, r[0]), h('td', { class: 'mono' }, r[1]), h('td', { class: 'mono' }, r[2]))))));
        shown += rows.length;
      } else {
        const items = s.items.map((it, i) => [it, i]).filter(([it, i]) =>
          (state.d !== 'fav' || state.favs.has(s.id + '|' + i)) && (titleHit || matches(q, it.c, it.x, it.w, it.g)));
        if (!items.length) continue;
        body = h('ol', { class: 'list' + (s.kind === 'steps' ? ' steps' : '') }, ...items.map(([it, i]) => renderItem(s, it, i)));
        shown += items.length;
      }
      let progress = null;
      if (s.kind === 'steps') {
        const n = s.items.filter((_, i) => state.done.has(s.id + '|' + i)).length;
        progress = h('span', { class: 'tag' }, n + ' / ' + s.items.length + ' zrobione');
      }
      main.append(h('section', { id: s.id },
        h('div', { class: 'sh' }, h('span', { class: 'tag ' + s.d }, LABEL[s.d]), h('h2', null, s.t), progress),
        s.intro && !q && state.d !== 'fav' ? h('p', { class: 'intro' }, s.intro) : null,
        body));
      chips.append(h('a', { href: '#' + s.id }, h('span', { class: 'dot ' + s.d }), s.t));
    }

    if (!shown) {
      main.append(h('div', { class: 'empty' },
        state.d === 'fav' && !q
          ? h('p', null, 'Nie masz jeszcze ulubionych. Kliknij ', h('b', null, '☆'), ' przy komendzie, żeby ją tu dodać.')
          : h('p', null, 'Nic nie pasuje do „', h('b', null, state.q), '”. Spróbuj innego słowa albo przełącz na ', h('b', null, 'Wszystko'), '.')));
    }
    chips.hidden = !shown;
    document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.d === state.d)));
  }

  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    state.d = b.dataset.d; store.set('sciaga.d', state.d); render(); window.scrollTo({ top: 0 });
  }));
  $('#q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape' && document.activeElement === $('#q')) { $('#q').value = ''; state.q = ''; render(); }
  });

  // PWA: instalacja i praca offline (nie działa w podglądzie Artifact, tam po cichu pomijamy)
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; $('#installBtn').hidden = true;
  });
  if (!window.__ARTIFACT && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    try { navigator.serviceWorker.register('./sw.js').catch(() => {}); } catch (e) {}
  }

  render();
})();
