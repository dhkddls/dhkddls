// 출신 설명과 능력치. 판정 규칙은 domain/skill-check.mjs에 있습니다.
export const ORIGINS = {
  warden: {
    name: "서약의 기사",
    subtitle: "부러진 검에도 맹세는 남는다",
    icon: "⚔",
    stats: {
      might: 4,
      wit: 1,
      spirit: 2,
    },
    item: "금이 간 기사 인장",
    text: "해체된 회색 근위대의 마지막 종자. 검과 방패에 익숙하며, 왕국이 버린 맹세를 아직 기억한다.",
  },
  scribe: {
    name: "이름의 서기관",
    subtitle: "지워진 글자에도 흔적은 남는다",
    icon: "✧",
    stats: {
      might: 0,
      wit: 4,
      spirit: 3,
    },
    item: "은실로 꿰맨 명부",
    text: "성흔 수도원에서 추방된 기록자. 이름과 기억을 엮는 마법을 배웠지만, 스승의 이름은 끝내 구하지 못했다.",
  },
  ranger: {
    name: "변경의 길잡이",
    subtitle: "지도 밖에도 길은 이어진다",
    icon: "➶",
    stats: {
      might: 2,
      wit: 3,
      spirit: 2,
    },
    item: "검은 갈대 부적",
    text: "안개벌의 사냥꾼. 왕의 법보다 마을의 약속을 믿으며, 숲과 강에 남은 오래된 징조를 읽는다.",
  },
};

export const STAT_NAMES = {
  might: "무력",
  wit: "통찰",
  spirit: "의지",
};
