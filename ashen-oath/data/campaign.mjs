/**
 * @file 막 종료 후 이동할 장소와 완결에 반영할 증거를 정의합니다.
 * 이미 저장된 초반부 이동 문구는 유지하고, 왕도 진입만 새로 추가합니다.
 */
export const CHAPTER_TRANSITIONS = {
  "ending-seal": {
    next: "road-oath",
    label: "중반부로 여정을 이어간다",
    button: "중반부로 떠나기 →",
  },
  "ending-dawn": {
    next: "road-oath",
    label: "중반부로 여정을 이어간다",
    button: "중반부로 떠나기 →",
  },
  "ending-price": {
    next: "road-oath",
    label: "중반부로 여정을 이어간다",
    button: "중반부로 떠나기 →",
  },
  "act2-ending": {
    next: "capital-gate",
    label: "왕도로 여정을 이어간다",
    button: "왕도로 향하기 →",
    unlockGrowth: true,
  },
};

// 시민 증언과 왕실 원본은 선택 조사, 실험 장부는 본편에서 반드시 확보합니다.
export const FINAL_EVIDENCE = [
  "왕실 반출 원본",
  "수도 시민 공동 증언",
  "제9보관소 실험 장부",
];

// 표시용 제목은 장면 ID나 저장 형식과 분리합니다.
export const ACT_PRESENTATION = {
  1: {
    label: "제1막 · 서리여울",
    footer: "제1막: 서리여울",
    numeral: "I",
    art: "별 아래 서리여울의 종탑과 안개 낀 마을",
  },
  2: {
    label: "제2막 · 별무덤",
    footer: "제2막: 염로와 별무덤",
    numeral: "II",
    art: "안개와 산맥 아래 선 봉인종의 탑",
  },
  3: {
    label: "최종막 · 왕도",
    footer: "최종막: 왕도와 제9보관소",
    numeral: "III",
    art: "왕도의 봉인종 탑과 오래된 성곽의 실루엣",
  },
};
