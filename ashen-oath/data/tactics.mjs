/** @file 적의 순환 행동, 출신 기술과 조사 단서의 전투 효과. 기존 몬스터 수치는 바꾸지 않습니다. */
export const INTENTS = Object.freeze({
  strike: {
    kind: "strike",
    name: "일반 공격",
    detail: "평소 피해로 공격합니다. 공격하거나 회복할 기회입니다.",
    damageBonus: 0,
  },
  gather: {
    kind: "gather",
    name: "힘 모으기",
    detail:
      "이번에는 공격하지 않습니다. 다음 강타를 방해하거나 다음 턴 방어를 준비하세요.",
    damageBonus: 0,
  },
  heavy: {
    kind: "heavy",
    name: "강타",
    detail:
      "기본 피해 +4, 명중 시 갈대 상처. 방어는 피해를 절반으로 줄이고 상처를 막으며, 방해가 명중하면 취소됩니다.",
    damageBonus: 4,
    status: "wound",
  },
  hex: {
    kind: "hex",
    name: "기억의 속삭임",
    detail:
      "명중하면 기억 혼탁이 생깁니다. 방어로 상태 이상을 막거나 방해로 취소하세요.",
    damageBonus: -1,
    status: "fog",
  },
  guard: {
    kind: "guard",
    name: "봉인 방어",
    detail:
      "이번 행동에는 방어 +3, 공격하지 않습니다. 결정타보다 회복이나 단서 활용이 좋습니다.",
    damageBonus: 0,
    defenseBonus: 3,
  },
  stagger: {
    kind: "stagger",
    name: "준비가 끊긴 틈",
    detail:
      "준비를 끊어 이번 강타는 나오지 않습니다. 안전하게 공격하거나 회복하세요.",
    damageBonus: 0,
  },
});

// 목록은 반복됩니다. 이번 적 행동을 먼저 표시하고 플레이어가 대응한 뒤 실행합니다.
export const ENEMY_PATTERNS = Object.freeze({
  "reed-wolf": ["strike", "heavy"],
  "hollow-hound": ["strike", "gather", "heavy"],
  "wax-sentinel": ["guard", "strike", "gather", "heavy"],
  "echo-knight": ["strike", "gather", "heavy", "hex"],
  "archive-keeper": ["gather", "heavy", "guard", "hex"],
  "wax-envoy": ["strike", "hex", "gather", "heavy"],
  "silent-bailiff": ["hex", "guard", "gather", "heavy"],
  "vault-marshal": ["guard", "strike", "gather", "heavy"],
  "crown-engine": ["gather", "heavy", "hex", "strike", "heavy", "guard"],
  "unwritten-heart": ["hex", "gather", "heavy", "hex", "strike", "heavy"],
});

export const ORIGIN_SKILLS = Object.freeze({
  warden: {
    name: "서약의 방패",
    detail: "이번 공격·상태 이상을 막고, 적이 공격하면 3 + 레벨로 반격",
    cooldown: 3,
  },
  scribe: {
    name: "이름 해독",
    detail:
      "2 + 레벨 확정 피해 · 다음 2행동 동안 적 방어 −2 · 이번 특수 행동 차단",
    cooldown: 3,
  },
  ranger: {
    name: "그림자 걸음",
    detail: "이번 공격 회피 · 명중 +3, 적중 피해 +2로 약점 사격",
    cooldown: 3,
  },
});

// 선택 조사로 얻은 단서는 한 전투에 한 번, 특수 행동 차단과 지속 방어 감소에 사용합니다.
export const COMBAT_CLUES = Object.freeze([
  {
    clue: "왕실 반출 원본",
    monsters: ["crown-engine"],
    text: "반출 원본의 제어 순서대로 은심의 잠금을 풀었다.",
  },
  {
    clue: "수도 시민 공동 증언",
    monsters: ["unwritten-heart"],
    text: "시민들의 증언이 빼앗긴 기억의 주인을 밝혀 사슬을 느슨하게 했다.",
  },
  {
    clue: "제9보관소 실험 장부",
    monsters: ["unwritten-heart"],
    text: "실험 장부에서 찾은 비상 정지 절차로 심장의 사슬을 풀었다.",
  },
  {
    clue: "원래의 봉인문",
    monsters: ["wax-sentinel", "archive-keeper", "crown-engine"],
    text: "올바른 봉인문으로 명령을 끊었다.",
  },
  {
    clue: "뒤집힌 장례문",
    monsters: ["wax-sentinel", "echo-knight", "crown-engine"],
    text: "거꾸로 된 명문을 지워 장치의 빈틈을 열었다.",
  },
  {
    clue: "검은 밀랍 인장",
    monsters: ["wax-envoy", "silent-bailiff", "vault-marshal"],
    text: "반출 인장으로 수호체의 이동 명령을 정지시켰다.",
  },
  {
    clue: "제9보관소 출고 명령",
    monsters: ["wax-envoy", "silent-bailiff", "vault-marshal"],
    text: "운송 명령의 정지 절차를 찾아 실행했다.",
  },
]);

export const TACTICAL_ACTIONS = Object.freeze({
  guard: {
    name: "방어",
    detail: "이번 방어 +3 · 받은 피해 절반 · 적이 거는 상태 이상 차단",
  },
  interrupt: {
    name: "방해 공격",
    detail: "명중 −2 · 피해 절반 · 명중 시 특수 행동 차단 · 2행동 대기",
  },
  skill: { name: "출신 기술", detail: "출신별 기술 · 3행동 대기" },
  evidence: {
    name: "단서 활용",
    detail: "한 전투에 한 번 · 특수 행동 차단 · 이후 적 방어 −2",
  },
  "treat-wound": {
    name: "약초 붕대",
    detail: "갈대 상처 해제 · 기력 2 + 레벨 회복 · 전투당 1회",
  },
  "treat-fog": { name: "이름 수첩", detail: "기억 혼탁 해제 · 전투당 1회" },
  "treat-dread": {
    name: "동료의 호명",
    detail: "메아리 공포 해제 · 전투당 1회",
  },
});

// 새 전투만 쓰는 보스 기력입니다. 과거 저장 재생의 MONSTERS 수치는 그대로 유지합니다.
export const TACTICAL_MONSTER_STATS = Object.freeze({
  "archive-keeper": { health: 40 },
  "crown-engine": { health: 64 },
  "unwritten-heart": { health: 78 },
});
