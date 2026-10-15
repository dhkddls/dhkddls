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
    quote: "“이 도시는 누구를 기억할지, 누가 결정하나요?”",
    paragraphs: [
      "왕도까지의 닷새 길 끝에 종 일곱 개가 같은 시각에 울린다. 소리는 웅장하지만 성문 옆 실종 공고에는 얼굴 대신 빈 사각형이 늘어섰다. 변경에서 보았던 번짐이다.",
      "등불 조합의 소개장을 든 서기관 리안이 당신을 맞는다. 세른은 북쪽에 남았지만 그의 소식과 주조소 사람들의 증언이 먼저 도착했다. 리안은 제9보관소에서 일하다 기록 반출을 거부하고 나온 사람이다.",
      "“감찰관 칼드 렌은 두 번째 백야를 막는다고 했어요. 그런데 남긴 것은 보호 명령이 아니라, 기억을 가진 사람들의 징발 명령이었죠.” 당신은 증거를 배낭 안쪽에 넣는다. 여기서는 괴물뿐 아니라 기록을 고치는 권력과도 맞서야 한다.",
    ],
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
    paragraphs: [
      "왕관의 서기관, 교단의 장례사, 조합의 수레꾼이 같은 탁자에 앉아 있다. 세 세력의 이름이 모두 찍힌 반출 명령을 보고 누구도 자기 편만 무죄라고 말하지 못한다.",
      "왕실 서고의 원본과 광장의 시민 증언을 확보하면 명령의 책임을 더 분명히 물을 수 있다. 조사에 실패해도 리안이 남은 기록을 복구할 길을 열어준다. 충분히 준비했다면 보관소 경비 장치를 먼저 멈춰도 된다.",
      "골목의 밀랍 운반체와 봉인 수호체는 여전히 살아 있는 기억을 실어 나른다. 이들을 제압하며 성장하고, 이 방으로 돌아와 쉬자. 보관소 외곽은 Lv.6, 중앙 장치는 Lv.7, 마지막 심장은 Lv.8이 권장된다.",
    ],
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
    paragraphs: [
      "리안이 보여준 오래된 문서에는 왕의 이름이 두 겹으로 겹쳐 있다. 백야 직전의 왕조는 패한 가문의 명부를 한곳에 모아 지웠다. 공동의 기억을 지킨다던 제도가 기억을 독점한 밤이었다.",
      "문서의 남은 이름과 장례문은 죽은 사람을 되살리는 비법이 아니다. 원래 이름을 다시 읽고 장례를 잇는다면 안식을 되찾을 수 있다는 오래된 경고다. 칼드가 가져간 부분은 그 경고 다음 장이다.",
    ],
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
    paragraphs: [
      "지방의 명부, 주조소 운송장, 왕실 원본의 번호가 맞아떨어진다. 칼드의 서명 위에는 비상 행정회의의 인장이 있다. 한 사제의 일탈로 덮을 수 없는 반출이었다.",
      "리안은 증거를 세 벌 베껴 왕관·교단·조합 밖의 증인에게도 맡긴다. 원본이 사라져도 이번에는 모두가 같은 밤에 잊지는 않을 것이다.",
    ],
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
    quote: "“내가 잊은 사람을, 당신은 기억하나요?”",
    paragraphs: [
      "빵집 주인, 하역꾼, 장례사가 의자를 하나씩 들고 나왔다. 기억을 징발당한 뒤 누구의 자리였는지 잊은 의자들이다. 증언을 들으러 온 관리들은 공고문만 적고 돌아서려 한다.",
      "당신은 이들에게 이름 하나를 억지로 떠올리게 할 수 없다. 대신 함께 살았던 하루를 말하게 할 수는 있다. 수프의 냄새, 못 고치던 창문, 먼저 건네던 인사. 작은 기억들이 서로의 빈자리를 맞춘다.",
    ],
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
    paragraphs: [
      "장례사 회관은 공개·비공개 증언을 당사자가 고른 방식으로 받는다. 참여한 시민들의 원래 기억을 읽어내거나 빼앗지 않고, 그들이 직접 한 말을 기록한다.",
      "왕실의 인장만이 증거인 것은 아니다. 반출된 이름과 주소가 같은 사람이 지금 여기 살아 있고, 그가 동의하지 않았다고 말하고 있다.",
    ],
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
    paragraphs: [
      "외곽 수호체가 멈춘 뒤 리안은 안쪽 문을 잠그는 대신 열어 둔다. 노동자들이 통로를 확보하고 기억 용기를 운반한다. 당신이 쓰러져도 구조대가 같은 길로 들어올 수 있다.",
      "실험 장부에는 국왕의 병세가 호전되지 않았다는 보고와 중앙 봉인의 출력 수치가 나란히 적혀 있다. 기억을 바꿔 병과 죽음을 없앨 수 없다는 사실을 칼드는 이미 알고 있었다.",
      "서리여울의 검은 밀랍은 전국의 수집망 중 한 갈래였다. 첫 봉헌에서 빼앗긴 기억도 이곳으로 옮겨졌다. 중앙 장치를 멈추고 당사자와 용기를 대조해야 되돌릴 수 있다.",
    ],
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
    paragraphs: [
      "감찰관 칼드 렌은 왕좌가 아닌 빈 기록 의자에 앉아 있다. 왕의 병을 고치겠다는 공약으로 모은 권한이 그의 손에 쌓였다. 병은 낫지 않았고, 그는 이제 기억을 빼앗아서라도 나라를 보존하겠다고 주장한다.",
      "“흩어진 증언은 사라진다. 이곳에 모두 모으면 다시는 백야가 오지 않아.” 그러나 벽의 명부는 이미 하얗게 번지고 있다. 한곳에 강제로 모은 기억이 서로를 지우는 것이, 지금 일어나는 일이다.",
      "당신이 싸워야 할 것은 이 사람의 몸이 아니라 강제 수집을 계속하는 중앙 장치다. 리안이 칼드를 증인들의 보호·감시 아래 데려가려 한다. 마지막으로, 그의 책임을 인정하게 할 수 있다.",
    ],
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
    paragraphs: [
      "일곱 은심이 기억 용기를 하나의 이름으로 덮어쓰고 있다. 왕관의 기계는 자신을 지키는 명령까지 복제했다. 이 첫 방어층을 부숴야 강제 수집망을 끊을 수 있다.",
      "리안과 구조대가 뒤편 통로를 지킨다. 권장 레벨은 7. 후퇴해도 확보한 증거와 외곽 통로는 남는다. 준비가 부족하면 은신처에서 훈련하고 돌아올 수 있다.",
    ],
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
    paragraphs: [
      "은심이 멈췄지만 그 안에서 검은 유리가 마지막 형체를 만든다. 서리여울에서 남겨진 자가 흉내 냈던 목소리들이 여기서는 수백 겹으로 겹친다. 버려진 기억을 한 몸에 묶어두려는 장치의 마지막 명령이다.",
      "리안은 용기를 바깥으로 옮기고 장례사들은 원래 이름 색인을 읽기 시작한다. 당신이 심장의 은사슬을 끊는 동안 각자의 기억이 제 그릇을 되찾을 것이다. 죽은 이에게 삶을, 살아 있는 이에게 죽음을 강요하는 의식은 없다.",
      "권장 레벨은 8. 첫 방어층은 이미 부서져 다시 싸우지 않아도 된다. 이곳에서 회복하거나 은신처로 돌아가 준비할 수 있다.",
    ],
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
    quote: "“이번에는, 기억을 맡기는 사람이 스스로 고르게 하자.”",
    paragraphs: [
      "사슬이 끊기자 겹친 목소리들이 각자의 이름으로 갈라진다. 당사자가 살아 있는 기억은 용기에 남고, 망자의 이름은 장례사들의 낭독을 따라 안식으로 이어진다. 남겨진 자는 새 먹이를 기다리는 괴물로 남지 않고, 서로 다른 이야기로 풀린다.",
      "왕관의 기계와 강제 수집망은 끝났다. 칼드와 승인자들의 책임은 증거와 증인들이 물을 것이다. 하지만 종을 지킬 제도와 기억을 맡을 사람들은 당신의 칼로 정할 수 없다. 광장에 모인 이들이 마지막 제안을 기다린다.",
      "세 제안 모두 살아 있는 사람에게 기억을 내놓으라 강요하지 않는다. 같은 일을 다시 막기 위해, 당신은 어떤 서약을 남길까. 이 선택에는 주사위가 없다.",
    ],
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
    paragraphs: [
      "왕실 단독 명부는 닫히고, 마을·도시·안개벌이 보관하는 서로 다른 사본이 만들어진다. 공개하는 것은 반출 명령과 관리 규칙이며, 개인의 기억을 모두에게 펼쳐 보이는 것이 아니다. 당사자는 자신의 기록을 맡길 곳과 증언할 범위를 고른다.",
      "누군가 기록을 고치면 다른 사본과 증인이 차이를 밝힌다. 번거롭고 느리지만, 이제 한 사람이 모두의 이름을 지울 수 없다. 당신이 제안한 서약은 검이 아니라 서로의 확인으로 유지된다.",
    ],
  },
  "ending-unbound": {
    chapter: "완결 · 열린 길의 서약",
    title: "종보다 멀리 가는 노래",
    place: "서리여울 · 일 년 뒤",
    ending: true,
    final: true,
    paragraphs: [
      "해체하는 것은 강제 수집을 독점한 중앙망이다. 마을의 자발적인 봉인종까지 부수지는 않는다. 종 주조법과 안전한 장례문이 공개되고, 종을 세울지 노래를 이을지는 각 공동체가 정한다.",
      "지역마다 다른 방법을 인정하는 일은 다툼도 낳는다. 조합의 호송대와 교단의 장례사들은 지시하는 대신 협의하는 법을 배운다. 왕국의 경계보다 넓은 기억의 길 위에서, 당신은 처음으로 누구의 허락도 필요 없는 등불을 본다.",
    ],
  },
  "ending-vigil": {
    chapter: "완결 · 등불지기의 서약",
    title: "빈 의자를 남기는 보관소",
    place: "서리여울 · 일 년 뒤",
    ending: true,
    final: true,
    paragraphs: [
      "제9보관소는 동의한 기록만 맡는 공동 보관소로 바뀐다. 기억을 추출하는 장치는 폐기하고, 당사자가 직접 남긴 말과 이미 회수한 용기를 관리한다. 임기가 있는 감시자와 외부 감사자가 서로의 권한을 제한한다.",
      "당신은 첫 감시자를 맡지만 새 왕이나 영구한 연료가 되지는 않는다. 첫 임기를 마칠 때 의자를 비워 다음 사람에게 넘긴다. 자리를 비워도 무너지지 않는 제도가, 혼자 지켜내는 왕좌보다 오래 남는다는 것을 증명한다.",
    ],
  },
};
