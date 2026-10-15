/**
 * @file 이야기와 전투를 연결하는 진행 관리자. 선택, 방문 기록, 단서, 전투 정산을 소유합니다.
 * Character는 능력치, CombatSession은 한 전투, ExperiencePolicy는 성장 규칙을 담당합니다.
 * #으로 시작하는 필드는 외부에서 직접 수정할 수 없는 비공개 상태입니다.
 */

import { ORIGINS } from "../data/origins.mjs";
import { SCENES } from "../data/scenes.mjs";
import { MONSTERS, COMBAT_ACTIONS } from "../data/monsters.mjs";
import { JOURNEY_ROUTES } from "../data/midgame-scenes.mjs";
import { Character } from "./character.mjs";
import { SkillCheck } from "./skill-check.mjs";
import { CombatSession } from "./combat-session.mjs";
import { ExperiencePolicy } from "./experience-policy.mjs";
import { CampaignResolution } from "./campaign-resolution.mjs";
import { CHAPTER_TRANSITIONS, FINAL_EVIDENCE } from "../data/campaign.mjs";

// 초반부의 조사 장소만 횟수 제한에 포함합니다. 중반부 반복 전투와 구분합니다.
const INVESTIGATION_SCENES = ["chapel", "archive", "river"];
// 새벽 전 조사할 수 있는 장소 수. 이 값만 바꾸면 선택지 필터도 함께 바뀝니다.
const MAX_INVESTIGATIONS = 2;
// 현재 저장 형식. 이전 v1은 fromSnapshot에서 별도로 읽습니다.
const SAVE_VERSION = 2;

/** 이야기·전투를 연결하고 보상을 한 번만 지급합니다. 브라우저에는 의존하지 않습니다. */
export class Adventure {
  // 능력치·기력·경험치를 관리하는 플레이어 객체입니다.
  #character;
  // 실제 플레이용 주사위. 복구할 때는 기록된 주사위를 임시로 사용합니다.
  #skillCheck;
  // SCENES에서 현재 장면을 찾는 키입니다.
  #sceneId = "arrival";
  // 발견한 단서 이름을 중복 없이 쌓습니다.
  #clues = [];
  // 처음 방문한 순서의 장면 목록. 조사 제한·경로 문장·지름길에 사용합니다.
  #visited = ["arrival"];
  // 시간순 입력 이력. kind는 choice(선택), continue(막 이동), combat(전투 행동)입니다.
  #history = [];
  // 화면에서 보여줄 직전 이야기 판정입니다.
  #lastCheck = null;
  // 전투 중일 때만 CombatSession 객체이며, 종료 정산 후 null이 됩니다.
  #combat = null;
  // 현재 전투를 시작한 선택지. 승리 후 next와 패배·후퇴 시 retreat를 기억합니다.
  #encounterChoice = null;
  // 종료된 전투의 표시용 결과. 진행 중 전투와 분리해 중복 보상을 막습니다.
  #lastBattle = null;

  /** 출신 ID와 주사위 객체로 새 모험을 만듭니다. 주사위를 주입하면 테스트에서도 같은 규칙을 사용할 수 있습니다. */
  constructor(originId = "warden", skillCheck = new SkillCheck()) {
    this.#character = new Character(originId);
    this.#skillCheck = skillCheck;
  }

  /** 현재 플레이어 객체입니다. 기력과 성장 변경은 Character의 메서드가 맡습니다. */
  get character() {
    return this.#character;
  }
  /** 현재 위치를 식별하는 장면 ID입니다. 화면 제목과 달리 저장과 이동에 사용합니다. */
  get sceneId() {
    return this.#sceneId;
  }
  /** 도입에는 첫 결말의 동기를, 완결에는 실제 선택·증거·출신에 맞는 후일담을 붙입니다. */
  get scene() {
    const scene = SCENES[this.#sceneId];
    if (scene.final) {
      return {
        ...scene,
        paragraphs: [
          ...scene.paragraphs,
          ...CampaignResolution.epilogue({
            firstEnding: this.firstEnding,
            clues: this.clues,
            originId: this.#character.originId,
          }),
        ],
      };
    }
    if (this.#sceneId !== "road-oath") return scene;
    const firstEnding = this.#visited.find((sceneId) =>
      Object.hasOwn(JOURNEY_ROUTES, sceneId),
    );
    return {
      ...scene,
      paragraphs: [JOURNEY_ROUTES[firstEnding], ...scene.paragraphs],
    };
  }
  /** 현재 장면이 한 막의 종료인지 확인합니다. 첫 결말도 true이므로 전체 게임 종료와는 다릅니다. */
  get isComplete() {
    return Boolean(this.scene.ending);
  }
  /** 막 종료와 전체 완결을 구분합니다. 중반 종료에서도 왕도로 이어갈 수 있습니다. */
  get canContinue() {
    return Object.hasOwn(CHAPTER_TRANSITIONS, this.#sceneId);
  }
  /** UI가 추측하지 않고 실제 다음 막의 이름을 표시하도록 합니다. */
  get continuationLabel() {
    return CHAPTER_TRANSITIONS[this.#sceneId]?.button ?? "";
  }
  /** 완결 장면에는 더 진행하는 버튼이나 선택지가 없습니다. */
  get isFinished() {
    return Boolean(SCENES[this.#sceneId].final);
  }
  /** 현재 막 번호입니다. 방문 이력으로 계산하므로 지름길과 후퇴에도 유지됩니다. */
  get actNumber() {
    return this.hasVisited("capital-gate") ? 3 : this.isMidgame ? 2 : 1;
  }
  /** 처음 선택한 서약을 완결 후에도 보존합니다. */
  get firstEnding() {
    return this.#visited.find((sceneId) =>
      Object.hasOwn(JOURNEY_ROUTES, sceneId),
    );
  }
  /** 최종막 선택 조사의 진행량입니다. 수집을 마치지 않아도 모든 최종 서약을 선택할 수 있습니다. */
  get evidenceCount() {
    return CampaignResolution.evidenceCount(this.#clues);
  }
  /** 결말 화면과 내보내기에 사용하는 실제 플레이 요약입니다. */
  get endingSummary() {
    if (!this.isFinished) return null;
    return {
      firstOath: SCENES[this.firstEnding].title,
      lastOath: this.scene.title,
      level: this.#character.level,
      experience: this.#character.experience,
      victories: this.#history.filter(
        (entry) => entry.kind === "combat" && entry.combat.status === "victory",
      ).length,
      evidence: this.evidenceCount,
      evidenceTotal: FINAL_EVIDENCE.length,
    };
  }
  /** 중반 도입부를 방문했는지로 현재 막을 구분합니다. 반복해서 야영지로 돌아가도 유지됩니다. */
  get isMidgame() {
    return this.hasVisited("road-oath");
  }
  /** 출신을 바꿀 수 있는 도입 상태인지 판단할 때 쓰는, 행동 기록 존재 여부입니다. */
  get hasStarted() {
    return this.#history.length > 0;
  }
  /** 문자열 배열의 복사본을 반환해 화면이 원본 단서 목록을 바꾸지 못하게 합니다. */
  get clues() {
    return [...this.#clues];
  }
  /** 중첩된 판정·전투 기록까지 복제합니다. 화면에서 역순 정렬해도 원래 시간 순서는 보존됩니다. */
  get history() {
    return structuredClone(this.#history);
  }
  /** 직전 이야기 판정의 복사본입니다. 판정이 없는 행동에서는 null입니다. */
  get lastCheck() {
    return structuredClone(this.#lastCheck);
  }
  /** 화면의 진행 번호에 사용하는 전체 기록 수입니다. 전투 행동과 막 이동도 포함합니다. */
  get choiceCount() {
    return this.#history.length;
  }
  /** 진행 중인 전투 객체가 있는지 확인합니다. 끝난 전투는 정산할 때 제거합니다. */
  get isInCombat() {
    return this.#combat !== null;
  }
  /** 진행 중인 전투를 표시용 스냅샷으로 전달합니다. 외부에서 적 기력을 직접 바꿀 수 없습니다. */
  get combat() {
    return this.#combat?.toSnapshot() ?? null;
  }
  /** 이미 정산한 전투 결과의 복사본입니다. 실제 획득 경험치와 레벨업 여부를 포함합니다. */
  get lastBattle() {
    return structuredClone(this.#lastBattle);
  }

  /** 지금 고를 수 있는 이야기 선택지만 반환합니다. 전투 중에는 일반 선택지를 숨겨 동시 진행을 막습니다. */
  get choices() {
    if (this.isInCombat) return [];
    return (this.scene.choices ?? []).filter((choice) =>
      this.#canChoose(choice),
    );
  }

  /** 장면 방문 여부를 조회합니다. 조사 제한과 보관실 지름길 개방에 사용합니다. */
  hasVisited(sceneId) {
    return this.#visited.includes(sceneId);
  }

  /** 전투를 시작하거나 주사위를 굴리지 않고 적·예상 경험치·경고를 계산합니다. 일반 선택지는 null입니다. */
  encounterPreview(choiceId) {
    const choice = this.choices.find((choice) => choice.id === choiceId);
    if (!choice?.encounter) return null;
    const monster = MONSTERS[choice.encounter];
    return {
      choiceId,
      monster: { ...monster },
      reward: ExperiencePolicy.reward(monster, this.#character.level),
      warning: ExperiencePolicy.warning(monster, this.#character.level),
    };
  }

  /**
   * 현재 유효한 행동만 실행합니다. 레벨이 다르면 acceptLevelMismatch=true가 있어야 전투를 시작합니다.
   * 안내 취소 시 이 메서드를 호출하지 않으므로 기록과 자원이 그대로 남습니다.
   */
  choose(choiceId, { acceptLevelMismatch = false } = {}) {
    const choice = this.choices.find((choice) => choice.id === choiceId);
    if (!choice) throw new Error("현재 장면에서 선택할 수 없습니다.");
    if (this.encounterPreview(choiceId)?.warning && !acceptLevelMismatch) {
      throw new Error("레벨 차이 안내를 확인한 뒤 전투를 시작하세요.");
    }
    this.#applyChoice(choice, this.#skillCheck);
  }

  /** 다음 막으로 이동하며 회복합니다. 왕도 진입 기록에서만 성장 상한을 열어 이전 전투를 보존합니다. */
  continueJourney() {
    if (!this.canContinue || this.isInCombat)
      throw new Error("지금은 다음 여정을 시작할 수 없습니다.");
    const transition = CHAPTER_TRANSITIONS[this.#sceneId];
    this.#history.push({
      kind: "continue",
      scene: this.#sceneId,
      label: transition.label,
      result: null,
    });
    if (transition.unlockGrowth) this.#character.unlockFinaleGrowth();
    this.#character.rest();
    this.#lastCheck = null;
    this.#lastBattle = null;
    this.#moveTo(transition.next);
  }

  /** 실제 플레이에 사용하는 전투 진입점. 저장 복구용 주사위와 구분해 현재 난수 생성기를 사용합니다. */
  performCombatAction(actionId) {
    this.#performCombatAction(actionId, this.#skillCheck);
  }

  /** 전투 한 행동을 처리하고 끝났으면 정산합니다. 전투 전 장면 ID와 사용한 주사위를 기록해 나중에 재생합니다. */
  #performCombatAction(actionId, dice) {
    if (!this.#combat) throw new Error("진행 중인 전투가 없습니다.");
    const sceneId = this.#sceneId;
    const turn = this.#combat.act(actionId, this.#character, dice);
    // 정산하면 #combat이 null이 되므로 종료 상태를 먼저 보관합니다.
    const status = this.#combat.status;
    if (this.#combat.isOver) {
      this.#settleBattle();
      turn.lines.push(
        `획득 경험치 ${this.#lastBattle.earnedExperience} XP · Lv.${this.#character.level}`,
      );
    }
    this.#history.push({
      kind: "combat",
      scene: sceneId,
      actionId,
      label: COMBAT_ACTIONS[actionId].name,
      result: null,
      combat: { ...turn, status },
    });
  }

  /**
   * 승리 때만 경험치를 지급하고, 패배 시 기력 1로 회복한 뒤 정해진 장면으로 이동합니다.
   * 처리 후 전투 객체를 비워 같은 승리에 보상이 다시 지급되지 않게 합니다.
   */
  #settleBattle() {
    const battle = this.#combat.toSnapshot();
    const previousLevel = this.#character.level;
    const earnedExperience =
      battle.status === "victory" ? battle.reward.amount : 0;
    if (earnedExperience) this.#character.gainExperience(earnedExperience);
    if (battle.status === "defeat") this.#character.heal(1);
    this.#lastBattle = {
      ...battle,
      earnedExperience,
      previousLevel,
      level: this.#character.level,
    };
    const destination =
      battle.status === "victory"
        ? this.#encounterChoice.next
        : this.#encounterChoice.retreat;
    this.#moveTo(destination);
    // 정산한 전투를 제거해야 다음 행동에서 보상을 다시 지급할 수 없습니다.
    this.#combat = null;
    this.#encounterChoice = null;
  }

  /** 방문 선행 조건과 초반부 조사 횟수를 확인합니다. 일반 이동·전투는 별도 조건이 없으면 허용합니다. */
  #canChoose(choice) {
    if (choice.unlessVisited && this.hasVisited(choice.unlessVisited))
      return false;
    if (choice.unlessClue && this.#clues.includes(choice.unlessClue))
      return false;
    if (choice.requiresVisited && !this.hasVisited(choice.requiresVisited))
      return false;
    if (!choice.unvisited) return true;
    const investigationCount = this.#visited.filter((sceneId) =>
      INVESTIGATION_SCENES.includes(sceneId),
    ).length;
    return (
      !this.hasVisited(choice.unvisited) &&
      investigationCount < MAX_INVESTIGATIONS
    );
  }

  /** 판정을 기록한 뒤 전투 시작 또는 이야기 이동을 처리합니다. 전투는 끝날 때까지 현재 장면에 머뭅니다. */
  #applyChoice(choice, skillCheck) {
    const result = choice.check
      ? skillCheck.resolve(choice, this.#character)
      : null;
    this.#lastBattle = null;
    this.#lastCheck = result;
    this.#history.push({
      kind: "choice",
      choiceId: choice.id,
      scene: this.#sceneId,
      label: choice.label,
      result,
    });
    if (choice.encounter) {
      this.#encounterChoice = choice;
      this.#combat = new CombatSession(
        MONSTERS[choice.encounter],
        this.#character,
      );
      return;
    }
    this.#applyConsequences(choice, result);
    if (choice.rest) this.#character.rest();
    this.#moveTo(choice.next);
  }

  /** 현재 장면을 바꾸고 처음 방문한 장소만 방문 목록에 추가합니다. */
  #moveTo(sceneId) {
    this.#sceneId = sceneId;
    if (!this.hasVisited(sceneId)) this.#visited.push(sceneId);
  }

  /** 단서·실패 피해·소지품을 반영합니다. discover는 무조건 발견, clue는 판정 성공 때만 발견합니다. */
  #applyConsequences(choice, result) {
    // ??는 무조건 발견 단서가 없을 때만 성공 판정 단서를 사용하도록 합니다.
    const clue = choice.discover ?? (result?.success ? choice.clue : null);
    if (clue && !this.#clues.includes(clue)) this.#clues.push(clue);
    if (result && !result.success)
      this.#character.takeDamage(choice.damage ?? 0);
    this.#character.addItem(choice.add);
  }

  /** 모험 상태를 독립적으로 복제합니다. 난수 생성기는 공유하므로 난수 스트림까지 독립 복제하는 것은 아닙니다. */
  clone() {
    const copy = new Adventure(this.#character.originId, this.#skillCheck);
    copy.#character = this.#character.clone();
    copy.#sceneId = this.#sceneId;
    copy.#clues = [...this.#clues];
    copy.#visited = [...this.#visited];
    copy.#history = this.history;
    copy.#lastCheck = this.lastCheck;
    copy.#combat = this.#combat?.clone() ?? null;
    copy.#encounterChoice = this.#encounterChoice;
    copy.#lastBattle = this.lastBattle;
    return copy;
  }

  /** JSON으로 저장할 수 있는 일반 객체를 만듭니다. 필드 이름은 저장 형식이므로 바꿀 때 마이그레이션이 필요합니다. */
  toSnapshot() {
    return {
      version: SAVE_VERSION,
      origin: this.#character.originId,
      scene: this.#sceneId,
      hp: this.#character.health,
      level: this.#character.level,
      experience: this.#character.experience,
      clues: this.clues,
      items: this.#character.items,
      visited: [...this.#visited],
      log: this.history,
      last: this.lastCheck,
      combat: this.combat,
      lastBattle: this.lastBattle,
    };
  }

  /**
   * v1·v2 기록을 새 모험에 재생해 복구하고, 잘못된 이동이나 주사위는 null로 거부합니다.
   * 저장된 HP·경험치 값을 대입하지 않고 실제 선택 결과로 다시 계산합니다.
   */
  static fromSnapshot(snapshot, skillCheck = new SkillCheck()) {
    if (!Adventure.#hasValidMetadata(snapshot)) return null;
    const adventure = new Adventure(snapshot.origin, skillCheck);
    try {
      // 입력 기록 순서를 그대로 재생합니다. 복구 중 잘못된 행동을 만나면 임시 모험을 버립니다.
      for (const entry of snapshot.log) {
        if (!entry || entry.scene !== adventure.sceneId) return null;
        if (snapshot.version === 1) {
          if (entry.kind) return null;
          if (!adventure.#replayChoice(entry, true)) return null;
        } else if (entry.kind === "choice") {
          if (!adventure.#replayChoice(entry, false)) return null;
        } else if (entry.kind === "continue") {
          adventure.continueJourney();
        } else if (entry.kind === "combat") {
          if (!adventure.#replayCombat(entry)) return null;
        } else return null;
      }
    } catch {
      return null;
    }
    return adventure.sceneId === snapshot.scene ? adventure : null;
  }

  /** v1은 문구, v2는 choiceId로 행동을 찾습니다. 기록된 d20 값을 0 이상 1 미만 난수로 되돌려 같은 판정을 만듭니다. */
  #replayChoice(entry, legacy) {
    const choice = this.choices.find((choice) =>
      legacy ? choice.label === entry.label : choice.id === entry.choiceId,
    );
    if (!choice || !Adventure.#hasValidRoll(choice, entry.result)) return false;
    const roll = entry.result?.roll ?? 1;
    this.#applyChoice(
      choice,
      new SkillCheck(() => (roll - 1) / SkillCheck.DICE_SIDES),
    );
    return true;
  }

  /** 저장된 주사위만 순서대로 소비해 전투 행동을 다시 실행합니다. 부족하거나 남는 값은 올바른 턴이 아닙니다. */
  #replayCombat(entry) {
    const rolls = entry.combat?.rolls;
    if (
      !Array.isArray(rolls) ||
      rolls.length > 2 ||
      !rolls.every(Adventure.#isDiceRoll)
    )
      return false;
    let cursor = 0;
    const dice = new SkillCheck(() => {
      if (cursor >= rolls.length)
        throw new Error("전투 주사위 기록이 부족합니다.");
      return (rolls[cursor++] - 1) / SkillCheck.DICE_SIDES;
    });
    this.#performCombatAction(entry.actionId, dice);
    // 치료는 적 주사위만, 후퇴는 0개, 마무리 공격은 플레이어 주사위만 필요할 수 있습니다.
    return cursor === rolls.length;
  }

  /** 지원 버전·출신·장면·기록 배열을 먼저 검사합니다. v1만 길이를 제한하며 v2는 반복 전투를 허용합니다. */
  static #hasValidMetadata(snapshot) {
    return Boolean(
      snapshot &&
        [1, SAVE_VERSION].includes(snapshot.version) &&
        Object.hasOwn(ORIGINS, snapshot.origin) &&
        Object.hasOwn(SCENES, snapshot.scene) &&
        Array.isArray(snapshot.log) &&
        (snapshot.version !== 1 || snapshot.log.length <= 20),
    );
  }

  /** 저장에서 읽은 값이 실제 d20의 정수 범위 1~20인지 확인합니다. */
  static #isDiceRoll(roll) {
    return Number.isInteger(roll) && roll >= 1 && roll <= SkillCheck.DICE_SIDES;
  }

  /** 판정이 필요한 행동에만 주사위 기록을 요구합니다. 단순 이동에는 주사위가 필요 없습니다. */
  static #hasValidRoll(choice, result) {
    return (
      !choice.check || Boolean(result && Adventure.#isDiceRoll(result.roll))
    );
  }
}
