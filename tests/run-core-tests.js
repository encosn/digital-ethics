/**
 * ethics-core.js 시험 — 실행: node tests/run-core-tests.js
 *
 * 화면 없이 확인할 수 있는 것만 본다.
 *   ① 퀴즈 채점이 띄어쓰기·문장부호에 흔들리지 않는가
 *   ② 점검하기가 빠진 곳을 정확히 짚는가
 *   ③ 발표 슬라이드가 완성된 사례만 담는가
 *   ④ ★ 저장할 때 학번·이름이 정말로 빠지는가 (교실 공용 컴퓨터 규칙)
 */
const E = require('../ethics-core.js');

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('✗ ' + name + '\n   ' + e.message); } }
function eq(a, b, msg) { const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) throw new Error((msg || '') + ' 기댓값 ' + B + ' 실제 ' + A); }
function ok(v, msg) { if (!v) throw new Error(msg || '참이어야 한다'); }
function no(v, msg) { if (v) throw new Error(msg || '거짓이어야 한다'); }
function group(title) { console.log('\n[' + title + ']'); }

/* ───────── 시험용 자료 ───────── */

const TOPIC = {
  id: 'demo',
  title: '연습 주제',
  emoji: '🧪',
  color: '#123456',
  pages: '교과서 1~2쪽',
  subs: [
    {
      no: 1,
      title: '첫 소주제',
      blocks: [
        { kind: 'define', term: '가나다', text: '가나다의 뜻' },
        { kind: 'lead', text: '설명글' },
        { kind: 'contact', title: '신고', items: [{ name: '어디어디', how: '전화 000', url: '' }] },
      ],
    },
    {
      no: 2,
      title: '둘째 소주제',
      blocks: [{ kind: 'define', term: '라마바', text: '라마바의 뜻' }],
    },
  ],
  quiz: [
    { id: 'q1', kind: 'ox', q: '참인가?', answer: 'O', hint: 'ㅎ', why: 'ㅇ' },
    { id: 'q2', kind: 'choice', q: '무엇?', choices: ['가', '나'], answer: '나', hint: 'ㅎ', why: 'ㅇ' },
    { id: 'q3', kind: 'blank', q: '무엇이라 하나?', answer: '개인 정보 침해', hint: 'ㅎ', why: 'ㅇ' },
  ],
};

/** 점검을 모두 통과하는 상태를 만든다. */
function fullState() {
  const s = E.emptyState();
  s.topicId = 'demo';
  s.groupName = '3모둠';
  s.answers = { q1: 'O', q2: '나', q3: '개인정보침해' };
  s.summary = { key: '한 문장', why: '이유', practice: '실천 세 가지' };
  s.cases = [
    { title: '사례 하나', what: '무슨 일', harm: '피해', prevent: '대처', source: '뉴스' },
    E.emptyCase(),
  ];
  s.student = { classNo: '1학년 3반 12번', name: '홍길동' };
  return s;
}

/* ───────── 정규화·채점 ───────── */

group('정답 비교용 정규화');

t('띄어쓰기를 무시한다', () => eq(E.normalize('개인 정보 침해'), '개인정보침해'));
t('문장부호와 따옴표를 무시한다', () => eq(E.normalize('「익명성」.'), '익명성'));
t('영문 대소문자를 무시한다', () => eq(E.normalize('BY'), E.normalize('by')));
t('빈 값도 터지지 않는다', () => { eq(E.normalize(null), ''); eq(E.normalize(undefined), ''); });

group('문항 채점');

t('O/X 정답', () => eq(E.gradeQuestion(TOPIC.quiz[0], 'O'), { answered: true, correct: true }));
t('O/X 오답', () => eq(E.gradeQuestion(TOPIC.quiz[0], 'X'), { answered: true, correct: false }));
t('안 풀면 answered 가 거짓이고 correct 도 거짓', () =>
  eq(E.gradeQuestion(TOPIC.quiz[0], ''), { answered: false, correct: false }));
t('공백만 써도 안 푼 것으로 본다', () =>
  eq(E.gradeQuestion(TOPIC.quiz[2], '   '), { answered: false, correct: false }));
t('선택형은 보기 문자열과 견준다', () => ok(E.gradeQuestion(TOPIC.quiz[1], '나').correct));
t('빈칸형은 띄어쓰기가 달라도 맞는다', () => ok(E.gradeQuestion(TOPIC.quiz[2], '개인정보 침해').correct));
t('빈칸형이 틀리면 틀렸다고 한다', () => no(E.gradeQuestion(TOPIC.quiz[2], '저작권').correct));

group('퀴즈 전체 채점');

t('다 맞히면 3문항 중 3문항', () => {
  const g = E.gradeQuiz(TOPIC.quiz, { q1: 'O', q2: '나', q3: '개인 정보 침해' });
  eq([g.total, g.answered, g.correct], [3, 3, 3]);
});
t('하나만 풀면 answered 가 1', () => {
  const g = E.gradeQuiz(TOPIC.quiz, { q2: '가' });
  eq([g.total, g.answered, g.correct], [3, 1, 0]);
});
t('문항이 없어도 터지지 않는다', () => eq(E.gradeQuiz(null, null).total, 0));

/* ───────── 사례 카드 ───────── */

group('사례 카드');

t('빈 카드는 손대지 않은 상태', () => {
  const st = E.caseStatus(E.emptyCase());
  eq([st.touched, st.filled, st.missing.length], [false, false, 4]);
});
t('출처는 비어도 완성으로 본다', () => {
  const st = E.caseStatus({ title: '가', what: '나', harm: '다', prevent: '라', source: '' });
  eq([st.touched, st.filled], [true, true]);
});
t('한 칸이라도 비면 미완성이고 그 칸 이름을 알려 준다', () => {
  const st = E.caseStatus({ title: '가', what: '나', harm: '', prevent: '라' });
  eq([st.filled, st.missing], [false, ['어떤 피해가 있었나요?']]);
});
t('완성된 카드만 센다', () => eq(E.filledCases(fullState().cases).length, 1));

/* ───────── 점검하기 ───────── */

group('점검하기');

t('아무것도 안 했으면 다섯 줄이 모두 경고', () => {
  const rows = E.checkReport(E.emptyState(), null);
  eq(rows.length, 5);
  eq(rows.filter((r) => r.ok).length, 0);
});
t('주제를 안 골랐으면 첫 줄이 경고', () => {
  const rows = E.checkReport(E.emptyState(), null);
  no(rows[0].ok);
  ok(rows[0].msg.includes('주제'));
});
t('다 채우면 모두 통과', () => {
  const rows = E.checkReport(fullState(), TOPIC);
  eq(rows.filter((r) => r.ok).length, 5, JSON.stringify(rows.filter((r) => !r.ok)));
  ok(E.isReady(fullState(), TOPIC));
});
t('퀴즈를 덜 풀면 남은 문항 수를 알려 준다', () => {
  const s = fullState();
  delete s.answers.q2;
  const row = E.checkReport(s, TOPIC).find((r) => r.label === '핵심 확인 퀴즈');
  no(row.ok);
  ok(row.msg.includes('1문항'), row.msg);
});
t('정리 칸이 비면 어느 칸인지 알려 준다', () => {
  const s = fullState();
  s.summary.why = '';
  const row = E.checkReport(s, TOPIC).find((r) => r.label === '우리 모둠의 정리');
  no(row.ok);
  ok(row.msg.includes('②'), row.msg);
});
t('완성된 사례가 없으면 경고', () => {
  const s = fullState();
  s.cases = [E.emptyCase()];
  no(E.checkReport(s, TOPIC).find((r) => r.label === '사례 조사').ok);
  no(E.isReady(s, TOPIC));
});

/* ───────── 발표 슬라이드 ───────── */

group('발표 슬라이드 만들기');

t('표지 → 낱말 → 정리 → 사례 → 마무리 순서로 나온다', () => {
  const slides = E.buildSlides(fullState(), TOPIC);
  eq(slides.map((s) => s.kind), ['cover', 'concept', 'summary', 'case', 'closing']);
});
t('표지에 주제와 모둠 이름이 들어간다', () => {
  const cover = E.buildSlides(fullState(), TOPIC)[0];
  eq([cover.title, cover.groupName], ['연습 주제', '3모둠']);
  eq(cover.subs, ['첫 소주제', '둘째 소주제']);
});
t('낱말 슬라이드는 소주제를 넘나들며 define 을 모은다', () => {
  const concept = E.buildSlides(fullState(), TOPIC)[1];
  eq(concept.terms.map((x) => x.term), ['가나다', '라마바']);
});
t('완성되지 않은 사례는 슬라이드에 안 들어간다', () => {
  const s = fullState();
  s.cases.push({ title: '반쯤 쓴 사례', what: '', harm: '', prevent: '', source: '' });
  const cases = E.buildSlides(s, TOPIC).filter((x) => x.kind === 'case');
  eq(cases.length, 1);
  eq(cases[0].title, '사례 하나');
});
t('사례 슬라이드는 제목 칸을 본문에 다시 넣지 않는다', () => {
  const c = E.buildSlides(fullState(), TOPIC).find((s) => s.kind === 'case');
  no(c.fields.some((f) => f.label === '사례 제목'));
  eq(c.fields.length, 4);
});
t('마무리 슬라이드에 신고처가 들어간다', () => {
  const last = E.buildSlides(fullState(), TOPIC).pop();
  eq(last.contacts.map((c) => c.name), ['어디어디']);
});
t('주제가 없으면 빈 목록', () => eq(E.buildSlides(fullState(), null), []));

/* ───────── 저장·복원 ───────── */

group('저장·복원');

t('★ 저장할 때 학번·이름이 빠진다', () => {
  const saved = E.toSaved(fullState());
  no('student' in saved, '저장물에 student 가 남아 있으면 안 된다');
  const text = JSON.stringify(saved);
  no(text.includes('홍길동'), '이름이 저장물에 남아 있다');
  no(text.includes('1학년 3반 12번'), '학번이 저장물에 남아 있다');
});
t('모둠 이름·정리·사례는 저장된다', () => {
  const saved = E.toSaved(fullState());
  eq(saved.groupName, '3모둠');
  eq(saved.summary.why, '이유');
  eq(saved.cases[0].title, '사례 하나');
});
t('사례는 최대 개수까지만 저장한다', () => {
  const s = fullState();
  for (let i = 0; i < 8; i++) s.cases.push(E.emptyCase());
  eq(E.toSaved(s).cases.length, E.MAX_CASES);
});
t('저장했다 되돌리면 그대로다', () => {
  const back = E.fromSaved(JSON.parse(JSON.stringify(E.toSaved(fullState()))));
  eq(back.groupName, '3모둠');
  eq(back.answers.q3, '개인정보침해');
  eq(back.cases[0].prevent, '대처');
});
t('되돌린 상태의 학번·이름은 비어 있다', () => {
  const back = E.fromSaved(E.toSaved(fullState()));
  eq(back.student, { classNo: '', name: '' });
});
t('저장물이 없거나 깨져 있으면 빈 상태로 시작한다', () => {
  eq(E.fromSaved(null).topicId, null);
  eq(E.fromSaved('이상한 값').topicId, null);
  eq(E.fromSaved({ version: 99, groupName: '헌 것' }).groupName, '');
});
t('단계 번호가 범위를 벗어나면 1단계로 돌린다', () => {
  eq(E.fromSaved({ version: E.SAVE_VERSION, step: 9 }).step, 1);
  eq(E.fromSaved({ version: E.SAVE_VERSION, step: 4 }).step, 4);
});
t('사례가 비어 있으면 빈 카드 두 장으로 시작한다', () => {
  eq(E.fromSaved({ version: E.SAVE_VERSION, cases: [] }).cases.length, 2);
});

group('주제 찾기');

t('아이디로 찾는다', () => eq(E.findTopic([TOPIC], 'demo').title, '연습 주제'));
t('없으면 null', () => eq(E.findTopic([TOPIC], 'none'), null));
t('목록이 없어도 터지지 않는다', () => eq(E.findTopic(null, 'demo'), null));

/* ───────── 결과 ───────── */

console.log(`\n합계 ${pass + fail}개 — 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
