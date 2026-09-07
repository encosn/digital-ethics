/**
 * topics.js 시험 — 실행: node tests/run-topic-tests.js
 *
 * 교과서 내용은 사람이 손으로 옮겨 적기 때문에 오타가 나기 쉽다.
 * 이 시험은 「자료가 스스로 말한 내용과 맞는지」를 확인한다.
 *   ① 화면(main.js)이 그릴 수 있는 모양인가 — 모르는 kind, 빠진 칸이 없는가
 *   ② 퀴즈 정답이 실제로 정답으로 채점되는가 (선택형은 보기 안에 있는가)
 *   ③ 교과서에서 옮긴 숫자가 뒤바뀌지 않았는가
 */
global.window = {};
require('../topics.js');
const TOPICS = global.window.TOPICS;
const E = require('../ethics-core.js');

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('✗ ' + name + '\n   ' + e.message); } }
function eq(a, b, msg) { const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) throw new Error((msg || '') + ' 기댓값 ' + B + ' 실제 ' + A); }
function ok(v, msg) { if (!v) throw new Error(msg || '참이어야 한다'); }
function group(title) { console.log('\n[' + title + ']'); }

/** main.js 의 renderBlock 이 그릴 수 있는 kind 와, 그때 반드시 있어야 하는 칸 */
const BLOCK_SHAPES = {
  lead: ['text'],
  define: ['term', 'text'],
  cards: ['title', 'items'],
  bars: ['title', 'items', 'unit'],
  rank: ['title', 'groups', 'unit'],
  delta: ['title', 'items'],
  flow: ['title', 'steps'],
  list: ['title', 'items'],
  pairs: ['title', 'items'],
  table: ['title', 'head', 'rows'],
  ccl: ['title', 'items'],
  contact: ['title', 'items'],
};

const allBlocks = (topic) => topic.subs.reduce((acc, s) => acc.concat(s.blocks), []);
const blocksOf = (topic, kind) => allBlocks(topic).filter((b) => b.kind === kind);
const byId = (id) => TOPICS.find((x) => x.id === id);

/* ───────── 전체 짜임 ───────── */

group('주제 목록');

t('주제가 네 개다', () => eq(TOPICS.length, 4));
t('아이디가 겹치지 않는다', () => eq(new Set(TOPICS.map((x) => x.id)).size, 4));
t('번호가 1부터 4까지 차례대로다', () => eq(TOPICS.map((x) => x.no), [1, 2, 3, 4]));
t('교과서 네 주제가 모두 있다', () =>
  eq(TOPICS.map((x) => x.title), ['사이버 폭력 예방', '디지털 중독 예방', '개인 정보 보호', '저작권 보호']));

TOPICS.forEach((topic) => {
  group(`${topic.no}. ${topic.title}`);

  t('기본 칸이 다 있다', () => {
    ['id', 'title', 'emoji', 'color', 'pages', 'lead'].forEach((k) =>
      ok(typeof topic[k] === 'string' && topic[k].length, `${k} 가 비었다`));
    ok(Array.isArray(topic.goals) && topic.goals.length, '학습 목표가 없다');
    ok(Array.isArray(topic.subs) && topic.subs.length, '소주제가 없다');
  });

  t('색이 #rrggbb 모양이다', () => ok(/^#[0-9a-f]{6}$/i.test(topic.color), topic.color));

  t('쪽수 표시가 교과서 범위를 가리킨다', () => ok(/교과서 2\d\d~2\d\d쪽/.test(topic.pages), topic.pages));

  t('소주제 번호가 1부터 차례대로다', () =>
    eq(topic.subs.map((s) => s.no), topic.subs.map((_, i) => i + 1)));

  t('모든 블록이 화면이 아는 모양이다', () => {
    allBlocks(topic).forEach((b) => {
      const need = BLOCK_SHAPES[b.kind];
      ok(need, `모르는 kind: ${b.kind}`);
      need.forEach((k) => ok(b[k] != null && b[k] !== '', `${b.kind} 블록에 ${k} 가 없다`));
    });
  });

  t('발표 자료에 넣을 낱말(define)이 하나 이상 있다', () => ok(blocksOf(topic, 'define').length >= 1));

  t('조사할 때 찾아볼 곳(contact)이 하나 이상 있다', () => ok(blocksOf(topic, 'contact').length >= 1));

  t('바깥 주소는 모두 https 다', () => {
    blocksOf(topic, 'contact').forEach((b) => b.items.forEach((it) => {
      if (it.url) ok(it.url.startsWith('https://'), it.url);
    }));
  });

  t('카드 블록의 항목에 아이콘·이름·설명이 다 있다', () => {
    blocksOf(topic, 'cards').forEach((b) => {
      ok(b.items.length >= 2, `${b.title} 카드가 너무 적다`);
      b.items.forEach((it) => ['icon', 'name', 'text'].forEach((k) =>
        ok(it[k], `${b.title} 카드에 ${k} 가 없다`)));
    });
  });

  t('표는 머리글 칸 수와 각 줄의 칸 수가 같다', () => {
    blocksOf(topic, 'table').forEach((b) =>
      b.rows.forEach((r) => eq(r.length, b.head.length, `${b.title} 표의 칸 수가 안 맞는다`)));
  });

  t('막대·순위 그래프의 값이 백분율 범위 안이다', () => {
    blocksOf(topic, 'bars').forEach((b) => b.items.forEach((it) =>
      ok(it.value > 0 && it.value <= 100, `${b.title}: ${it.value}`)));
    blocksOf(topic, 'rank').forEach((b) => b.groups.forEach((g) => g.items.forEach((it) =>
      ok(it.value > 0 && it.value <= 100, `${b.title}: ${it.value}`))));
  });

  t('순위 그래프가 큰 값부터 차례대로 놓여 있다', () => {
    blocksOf(topic, 'rank').forEach((b) => b.groups.forEach((g) => {
      const v = g.items.map((it) => it.value);
      eq(v, v.slice().sort((a, c) => c - a), `${b.title} / ${g.label} 순서가 어긋난다`);
    }));
  });

  t('증감 그래프는 뒤가 앞보다 크다', () => {
    blocksOf(topic, 'delta').forEach((b) => b.items.forEach((it) =>
      ok(it.to > it.from, `${it.label}: ${it.from} → ${it.to}`)));
  });

  t('퀴즈가 여섯 문항이고 아이디가 겹치지 않는다', () => {
    eq(topic.quiz.length, 6);
    eq(new Set(topic.quiz.map((q) => q.id)).size, 6);
  });

  t('퀴즈마다 힌트와 해설이 있다', () =>
    topic.quiz.forEach((q) => {
      ok(q.hint && q.hint.length > 3, `${q.id} 힌트가 없다`);
      ok(q.why && q.why.length > 5, `${q.id} 해설이 없다`);
    }));

  t('O/X 문항의 정답은 O 아니면 X 다', () =>
    topic.quiz.filter((q) => q.kind === 'ox').forEach((q) =>
      ok(q.answer === 'O' || q.answer === 'X', `${q.id}: ${q.answer}`)));

  t('선택형 정답은 보기 안에 있고 보기가 겹치지 않는다', () =>
    topic.quiz.filter((q) => q.kind === 'choice').forEach((q) => {
      ok(q.choices.length >= 3, `${q.id} 보기가 적다`);
      eq(new Set(q.choices).size, q.choices.length, `${q.id} 보기가 겹친다`);
      ok(q.choices.includes(q.answer), `${q.id} 정답이 보기에 없다: ${q.answer}`);
    }));

  t('★ 정답을 그대로 넣으면 채점기가 맞다고 한다', () => {
    const answers = {};
    topic.quiz.forEach((q) => { answers[q.id] = q.answer; });
    const g = E.gradeQuiz(topic.quiz, answers);
    eq([g.total, g.correct], [6, 6]);
  });

  t('오답을 넣으면 틀렸다고 한다', () =>
    topic.quiz.forEach((q) => {
      const wrong = q.kind === 'ox' ? (q.answer === 'O' ? 'X' : 'O')
        : q.kind === 'choice' ? q.choices.find((c) => c !== q.answer)
        : q.answer + '아니다';
      ok(!E.gradeQuestion(q, wrong).correct, `${q.id} 가 오답도 맞다고 한다`);
    }));

  t('교과서 예시 사례의 칸이 다 채워져 있다', () => {
    const c = topic.caseExample;
    ok(c, '예시 사례가 없다');
    ['title', 'what', 'harm', 'prevent', 'source'].forEach((k) => ok(c[k], `예시 사례에 ${k} 가 없다`));
    ok(E.caseStatus(c).filled, '예시 사례가 미완성으로 판정된다');
  });

  t('이 주제로 발표 슬라이드가 만들어진다', () => {
    const s = E.emptyState();
    s.topicId = topic.id;
    s.groupName = '시험 모둠';
    s.cases = [Object.assign({}, topic.caseExample)];
    const slides = E.buildSlides(s, topic);
    ok(slides.length >= 4, `슬라이드가 ${slides.length}장뿐이다`);
    eq(slides[0].kind, 'cover');
    eq(slides[slides.length - 1].kind, 'closing');
  });
});

/* ───────── 교과서에서 옮긴 숫자 ───────── */

group('교과서 숫자 대조');

t('사이버 폭력 실태 — 청소년 43.9 / 79.9, 성인 31.6 / 71.5', () => {
  const bars = blocksOf(byId('cyberbully'), 'bars')[0];
  eq(bars.items.map((i) => i.value), [43.9, 31.6, 79.9, 71.5]);
});

t('가해 동기 1위 — 청소년은 보복, 성인은 재미·장난', () => {
  const rank = blocksOf(byId('cyberbully'), 'rank')[0];
  eq(rank.groups.map((g) => g.label), ['청소년', '성인']);
  ok(rank.groups[0].items[0].name.includes('보복'), rank.groups[0].items[0].name);
  ok(rank.groups[1].items[0].name.includes('재미나 장난'), rank.groups[1].items[0].name);
  eq([rank.groups[0].items[0].value, rank.groups[1].items[0].value], [38.4, 39.2]);
});

t('가해 동기는 두 집단 모두 여섯 항목이고 같은 항목들이다', () => {
  const rank = blocksOf(byId('cyberbully'), 'rank')[0];
  const names = rank.groups.map((g) => g.items.map((i) => i.name).sort());
  eq(rank.groups.map((g) => g.items.length), [6, 6]);
  eq(names[0], names[1]);
});

t('중독 위험군 증가 — 인터넷 +5,750명, 스마트폰 +5,289명', () => {
  const d = blocksOf(byId('addiction'), 'delta')[0];
  eq(d.items.map((i) => i.to - i.from), [5750, 5289]);
  eq(d.items.map((i) => [i.from, i.to]), [[183228, 188978], [129543, 134832]]);
});

t('개인 정보는 인적·신체·행위·교육 네 가지로 나뉜다', () => {
  const cards = blocksOf(byId('privacy'), 'cards')[0];
  eq(cards.items.map((i) => i.name), ['인적 정보', '신체 정보', '행위 정보', '교육 정보']);
});

t('개인 정보 침해는 네 단계에서 일어난다', () => {
  const flow = blocksOf(byId('privacy'), 'flow')[0];
  eq(flow.steps.map((s) => s.name), ['수집 단계', '저장·관리 단계', '이용 제공 단계', '폐기 단계']);
});

t('신고 전화번호 — 학교 폭력 117, 개인 정보 침해 118', () => {
  const bully = blocksOf(byId('cyberbully'), 'contact')[0].items[0];
  const privacy = blocksOf(byId('privacy'), 'contact')[0].items[0];
  ok(bully.how.includes('117'), bully.how);
  ok(privacy.how.includes('118'), privacy.how);
});

t('CC 라이선스는 BY·NC·ND·SA 네 가지다', () => {
  const ccl = blocksOf(byId('copyright'), 'ccl')[0];
  eq(ccl.items.map((i) => i.code), ['BY', 'NC', 'ND', 'SA']);
});

t('저작물은 아홉 가지다', () => {
  const cards = blocksOf(byId('copyright'), 'cards')[0];
  eq(cards.items.length, 9);
  eq(cards.items[0].name, '어문');
  eq(cards.items[8].name, '컴퓨터 프로그램');
});

t('공공누리는 네 유형이고 출처 표시가 모두 필수다', () => {
  const tbl = blocksOf(byId('copyright'), 'table')[0];
  eq(tbl.rows.length, 4);
  tbl.rows.forEach((r) => eq(r[1], '필수', `${r[0]} 의 출처 표시`));
});

t('폭력 없는 사이버 공간 10대 수칙은 열 개다', () => {
  const list = blocksOf(byId('cyberbully'), 'list').find((b) => b.title.includes('10대 수칙'));
  eq(list.items.length, 10);
});

/* ───────── 결과 ───────── */

console.log(`\n합계 ${pass + fail}개 — 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
