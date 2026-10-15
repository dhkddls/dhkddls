/**
 * @file 몬스터 수치와 행동 버튼 문구. 수치를 바꾸면 전투와 보상 미리보기에 함께 반영됩니다.
 * level은 권장 레벨, health는 적 최대 기력, defense는 명중해야 할 난이도입니다.
 * attack은 적의 d20 명중 보정, damage는 기본 피해, experience는 배율 적용 전 기본 경험치입니다.
 * COMBAT_ACTIONS는 표시용 문구이며 실제 효과는 CombatSession에서 구현합니다.
 */

// 권장 레벨·전투 능력치·기본 경험치는 여기서 함께 조정합니다.
export const MONSTERS = {
  // 첫 전투용 약한 적. 같은 설정을 야영지 반복 전투에서도 사용합니다.
  "reed-wolf": {
    id: "reed-wolf",
    name: "갈대 그림자늑대",
    level: 1,
    health: 10,
    defense: 8,
    attack: 1,
    damage: 2,
    experience: 50,
    description:
      "잊힌 사냥개들의 기억이 검은 갈대에 엉겨 붙었다. 부서지면 빈 갈대만 남는다.",
  },
  // Lv.2 훈련 상대. 기본 경험치는 최종 지급량이 아니라 배율의 입력값입니다.
  "hollow-hound": {
    id: "hollow-hound",
    name: "공허의 사냥개",
    level: 2,
    health: 16,
    defense: 10,
    attack: 2,
    damage: 3,
    experience: 75,
    description:
      "제9보관소 운송 수레를 쫓는 기억의 잔향. 주인의 목소리를 흉내 내 길을 막는다.",
  },
  // 주조소 기록실을 여는 적. 처치 후 이동 장소는 해당 장면 선택지가 정합니다.
  "wax-sentinel": {
    id: "wax-sentinel",
    name: "밀랍 파수병",
    level: 3,
    health: 22,
    defense: 12,
    attack: 3,
    damage: 4,
    experience: 95,
    description:
      "검은 밀랍으로 움직이는 빈 갑옷. 살아 있는 병사가 아니며 가슴의 뒤집힌 장례문이 약점이다.",
  },
  // 선택 고난도 전투. 낮은 플레이어 레벨에서는 경고와 감소된 보상이 표시됩니다.
  "echo-knight": {
    id: "echo-knight",
    name: "메아리 기사",
    level: 4,
    health: 28,
    defense: 13,
    attack: 4,
    damage: 5,
    experience: 130,
    description:
      "폐주조소 순찰로에 남은 맹세의 잔재. 죽은 기사의 부활이 아니라 갑옷에 새겨진 명령이다.",
  },
  // 중반 보스. 같은 Lv.4라도 메아리 기사보다 기력·피해·기본 경험치가 높습니다.
  "archive-keeper": {
    id: "archive-keeper",
    name: "보관소의 문지기",
    level: 4,
    health: 34,
    defense: 14,
    attack: 4,
    damage: 6,
    experience: 160,
    description:
      "기억을 운반하는 종 껍데기로 만든 수호체. 은심을 끊으면 붙들린 기억을 다치게 하지 않고 멈출 수 있다.",
  },
};

// 키 attack/power/recover/flee가 버튼·전투 처리·저장 기록을 연결합니다. 문구만 바꿔도 효과는 바뀌지 않습니다.
export const COMBAT_ACTIONS = {
  attack: {
    name: "기본 공격",
    detail: "가장 높은 능력치로 판정 · 빗나가도 1 피해",
  },
  power: { name: "결정타", detail: "명중 보정 −3 · 적중 피해 +3" },
  recover: {
    name: "응급 처치",
    detail: "기력 4 + 레벨 회복 · 전투당 2회 · 적도 행동",
  },
  flee: { name: "야영지로 후퇴", detail: "항상 성공 · 경험치 없음" },
};
