/**
 * @file 중반부 장면과 첫 결말별 연결 문장. 장면의 공통 필드는 data/scenes.mjs와 같습니다.
 * encounter는 몬스터 ID, next는 승리 후 장면, retreat는 패배·후퇴 시 장면입니다.
 * rest는 전체 회복, discover는 판정 없이 얻는 단서, requiresVisited는 통로 개방 조건입니다.
 * 전투 수치와 보상은 장면에 복사하지 않고 monsters.mjs와 ExperiencePolicy에서 가져옵니다.
 */

// 각 첫 결말에 대응하는 중반 도입 문장입니다. Adventure.scene이 선택한 한 문장을 본문 앞에 붙입니다.
export const JOURNEY_ROUTES = {
  "ending-seal":
    "서리여울의 종을 바로잡고 사람들을 구했다. 이제 잘못된 수리 지침을 보낸 곳을 찾는다. 첫 목적지는 부품을 만든 별무덤 주조소다.",
  "ending-dawn":
    "종 대신 노래를 택한 마을은 세른과 증인들에게 맡겼다. 검은 봉투가 가리킨 별무덤 주조소에서, 당신처럼 종을 부순 사람들의 흔적을 찾으려 한다.",
  "ending-price":
    "서리여울은 일 년을 얻었다. 잃은 기억을 되찾으려면 제9보관소로 가야 한다. 세른은 왕도로 보낸 기억 용기의 출발지가 별무덤 주조소라는 소식을 가져왔다.",
};

export const MIDGAME_SCENES = {
  // 중반 도입: 첫 결말의 동기를 유지하며 공통 추적로로 모읍니다.
  "road-oath": {
    chapter: "제3장 · 염로의 잔향",
    title: "기억을 싣고 떠나는 길",
    place: "동부 염로 · 셋째 날",
    choices: [
      {
        id: "reach-camp",
        label: "염로 역참에 야영지를 세운다",
        detail: "중반부 시작 · 기력과 레벨 확인",
        next: "waystation",
      },
    ],
  },
  // 역참: 권장 Lv.1 첫 전투와 회복을 제공합니다. 패배해도 같은 장소로 돌아옵니다.
  waystation: {
    chapter: "제3장 · 염로의 잔향",
    title: "검은 갈대가 길을 막을 때",
    place: "염로 · 버려진 역참",
    choices: [
      {
        id: "first-wolf",
        label: "갈대 그림자늑대를 몰아낸다",
        detail: "권장 Lv.1 · 첫 전투",
        encounter: "reed-wolf",
        next: "road-trace",
        retreat: "waystation",
      },
      {
        id: "rest-road",
        label: "야영지에서 장비를 정비하고 쉰다",
        detail: "기력 전부 회복 · 경험치 없음",
        rest: true,
        next: "waystation",
      },
    ],
  },
  // 첫 승리 뒤: 운송표 단서를 얻고 반복 전투가 가능한 주조소 야영지로 이동합니다.
  "road-trace": {
    chapter: "제3장 · 염로의 잔향",
    title: "수레 아래의 운송표",
    place: "염로 · 갈라진 봉인석",
    choices: [
      {
        id: "track-foundry",
        label: "운송표를 챙겨 주조소 야영지로 향한다",
        detail: "추적 단서 확보 · 전투 후에는 휴식을 권장",
        discover: "기억 반출 운송표",
        next: "forge-camp",
      },
    ],
  },
  // 성장 거점: 적의 수치는 고정이며 휴식과 여러 난도의 전투를 반복할 수 있습니다.
  "forge-camp": {
    chapter: "제4장 · 별무덤 주조소",
    title: "폐주조소의 불 꺼진 화로",
    place: "별무덤 산기슭 · 공동 야영지",
    choices: [
      {
        id: "hunt-wolf",
        label: "갈대 그림자늑대로 기본기를 다진다",
        detail: "반복 전투 · 권장 Lv.1",
        encounter: "reed-wolf",
        next: "forge-camp",
        retreat: "forge-camp",
      },
      {
        id: "hunt-hound",
        label: "운송로의 공허 사냥개를 추적한다",
        detail: "반복 전투 · 권장 Lv.2",
        encounter: "hollow-hound",
        next: "forge-camp",
        retreat: "forge-camp",
      },
      {
        id: "break-sentinel",
        label: "입구의 밀랍 파수병에 도전한다",
        detail: "이야기 진행 · 권장 Lv.3",
        encounter: "wax-sentinel",
        next: "foundry-truth",
        retreat: "forge-camp",
      },
      {
        id: "hunt-knight",
        label: "순찰로의 메아리 기사와 맞선다",
        detail: "선택 전투 · 권장 Lv.4 · 위험",
        encounter: "echo-knight",
        next: "forge-camp",
        retreat: "forge-camp",
      },
      {
        id: "rest-forge",
        label: "사람들과 기억을 나누며 쉰다",
        detail: "기력 전부 회복 · 경험치 없음",
        rest: true,
        next: "forge-camp",
      },
      {
        id: "shortcut-vault",
        label: "열어 둔 통로로 은심 보관실에 돌아간다",
        detail: "증거를 확보한 뒤에는 재전투 없이 이동",
        requiresVisited: "vault-door",
        next: "vault-door",
      },
    ],
  },
  // 입구 돌파 뒤: 제9보관소의 개입 증거를 확보합니다. add와 discover는 서로 다른 목록을 갱신합니다.
  "foundry-truth": {
    chapter: "제4장 · 별무덤 주조소",
    title: "만들어진 망각",
    place: "폐주조소 · 주조 기록실",
    choices: [
      {
        id: "copy-orders",
        label: "출고 명령과 노동자들의 증언을 베낀다",
        detail: "제9보관소의 개입 증거 확보",
        discover: "주조소 공동 증언",
        add: "제9보관소 출고 명령",
        next: "vault-door",
      },
    ],
  },
  // 보스 앞: 준비가 부족하면 돌아가며, 열린 통로는 재도전 시 다시 싸우지 않고 지나갈 수 있습니다.
  "vault-door": {
    chapter: "제4장 · 별무덤 주조소",
    title: "기억을 지키는 마지막 문",
    place: "폐주조소 · 은심 보관실",
    choices: [
      {
        id: "face-keeper",
        label: "은심을 겨누고 문지기와 싸운다",
        detail: "중반부 보스 · 권장 Lv.4",
        encounter: "archive-keeper",
        next: "act2-ending",
        retreat: "forge-camp",
      },
      {
        id: "prepare-again",
        label: "증거를 지니고 야영지로 돌아간다",
        detail: "추가 전투와 회복 후 재도전 가능",
        next: "forge-camp",
      },
    ],
  },
  // 중반부 종료. continueJourney로 왕도에 진입하면 Lv.8까지 성장할 수 있습니다.
  "act2-ending": {
    chapter: "제2막 완료 · 기억의 운송장",
    title: "왕도로 향하는 증언",
    place: "별무덤 · 되살아난 화로",
    ending: true,
  },
};
