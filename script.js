const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

// Mobile navigation
const navToggle = qs('.nav-toggle');
const nav = qs('.nav');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  qsa('.nav a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Reveal animation
const revealElements = qsa('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealElements.forEach((el) => revealObserver.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add('visible'));
}

// Counters
const countElements = qsa('[data-count]');
if ('IntersectionObserver' in window) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count || 0);
      const duration = 1100;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased).toString();
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.7 });
  countElements.forEach((el) => counterObserver.observe(el));
} else {
  countElements.forEach((el) => { el.textContent = el.dataset.count || '0'; });
}

// Searchable research atlas: filter chips + free-text search work together
const atlasSearch = qs('#atlasSearch');
const atlasCards = qsa('.atlas-card');
const atlasCount = qs('#atlasCount');
let activeAtlasFilter = 'all';

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesQuery(card, query) {
  if (!query) return true;
  const haystack = normalizeText(`${card.dataset.tags || ''} ${card.textContent || ''}`);
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function matchesFilter(card, filter) {
  if (filter === 'all') return true;
  const tags = normalizeText(card.dataset.tags || '');
  return tags.includes(normalizeText(filter));
}

function updateAtlas() {
  const query = atlasSearch ? atlasSearch.value : '';
  let visible = 0;
  atlasCards.forEach((card) => {
    const show = matchesFilter(card, activeAtlasFilter) && matchesQuery(card, query);
    card.classList.toggle('hidden', !show);
    if (show) visible += 1;
  });
  if (atlasCount) {
    atlasCount.textContent = `${visible} card${visible === 1 ? '' : 's'} shown`;
  }
}

qsa('.filter-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    qsa('.filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    activeAtlasFilter = chip.dataset.filter || 'all';
    updateAtlas();
  });
});
if (atlasSearch) atlasSearch.addEventListener('input', updateAtlas);
updateAtlas();

// Publication search
const pubSearch = qs('#pubSearch');
const pubItems = qsa('.pub-item');
const pubCount = qs('#pubCount');
function updatePubCount(count) {
  if (pubCount) pubCount.textContent = `${count} publication${count === 1 ? '' : 's'} shown`;
}
function updatePublications() {
  const query = pubSearch ? pubSearch.value : '';
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  let visible = 0;
  pubItems.forEach((item) => {
    const haystack = normalizeText(`${item.dataset.pub || ''} ${item.textContent || ''}`);
    const show = tokens.length === 0 || tokens.every((token) => haystack.includes(token));
    item.classList.toggle('hidden', !show);
    if (show) visible += 1;
  });
  updatePubCount(visible);
}
if (pubSearch) pubSearch.addEventListener('input', updatePublications);
updatePublications();

// Modal details
const modal = qs('#infoModal');
const modalTitle = qs('#modalTitle');
const modalText = qs('#modalText');
function closeModal() {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}
qsa('.open-card').forEach((button) => {
  button.addEventListener('click', () => {
    if (!modal || !modalTitle || !modalText) return;
    modalTitle.textContent = button.dataset.title || 'Details';
    modalText.textContent = button.dataset.text || '';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  });
});
qsa('[data-close]').forEach((button) => button.addEventListener('click', closeModal));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

// Animated background field
const canvas = qs('#fieldCanvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (canvas && !reduceMotion) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let points = [];
  const density = 72;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = Array.from({ length: Math.max(34, Math.floor((width * height) / (density * density))) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      r: 1.2 + Math.random() * 1.8
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    points.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    });

    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 125) {
          const alpha = (1 - dist / 125) * 0.24;
          ctx.strokeStyle = `rgba(56, 215, 197, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    points.forEach((p, index) => {
      ctx.fillStyle = index % 5 === 0 ? 'rgba(185, 221, 76, 0.65)' : 'rgba(246, 241, 224, 0.45)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  draw();
}
