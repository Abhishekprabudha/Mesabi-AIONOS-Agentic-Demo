const state = {
  data: null,
  scenarioTimer: null,
  scenarioStep: 0,
  scenarioStarted: false,
  activeEventId: null,
  riskPointer: 22,
  readinessGenerated: false,
  overlayAnimation: null,
  tickTimer: null
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function fmt(value, suffix = '') {
  if (typeof value !== 'number') return `${value}${suffix}`;
  const fixed = Number.isInteger(value) ? value : value.toFixed(1);
  return `${fixed}${suffix}`;
}

async function loadData() {
  try {
    const res = await fetch('data/demo-data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    initApp();
  } catch (err) {
    document.body.innerHTML = `<main class="load-error"><h1>Could not load data/demo-data.json</h1><p>This demo fetches local JSON. Open it through GitHub Pages, VS Code Live Server, Vite, or <code>python -m http.server</code> instead of double-clicking the HTML file.</p><pre>${escapeHtml(err.message)}</pre></main>`;
  }
}

function initApp() {
  renderScenarioSteps();
  renderKPIs();
  renderChain();
  renderEvents();
  renderRisk();
  renderReadinessPack();
  renderTimeline();
  renderGeology();
  renderActions();
  renderRoadmap();
  renderGovernance();
  renderCopilot();
  renderEvidence();
  renderAudit();
  drawRiskTrendChart();
  drawImpactChart();
  wireInteractions();
  setupVideo();
  startLiveTicks();
}

function wireInteractions() {
  $$('.nav-link').forEach(btn => {
    btn.onclick = () => {
      $$('.nav-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  $('#startScenarioBtn').onclick = startScenario;
  $('#resetScenarioBtn').onclick = resetScenario;
  $('#exportJsonBtn').onclick = exportEvidenceJson;
  $('#importJsonInput').onchange = importJson;
  $('#createIncidentBtn').onclick = generateReadinessPack;

  $('#copilotForm').onsubmit = (e) => {
    e.preventDefault();
    const input = $('#copilotInput');
    const q = input.value.trim();
    if (!q) return;
    askCopilot(q);
    input.value = '';
  };

  $$('#quickPrompts .prompt-btn').forEach(btn => {
    btn.onclick = () => askCopilot(btn.dataset.q);
  });

  window.addEventListener('resize', debounce(() => {
    drawRiskTrendChart();
    drawImpactChart();
    resizeOverlay();
  }, 160));
}

function renderScenarioSteps() {
  $('#scenarioSteps').innerHTML = state.data.scenario.script.map((text, i) => {
    const parts = text.split('.');
    const headline = parts.shift();
    return `<div class="step-card" data-step="${i}">
      <div class="step-index">${i + 1}</div>
      <strong>${escapeHtml(headline)}</strong>
      <p>${escapeHtml(parts.join('.').trim())}</p>
    </div>`;
  }).join('');
}

function renderKPIs() {
  const k = state.data.scenario.kpis;
  const cards = [
    ['Readiness baseline', k.readinessPct, '%', `+${k.readinessRiskReductionPct}% risk reduction target`, ''],
    ['Off-spec risk', k.offSpecRiskPct, '%', 'Quality action required', 'warn'],
    ['Learning cycle saved', k.qualityLearningDaysSaved, ' days', 'Ramp-up acceleration', ''],
    ['QAQC exceptions', k.qaQcExceptions, '', 'Geology review queue', 'warn'],
    ['Failure lead time', k.reliabilityLeadTimeHours, ' hrs', 'Reliability sentinel', ''],
    ['War-room artifacts', k.warRoomArtifacts, '', 'Generated outputs', '']
  ];
  $('#kpiGrid').innerHTML = cards.map(([label, value, suffix, trend, tone]) => `
    <article class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${fmt(value, suffix)}</div>
      <div class="kpi-trend ${tone || ''}">${trend}</div>
    </article>`).join('');
}

function renderChain() {
  $('#chainGrid').innerHTML = state.data.chain.map(item => {
    const chipClass = item.readiness < 70 ? 'danger' : item.readiness < 80 ? 'warn' : 'green';
    return `<article class="chain-card">
      <div class="chain-top">
        <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.focus)}</p></div>
        <span class="status-chip ${chipClass}">${escapeHtml(item.risk)}</span>
      </div>
      <div class="bar"><div style="width:${item.readiness}%"></div></div>
      <div class="chain-metrics">
        ${item.kpis.map(k => `<div class="chain-metric"><span>${escapeHtml(k[0])}</span><b>${fmt(k[1], k[2])}</b></div>`).join('')}
      </div>
      <p><strong>${escapeHtml(item.agent)}:</strong> ${escapeHtml(item.primaryAction)}</p>
    </article>`;
  }).join('');
}

function renderEvents() {
  $('#eventStrip').innerHTML = state.data.events.map(evt => `
    <article class="event-card ${evt.id === state.activeEventId ? 'active' : ''}" data-event="${evt.id}">
      <strong>${escapeHtml(evt.type)}</strong>
      <div class="muted small">${escapeHtml(evt.time)} · ${escapeHtml(evt.area)}</div>
      <p class="muted small">${escapeHtml(evt.summary)}</p>
      <span class="pill ${evt.severity === 'High' ? 'high' : 'medium'}">${escapeHtml(evt.severity)} · ${evt.confidence}%</span>
    </article>`).join('');
}

function renderRisk() {
  if (!state.data.riskTrend?.length) return;
  const latest = state.data.riskTrend[Math.min(state.riskPointer, state.data.riskTrend.length - 1)];
  const score = Math.round(latest.riskScore);
  $('#riskScore').textContent = score;
  const arc = $('#riskArc');
  if (arc) arc.style.strokeDashoffset = String(270 - (270 * score / 100));
  const status = $('#riskStatus');
  status.textContent = score >= 74 ? 'High' : score >= 58 ? 'Elevated' : 'Stable';
  status.className = `status-chip ${score >= 74 ? 'danger' : score >= 58 ? 'warn' : 'green'}`;

  $('#riskInsights').innerHTML = state.data.riskInsights.map((i, idx) => `
    <div class="insight">
      <strong>${escapeHtml(i.title)}</strong>
      <p class="muted">${escapeHtml(i.body)}</p>
      ${idx === 0 ? `<span class="pill ${score >= 74 ? 'high' : 'medium'}">Current score ${score}% · SiO₂ ${latest.silicaPct}% · P80 ${latest.p80Micron}µm</span>` : ''}
    </div>`).join('');
}

function renderReadinessPack() {
  const pack = state.data.readinessPack;
  const fields = [
    ['Pack ID', pack.id],
    ['Title', pack.title],
    ['Area', pack.area],
    ['Generated', pack.time],
    ['Gate', pack.gate],
    ['Readiness', pack.readiness],
    ['Classification', pack.classification],
    ['Evidence', pack.evidence],
    ['Approval', pack.approval],
    ['Status', state.readinessGenerated ? 'Generated and routed to war-room owners' : pack.status]
  ];
  $('#incidentCard').innerHTML = fields.map(([label, value]) => `<div class="incident-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function renderTimeline() {
  $('#incidentTimeline').innerHTML = state.data.timeline.map(t => `
    <div class="timeline-item">
      <div class="timeline-time">${escapeHtml(t.time)}</div>
      <div><strong>${escapeHtml(t.label)}</strong><p class="muted small">${escapeHtml(t.detail)}</p></div>
    </div>`).join('');
}

function renderGeology() {
  $('#geologyWorkbench').innerHTML = state.data.geologyWorkbench.map(g => `
    <article class="work-card">
      <strong>${escapeHtml(g.title)}</strong>
      <p>${escapeHtml(g.body)}</p>
      <div class="doc-meta">${escapeHtml(g.tag)}</div>
    </article>`).join('');
}

function renderActions() {
  $('#capaList').innerHTML = state.data.actions.map(a => `
    <div class="capa-item">
      <div class="capa-row"><span>${escapeHtml(a.id)} · ${escapeHtml(a.area)}</span><span>${escapeHtml(a.due)}</span></div>
      <strong>${escapeHtml(a.title)}</strong>
      <p class="muted small">${escapeHtml(a.value)}</p>
      <div class="capa-row"><span>${escapeHtml(a.owner)}</span><span class="pill ${a.priority === 'High' ? 'high' : 'medium'}">${escapeHtml(a.priority)}</span></div>
    </div>`).join('');
}

function renderRoadmap() {
  $('#roadmapGrid').innerHTML = state.data.roadmap.map(r => `
    <article class="road-card">
      <div class="muted small">${escapeHtml(r.phase)}</div>
      <strong>${escapeHtml(r.title)}</strong>
      <p>${escapeHtml(r.body)}</p>
    </article>`).join('');
}

function renderGovernance() {
  const rows = state.data.governanceMatrix.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.agent)}</strong><br><span class="muted small">${escapeHtml(r.decision)}</span></td>
      <td>${escapeHtml(r.kpi)}</td>
      <td>${escapeHtml(r.owner)}</td>
      <td>${escapeHtml(r.evidence)}</td>
      <td><span class="pill green">${escapeHtml(r.approval)}</span></td>
    </tr>`).join('');
  $('#governanceTable').innerHTML = `<thead><tr><th>Agent / decision</th><th>KPI</th><th>Owner</th><th>Evidence</th><th>Approval</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderCopilot() {
  const prompts = state.data.knowledgeQuestions.map(q => q.q);
  $('#quickPrompts').innerHTML = prompts.slice(0, 5).map(q => `<button class="prompt-btn" type="button" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('');
  $('#chatWindow').innerHTML = `<div class="msg bot"><strong>Mesabi Copilot ready.</strong><br>Ask about first-wave agents, low-data deployment, tangible outputs, approval value or 90-day PoV success criteria.</div>`;
}

function askCopilot(question) {
  const chat = $('#chatWindow');
  chat.insertAdjacentHTML('beforeend', `<div class="msg user">${escapeHtml(question)}</div>`);
  const answer = findAnswer(question);
  chat.insertAdjacentHTML('beforeend', `<div class="msg bot">${escapeHtml(answer.a)}<div class="source">Source: ${escapeHtml(answer.source)}</div></div>`);
  chat.scrollTop = chat.scrollHeight;
  flashAgent('Mesabi Copilot answered', `Answered: “${question.slice(0, 72)}${question.length > 72 ? '…' : ''}”`);
}

function findAnswer(question) {
  const q = question.toLowerCase();
  let best = state.data.knowledgeQuestions[0];
  let bestScore = -1;
  state.data.knowledgeQuestions.forEach(item => {
    const text = `${item.q} ${item.a}`.toLowerCase();
    const score = q.split(/\W+/).filter(word => word.length > 2 && text.includes(word)).length;
    if (score > bestScore) { bestScore = score; best = item; }
  });
  return best;
}

function renderEvidence() {
  $('#evidenceObjects').innerHTML = state.data.evidenceObjects.map(e => `
    <div class="doc-card"><strong>${escapeHtml(e.name)}</strong><p>${escapeHtml(e.description)}</p><div class="doc-meta">Owner: ${escapeHtml(e.owner)} · ${escapeHtml(e.retention)}</div></div>`).join('');
}

function renderAudit() {
  $('#auditTrail').innerHTML = state.data.auditTrail.map(a => `
    <div class="doc-card"><strong>${escapeHtml(a.time)} · ${escapeHtml(a.actor)}</strong><p>${escapeHtml(a.action)}</p><div class="doc-meta">Hash ${escapeHtml(a.hash)}</div></div>`).join('');
  $('#approvalControls').innerHTML = state.data.approvalControls.map(c => `
    <div class="doc-card"><strong>${escapeHtml(c.name)}</strong><p>${escapeHtml(c.description)}</p><div class="doc-meta">Owner: ${escapeHtml(c.owner)} · Scope: ${escapeHtml(c.retention)}</div></div>`).join('');
}

function startScenario() {
  resetScenario(false);
  state.scenarioStarted = true;
  state.activeEventId = state.data.events[0].id;
  $('#videoStatus').textContent = 'Scenario live';
  $('#videoStatus').className = 'status-chip warn';
  flashAgent('Mesabi scenario started', 'Supervisor Agent is now orchestrating video twin, readiness, quality, geology, reliability and ESG workflows.');
  advanceScenario();
  state.scenarioTimer = setInterval(advanceScenario, 5200);
  const video = $('#demoVideo');
  if (video) video.play().catch(() => $('#videoPlayBtn').hidden = false);
}

function advanceScenario() {
  const steps = $$('.step-card');
  steps.forEach(s => s.classList.remove('active'));
  const idx = Math.min(state.scenarioStep, steps.length - 1);
  steps[idx]?.classList.add('active');
  const message = state.data.scenario.script[idx];
  const headline = message.split('.')[0];
  $('#agentHeadline').textContent = headline;
  $('#agentSummary').textContent = message;
  $('#agentMeterFill').style.width = `${((idx + 1) / steps.length) * 100}%`;
  $('#agentTags').innerHTML = ['Readiness', 'Simulation', 'Approval', 'Evidence'].map(t => `<span>${t}</span>`).join('');

  if (idx >= 1) state.activeEventId = state.data.events[1].id;
  if (idx >= 2) state.riskPointer = Math.min(23 + idx, state.data.riskTrend.length - 1);
  if (idx >= 3) state.activeEventId = state.data.events[2].id;
  if (idx >= 5) state.readinessGenerated = true;

  renderEvents();
  renderRisk();
  renderReadinessPack();
  drawRiskTrendChart();

  state.scenarioStep += 1;
  if (state.scenarioStep >= steps.length) {
    clearInterval(state.scenarioTimer);
    state.scenarioTimer = null;
    setTimeout(() => flashAgent('PoV decision package ready', 'The demo has generated a KPI-backed 90-day PoV charter, evidence vault and governance action log.'), 500);
  }
}

function resetScenario(resetVisual = true) {
  clearInterval(state.scenarioTimer);
  state.scenarioTimer = null;
  state.scenarioStarted = false;
  state.scenarioStep = 0;
  state.activeEventId = null;
  state.readinessGenerated = false;
  state.riskPointer = Math.min(22, state.data.riskTrend.length - 1);
  $$('.step-card').forEach(s => s.classList.remove('active'));
  $('#agentHeadline').textContent = 'Awaiting Mesabi signal';
  $('#agentSummary').textContent = 'Press “Start Mesabi scenario” to trigger video-twin monitoring, readiness checks, pellet quality simulation, reliability recommendations and evidence generation.';
  $('#agentMeterFill').style.width = '0%';
  $('#agentTags').innerHTML = '';
  $('#videoStatus').textContent = 'Monitoring';
  $('#videoStatus').className = 'status-chip';
  if (resetVisual) {
    renderEvents(); renderRisk(); renderReadinessPack(); drawRiskTrendChart();
  }
}

function generateReadinessPack() {
  state.readinessGenerated = true;
  renderReadinessPack();
  flashAgent('Readiness pack generated', 'Word/PDF narrative, Excel punch tracker, RACI, schedule delta and approval summary are now ready for the war-room.');
}

function flashAgent(headline, summary) {
  $('#agentHeadline').textContent = headline;
  $('#agentSummary').textContent = summary;
  $('#agentMeterFill').style.width = state.scenarioStarted ? `${Math.min(100, (state.scenarioStep / state.data.scenario.script.length) * 100)}%` : '28%';
}

function setupVideo() {
  const video = $('#demoVideo');
  const playBtn = $('#videoPlayBtn');
  if (!video) return;
  video.addEventListener('loadedmetadata', resizeOverlay);
  video.addEventListener('error', () => { $('#videoError').hidden = false; });
  playBtn.onclick = () => video.play().then(() => playBtn.hidden = true).catch(() => {});
  video.play().catch(() => playBtn.hidden = false);
  startOverlayAnimation();
}

function resizeOverlay() {
  const canvas = $('#visionOverlay');
  const wrap = canvas?.parentElement;
  if (!canvas || !wrap) return;
  const rect = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
}

function startOverlayAnimation() {
  if (state.overlayAnimation) cancelAnimationFrame(state.overlayAnimation);
  const canvas = $('#visionOverlay');
  const ctx = canvas.getContext('2d');
  let t = 0;
  const loop = () => {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    if (!w || !h) { state.overlayAnimation = requestAnimationFrame(loop); return; }
    t += 0.018;
    const pulse = (Math.sin(t * 4) + 1) / 2;

    drawZone(ctx, w * .09, h * .58, w * .52, h * .18, 'Haul lane', 'rgba(53,217,255,.24)', 'rgba(53,217,255,.95)');
    drawZone(ctx, w * .58, h * .38, w * .30, h * .28, 'Stockpile boundary', 'rgba(255,209,102,.18)', 'rgba(255,209,102,.95)');
    drawZone(ctx, w * .22, h * .20, w * .26, h * .18, 'Dust plume proxy', `rgba(255,159,67,${.10 + pulse*.12})`, 'rgba(255,159,67,.95)');

    const x1 = w * (.22 + .20 * ((Math.sin(t * 1.5) + 1) / 2));
    const y1 = h * (.68 + .04 * Math.sin(t * 1.1));
    const x2 = w * (.70 + .06 * Math.sin(t * 1.2));
    const y2 = h * (.53 + .03 * Math.cos(t * 1.8));
    drawBox(ctx, x1, y1, w*.12, h*.10, 'Haul unit 92%', 'rgba(45,242,163,.95)');
    drawBox(ctx, x2, y2, w*.09, h*.13, 'Loader 88%', state.scenarioStarted ? 'rgba(255,93,115,.96)' : 'rgba(255,209,102,.95)');
    drawArrow(ctx, x1+w*.12, y1+h*.05, x2, y2+h*.07, state.scenarioStarted ? 'rgba(255,93,115,.96)' : 'rgba(255,209,102,.9)');

    const hud = $('#videoHud');
    if (hud) hud.textContent = state.scenarioStarted ? 'Active AI alert: haul-route congestion + stockpile movement risk. Supervisor Agent is simulating queue and readiness impact.' : 'Tracking haul route, stockpile boundary, worker/equipment movement and dust plume proxy.';
    state.overlayAnimation = requestAnimationFrame(loop);
  };
  resizeOverlay();
  loop();
}

function drawZone(ctx, x, y, w, h, label, fill, stroke) {
  ctx.save();
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
  roundedRect(ctx, x, y, w, h, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = stroke; ctx.font = '12px Inter, sans-serif'; ctx.fillText(label, x + 10, y + 18);
  ctx.restore();
}

function drawBox(ctx, x, y, w, h, label, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(0,0,0,.2)';
  roundedRect(ctx, x, y, w, h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.font = '12px Inter, sans-serif'; ctx.fillText(label, x, Math.max(14, y - 8));
  ctx.restore();
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  const angle = Math.atan2(y2-y1, x2-x1);
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 12*Math.cos(angle-.4), y2 - 12*Math.sin(angle-.4)); ctx.lineTo(x2 - 12*Math.cos(angle+.4), y2 - 12*Math.sin(angle+.4)); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function startLiveTicks() {
  clearInterval(state.tickTimer);
  state.tickTimer = setInterval(() => {
    if (!state.data?.riskTrend?.length) return;
    if (!state.scenarioStarted) return;
    state.riskPointer = (state.riskPointer + 1) % state.data.riskTrend.length;
    renderRisk();
    drawRiskTrendChart();
  }, 3500);
}

function drawRiskTrendChart() {
  const canvas = $('#riskTrendChart');
  if (!canvas || !state.data) return;
  const points = state.data.riskTrend.slice(Math.max(0, state.riskPointer - 14), state.riskPointer + 1);
  drawLines(canvas, points, [
    { key: 'riskScore', min: 0, max: 100, color: 'rgba(255,209,102,.95)', label: 'Off-spec risk' },
    { key: 'silicaPct', min: 2.8, max: 4.4, color: 'rgba(53,217,255,.95)', label: 'SiO₂ %' },
    { key: 'moisturePct', min: 7.4, max: 9.3, color: 'rgba(45,242,163,.95)', label: 'Moisture %' }
  ], 'Quality risk, silica and moisture signals');
}

function drawImpactChart() {
  const canvas = $('#impactChart');
  if (!canvas || !state.data) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(237,244,251,.84)'; ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Manual effort before vs AIonOS after · minutes', 14, 22);
  const data = state.data.impactChart;
  const max = Math.max(...data.flatMap(d => [d.before, d.after]));
  const rowH = (h - 46) / data.length;
  data.forEach((item, i) => {
    const y = 42 + i * rowH;
    ctx.fillStyle = 'rgba(138,160,179,.85)'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(item.label, 14, y + 11);
    const bx = 126; const bw = Math.max(2, (w - 170) * item.before / max);
    const aw = Math.max(2, (w - 170) * item.after / max);
    ctx.fillStyle = 'rgba(255,209,102,.45)'; roundedRect(ctx, bx, y - 2, bw, 10, 5); ctx.fill();
    ctx.fillStyle = 'rgba(53,217,255,.75)'; roundedRect(ctx, bx, y + 14, aw, 10, 5); ctx.fill();
    ctx.fillStyle = 'rgba(237,244,251,.75)'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`${item.before}m`, bx + bw + 6, y + 7);
    ctx.fillText(`${item.after}m`, bx + aw + 6, y + 23);
  });
}

function drawLines(canvas, points, series, title) {
  if (!canvas || !points.length) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height, pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(143,164,184,.18)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = pad + (h - pad * 2) * i / 4;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  series.forEach(s => {
    ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = 2.3;
    points.forEach((p, i) => {
      const v = p[s.key];
      const x = pad + (w - pad * 2) * (points.length <= 1 ? 0 : i / (points.length - 1));
      const y = h - pad - ((v - s.min) / (s.max - s.min)) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.fillStyle = 'rgba(237,244,251,.82)'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(title, pad, 18);
}

function exportEvidenceJson() {
  const payload = JSON.parse(JSON.stringify(state.data));
  payload.scenarioState = {
    scenarioStarted: state.scenarioStarted,
    scenarioStep: state.scenarioStep,
    activeEventId: state.activeEventId,
    readinessGenerated: state.readinessGenerated,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mesabi-aionos-evidence-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state.data = JSON.parse(reader.result);
      state.riskPointer = Math.min(22, state.data.riskTrend.length - 1);
      resetScenario(false);
      renderScenarioSteps(); renderKPIs(); renderChain(); renderEvents(); renderRisk(); renderReadinessPack(); renderTimeline(); renderGeology(); renderActions(); renderRoadmap(); renderGovernance(); renderCopilot(); renderEvidence(); renderAudit(); drawRiskTrendChart(); drawImpactChart();
      flashAgent('JSON evidence imported', 'The Mesabi operating brain has been reproduced from the imported JSON file.');
    } catch (e) {
      alert('Invalid JSON file: ' + e.message);
    }
  };
  reader.readAsText(file);
}

function debounce(fn, wait) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), wait);
  };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

loadData();
