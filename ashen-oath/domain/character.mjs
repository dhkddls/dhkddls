/**
 * @file 한 플레이어의 출신, 기력, 소지품, 누적 경험치를 관리합니다.
 * 레벨과 능력치는 누적 경험치로 계산하므로 서로 어긋나는 값을 따로 저장하지 않습니다.
 */

import { ORIGINS } from "../data/origins.mjs";
import { ExperiencePolicy } from "./experience-policy.mjs";
import { StatusEffects } from "./status-effects.mjs";

export class Character {
  // Lv.1의 최대 기력입니다. 성장 후 최대 기력은 maxHealth getter를 사용합니다.
  static MAX_HEALTH = 10;
  // 이야기 판정의 하한이자 패배 후 복귀 기력입니다. 전투 피해에는 이 하한을 쓰지 않습니다.
  static MIN_HEALTH = 1;

  // ORIGINS의 키. 출신 설명과 시작 능력치를 조회합니다.
  #originId;
  // 현재 기력. 레벨업과 휴식 때 maxHealth로 갱신합니다.
  #health = Character.MAX_HEALTH;
  // 이 플레이어가 가진 물건 목록입니다.
  #items;
  // 레벨업 시 차감하지 않는 전체 누적 경험치입니다.
  #experience = 0;
  // 이전 v2 저장은 Lv.5 계산을 그대로 재생합니다. 왕도 진입 기록에서만 Lv.8을 엽니다.
  #levelCap = 5;
  // 상태 이상은 별도 객체에 맡겨 성장·소지품과 지속 횟수 처리를 구분합니다.
  #statusEffects = new StatusEffects();

  /** 등록된 출신만 허용하고 해당 출신의 시작 소지품을 지급합니다. */
  constructor(originId = "warden") {
    if (!Object.hasOwn(ORIGINS, originId)) throw new Error("알 수 없는 출신");
    this.#originId = originId;
    this.#items = [this.origin.item];
  }

  /** 출신의 고정 ID입니다. 저장과 캐릭터 복제에 사용합니다. */
  get originId() {
    return this.#originId;
  }
  /** 출신 설정 원본을 읽습니다. 기본 능력치와 설명은 data/origins.mjs에서 관리합니다. */
  get origin() {
    return ORIGINS[this.#originId];
  }
  /** 현재 기력입니다. 초반 판정은 1까지, 전투 피해는 패배를 위해 0까지 내려갈 수 있습니다. */
  get health() {
    return this.#health;
  }
  /** 소지품 목록의 복사본을 반환해 외부 배열 수정이 원본에 영향을 주지 않게 합니다. */
  get items() {
    return [...this.#items];
  }
  /** 기력 1인 부상 상태인지 확인합니다. 0은 전투에서 패배가 처리되기 직전의 상태입니다. */
  get isWounded() {
    return this.#health === Character.MIN_HEALTH;
  }

  /** 누적 경험치로 현재 레벨을 계산합니다. 별도 레벨 필드를 저장해 불일치를 만들지 않습니다. */
  get level() {
    return ExperiencePolicy.levelFor(this.#experience, this.#levelCap);
  }
  /** 전체 모험에서 획득한 누적 경험치입니다. 레벨업해도 차감하지 않습니다. */
  get experience() {
    return this.#experience;
  }
  /** 경험치 막대용 현재 구간 수치입니다. 최고 레벨이면 required가 null입니다. */
  get experienceProgress() {
    return ExperiencePolicy.progress(this.#experience, this.#levelCap);
  }
  /** 현재 막에서 허용하는 성장 상한입니다. 누적 경험치는 상한 이후에도 보존합니다. */
  get levelCap() {
    return this.#levelCap;
  }

  /** 왕도 진입 때만 상한을 엽니다. 이전 전투의 피해·보상 계산을 소급 변경하지 않습니다. */
  unlockFinaleGrowth() {
    this.#levelCap = ExperiencePolicy.MAX_LEVEL;
  }
  /** Lv.1은 10이며 레벨마다 최대 기력이 4씩 증가합니다. */
  get maxHealth() {
    return Character.MAX_HEALTH + (this.level - 1) * 4;
  }
  /** 출신의 세 기본 능력치에 레벨−1을 더해 새 객체로 반환합니다. */
  get baseStats() {
    return Object.fromEntries(
      Object.entries(this.origin.stats).map(([stat, bonus]) => [
        stat,
        bonus + this.level - 1,
      ]),
    );
  }
  /** 화면과 이야기 판정에는 상태 이상을 반영한 능력치를 표시합니다. 음수도 유효한 보정입니다. */
  get stats() {
    return Object.fromEntries(
      Object.entries(this.baseStats).map(([stat, bonus]) => [
        stat,
        bonus - this.statusPenaltyFor(stat),
      ]),
    );
  }
  /** 현재 상태와 횟수의 복사본입니다. 저장에서 받은 상태를 직접 대입하지 않습니다. */
  get statuses() {
    return this.#statusEffects.active;
  }
  /** 이야기 판정의 기본치와 감소량을 구분해 표시할 때 사용합니다. */
  statusPenaltyFor(stat) {
    return this.#statusEffects.statPenalty(stat);
  }
  /** 실패로 새 효과를 걸거나 같은 효과의 기간을 갱신합니다. */
  applyStatus(id) {
    return this.#statusEffects.apply(id);
  }
  /** 판정·전투 행동이 끝난 뒤 기존 효과의 남은 횟수를 줄입니다. */
  advanceStatuses() {
    return this.#statusEffects.advance();
  }
  /** 응급 처치 시 먼저 걸린 효과 하나만 해제합니다. */
  relieveStatus() {
    return this.#statusEffects.relieveOne();
  }
  /** 전용 도구로 한 종류의 효과만 치료합니다. */
  treatStatus(id) {
    return this.#statusEffects.relieve(id);
  }
  /** 전투 명중은 성장 능력치 중 최고값에 기억 혼탁의 감소량을 적용합니다. */
  get attackBonus() {
    return (
      Math.max(...Object.values(this.baseStats)) -
      this.#statusEffects.combatPenalty("attack")
    );
  }
  /** 기본 피해 3에 레벨과 성장 최고 능력치의 절반(버림)을 더하고 상처 피해 감소를 뺍니다. */
  get attackDamage() {
    return Math.max(
      1,
      3 +
        this.level +
        Math.floor(Math.max(...Object.values(this.baseStats)) / 2) -
        this.#statusEffects.combatPenalty("damage"),
    );
  }
  /** 적 공격이 넘어야 할 방어값입니다. 레벨마다 1 증가하고 공포 상태에서는 2 감소합니다. */
  get defense() {
    return 9 + this.level - this.#statusEffects.combatPenalty("defense");
  }

  /** might·wit·spirit 중 요청한 능력치의 현재 보정값을 반환합니다. */
  bonusFor(stat) {
    return this.stats[stat];
  }

  /** 이야기 판정 실패 피해입니다. 진행이 막히지 않게 기력 1을 하한으로 둡니다. */
  takeDamage(amount) {
    this.#health = Math.max(Character.MIN_HEALTH, this.#health - amount);
  }

  /** 전투 피해는 기력 0까지 허용합니다. 패배 정산과 야영지 이동은 Adventure가 처리합니다. */
  takeCombatDamage(amount) {
    this.#health = Math.max(0, this.#health - amount);
  }

  /** 지정한 양만큼 회복하되 현재 레벨의 최대 기력을 넘기지 않습니다. */
  heal(amount) {
    this.#health = Math.min(this.maxHealth, this.#health + amount);
  }

  /** 안전한 곳의 휴식은 기력을 채우고 모든 상태 이상을 해제합니다. */
  rest() {
    this.#health = this.maxHealth;
    this.#statusEffects.clear();
  }

  /**
   * 0 이상의 정수 경험치를 누적하고, 한 번에 여러 레벨이 올라도 새 최대 기력까지 회복합니다.
   * 반환값은 이전·이후 레벨과 지급량이므로 보상 화면에서도 사용할 수 있습니다.
   */
  gainExperience(amount) {
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error("경험치는 0 이상의 정수여야 합니다.");
    const previousLevel = this.level;
    this.#experience += amount;
    // 레벨업은 기력만 회복합니다. 디버프는 휴식·치료·지속 횟수로 해제해야 합니다.
    if (this.level > previousLevel) this.#health = this.maxHealth;
    return { previousLevel, level: this.level, amount };
  }

  /** 빈 값과 이미 가진 물건은 추가하지 않아 같은 사건을 반복해도 목록이 중복되지 않게 합니다. */
  addItem(item) {
    if (item && !this.#items.includes(item)) this.#items.push(item);
  }

  /** 현재 기력·경험치·소지품이 같은 독립 캐릭터를 만듭니다. 출신의 설정 데이터는 공유합니다. */
  clone() {
    const character = new Character(this.#originId);
    character.#health = this.#health;
    character.#items = [...this.#items];
    character.#experience = this.#experience;
    character.#levelCap = this.#levelCap;
    character.#statusEffects = this.#statusEffects.clone();
    return character;
  }
}
