/* Delta Schools — site behaviour
   Bilingual UI · navigation · tabs · gallery · FAQ search · multi-step forms.
   No build step and no dependencies. */
(() => {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const session = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { sessionStorage.removeItem(k); } catch {} },
  };
  const SCHOOL_EMAIL = 'hello@delta.edu.sa';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.remove('no-js');

  // Directional page assembly: each real page element enters from its own direction.
  if (document.body.dataset.titleEn === 'Home' && !reduceMotion) {
    const add = (selector, direction, stagger = 0) => {
      $$(selector).forEach((el, i) => {
        el.classList.add('build-reveal', `build-from-${direction}`);
        el.style.setProperty('--build-delay', `${Math.min(stagger + i * 65, 1550)}ms`);
      });
    };

    // Header: brand from the left, navigation from the right, controls from above.
    add('.site-header .brand', 'left', 0);
    add('.site-header .menu a', 'right', 100);
    add('.site-header .nav__actions > *', 'top', 260);

    // Hero: visual sweeps in from the left; copy descends and rises in layers.
    add('.hero__media img', 'left', 180);
    add('.hero__copy .kicker, .hero__copy h1', 'top', 260);
    add('.hero__copy .hero__lead', 'bottom', 440);
    add('.hero__copy .btns', 'bottom', 560);

    // Facts and following sections build in a quick stagger.
    add('.hero__facts .fact', 'bottom', 700);
    add('main > section:not(.hero) .head', 'top', 900);
    add('main > section:not(.hero) .explorer, main > section:not(.hero) .cards, main > section:not(.hero) .grid', 'bottom', 1040);
    add('main > section:not(.hero) .card, main > section:not(.hero) .tabpanel', 'right', 1120);

    requestAnimationFrame(() => {
      document.documentElement.classList.remove('is-building');
      $$('.build-reveal').forEach(el => el.classList.add('is-built'));
    });
  } else {
    document.documentElement.classList.remove('is-building');
  }

  /* ---------------------------------------------------------------------
     1. Language
     Arabic is the source text in the HTML. English lives in data-en
     (and data-ph-en / data-aria-en / data-alt-en for attributes).
  --------------------------------------------------------------------- */
  const ATTRS = [['ph', 'placeholder'], ['aria', 'aria-label'], ['alt', 'alt'], ['title', 'title']];
  $$('[data-en]').forEach(el => { if (!('ar' in el.dataset)) el.dataset.ar = el.textContent; });
  ATTRS.forEach(([key, attr]) => $$(`[data-${key}-en]`).forEach(el => {
    if (!el.hasAttribute(`data-${key}-ar`)) el.setAttribute(`data-${key}-ar`, el.getAttribute(attr) || '');
  }));

  let lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
  const t = (ar, en) => (lang === 'ar' ? ar : en);

  function applyLanguage(next) {
    lang = next;
    const root = document.documentElement;
    root.lang = next;
    root.dir = next === 'ar' ? 'rtl' : 'ltr';
    $$('[data-en]').forEach(el => { el.textContent = el.dataset[next]; });
    ATTRS.forEach(([key, attr]) => $$(`[data-${key}-en]`).forEach(el => {
      el.setAttribute(attr, el.getAttribute(`data-${key}-${next}`));
    }));
    const b = document.body.dataset;
    document.title = next === 'ar'
      ? `${b.titleAr || 'مدارس دلتا'} | مدارس دلتا`
      : `${b.titleEn || 'Delta Schools'} | Delta Schools`;
    $$('.lang').forEach(btn => btn.setAttribute('aria-label', next === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'));
    store.set('delta-lang', next);
    document.dispatchEvent(new CustomEvent('delta:lang', { detail: next }));
  }
  $$('.lang').forEach(btn => btn.addEventListener('click', () => applyLanguage(lang === 'ar' ? 'en' : 'ar')));
  applyLanguage(lang);

  /* ---------------------------------------------------------------------
     2. Header state, scroll progress, back-to-top
  --------------------------------------------------------------------- */
  const header = $('.site-header');
  const progress = $('.progress');
  const toTop = $('.to-top');
  let ticking = false;
  function onScroll() {
    const y = scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    toTop?.classList.toggle('is-shown', y > 700);
    if (progress) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ---------------------------------------------------------------------
     3. Mobile drawer with focus trap
  --------------------------------------------------------------------- */
  const drawer = $('#drawer');
  const burger = $('.burger');
  let lastFocus = null;
  const focusables = el => $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', el);
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => focusables($('.drawer__panel', drawer))[0]?.focus(), 50);
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    lastFocus?.focus();
  }
  if (drawer && burger) {
    burger.addEventListener('click', openDrawer);
    $$('[data-close-drawer]', drawer).forEach(el => el.addEventListener('click', closeDrawer));
    drawer.addEventListener('keydown', e => {
      if (e.key === 'Escape') return closeDrawer();
      if (e.key !== 'Tab') return;
      const f = focusables($('.drawer__panel', drawer));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    });
    addEventListener('resize', () => { if (innerWidth > 1100 && drawer.classList.contains('is-open')) closeDrawer(); });
  }

  /* ---------------------------------------------------------------------
     4. Reveal on scroll (only on blocks marked .reveal) and counters
  --------------------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));

    const fmt = n => n.toLocaleString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
    const counters = $$('[data-count]');
    const co = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, end = +el.dataset.count, pre = el.dataset.prefix || '';
      co.unobserve(el);
      if (reduceMotion) { el.textContent = pre + fmt(end); return; }
      const t0 = performance.now(), dur = 1200;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = pre + fmt(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { threshold: .6 });
    counters.forEach(el => co.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('is-in'));
  }

  /* ---------------------------------------------------------------------
     5. Tabs (pathway explorer) — WAI-ARIA tabs pattern
  --------------------------------------------------------------------- */
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab, focus) => {
      tabs.forEach(item => {
        const on = item === tab;
        item.setAttribute('aria-selected', on);
        item.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        if (on && !reduceMotion) { panel.classList.remove('is-entering'); void panel.offsetWidth; panel.classList.add('is-entering'); }
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', e => {
        const vertical = list.getAttribute('aria-orientation') === 'vertical';
        const rtl = document.documentElement.dir === 'rtl';
        const nextKeys = vertical ? ['ArrowDown'] : [rtl ? 'ArrowLeft' : 'ArrowRight'];
        const prevKeys = vertical ? ['ArrowUp'] : [rtl ? 'ArrowRight' : 'ArrowLeft'];
        let j = null;
        if (nextKeys.includes(e.key)) j = (i + 1) % tabs.length;
        else if (prevKeys.includes(e.key)) j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  });

  /* ---------------------------------------------------------------------
     6. Section sub-navigation scroll-spy (programs page)
  --------------------------------------------------------------------- */
  const subLinks = $$('.subnav a[href^="#"]');
  if (subLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(subLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      subLinks.forEach(a => a.classList.remove('is-active'));
      const a = map.get(en.target.id);
      a?.classList.add('is-active');
      a?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------------------------------------------------------------------
     7. Gallery: filters + accessible lightbox (keys, swipe, prev/next)
  --------------------------------------------------------------------- */
  const items = $$('.gallery__item');
  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter').forEach(b => b.setAttribute('aria-pressed', b === btn));
    const f = btn.dataset.filter;
    items.forEach(it => it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f));
  }));

  const lb = $('#lightbox');
  if (lb && items.length) {
    const img = $('img', lb), cap = $('figcaption', lb), count = $('.lb-count', lb);
    let idx = 0, opener = null;
    const visible = () => items.filter(i => !i.classList.contains('is-hidden'));
    const show = i => {
      const list = visible();
      idx = (i + list.length) % list.length;
      const src = $('img', list[idx]);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = $('figcaption', list[idx])?.textContent || '';
      count.textContent = `${idx + 1} / ${list.length}`;
    };
    const open = item => { opener = item; show(visible().indexOf(item)); lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); };
    const close = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; opener?.focus(); };
    items.forEach(it => it.addEventListener('click', () => open(it)));
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + (rtl ? -1 : 1));
      if (e.key === 'ArrowLeft') show(idx + (rtl ? 1 : -1));
      if (e.key === 'Tab') { // keep focus inside
        const f = focusables(lb); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    });
    let sx = 0;
    lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1) * (document.documentElement.dir === 'rtl' ? -1 : 1));
    });
  }

  /* ---------------------------------------------------------------------
     8. FAQ live search (Arabic-aware normalisation)
  --------------------------------------------------------------------- */
  const norm = s => s.toLowerCase()
    .replace(/[ً-ْـ]/g, '')   // tashkeel + tatweel
    .replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  const faqInput = $('#faqSearch');
  if (faqInput) {
    const qs = $$('.faq details');
    const empty = $('.faq-empty');
    faqInput.addEventListener('input', () => {
      const q = norm(faqInput.value.trim());
      let shown = 0;
      qs.forEach(d => {
        const hit = !q || norm(d.textContent).includes(q);
        d.hidden = !hit; if (hit) shown++;
        if (q && hit) d.open = true; else if (!q) d.open = false;
      });
      if (empty) empty.style.display = shown ? 'none' : 'block';
    });
  }
  // One FAQ open at a time keeps the list scannable
  $$('.faq details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open && !faqInput?.value) $$('.faq details').forEach(o => { if (o !== d) o.open = false; });
  }));

  /* ---------------------------------------------------------------------
     9. Forms: validation, multi-step, draft saving, email hand-off
  --------------------------------------------------------------------- */
  const MSG = {
    valueMissing: ['هذا الحقل مطلوب.', 'This field is required.'],
    typeMismatch: ['أدخل بريدًا إلكترونيًا صحيحًا، مثل name@example.com', 'Enter a valid email, e.g. name@example.com'],
    patternMismatch: ['أدخل رقم جوال صحيحًا من 9 إلى 15 رقمًا.', 'Enter a valid phone number (9–15 digits).'],
    tooShort: ['النص قصير جدًا.', 'This is too short.'],
  };
  function validateField(input) {
    const field = input.closest('.field');
    const out = field && $('.error', field);
    let msg = '';
    if (!input.checkValidity()) {
      const v = input.validity;
      const key = Object.keys(MSG).find(k => v[k]) || 'valueMissing';
      msg = t(...MSG[key]);
    }
    field?.classList.toggle('has-error', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (out) out.textContent = msg;
    return !msg;
  }
  function validateGroup(scope) {
    const inputs = $$('input,select,textarea', scope).filter(i => !i.disabled && i.type !== 'hidden');
    const bad = inputs.filter(i => !validateField(i));
    if (bad.length) bad[0].focus();
    return !bad.length;
  }
  $$('form[data-form]').forEach(form => {
    form.noValidate = true;
    $$('input,select,textarea', form).forEach(i => {
      i.addEventListener('blur', () => { if (i.value) validateField(i); });
      i.addEventListener('input', () => { if (i.closest('.field')?.classList.contains('has-error')) validateField(i); });
    });
  });

  function labelFor(input) {
    const l = input.id && $(`label[for="${input.id}"]`);
    return (l?.dataset.ar ? l.dataset[lang] : l?.textContent || input.name).replace(/\s*\(.*?\)\s*/g, '').trim();
  }
  function collect(form) {
    return $$('input,select,textarea', form).filter(i => i.name && i.value.trim()).map(i => {
      const value = i.tagName === 'SELECT' ? i.selectedOptions[0].textContent.trim() : i.value.trim();
      return { name: i.name, label: labelFor(i), value };
    });
  }
  function mailto(subject, rows) {
    const body = rows.map(r => `${r.name}: ${r.value}`).join('\n') + '\n\n— Delta Schools website';
    return `mailto:${SCHOOL_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = msg; el.classList.add('is-shown');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('is-shown'), 2600);
  }
  function finish(form, subject) {
    const rows = collect(form);
    const shell = form.closest('.form-shell');
    const done = $('.success', shell);
    const href = mailto(subject, rows);
    form.hidden = true;
    $('.stepper', shell)?.setAttribute('hidden', '');
    if (done) {
      done.classList.add('is-shown');
      $('[data-mail-link]', done)?.setAttribute('href', href);
      const copy = $('[data-copy]', done);
      copy && (copy.onclick = async () => {
        const text = rows.map(r => `${r.label}: ${r.value}`).join('\n');
        try { await navigator.clipboard.writeText(text); toast(t('تم نسخ البيانات.', 'Details copied.')); }
        catch { toast(t('تعذّر النسخ. انسخ البيانات يدويًا.', 'Copy failed. Please copy the details manually.')); }
      });
      done.focus();
    }
    session.del(`draft-${form.dataset.form}`);
    location.href = href;
  }

  // Multi-step admission form
  const multi = $('form[data-form="admission"]');
  let goToStep = null;
  if (multi) {
    const steps = $$('.form-step', multi);
    const markers = $$('.stepper li', multi.closest('.form-shell'));
    const back = $('[data-back]', multi), next = $('[data-next]', multi), submit = $('[data-submit]', multi);
    let cur = 0;
    const draftKey = 'draft-admission';

    // Restore draft, then let ?track= preselect the pathway
    const draft = session.get(draftKey) || {};
    Object.entries(draft).forEach(([n, v]) => { const el = multi.elements[n]; if (el) el.value = v; });
    const track = new URLSearchParams(location.search).get('track');
    if (track && multi.elements.track) multi.elements.track.value = track;
    multi.addEventListener('input', () => {
      const d = {}; $$('input,select,textarea', multi).forEach(i => { if (i.name) d[i.name] = i.value; });
      session.set(draftKey, d);
    });

    function renderReview() {
      const dl = $('.review', multi); if (!dl) return;
      dl.innerHTML = '';
      collect(multi).forEach(r => {
        const dt = document.createElement('dt'); dt.textContent = r.label;
        const dd = document.createElement('dd'); dd.textContent = r.value;
        dl.append(dt, dd);
      });
    }
    function go(i, focus = true) {
      cur = i;
      steps.forEach((s, k) => { s.hidden = k !== i; });
      markers.forEach((m, k) => {
        m.classList.toggle('is-done', k < i); m.classList.toggle('is-current', k === i);
        if (k === i) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
      });
      back.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      if (i === steps.length - 1) renderReview();
      if (focus) $('legend', steps[i])?.focus();
    }
    next.addEventListener('click', () => { if (validateGroup(steps[cur])) go(cur + 1); });
    back.addEventListener('click', () => go(cur - 1));
    multi.addEventListener('submit', e => {
      e.preventDefault();
      if (cur !== steps.length - 1) { if (validateGroup(steps[cur])) go(cur + 1); return; }
      if (!validateGroup(multi)) return;
      finish(multi, 'Admission enquiry — Delta Schools');
    });
    document.addEventListener('delta:lang', () => { if (cur === steps.length - 1) renderReview(); });
    goToStep = go;
    go(0, false);
  }

  // Single-step contact form
  $$('form[data-form="contact"]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateGroup(form)) return;
    const topic = form.elements.topic?.selectedOptions[0]?.textContent.trim();
    finish(form, `${topic ? topic + ' — ' : ''}Website enquiry — Delta Schools`);
  }));

  // "Start over" in success panels
  $$('[data-reset]').forEach(btn => btn.addEventListener('click', () => {
    const shell = btn.closest('.form-shell');
    const form = $('form', shell);
    form.reset(); form.hidden = false;
    $('.success', shell).classList.remove('is-shown');
    $('.stepper', shell)?.removeAttribute('hidden');
    if (form === multi) { session.del('draft-admission'); goToStep(0, false); }
    $$('input,select,textarea', form)[0]?.focus();
  }));

  // Preselect any form field from the URL, e.g. contact.html?topic=visit
  const params = new URLSearchParams(location.search);
  $$('form[data-form]').forEach(form => params.forEach((v, k) => {
    const el = form.elements[k];
    if (el && el.tagName === 'SELECT' && [...el.options].some(o => o.value === v)) el.value = v;
  }));

  /* ---------------------------------------------------------------------
     10. Quick-contact menu, image fallback, footer year
  --------------------------------------------------------------------- */
  const quick = $('.quick');
  const qBtn = $('.quick__toggle');
  qBtn?.addEventListener('click', () => {
    const open = quick.classList.toggle('is-open');
    qBtn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => { if (quick && !quick.contains(e.target)) { quick.classList.remove('is-open'); qBtn?.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && quick?.classList.contains('is-open')) { quick.classList.remove('is-open'); qBtn.setAttribute('aria-expanded', 'false'); qBtn.focus(); } });

  const FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#E8ECF4"/><path d="M200 105l38 66h-76z" fill="#C8952B" opacity=".5"/></svg>');
  const useFallback = img => { if (img.dataset.fallback) return; img.dataset.fallback = '1'; img.src = FALLBACK; };
  $$('img').forEach(img => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src') !== 'data:,') useFallback(img);
    else img.addEventListener('error', () => useFallback(img), { once: true });
  });

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
