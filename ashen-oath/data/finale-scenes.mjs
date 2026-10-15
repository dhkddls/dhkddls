/**
 * @file 완결막: 왕도 조사, 제9보관소, 두 단계 보스와 세 최종 서약입니다.
 * unlessVisited/unlessClue는 끝낸 사건의 반복을 막고 재도전 지름길을 구분합니다.
 * final은 막 종료(ending)와 달리 캠페인 전체가 끝났음을 뜻합니다.
 */
export const FINALE_SCENES = {
  "capital-gate": {
    chapter: "제5장 · 왕도의 빈 의자",
    title: "일곱 성문과 하나의 침묵",
    place: "엘드라 왕도 · 동문",
    choices: [
      {
        id: "enter-safehouse",
        label: "리안과 함께 등불 조합의 은신처로 간다",
        detail: "왕도 거점 · Lv.8 성장 개방",
        next: "lantern-house",
      },
    ],
  },
  // 조사와 훈련은 선택입니다. 증거가 적어도 마지막 선택까지 갈 수 있습니다.
  "lantern-house": {
    chapter: "제5장 · 왕도의 빈 의자",
    title: "꺼뜨릴 수 없는 등불",
    place: "왕도 · 등불 조합 지하방",
    choices: [
      {
        id: "seek-royal-record",
        label: "왕실 서고에서 반출 원본을 찾는다",
        detail: "선택 조사 · 백야와 명령의 기원",
        unlessClue: "왕실 반출 원본",
        next: "royal-archive",
      },
      {
        id: "seek-citizens",
        label: "광장에서 기억을 잃은 시민들을 만난다",
        detail: "선택 조사 · 피해자들의 증언",
        unlessClue: "수도 시민 공동 증언",
        next: "witness-square",
      },
      {
        id: "train-envoy",
        label: "골목의 밀랍 운반체를 멈춘다",
        detail: "반복 전투 · 권장 Lv.4",
        encounter: "wax-envoy",
        next: "lantern-house",
        retreat: "lantern-house",
      },
      {
        id: "train-bailiff",
        label: "법원 지하의 침묵 집행관과 싸운다",
        detail: "반복 전투 · 권장 Lv.5",
        encounter: "silent-bailiff",
        next: "lantern-house",
        retreat: "lantern-house",
      },
      {
        id: "train-marshal",
        label: "외곽 순찰 수호체를 제압한다",
        detail: "반복 전투 · 권장 Lv.6",
        encounter: "vault-marshal",
        next: "lantern-house",
        retreat: "lantern-house",
      },
      {
        id: "rest-capital",
        label: "등불 아래에서 기력을 회복한다",
        detail: "기력 전부 회복 · 경험치 없음",
        rest: true,
        next: "lantern-house",
      },
      {
        id: "breach-vault",
        label: "제9보관소의 외곽 방어선을 돌파한다",
        detail: "본편 전투 · 권장 Lv.6",
        unlessVisited: "ninth-vault",
        encounter: "vault-marshal",
        next: "ninth-vault",
        retreat: "lantern-house",
      },
      {
        id: "return-vault",
        label: "열어 둔 입구로 보관소에 돌아간다",
        detail: "재전투 없이 진입",
        requiresVisited: "ninth-vault",
        unlessVisited: "empty-throne",
        next: "ninth-vault",
      },
      {
        id: "return-core",
        label: "리안의 통로로 중앙 장치에 돌아간다",
        detail: "외곽 경비를 다시 상대하지 않음",
        requiresVisited: "empty-throne",
        unlessVisited: "breathing-vault",
        next: "core-breach",
      },
      {
        id: "return-heart",
        label: "안정시킨 중앙 통로로 심장 앞에 돌아간다",
        detail: "첫 단계 보스를 다시 상대하지 않음",
        requiresVisited: "breathing-vault",
        next: "breathing-vault",
      },
    ],
  },
  "royal-archive": {
    chapter: "제5장 · 왕도의 빈 의자",
    title: "왕들이 고친 역사",
    place: "왕실 서고 · 봉인 문서실",
    choices: [
      {
        id: "read-undertext",
        label: "지워진 잉크 아래의 삭제 명령을 읽는다",
        detail: "통찰 판정 · 난이도 17",
        check: { stat: "wit", dc: 17 },
        clue: "백야 삭제 명령",
        damage: 2,
        success:
          "재력 원년 이전의 삭제 명령을 판독했다. 기억을 한 손에 모으는 일이 봉인을 강하게 한다는 칼드의 주장은, 백야의 실수를 되풀이하는 것이었다.",
        failure:
          "봉인 잉크에 손이 베이고 삭제 문장은 복구하지 못했다. 하지만 남은 반출 번호와 왕실 승인 인장은 대조할 수 있다. 리안이 별도 장부를 찾아온다.",
        next: "royal-proof",
      },
    ],
  },
  "royal-proof": {
    chapter: "제5장 · 왕도의 빈 의자",
    title: "명령의 원본",
    place: "왕실 서고 · 대조 탁자",
    choices: [
      {
        id: "secure-royal-proof",
        label: "왕실 반출 원본을 증인들에게 맡긴다",
        detail: "최종 책임 규명에 반영",
        discover: "왕실 반출 원본",
        next: "lantern-house",
      },
    ],
  },
  "witness-square": {
    chapter: "제5장 · 왕도의 빈 의자",
    title: "비어 있는 의자들의 광장",
    place: "왕도 · 이름의 광장",
    choices: [
      {
        id: "hear-citizens",
        label: "사라진 이름 대신 함께한 하루를 들려달라고 한다",
        detail: "의지 판정 · 난이도 16",
        check: { stat: "spirit", dc: 16 },
        clue: "증인들의 공동 선언",
        damage: 1,
        success:
          "시민들이 서로의 말을 이어 공동 선언을 완성한다. 강제 반출에 동의한 적이 없다는 서명이 광장 전체로 퍼진다.",
        failure:
          "두려움 때문에 모두가 공개 서명을 하지는 못한다. 당신은 설득을 강요하지 않고 리안에게 비공개 증언 절차를 부탁한다. 봉인 공고를 떼다가 손끝을 다친다.",
        next: "witness-proof",
      },
    ],
  },
  "witness-proof": {
    chapter: "제5장 · 왕도의 빈 의자",
    title: "누군가의 말이 증거가 될 때",
    place: "왕도 · 장례사 회관",
    choices: [
      {
        id: "secure-citizen-proof",
        label: "시민들의 동의 아래 증언 사본을 확보한다",
        detail: "최종 책임 규명에 반영",
        discover: "수도 시민 공동 증언",
        next: "lantern-house",
      },
    ],
  },
  "ninth-vault": {
    chapter: "제6장 · 제9보관소",
    title: "살아 있는 기억의 창고",
    place: "제9보관소 · 반출 장부실",
    choices: [
      {
        id: "take-experiment-ledger",
        label: "실험 장부와 원래 이름의 색인을 보존한다",
        detail: "필수 증거 · 망자의 이름도 장례로 돌려보냄",
        discover: "제9보관소 실험 장부",
        add: "원래 이름 색인",
        next: "empty-throne",
      },
    ],
  },
  "empty-throne": {
    chapter: "제6장 · 제9보관소",
    title: "빈 왕좌를 지킨 사람",
    place: "제9보관소 · 중앙 관제실",
    quote:
      "“기억할 사람이 사라지면, 왕국도 사라진다. 그래서 내가 대신하려 했다.”",
    choices: [
      {
        id: "demand-confession",
        label: "칼드에게 자신의 이름으로 명령을 인정하라고 한다",
        detail: "의지 판정 · 난이도 18 · 실패해도 진행",
        check: { stat: "spirit", dc: 18 },
        clue: "칼드의 자백",
        damage: 0,
        success:
          "“명령은 내가 내렸다.” 칼드는 처음으로 왕의 이름 뒤에 숨지 않는다. 리안이 그 말을 기록한다. 중앙 장치는 이미 명령 없이도 기억을 빨아들이고 있다.",
        failure:
          "칼드는 왕국을 위한 일이었다는 말만 되풀이한다. 당신은 그를 해치지 않고 장부를 증인에게 넘긴다. 자백이 없어도 명령의 기록은 남았다.",
        next: "core-breach",
      },
      {
        id: "preserve-trial",
        label: "재판은 증인들에게 맡기고 장치를 멈추러 간다",
        detail: "자백을 강요하지 않음",
        next: "core-breach",
      },
    ],
  },
  "core-breach": {
    chapter: "제7장 · 마지막 종",
    title: "왕관의 기계",
    place: "제9보관소 · 중앙 봉인륜",
    choices: [
      {
        id: "shatter-crown",
        label: "왕관의 기계와 맞선다",
        detail: "최종 전투 1단계 · 권장 Lv.7",
        unlessVisited: "breathing-vault",
        encounter: "crown-engine",
        next: "breathing-vault",
        retreat: "lantern-house",
      },
      {
        id: "rest-before-crown",
        label: "확보한 통로에서 기력을 회복한다",
        detail: "기력 전부 회복",
        rest: true,
        next: "core-breach",
      },
      {
        id: "train-before-crown",
        label: "은신처에서 더 준비한다",
        detail: "조사와 추가 전투 가능",
        next: "lantern-house",
      },
    ],
  },
  // 첫 단계는 한 번만 보상합니다. 후퇴해 돌아와도 여기서 두 번째 단계에 바로 도전합니다.
  "breathing-vault": {
    chapter: "제7장 · 마지막 종",
    title: "이름 없는 심장의 숨",
    place: "제9보관소 · 봉인의 심장",
    choices: [
      {
        id: "face-unwritten",
        label: "이름 없는 심장의 사슬을 끊는다",
        detail: "최종 전투 2단계 · 권장 Lv.8",
        encounter: "unwritten-heart",
        next: "last-oath",
        retreat: "breathing-vault",
      },
      {
        id: "rest-before-heart",
        label: "동료들의 목소리를 들으며 쉰다",
        detail: "기력 전부 회복",
        rest: true,
        next: "breathing-vault",
      },
      {
        id: "train-before-heart",
        label: "은신처로 돌아가 마지막 준비를 한다",
        detail: "첫 단계 재전투 없이 복귀 가능",
        next: "lantern-house",
      },
    ],
  },
  "last-oath": {
    chapter: "종장 · 잿빛 서약",
    title: "이제 누가 기억할 것인가",
    place: "왕도 · 마지막 종이 멎은 뒤",
    choices: [
      {
        id: "choose-covenant",
        label: "마을들이 함께 관리하는 기록의 서약을 맺는다",
        detail: "분산 명부와 서로의 증언 · 공동 기록 결말",
        next: "ending-covenant",
      },
      {
        id: "choose-unbound",
        label: "중앙의 독점권을 없애고 기억의 길을 연다",
        detail: "지역의 종과 노래를 자율로 · 열린 길 결말",
        next: "ending-unbound",
      },
      {
        id: "choose-vigil",
        label: "동의를 원칙으로 삼는 보관소의 첫 감시자가 된다",
        detail: "임기와 공개 감사 · 등불지기 결말",
        next: "ending-vigil",
      },
    ],
  },
  "ending-covenant": {
    chapter: "완결 · 공동 기록의 서약",
    title: "여럿이 기억하는 왕국",
    place: "서리여울 · 일 년 뒤",
    ending: true,
    final: true,
  },
  "ending-unbound": {
    chapter: "완결 · 열린 길의 서약",
    title: "종보다 멀리 가는 노래",
    place: "서리여울 · 일 년 뒤",
    ending: true,
    final: true,
  },
  "ending-vigil": {
    chapter: "완결 · 등불지기의 서약",
    title: "빈 의자를 남기는 보관소",
    place: "서리여울 · 일 년 뒤",
    ending: true,
    final: true,
  },
};
