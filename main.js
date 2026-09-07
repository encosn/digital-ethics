/* 디지털 윤리 모둠 탐구 — 화면 그리기와 눌렀을 때의 동작
 *
 * 계산·판정은 모두 ethics-core.js(ETHICS) 가 한다. 여기서는 그 결과를 화면에 그린다.
 * 교과서 내용은 topics.js(TOPICS) 에 있다.
 */
(function () {
  'use strict';

  const SAVE_KEY = 'digital-ethics-v1';
  const STEP_NAMES = ['주제 고르기', '교과서 정리', '내용 정리', '사례 조사', '발표하기'];

  /* ── 상태 ───────────────────────────────────────────────── */

  let state = load();
  let viewerId = state.topicId;   // 2단계에서 보고 있는 주제 (내 주제가 아닐 수도 있다)
  let activeSub = 0;              // 2단계 소주제 번호
  let quizChecked = false;        // 정답 확인을 눌렀는가
  const hintsOpen = new Set();
  let showSlides = [];
  let showIndex = 0;

  function myTopic() { return ETHICS.findTopic(TOPICS, state.topicId); }
  function viewTopic() { return ETHICS.findTopic(TOPICS, viewerId) || myTopic(); }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return ETHICS.fromSaved(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return ETHICS.emptyState();
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(ETHICS.toSaved(state)));
    } catch (e) {
      /* 저장이 막혀 있어도 수업은 계속할 수 있어야 하므로 넘어간다 */
    }
  }

  /* ── 잔손질 ─────────────────────────────────────────────── */

  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 주제 색을 옅게 만들어 배경색으로 쓴다 (흰색과 섞는다). */
  function tint(hex, ratio) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#f2f4f9';
    const n = parseInt(m[1], 16);
    const mix = (c) => Math.round(c + (255 - c) * ratio);
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function applyColor(el, topic) {
    const color = (topic && topic.color) || '#ff6f91';
    el.style.setProperty('--topic', color);
    el.style.setProperty('--topic-soft', tint(color, 0.88));
  }

  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }

  /* ── 전체 그리기 ─────────────────────────────────────────── */

  function render() {
    applyColor(document.documentElement, myTopic());
    renderSteps();
    for (let i = 1; i <= 5; i++) $('panel-' + i).hidden = state.step !== i;

    if (state.step === 1) renderTopicGrid();
    if (state.step === 2) renderViewer();
    if (state.step === 3) { renderQuiz(); renderSummary(); }
    if (state.step === 4) { renderSample(); renderLinks(); renderCases(); }
    if (state.step === 5) { renderCheck(); renderSlides(); }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goStep(n) {
    if (n > 1 && !state.topicId) return;
    state.step = n;
    if (n === 2 && !viewerId) viewerId = state.topicId;
    save();
    render();
  }

  function renderSteps() {
    const box = $('steps');
    box.innerHTML = STEP_NAMES.map((name, i) => {
      const no = i + 1;
      const locked = no > 1 && !state.topicId;
      return `<button type="button" class="step-chip" data-step="${no}"
        aria-current="${state.step === no}" ${locked ? 'disabled' : ''}>
        <span class="step-no">${no}.</span> ${esc(name)}</button>`;
    }).join('');
  }

  /* ── 1단계 : 주제 고르기 ─────────────────────────────────── */

  function renderTopicGrid() {
    $('group-name').value = state.groupName;
    $('go-2').disabled = !state.topicId;

    $('topic-grid').innerHTML = TOPICS.map((t) => {
      const picked = t.id === state.topicId;
      return `<button type="button" class="topic-card" data-topic="${esc(t.id)}"
        aria-pressed="${picked}" style="--tc:${esc(t.color)};--tcs:${tint(t.color, 0.9)}">
        <div class="topic-card-head">
          <span class="topic-card-emoji">${esc(t.emoji)}</span>
          <h3 class="topic-card-title">${esc(t.title)}</h3>
        </div>
        <p class="topic-card-pages">${esc(t.pages)}</p>
        <p class="topic-card-lead">${esc(t.lead)}</p>
        <ol class="topic-card-subs">${t.subs.map((s) => `<li>${esc(s.title)}</li>`).join('')}</ol>
        <p class="topic-card-pick">${picked ? '✔ 우리 모둠 주제로 골랐어요' : '눌러서 고르기'}</p>
      </button>`;
    }).join('');
  }

  /* ── 2단계 : 교과서 정리 보기 ───────────────────────────── */

  function renderViewer() {
    const topic = viewTopic();
    if (!topic) return;

    $('viewer-topics').innerHTML = TOPICS.map((t) => {
      const on = t.id === topic.id;
      const mine = t.id === state.topicId ? ' <span class="mine">(우리 모둠)</span>' : '';
      return `<button type="button" class="viewer-chip" data-view="${esc(t.id)}"
        aria-pressed="${on}" style="--vc:${esc(t.color)}">${esc(t.emoji)} ${esc(t.title)}${mine}</button>`;
    }).join('');

    if (activeSub >= topic.subs.length) activeSub = 0;

    $('sub-tabs').innerHTML = topic.subs.map((s, i) => `
      <button type="button" class="sub-tab" data-sub="${i}" aria-selected="${i === activeSub}">
        ${s.no}. ${esc(s.title)}</button>`).join('');

    const blocks = $('blocks');
    applyColor(blocks, topic);
    blocks.innerHTML = (topic.subs[activeSub].blocks || []).map(renderBlock).join('');
  }

  function renderBlock(b) {
    switch (b.kind) {
      case 'lead':
        return `<div class="blk blk-lead"><p>${esc(b.text)}</p></div>`;

      case 'define':
        return `<div class="blk blk-define">
          <span class="define-term">${esc(b.term)}</span>
          <p class="define-text">${esc(b.text)}</p></div>`;

      case 'cards':
        return blockShell(b, `<div class="grid grid-${b.cols || 3}">${
          b.items.map((it) => `<div class="mini">
            <div class="mini-icon">${esc(it.icon)}</div>
            <p class="mini-name">${esc(it.name)}</p>
            <p class="mini-text">${esc(it.text)}</p></div>`).join('')
        }</div>`);

      case 'bars': {
        const max = b.max || Math.max(...b.items.map((i) => i.value)) * 1.1;
        return blockShell(b, `<div class="bars">${
          b.items.map((it) => `<div class="bar-row">
            <div class="bar-label">${esc(it.label)}${it.sub ? `<span class="bar-sub">${esc(it.sub)}</span>` : ''}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${(it.value / max * 100).toFixed(1)}%;background:${esc(it.color)}">${it.value}${esc(b.unit || '')}</div></div>
          </div>`).join('')
        }</div>`);
      }

      case 'rank': {
        const top = Math.max(...b.groups.map((g) => Math.max(...g.items.map((i) => i.value))));
        return blockShell(b, `<div class="rank">${
          b.groups.map((g) => `<div class="rank-col">
            <p class="rank-head" style="background:${esc(g.color)}">${esc(g.label)}</p>
            ${g.items.map((it, i) => `<div class="rank-item${i === 0 ? ' top' : ''}">
              <div class="rank-name"><span>${esc(it.name)}</span><b>${it.value}${esc(b.unit || '')}</b></div>
              <div class="rank-track"><div class="rank-fill" style="width:${(it.value / top * 100).toFixed(1)}%;background:${esc(g.color)}"></div></div>
            </div>`).join('')}
          </div>`).join('')
        }</div>`);
      }

      case 'delta':
        return blockShell(b, `<div class="deltas">${
          b.items.map((it) => `<div class="delta-row">
            <p class="delta-label" style="color:${esc(it.color)}">${esc(it.label)}</p>
            <div class="delta-nums">
              <span class="delta-num"><span class="delta-year">2021년</span>${fmt(it.from)}${esc(it.unit)}</span>
              <span class="delta-arrow">→</span>
              <span class="delta-num"><span class="delta-year">2022년</span>${fmt(it.to)}${esc(it.unit)}</span>
              <span class="delta-gain">▲ ${fmt(it.to - it.from)}${esc(it.unit)} 늘었다</span>
            </div>
          </div>`).join('')
        }</div>`);

      case 'flow':
        return blockShell(b, `<div class="flow">${
          b.steps.map((s, i) => `<div class="flow-step">
            <div class="flow-no">${i + 1}</div>
            <div class="flow-body"><div class="flow-name">${esc(s.name)}</div>
            <p class="flow-text">${esc(s.text)}</p></div>
          </div>`).join('')
        }</div>`);

      case 'list':
        return blockShell(b, `<ol class="numlist">${b.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`);

      case 'pairs':
        return blockShell(b, `<div class="pairs">${
          b.items.map((it) => `<div class="pair">
            <div class="pair-q">${esc(it.q)}</div>
            <div class="pair-a">${esc(it.a)}</div></div>`).join('')
        }</div>`);

      case 'table':
        return blockShell(b, `<div class="table-wrap"><table class="tbl">
          <thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`);

      case 'ccl':
        return blockShell(b, `<div class="ccl">${
          b.items.map((it) => `<div class="ccl-item">
            <div class="ccl-mark">${esc(it.code)}</div>
            <p class="ccl-name">${esc(it.name)}</p>
            <p class="ccl-text">${esc(it.text)}</p></div>`).join('')
        }</div>`);

      case 'contact':
        return blockShell(b, `<div class="contacts">${
          b.items.map((it) => `<div class="contact">
            <p class="contact-name">${esc(it.name)}</p>
            <p class="contact-how">${esc(it.how)}</p>
            ${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.url)}</a>` : ''}
          </div>`).join('')
        }</div>`);

      default:
        return '';
    }
  }

  /* 제목·설명·출처를 두른 공통 껍데기 */
  function blockShell(b, inner) {
    return `<div class="blk">
      ${b.title ? `<h3 class="block-title">${esc(b.title)}</h3>` : ''}
      ${b.note ? `<p class="block-note">${esc(b.note)}</p>` : ''}
      ${inner}
      ${b.source ? `<p class="block-source">* 자료: ${esc(b.source)}</p>` : ''}
    </div>`;
  }

  /* ── 3단계 : 퀴즈 ───────────────────────────────────────── */

  function renderQuiz() {
    const topic = myTopic();
    if (!topic) return;
    const grade = ETHICS.gradeQuiz(topic.quiz, state.answers);

    $('quiz-list').innerHTML = topic.quiz.map((q, i) => {
      const given = state.answers[q.id] || '';
      const r = grade.results[i];
      const mark = quizChecked && r.answered ? (r.correct ? 'right' : 'wrong') : '';

      let body = '';
      if (q.kind === 'ox') {
        body = `<div class="ox-row">${['O', 'X'].map((v) => `
          <button type="button" class="ox" data-ans="${q.id}" data-value="${v}"
            aria-pressed="${given === v}">${v}</button>`).join('')}</div>`;
      } else if (q.kind === 'choice') {
        body = `<div class="choices">${q.choices.map((c, ci) => `
          <label class="choice"><input type="radio" name="${esc(q.id)}" value="${esc(c)}"
            data-ans="${q.id}" ${given === c ? 'checked' : ''}> ${esc(c)}</label>`).join('')}</div>`;
      } else {
        body = `<input type="text" class="text-input" data-ans="${q.id}"
          value="${esc(given)}" placeholder="답을 써 보세요" maxlength="40">`;
      }

      const hint = hintsOpen.has(q.id) ? `<span class="hint-text">💡 ${esc(q.hint)}</span>` : '';
      const verdict = mark
        ? `<div class="q-verdict ${mark}">${r.correct ? '⭕ 맞았어요!' : `❌ 아쉬워요. 정답은 「${esc(q.answer)}」`}
             <p class="q-why">${esc(q.why)}</p></div>`
        : '';

      return `<div class="q ${mark}">
        <div class="q-head"><span class="q-no">${i + 1}</span><p class="q-text">${esc(q.q)}</p></div>
        <div class="q-body">${body}</div>
        <div class="q-tools"><button type="button" class="hint-btn" data-hint="${esc(q.id)}">💡 힌트</button>${hint}</div>
        ${verdict}
      </div>`;
    }).join('');

    $('quiz-score').textContent = quizChecked
      ? `${grade.total}문항 중 ${grade.correct}문항 정답`
      : `${grade.total}문항 중 ${grade.answered}문항 풀었어요`;
  }

  function renderSummary() {
    $('summary-list').innerHTML = ETHICS.SUMMARY_FIELDS.map((f) => `
      <label class="field">
        <span class="field-label">${esc(f.label)}</span>
        <textarea class="text-area" data-sum="${esc(f.key)}"
          placeholder="${esc(summaryHint(f.key))}">${esc(state.summary[f.key] || '')}</textarea>
      </label>`).join('');
  }

  function summaryHint(key) {
    if (key === 'key') return '예) 사이버 폭력은 디지털 공간에서 남에게 피해를 주는 범죄다.';
    if (key === 'why') return '예) 익명성 때문에 죄책감을 덜 느끼고, 피해자가 다시 가해자가 되기 때문이다.';
    return '예) ① 화가 나도 되갚지 않는다 ② 캡처해서 어른에게 알린다 ③ 친구의 개인 정보를 올리지 않는다';
  }

  /* ── 4단계 : 사례 조사 ──────────────────────────────────── */

  function renderSample() {
    const topic = myTopic();
    const s = topic && topic.caseExample;
    if (!s) { $('case-sample').innerHTML = ''; return; }
    $('case-sample').innerHTML = `
      <p class="sample-row"><b>사례 제목</b> — ${esc(s.title)}</p>
      <p class="sample-row"><b>무슨 일이 있었나</b> — ${esc(s.what)}</p>
      <p class="sample-row"><b>어떤 피해가 있었나</b> — ${esc(s.harm)}</p>
      <p class="sample-row"><b>예방·대처 방법</b> — ${esc(s.prevent)}</p>
      <p class="sample-row"><b>출처</b> — ${esc(s.source)}</p>`;
  }

  function renderLinks() {
    const topic = myTopic();
    if (!topic) return;
    const items = [];
    topic.subs.forEach((sub) => sub.blocks.forEach((b) => {
      if (b.kind === 'contact') b.items.forEach((it) => items.push(it));
    }));
    $('case-links').innerHTML = items.map((it) => `<div class="link-item">
      <b>${esc(it.name)}</b>
      ${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.url)}</a>`
               : `<span>${esc(it.how)}</span>`}
    </div>`).join('');
  }

  function renderCases() {
    $('cases').innerHTML = state.cases.map((c, i) => {
      const st = ETHICS.caseStatus(c);
      return `<div class="case-card ${st.filled ? 'done' : ''}">
        <div class="case-head">
          <h3 class="case-title">사례 ${i + 1}</h3>
          <span class="case-state ${st.filled ? 'ok' : ''}">${
            st.filled ? '✔ 다 채웠어요' : `아직 ${st.missing.length}칸 남았어요`}</span>
          ${state.cases.length > 1 ? `<button type="button" class="case-del" data-del="${i}">이 사례 지우기</button>` : ''}
        </div>
        <div class="case-fields">${ETHICS.CASE_FIELDS.map((f) => `
          <label class="field">
            <span class="field-label">${esc(f.label)}${f.required ? '' : ' <small>(없으면 비워도 돼요)</small>'}</span>
            ${f.key === 'title' || f.key === 'source'
              ? `<input type="text" class="text-input" data-case="${i}" data-key="${f.key}" value="${esc(c[f.key] || '')}" maxlength="80">`
              : `<textarea class="text-area" data-case="${i}" data-key="${f.key}">${esc(c[f.key] || '')}</textarea>`}
          </label>`).join('')}</div>
      </div>`;
    }).join('');

    const done = ETHICS.filledCases(state.cases).length;
    $('cases-count').textContent = `사례 ${state.cases.length}개 중 ${done}개 완성 (최대 ${ETHICS.MAX_CASES}개)`;
    $('case-add').disabled = state.cases.length >= ETHICS.MAX_CASES;
  }

  /* ── 5단계 : 점검·슬라이드 ─────────────────────────────── */

  function renderCheck() {
    $('check-list').innerHTML = ETHICS.checkReport(state, myTopic()).map((r) => `
      <div class="check-row ${r.ok ? 'ok' : 'no'}">
        <span class="check-icon">${r.ok ? '✅' : '⚠️'}</span>
        <div><div class="check-label">${esc(r.label)}</div><p class="check-msg">${esc(r.msg)}</p></div>
      </div>`).join('');
  }

  function renderSlides() {
    const topic = myTopic();
    const slides = ETHICS.buildSlides(state, topic);
    $('slides').innerHTML = slides.map((s, i) => `
      <div class="slide ${s.kind === 'cover' ? 'slide-cover' : ''}">${slideInner(s, i, slides.length)}</div>`).join('');
  }

  function slideInner(s, i, total) {
    const tag = `<span class="slide-tag">${i + 1} / ${total}</span>`;
    if (s.kind === 'cover') {
      return `<div class="cover-emoji">${esc(s.emoji)}</div>
        <h3 class="cover-title">${esc(s.title)}</h3>
        <p class="cover-group">${esc(s.groupName || '모둠 이름을 적어 주세요')}</p>
        <ul class="cover-subs">${s.subs.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="cover-pages">${esc(s.pages)}</p>`;
    }
    if (s.kind === 'concept') {
      return `${tag}<h3 class="slide-title">${esc(s.title)}</h3>${
        s.terms.map((t) => `<div class="slide-item">
          <p class="slide-item-label">${esc(t.term)}</p>
          <p class="slide-item-text">${esc(t.text)}</p></div>`).join('')}`;
    }
    if (s.kind === 'summary' || s.kind === 'case') {
      const head = s.kind === 'case'
        ? `${tag}<h3 class="slide-title">사례 ${s.index}. ${esc(s.title)}</h3>`
        : `${tag}<h3 class="slide-title">${esc(s.title)}</h3>`;
      const rows = s.kind === 'case' ? s.fields : s.items;
      return head + (rows || []).map(itemHtml).join('');
    }
    return `${tag}<h3 class="slide-title">${esc(s.title)}</h3>
      <div class="slide-item"><p class="slide-item-text">${
        s.text ? esc(s.text) : '<span class="slide-empty">3단계의 「실천 방법」 칸을 채우면 여기에 나와요.</span>'}</p></div>
      ${s.contacts && s.contacts.length ? `<div class="slide-item">
        <p class="slide-item-label">도움을 받을 수 있는 곳</p>
        ${s.contacts.map((c) => `<p class="slide-item-text">${esc(c.name)} — ${esc(c.how)}${c.url ? ` (${esc(c.url)})` : ''}</p>`).join('')}
      </div>` : ''}`;
  }

  function itemHtml(it) {
    return `<div class="slide-item">
      <p class="slide-item-label">${esc(it.label)}</p>
      <p class="slide-item-text">${it.text ? esc(it.text) : '<span class="slide-empty">아직 안 썼어요</span>'}</p></div>`;
  }

  /* ── 발표 모드 ──────────────────────────────────────────── */

  function startShow() {
    showSlides = ETHICS.buildSlides(state, myTopic());
    if (!showSlides.length) return;
    showIndex = 0;
    $('show').hidden = false;
    applyColor($('show'), myTopic());
    drawShow();
    document.body.style.overflow = 'hidden';
  }

  function endShow() {
    $('show').hidden = true;
    document.body.style.overflow = '';
  }

  function moveShow(delta) {
    showIndex = Math.min(showSlides.length - 1, Math.max(0, showIndex + delta));
    drawShow();
  }

  function drawShow() {
    const s = showSlides[showIndex];
    const stage = $('show-stage');

    if (s.kind === 'cover') {
      stage.innerHTML = `<div class="show-cover">
        <div class="cover-emoji">${esc(s.emoji)}</div>
        <h2 class="cover-title">${esc(s.title)}</h2>
        <p class="cover-group">${esc(s.groupName || '')}</p>
        <ul>${s.subs.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    } else if (s.kind === 'concept') {
      stage.innerHTML = `<h2 class="show-title">${esc(s.title)}</h2>
        <ul class="show-list">${s.terms.map((t) => `<li><b>${esc(t.term)}</b> — ${esc(t.text)}</li>`).join('')}</ul>`;
    } else if (s.kind === 'summary') {
      stage.innerHTML = `<h2 class="show-title">${esc(s.title)}</h2>${
        s.items.map((it) => `<div class="show-item">
          <p class="show-label">${esc(it.label)}</p>
          <p class="show-text">${esc(it.text)}</p></div>`).join('')}`;
    } else if (s.kind === 'case') {
      stage.innerHTML = `<h2 class="show-title">사례 ${s.index}. ${esc(s.title)}</h2>${
        s.fields.map((it) => `<div class="show-item">
          <p class="show-label">${esc(it.label)}</p>
          <p class="show-text">${esc(it.text)}</p></div>`).join('')}`;
    } else {
      stage.innerHTML = `<h2 class="show-title">${esc(s.title)}</h2>
        <div class="show-item"><p class="show-text">${esc(s.text)}</p></div>
        ${s.contacts && s.contacts.length ? `<div class="show-item">
          <p class="show-label">도움을 받을 수 있는 곳</p>
          <ul class="show-list">${s.contacts.map((c) => `<li><b>${esc(c.name)}</b> — ${esc(c.how)}</li>`).join('')}</ul>
        </div>` : ''}`;
    }

    $('show-count').textContent = `${showIndex + 1} / ${showSlides.length}`;
    $('show-prev').disabled = showIndex === 0;
    $('show-next').disabled = showIndex === showSlides.length - 1;
  }

  /* ── PDF 저장 ───────────────────────────────────────────── */

  function savePdf() {
    const topic = myTopic();
    const cls = $('student-class').value.trim();
    const name = $('student-name').value.trim();
    $('print-head').innerHTML = `
      <div class="ph-title">디지털 윤리 모둠 탐구 — ${esc(topic ? topic.title : '')}</div>
      <div>모둠: ${esc(state.groupName || '-')} / 학번: ${esc(cls || '-')} / 모둠원: ${esc(name || '-')}</div>`;
    window.print();
  }

  /* ── 눌렀을 때 ──────────────────────────────────────────── */

  function bind() {
    $('steps').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-step]');
      if (btn && !btn.disabled) goStep(Number(btn.dataset.step));
    });

    $('group-name').addEventListener('input', (e) => {
      state.groupName = e.target.value;
      save();
    });

    $('topic-grid').addEventListener('click', (e) => {
      const card = e.target.closest('[data-topic]');
      if (!card) return;
      state.topicId = card.dataset.topic;
      viewerId = state.topicId;
      activeSub = 0;
      quizChecked = false;
      hintsOpen.clear();
      save();
      render();
    });

    $('viewer-topics').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-view]');
      if (!chip) return;
      viewerId = chip.dataset.view;
      activeSub = 0;
      renderViewer();
    });

    $('sub-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-sub]');
      if (!tab) return;
      activeSub = Number(tab.dataset.sub);
      renderViewer();
    });

    /* 퀴즈 — 답을 고르거나 쓰면 바로 상태에 담는다 */
    const quiz = $('quiz-list');
    quiz.addEventListener('click', (e) => {
      const ox = e.target.closest('[data-value]');
      if (ox) {
        state.answers[ox.dataset.ans] = ox.dataset.value;
        save();
        renderQuiz();
        return;
      }
      const hint = e.target.closest('[data-hint]');
      if (hint) {
        const id = hint.dataset.hint;
        if (hintsOpen.has(id)) hintsOpen.delete(id); else hintsOpen.add(id);
        renderQuiz();
      }
    });
    quiz.addEventListener('change', (e) => {
      const radio = e.target.closest('input[type="radio"][data-ans]');
      if (!radio) return;
      state.answers[radio.dataset.ans] = radio.value;
      save();
    });
    quiz.addEventListener('input', (e) => {
      const text = e.target.closest('input[type="text"][data-ans]');
      if (!text) return;
      state.answers[text.dataset.ans] = text.value;
      save();
    });

    $('quiz-check').addEventListener('click', () => { quizChecked = true; renderQuiz(); });
    $('quiz-reset').addEventListener('click', () => {
      const topic = myTopic();
      if (topic) topic.quiz.forEach((q) => { delete state.answers[q.id]; });
      quizChecked = false;
      hintsOpen.clear();
      save();
      renderQuiz();
    });

    $('summary-list').addEventListener('input', (e) => {
      const area = e.target.closest('[data-sum]');
      if (!area) return;
      state.summary[area.dataset.sum] = area.value;
      save();
    });

    const cases = $('cases');
    cases.addEventListener('input', (e) => {
      const f = e.target.closest('[data-case]');
      if (!f) return;
      state.cases[Number(f.dataset.case)][f.dataset.key] = f.value;
      save();
      // 다 채웠는지 표시만 바꾼다 (다시 그리면 글자를 쓰던 칸에서 커서가 빠진다)
      const card = f.closest('.case-card');
      const st = ETHICS.caseStatus(state.cases[Number(f.dataset.case)]);
      card.classList.toggle('done', st.filled);
      const badge = card.querySelector('.case-state');
      badge.classList.toggle('ok', st.filled);
      badge.textContent = st.filled ? '✔ 다 채웠어요' : `아직 ${st.missing.length}칸 남았어요`;
      const done = ETHICS.filledCases(state.cases).length;
      $('cases-count').textContent = `사례 ${state.cases.length}개 중 ${done}개 완성 (최대 ${ETHICS.MAX_CASES}개)`;
    });
    cases.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const i = Number(del.dataset.del);
      const st = ETHICS.caseStatus(state.cases[i]);
      if (st.touched && !confirm(`사례 ${i + 1}에 쓴 내용이 지워져요. 지울까요?`)) return;
      state.cases.splice(i, 1);
      if (!state.cases.length) state.cases.push(ETHICS.emptyCase());
      save();
      renderCases();
    });

    $('case-add').addEventListener('click', () => {
      if (state.cases.length >= ETHICS.MAX_CASES) return;
      state.cases.push(ETHICS.emptyCase());
      save();
      renderCases();
    });

    $('go-2').addEventListener('click', () => goStep(2));
    $('go-3').addEventListener('click', () => goStep(3));
    $('go-4').addEventListener('click', () => goStep(4));
    $('go-5').addEventListener('click', () => goStep(5));
    $('back-1').addEventListener('click', () => goStep(1));
    $('back-2').addEventListener('click', () => goStep(2));
    $('back-3').addEventListener('click', () => goStep(3));
    $('back-4').addEventListener('click', () => goStep(4));

    $('present-start').addEventListener('click', startShow);
    $('show-close').addEventListener('click', endShow);
    $('show-prev').addEventListener('click', () => moveShow(-1));
    $('show-next').addEventListener('click', () => moveShow(1));
    $('pdf-save').addEventListener('click', savePdf);

    document.addEventListener('keydown', (e) => {
      if ($('show').hidden) return;
      if (e.key === 'Escape') endShow();
      else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); moveShow(1); }
      else if (e.key === 'ArrowLeft') moveShow(-1);
    });

    $('reset-all').addEventListener('click', () => {
      if (!confirm('지금까지 쓴 내용이 모두 지워져요. 처음부터 다시 할까요?')) return;
      state = ETHICS.emptyState();
      viewerId = null;
      activeSub = 0;
      quizChecked = false;
      hintsOpen.clear();
      save();
      render();
    });
  }

  bind();
  render();
})();
