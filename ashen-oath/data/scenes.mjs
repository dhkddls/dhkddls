/**
 * @file 초반부 장면·선택지 규칙. 본문과 목표는 story-revision.mjs에서 합칩니다. 객체 키가 장면 ID이며 choice.next가 이동할 장면 ID를 가리킵니다.
 * chapter/title/place/quote/paragraphs는 표시 내용, ending은 해당 막의 종료 표시입니다.
 * 선택지: id는 행동 ID, label/detail은 화면 문구, check는 stat과 dc(난이도)입니다.
 * clue는 판정 성공 시 단서, success/failure는 결과 문장, damage는 실패 피해, add는 소지품입니다.
 * unvisited는 아직 방문하지 않은 조사 장소만 허용합니다. v1 저장은 label로 복구하므로 기존 문구를 보존합니다.
 */

import { STORY_REVISION } from "./story-revision.mjs";
import { MIDGAME_SCENES } from "./midgame-scenes.mjs";
import { FINALE_SCENES } from "./finale-scenes.mjs";

// 장면과 선택지 데이터. label은 기존 저장 기록을 복구하는 데에도 사용됩니다.
const BASE_SCENES = {
  // 나루 도입: 세계의 이상 현상을 소개하고 첫 의지 판정을 선택할 수 있습니다.
  arrival: {
    chapter: "서막 · 추수 끝의 달",
    title: "종이 울리지 않는 마을",
    place: "서리여울 · 동쪽 나루",
    choices: [
      {
        id: "lantern",
        label: "등불을 받아 들고 마을로 향한다",
        detail: "소녀의 안내를 따라 「마지막 불씨」 여관으로",
        next: "inn",
        add: "나루터의 등불",
      },
      {
        id: "listen",
        label: "소녀에게 나무패에 관해 묻는다",
        detail: "의지 판정 · 난이도 11 · 성공 시 첫 단서",
        next: "inn",
        check: {
          stat: "spirit",
          dc: 11,
        },
        clue: "소녀의 이름",
        success:
          "“네라.” 당신이 기다리자 소녀가 스스로 답한다. 이름을 말한 목소리에는 아무 일도 일어나지 않는다. 위험한 것은 이름 자체가 아닐지도 모른다.",
        failure:
          "소녀는 고개를 젓는다. “엄마도 처음엔 그저 물어봤어요.” 더 묻지 않고 함께 길을 걷는다. 등불의 불빛이 조금 낮아진다.",
        damage: 1,
      },
    ],
  },
  // 여관: 세 조사 장소로 분기합니다. 방문 제한은 데이터가 아니라 Adventure가 검사합니다.
  inn: {
    chapter: "제1장 · 마지막 불씨",
    title: "빈 의자에 앉은 손님",
    place: "서리여울 · 마지막 불씨 여관",
    choices: [
      {
        id: "chapel",
        label: "예배당에서 사제 오르벤을 만난다",
        detail: "의식과 봉인종을 조사한다",
        next: "chapel",
      },
      {
        id: "archive",
        label: "닫힌 서고에서 옛 명부를 찾는다",
        detail: "사라진 이름의 흔적을 조사한다",
        next: "archive",
      },
      {
        id: "river",
        label: "강가에 남은 발자국을 따라간다",
        detail: "교단 밖의 목격자를 찾는다",
        next: "river",
      },
    ],
  },
  // 예배당: 사제의 증언 또는 장례문으로 사건의 원인을 조사합니다.
  chapel: {
    chapter: "제1장 · 금이 간 신앙",
    title: "은종 아래의 고백",
    place: "서리여울 · 세 성인 예배당",
    choices: [
      {
        id: "confession",
        label: "교리에 기대어 빠진 진실을 짚는다",
        detail: "의지 판정 · 난이도 13",
        next: "crossroads",
        check: {
          stat: "spirit",
          dc: 13,
        },
        clue: "사제의 증언",
        success:
          "“아래에서 대답했소. 죽은 내 동생의 목소리였지.” 오르벤은 지하 열쇠를 내민다. 종 아래의 것은 기억을 흉내 낸다.",
        failure:
          "사제는 입을 닫고 열쇠만 내민다. “종 아래로 가거든, 대답하지 마시오.” 은가루를 밟은 발이 타들어 간다.",
        damage: 2,
        add: "지하 예배실 열쇠",
      },
      {
        id: "rubbing",
        label: "종 안쪽의 글자를 조심스레 베낀다",
        detail: "통찰 판정 · 난이도 12",
        next: "crossroads",
        check: {
          stat: "wit",
          dc: 12,
        },
        clue: "뒤집힌 장례문",
        success:
          "문장이 거꾸로 새겨졌다. 「기억하여 쉬게 하라」가 아니라 「잊어서 먹이라」. 누군가 의도적으로 봉인문을 바꿨다.",
        failure:
          "글자는 읽어내기 전에 재가 되어 떨어진다. 그래도 명문이 안쪽을 향한다는 사실은 남는다. 은가루에 손끝이 벤다.",
        damage: 1,
      },
    ],
  },
  // 서고: 기록 조사와 구조 행동 중 출신의 강점에 맞게 선택합니다.
  archive: {
    chapter: "제1장 · 지워진 기록",
    title: "죽은 자의 장부, 산 자의 이름",
    place: "서리여울 · 갈대종이 서고",
    choices: [
      {
        id: "blueprint",
        label: "도면과 최근 명부를 대조한다",
        detail: "통찰 판정 · 난이도 12",
        next: "crossroads",
        check: {
          stat: "wit",
          dc: 12,
        },
        clue: "원래의 봉인문",
        success:
          "도면의 주석을 찾았다. 「종은 그릇, 공동의 증언은 마개」. 잊힌 사람을 함께 기억하면 새 은종 없이도 봉인을 되살릴 수 있다.",
        failure:
          "최근 명부가 손 안에서 바스러진다. 주석 한 줄은 건진다. 「한 사람의 기억만으로는 부족하다」. 재 속에서 찬 기운이 손목을 문다.",
        damage: 1,
      },
      {
        id: "shelves",
        label: "넘어지는 책장을 붙들고 숨은 이를 구한다",
        detail: "무력 판정 · 난이도 12",
        next: "crossroads",
        check: {
          stat: "might",
          dc: 12,
        },
        clue: "종지기의 생존",
        success:
          "책장 뒤의 여인이 숨을 몰아쉰다. “내 이름은 에다. 아직은.” 종지기가 살아 있다. 그녀는 지하로 내려가는 오래된 수로를 알려준다.",
        failure:
          "책장에 어깨를 다치지만 여인을 끌어낸다. “에다, 내 이름은 에다예요.” 그녀는 여관으로 몸을 피한다. 손에 쥔 수로 지도를 당신에게 남긴다.",
        damage: 2,
        add: "낡은 수로 지도",
      },
    ],
  },
  // 강가: 교단 밖의 증인과 왕도 인장 단서를 제공합니다.
  river: {
    chapter: "제1장 · 안개 속의 노래",
    title: "강은 이름을 돌려준다",
    place: "서리여울 · 검은갈대강",
    choices: [
      {
        id: "song",
        label: "목소리를 외면하고 세른의 노래를 배운다",
        detail: "의지 판정 · 난이도 12",
        next: "crossroads",
        check: {
          stat: "spirit",
          dc: 12,
        },
        clue: "강 건너의 증인",
        success:
          "세 이름과 세 삶을 노래에 담았다. 세른은 새벽 전에 증인들을 데리고 오겠다고 약속한다. 기억은 교단만의 것이 아니다.",
        failure:
          "그리운 목소리에 잠시 발을 헛디딘다. 세른이 당신을 끌어당긴다. 노래는 완전히 외우지 못했지만, 그는 증인들을 데려오기로 한다.",
        damage: 2,
      },
      {
        id: "rope",
        label: "강물에 들어가 종줄의 끝을 건져낸다",
        detail: "무력 판정 · 난이도 13",
        next: "crossroads",
        check: {
          stat: "might",
          dc: 13,
        },
        clue: "검은 밀랍 인장",
        success:
          "종줄 끝에 왕도 감찰원의 밀랍 인장이 매달려 있다. 종의 파손은 우연이 아니다. 인장 가장자리에 「제9보관소」가 새겨져 있다.",
        failure:
          "차가운 강물에서 인장 조각만 건진다. 글씨는 불완전하지만 왕도에서 온 물건이다. 세른이 당신을 둑으로 끌어올린다.",
        damage: 2,
        add: "왕도 인장 조각",
      },
    ],
  },
  // 광장: 두 번째 조사 또는 지하 진입. 이미 방문한 장소는 목록에서 빠집니다.
  crossroads: {
    chapter: "제1장 · 새벽까지 두 시간",
    title: "흩어진 증언을 모아",
    place: "서리여울 · 종루 앞 광장",
    choices: [
      {
        id: "more-chapel",
        label: "예배당의 사제를 찾아간다",
        detail: "아직 방문하지 않은 곳을 조사",
        next: "chapel",
        unvisited: "chapel",
      },
      {
        id: "more-archive",
        label: "서고의 기록을 확인한다",
        detail: "아직 방문하지 않은 곳을 조사",
        next: "archive",
        unvisited: "archive",
      },
      {
        id: "more-river",
        label: "강가의 목격자를 찾는다",
        detail: "아직 방문하지 않은 곳을 조사",
        next: "river",
        unvisited: "river",
      },
      {
        id: "descend",
        label: "네라와 함께 종 아래로 내려간다",
        detail: "지하 예배실로 · 되돌아갈 수 없음",
        next: "crypt",
      },
    ],
  },
  // 지하 위기: 판정 실패로 피해를 입어도 마지막 가치 선택에는 도달할 수 있습니다.
  crypt: {
    chapter: "제2장 · 이름을 먹는 것",
    title: "종의 안쪽에서",
    place: "서리여울 · 지하 예배실",
    choices: [
      {
        id: "shield",
        label: "몸으로 네라를 감싸고 손을 밀쳐낸다",
        detail: "무력 판정 · 난이도 13",
        next: "heart",
        check: {
          stat: "might",
          dc: 13,
        },
        clue: "구출한 네라",
        success:
          "손이 부서진다. 네라가 당신의 등을 붙잡고 또렷이 외친다. “우리 엄마는 미르예요. 나는 기억해요!” 그림자 하나가 빛을 되찾는다.",
        failure:
          "네라는 무사하지만 검은 유리가 당신의 팔을 깊이 벤다. 그녀는 당신을 부축하며 어머니의 이름을 되뇐다.",
        damage: 3,
      },
      {
        id: "true-name",
        label: "네라에게 어머니와의 기억을 말하게 한다",
        detail: "의지 판정 · 난이도 13",
        next: "heart",
        check: {
          stat: "spirit",
          dc: 13,
        },
        clue: "되찾은 기억",
        success:
          "“빵 끝은 늘 엄마가 먹었어요.” 거창한 참이름보다 작은 기억이 강했다. 검은 손이 촛농처럼 녹아내린다.",
        failure:
          "겁에 질린 네라의 말이 끊긴다. 당신은 그녀를 붙들고 손이 지나가기를 견딘다. 빼앗긴 기억 하나가 머릿속을 차갑게 비운다.",
        damage: 2,
      },
    ],
  },
  // 첫 서약: 주사위 없이 세 결말을 선택합니다. 어떤 단서를 얻었든 고를 수 있습니다.
  heart: {
    chapter: "제2장 · 첫 번째 서약",
    title: "무엇을 남길 것인가",
    place: "서리여울 · 봉인의 심장",
    choices: [
      {
        id: "restore",
        label: "마을 사람들과 이름을 불러 봉인을 다시 맺는다",
        detail: "공동의 기억으로 종을 울린다",
        next: "ending-seal",
      },
      {
        id: "break",
        label: "은종과 검은 유리를 함께 부순다",
        detail: "갇힌 이들을 풀고 새로운 길을 택한다",
        next: "ending-dawn",
      },
      {
        id: "bargain",
        label: "자신의 소중한 기억을 내어주고 시간을 번다",
        detail: "마을을 구하고 대가를 직접 짊어진다",
        next: "ending-price",
      },
    ],
  },
  // 봉인 복구 결말. ending은 첫 막의 종료이며 canContinue를 통해 중반부가 이어집니다.
  "ending-seal": {
    chapter: "제1막 완료 · 기억하는 사람들",
    title: "다시 울리는 종",
    place: "서리여울 · 첫 새벽",
    ending: true,
  },
  // 종 파괴 결말. 후속 경로의 동기는 JOURNEY_ROUTES에서 다르게 설명합니다.
  "ending-dawn": {
    chapter: "제1막 완료 · 종 없는 새벽",
    title: "침묵 너머의 노래",
    place: "서리여울 · 첫 새벽",
    ending: true,
  },
  // 기억을 대가로 낸 결말. 일 년의 유예와 잃은 기억의 추적을 남깁니다.
  "ending-price": {
    chapter: "제1막 완료 · 남겨진 대가",
    title: "이름 없는 온기",
    place: "서리여울 · 첫 새벽",
    ending: true,
  },
  // 중반 장면을 같은 장면 사전에 합쳐 next ID로 두 막을 조회할 수 있게 합니다.
  ...MIDGAME_SCENES,
  ...FINALE_SCENES,
};

// 본문만 개정하고 선택지·판정·이전 결과 문장은 그대로 보존합니다.
export const SCENES = Object.fromEntries(
  Object.entries(BASE_SCENES).map(([id, scene]) => [
    id,
    { ...scene, ...STORY_REVISION[id] },
  ]),
);
