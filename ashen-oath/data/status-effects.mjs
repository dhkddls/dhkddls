/**
 * @file 상태 이상의 이름·세계관 설명·고정 수치입니다. 같은 효과는 강도가 중첩되지 않습니다.
 * duration은 이후 이야기 판정 또는 공격·응급 처치의 횟수입니다. 이동·후퇴는 소모하지 않습니다.
 */
export const STATUS_EFFECTS = Object.freeze({
  wound: Object.freeze({
    id: "wound",
    name: "갈대 상처",
    stat: "might",
    statPenalty: 2,
    damagePenalty: 2,
    duration: 3,
    effect: "무력 판정 −2 · 공격 피해 −2",
    lore: "차가운 갈대와 금 간 은종이 남긴 상처 때문에 힘을 온전히 싣지 못한다.",
  }),
  fog: Object.freeze({
    id: "fog",
    name: "기억 혼탁",
    stat: "wit",
    statPenalty: 2,
    attackPenalty: 2,
    duration: 3,
    effect: "통찰 판정 −2 · 공격 명중 −2",
    lore: "지워진 이름의 잔향이 방금 본 글자와 적의 움직임을 겹쳐 보이게 한다.",
  }),
  dread: Object.freeze({
    id: "dread",
    name: "메아리 공포",
    stat: "spirit",
    statPenalty: 2,
    defensePenalty: 2,
    duration: 3,
    effect: "의지 판정 −2 · 방어 −2",
    lore: "붙잡지 못한 목소리와 빗나간 칼끝이 떠올라 다음 공격에 몸이 굳는다.",
  }),
});

// 판정에 사용한 능력치로 실패의 대가를 고릅니다. 전투 빗나감은 공포를 남깁니다.
export const FAILURE_STATUSES = Object.freeze({
  might: "wound",
  wit: "fog",
  spirit: "dread",
});
