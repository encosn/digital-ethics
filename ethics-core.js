/* 디지털 윤리 모둠 탐구 — 핵심 로직 (화면과 상관없는 순수 함수)
 *
 * 이 파일에는 문서(DOM)를 건드리는 코드가 없다.
 * 그래서 브라우저 없이 node 로 단위 시험을 돌릴 수 있다. (tests/run-core-tests.js)
 *
 * ★ 개인정보 규칙
 *   학번·이름(state.student)은 발표 자료 머리말에만 쓰고 저장하지 않는다.
 *   저장은 toSaved() 를 거쳐서만 하며, toSaved() 가 student 를 통째로 빼 버린다.
 *   교실 공용 컴퓨터에서 다음 학생에게 이름이 남지 않게 하기 위한 것이다.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ETHICS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SAVE_VERSION = 1;
  const MAX_CASES = 4;

  /* 사례 카드 한 장의 칸 이름. 점검하기와 발표 자료가 이 목록을 함께 쓴다. */
  const CASE_FIELDS = [
    { key: 'title', label: '사례 제목', required: true },
    { key: 'what', label: '무슨 일이 있었나요?', required: true },
    { key: 'harm', label: '어떤 피해가 있었나요?', required: true },
    { key: 'prevent', label: '어떻게 예방·대처할 수 있나요?', required: true },
    { key: 'source', label: '어디에서 찾았나요? (출처)', required: false },
  ];

  const SUMMARY_FIELDS = [
    { key: 'key', label: '① 이 주제를 한 문장으로 말하면?' },
    { key: 'why', label: '② 왜 문제가 되나요? (원인과 심각성)' },
    { key: 'practice', label: '③ 우리가 지킬 실천 방법 3가지' },
  ];

  function emptyCase() {
    return { title: '', what: '', harm: '', prevent: '', source: '' };
  }

  function emptyState() {
    return {
      version: SAVE_VERSION,
      step: 1,
      topicId: null,
      groupName: '',
      answers: {},
      summary: { key: '', why: '', practice: '' },
      cases: [emptyCase(), emptyCase()],
      // ↓ 저장되지 않는다. toSaved() 가 빼 버린다.
      student: { classNo: '', name: '' },
    };
  }

  /* 정답 비교용 정규화 — 띄어쓰기와 흔한 문장부호를 빼고 견준다.
   * 「개인 정보 침해」와 「개인정보침해」를 같은 답으로 인정하기 위한 것이다. */
  function normalize(value) {
    return String(value == null ? '' : value)
      .replace(/[\s.,·!?'"’“”()\[\]「」『』-]/g, '')
      .toLowerCase();
  }

  function isBlank(value) {
    return String(value == null ? '' : value).trim() === '';
  }

  /* ── 퀴즈 채점 ───────────────────────────────────────────── */

  function gradeQuestion(question, given) {
    const answered = !isBlank(given);
    if (!answered) return { answered: false, correct: false };
    return { answered: true, correct: normalize(given) === normalize(question.answer) };
  }

  function gradeQuiz(questions, answers) {
    const list = Array.isArray(questions) ? questions : [];
    const given = answers || {};
    const results = list.map((q) => {
      const r = gradeQuestion(q, given[q.id]);
      return { id: q.id, answered: r.answered, correct: r.correct };
    });
    return {
      total: list.length,
      answered: results.filter((r) => r.answered).length,
      correct: results.filter((r) => r.correct).length,
      results,
    };
  }

  /* ── 사례 카드 ───────────────────────────────────────────── */

  /* 다 채웠는지, 안 채웠으면 어느 칸인지 알려 준다. */
  function caseStatus(item) {
    const card = item || {};
    const missing = CASE_FIELDS.filter((f) => f.required && isBlank(card[f.key])).map((f) => f.label);
    const touched = CASE_FIELDS.some((f) => !isBlank(card[f.key]));
    return { touched, filled: missing.length === 0, missing };
  }

  function filledCases(cases) {
    return (cases || []).filter((c) => caseStatus(c).filled);
  }

  /* ── 점검하기 ───────────────────────────────────────────── */

  function checkReport(state, topic) {
    const s = state || {};
    const rows = [];

    rows.push(
      topic
        ? { ok: true, label: '주제 고르기', msg: `「${topic.title}」 주제를 골랐어요.` }
        : { ok: false, label: '주제 고르기', msg: '1단계에서 발표할 주제를 먼저 골라 주세요.' }
    );

    rows.push(
      isBlank(s.groupName)
        ? { ok: false, label: '모둠 이름', msg: '1단계에서 모둠 이름을 적어 주세요.' }
        : { ok: true, label: '모둠 이름', msg: `${s.groupName}` }
    );

    const quiz = gradeQuiz(topic ? topic.quiz : [], s.answers);
    if (!topic) {
      rows.push({ ok: false, label: '핵심 확인 퀴즈', msg: '주제를 골라야 퀴즈가 나와요.' });
    } else {
      rows.push(
        quiz.answered < quiz.total
          ? { ok: false, label: '핵심 확인 퀴즈', msg: `${quiz.total}문항 중 ${quiz.total - quiz.answered}문항이 비어 있어요.` }
          : { ok: true, label: '핵심 확인 퀴즈', msg: `${quiz.total}문항을 모두 풀었고 ${quiz.correct}문항을 맞혔어요.` }
      );
    }

    const emptySummary = SUMMARY_FIELDS.filter((f) => isBlank((s.summary || {})[f.key]));
    rows.push(
      emptySummary.length
        ? { ok: false, label: '우리 모둠의 정리', msg: `${emptySummary.map((f) => f.label).join(', ')} 칸이 비어 있어요.` }
        : { ok: true, label: '우리 모둠의 정리', msg: '세 칸을 모두 채웠어요.' }
    );

    const done = filledCases(s.cases);
    rows.push(
      done.length === 0
        ? { ok: false, label: '사례 조사', msg: '완성된 사례가 아직 없어요. 사례 하나는 모든 칸을 채워야 발표할 수 있어요.' }
        : { ok: true, label: '사례 조사', msg: `사례 ${done.length}개를 완성했어요.` }
    );

    return rows;
  }

  function isReady(state, topic) {
    return checkReport(state, topic).every((r) => r.ok);
  }

  /* ── 발표 슬라이드 만들기 ──────────────────────────────────── */

  function collectBlocks(topic, kind) {
    if (!topic) return [];
    const out = [];
    (topic.subs || []).forEach((sub) => {
      (sub.blocks || []).forEach((b) => {
        if (b.kind === kind) out.push(b);
      });
    });
    return out;
  }

  function buildSlides(state, topic) {
    const s = state || {};
    if (!topic) return [];
    const slides = [];

    slides.push({
      kind: 'cover',
      title: topic.title,
      emoji: topic.emoji,
      color: topic.color,
      pages: topic.pages,
      groupName: s.groupName || '',
      subs: (topic.subs || []).map((sub) => sub.title),
    });

    const terms = collectBlocks(topic, 'define').map((b) => ({ term: b.term, text: b.text }));
    if (terms.length) slides.push({ kind: 'concept', title: '꼭 알아야 할 낱말', terms });

    slides.push({
      kind: 'summary',
      title: '우리 모둠의 정리',
      items: SUMMARY_FIELDS.map((f) => ({ label: f.label, text: (s.summary || {})[f.key] || '' })),
    });

    const cases = filledCases(s.cases);
    cases.forEach((c, i) => {
      slides.push({
        kind: 'case',
        title: c.title,
        index: i + 1,
        total: cases.length,
        fields: CASE_FIELDS.filter((f) => f.key !== 'title' && !isBlank(c[f.key])).map((f) => ({
          label: f.label,
          text: c[f.key],
        })),
      });
    });

    const contacts = [];
    collectBlocks(topic, 'contact').forEach((b) => {
      (b.items || []).forEach((it) => contacts.push(it));
    });
    slides.push({
      kind: 'closing',
      title: '우리가 지킬 실천 방법',
      text: (s.summary || {}).practice || '',
      contacts,
    });

    return slides;
  }

  /* ── 저장·복원 ──────────────────────────────────────────── */

  /* 저장할 모양으로 바꾼다. 학번·이름(student)은 여기서 빠진다. */
  function toSaved(state) {
    const s = state || {};
    return {
      version: SAVE_VERSION,
      step: s.step || 1,
      topicId: s.topicId || null,
      groupName: s.groupName || '',
      answers: Object.assign({}, s.answers),
      summary: {
        key: (s.summary || {}).key || '',
        why: (s.summary || {}).why || '',
        practice: (s.summary || {}).practice || '',
      },
      cases: (s.cases || []).slice(0, MAX_CASES).map((c) => Object.assign(emptyCase(), c)),
    };
  }

  /* 저장된 값을 상태로 되돌린다. 값이 깨져 있어도 빈 상태로 안전하게 돌아간다. */
  function fromSaved(raw) {
    const base = emptyState();
    if (!raw || typeof raw !== 'object' || raw.version !== SAVE_VERSION) return base;
    const step = Number(raw.step);
    base.step = step >= 1 && step <= 5 ? step : 1;
    base.topicId = typeof raw.topicId === 'string' ? raw.topicId : null;
    base.groupName = typeof raw.groupName === 'string' ? raw.groupName : '';
    if (raw.answers && typeof raw.answers === 'object') base.answers = Object.assign({}, raw.answers);
    if (raw.summary && typeof raw.summary === 'object') {
      base.summary = {
        key: raw.summary.key || '',
        why: raw.summary.why || '',
        practice: raw.summary.practice || '',
      };
    }
    if (Array.isArray(raw.cases) && raw.cases.length) {
      base.cases = raw.cases.slice(0, MAX_CASES).map((c) => Object.assign(emptyCase(), c));
    }
    return base;
  }

  function findTopic(topics, id) {
    return (topics || []).find((t) => t.id === id) || null;
  }

  return {
    SAVE_VERSION,
    MAX_CASES,
    CASE_FIELDS,
    SUMMARY_FIELDS,
    emptyCase,
    emptyState,
    normalize,
    isBlank,
    gradeQuestion,
    gradeQuiz,
    caseStatus,
    filledCases,
    checkReport,
    isReady,
    buildSlides,
    toSaved,
    fromSaved,
    findTopic,
  };
});
