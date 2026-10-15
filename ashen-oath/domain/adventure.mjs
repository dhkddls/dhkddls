import { ORIGINS } from "../data/origins.mjs";
import { SCENES } from "../data/scenes.mjs";
import { Character } from "./character.mjs";
import { SkillCheck } from "./skill-check.mjs";

const INVESTIGATION_SCENES = ["chapel", "archive", "river"];
const MAX_INVESTIGATIONS = 2;
const SAVE_VERSION = 1;
const MAX_SAVED_CHOICES = 20;

/** 진행 상태를 소유합니다. UI와 브라우저 저장소에는 의존하지 않습니다. */
export class Adventure {
  #character;
  #skillCheck;
  #sceneId = "arrival";
  #clues = [];
  #visited = ["arrival"];
  #history = [];
  #lastCheck = null;

  constructor(originId = "warden", skillCheck = new SkillCheck()) {
    this.#character = new Character(originId);
    this.#skillCheck = skillCheck;
  }

  get character() {
    return this.#character;
  }
  get sceneId() {
    return this.#sceneId;
  }
  get scene() {
    return SCENES[this.#sceneId];
  }
  get isComplete() {
    return Boolean(this.scene.ending);
  }
  get hasStarted() {
    return this.#history.length > 0;
  }
  get clues() {
    return [...this.#clues];
  }
  get history() {
    return structuredClone(this.#history);
  }
  get lastCheck() {
    return structuredClone(this.#lastCheck);
  }
  get choiceCount() {
    return this.#history.length;
  }

  get choices() {
    return (this.scene.choices ?? []).filter((choice) =>
      this.#canChoose(choice),
    );
  }

  hasVisited(sceneId) {
    return this.#visited.includes(sceneId);
  }

  choose(choiceId) {
    const choice = this.choices.find((choice) => choice.id === choiceId);
    if (!choice) throw new Error("현재 장면에서 선택할 수 없습니다.");
    this.#applyChoice(choice, this.#skillCheck);
  }

  #canChoose(choice) {
    if (!choice.unvisited) return true;
    const investigationCount = this.#visited.filter((sceneId) =>
      INVESTIGATION_SCENES.includes(sceneId),
    ).length;
    return (
      !this.hasVisited(choice.unvisited) &&
      investigationCount < MAX_INVESTIGATIONS
    );
  }

  #applyChoice(choice, skillCheck) {
    const result = choice.check
      ? skillCheck.resolve(choice, this.#character)
      : null;
    this.#applyConsequences(choice, result);
    this.#history.push({ scene: this.#sceneId, label: choice.label, result });
    this.#lastCheck = result;
    this.#sceneId = choice.next;
    if (!this.hasVisited(choice.next)) this.#visited.push(choice.next);
  }

  #applyConsequences(choice, result) {
    if (result?.success && choice.clue && !this.#clues.includes(choice.clue)) {
      this.#clues.push(choice.clue);
    }
    if (result && !result.success)
      this.#character.takeDamage(choice.damage ?? 0);
    this.#character.addItem(choice.add);
  }

  /** 분기 검증 시 원래 진행에 영향을 주지 않는 복제본을 만듭니다. */
  clone() {
    const copy = new Adventure(this.#character.originId, this.#skillCheck);
    copy.#character = this.#character.clone();
    copy.#sceneId = this.#sceneId;
    copy.#clues = [...this.#clues];
    copy.#visited = [...this.#visited];
    copy.#history = structuredClone(this.#history);
    copy.#lastCheck = structuredClone(this.#lastCheck);
    return copy;
  }

  /** 기존 v1 저장 형식을 유지하며, 내부 배열은 외부에 노출하지 않습니다. */
  toSnapshot() {
    return {
      version: SAVE_VERSION,
      origin: this.#character.originId,
      scene: this.#sceneId,
      hp: this.#character.health,
      clues: this.clues,
      items: this.#character.items,
      visited: [...this.#visited],
      log: this.history,
      last: this.lastCheck,
    };
  }

  /** 저장된 능력치와 본문을 신뢰하지 않고, 선택·주사위 기록으로 재구성합니다. */
  static fromSnapshot(snapshot, skillCheck = new SkillCheck()) {
    if (!Adventure.#hasValidMetadata(snapshot)) return null;
    const adventure = new Adventure(snapshot.origin, skillCheck);
    for (const entry of snapshot.log) {
      if (!entry || entry.scene !== adventure.sceneId) return null;
      const choice = adventure.choices.find(
        (choice) => choice.label === entry.label,
      );
      if (!choice || !Adventure.#hasValidRoll(choice, entry.result))
        return null;
      const roll = entry.result?.roll ?? 1;
      const recordedCheck = new SkillCheck(
        () => (roll - 1) / SkillCheck.DICE_SIDES,
      );
      adventure.#applyChoice(choice, recordedCheck);
    }
    return adventure.sceneId === snapshot.scene ? adventure : null;
  }

  static #hasValidMetadata(snapshot) {
    return Boolean(
      snapshot &&
        snapshot.version === SAVE_VERSION &&
        Object.hasOwn(ORIGINS, snapshot.origin) &&
        Object.hasOwn(SCENES, snapshot.scene) &&
        Array.isArray(snapshot.log) &&
        snapshot.log.length <= MAX_SAVED_CHOICES,
    );
  }

  static #hasValidRoll(choice, result) {
    if (!choice.check) return true;
    return Boolean(
      result &&
        Number.isInteger(result.roll) &&
        result.roll >= 1 &&
        result.roll <= SkillCheck.DICE_SIDES,
    );
  }
}
