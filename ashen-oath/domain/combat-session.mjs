/**
 * @file 한 번의 턴제 전투를 관리합니다. 플레이어 행동 뒤 살아 있는 적이 반격합니다.
 * 이 클래스는 승패만 결정하며 경험치 지급과 전투 후 이동은 Adventure가 처리합니다.
 */

import { COMBAT_ACTIONS } from "../data/monsters.mjs";
import { ExperiencePolicy } from "./experience-policy.mjs";

/** 한 번의 전투만 소유합니다. 보상 지급과 장면 이동은 Adventure의 책임입니다. */
export class CombatSession {
  // 원본 몬스터 설정. 전투가 시작되어도 적 레벨은 플레이어에 맞춰 변하지 않습니다.
  #monster;
  // 전투마다 새로 생성되는 적의 현재 기력입니다.
  #enemyHealth;
  // 지금까지 처리한 행동 수. 플레이어 행동 한 번과 적 반격이 한 라운드입니다.
  #round = 0;
  // 이 전투에서 남은 응급 처치 횟수. 새 전투를 시작할 때 두 번으로 초기화합니다.
  #remedies = 2;
  // ongoing → victory / defeat / escaped 중 하나로 전이합니다.
  #status = "ongoing";
  // 각 턴의 행동 ID·사용한 주사위·설명 문장을 보관합니다.
  #turns = [];
  // 예상 보상. 시작 레벨로 고정하며 실제 지급은 Adventure가 승리 때만 합니다.
  #reward;

  /** 적의 기력을 초기화하고 보상 배율을 전투 시작 시점의 플레이어 레벨로 고정합니다. */
  constructor(monster, character) {
    this.#monster = monster;
    this.#enemyHealth = monster.health;
    this.#reward = ExperiencePolicy.reward(monster, character.level);
  }

  /** 진행 상태가 ongoing이 아니면 승리·패배·후퇴 중 하나로 끝난 전투입니다. */
  get isOver() {
    return this.#status !== "ongoing";
  }
  /** 전투 상태 문자열입니다. Adventure가 보상과 복귀 장소를 결정할 때 사용합니다. */
  get status() {
    return this.#status;
  }
  /** 시작 때 계산한 보상 정보의 복사본입니다. 실제 지급 여부는 승패에 따라 나중에 결정합니다. */
  get reward() {
    return { ...this.#reward };
  }

  /**
   * 행동을 검증한 뒤 플레이어 → 생존한 적 순서로 한 턴을 진행합니다.
   * 후퇴는 즉시 종료하고, 소진된 치료 등 잘못된 행동은 턴을 소비하기 전에 거부합니다.
   */
  act(actionId, character, dice) {
    if (this.isOver || !Object.hasOwn(COMBAT_ACTIONS, actionId)) {
      throw new Error("현재 사용할 수 없는 전투 행동입니다.");
    }
    if (actionId === "recover" && this.#remedies === 0) {
      throw new Error("응급 처치를 모두 사용했습니다.");
    }

    const turn = {
      actionId,
      label: COMBAT_ACTIONS[actionId].name,
      rolls: [],
      lines: [],
    };
    this.#round++;
    if (actionId === "flee") {
      this.#status = "escaped";
      turn.lines.push(
        this.#monster.retreatText ??
          "교전을 끊고 야영지로 물러났다. 경험치는 얻지 못했다.",
      );
    } else {
      this.#playerTurn(actionId, character, dice, turn);
      // 처치한 적은 반격하지 않습니다. 먼저 승리를 판정한 뒤 살아 있는 경우에만 적 차례로 넘어갑니다.
      if (this.#enemyHealth === 0) {
        this.#status = "victory";
        turn.lines.push(`${this.#monster.name}의 형체가 흩어졌다.`);
      } else {
        this.#enemyTurn(character, dice, turn);
        if (character.health === 0) {
          this.#status = "defeat";
          turn.lines.push(
            this.#monster.defeatText ??
              "동료가 당신을 야영지로 옮겼다. 경험치 없이 기력 1로 돌아왔다.",
          );
        }
      }
    }
    this.#turns.push(turn);
    return structuredClone(turn);
  }

  /** 실제 d20 값을 이번 턴 기록에도 남깁니다. 저장 복구가 같은 전투를 재생하는 근거입니다. */
  #roll(dice, turn) {
    const roll = dice.roll();
    turn.rolls.push(roll);
    return roll;
  }

  /** 치료는 횟수를 소모하고, 공격은 명중·피해를 계산합니다. 결정타는 명중 −3 대신 적중 피해 +3입니다. */
  #playerTurn(actionId, character, dice, turn) {
    if (actionId === "recover") {
      const before = character.health;
      character.heal(4 + character.level);
      this.#remedies--;
      turn.lines.push(
        `응급 처치로 기력 ${character.health - before} 회복. 남은 처치 ${this.#remedies}회.`,
      );
      return;
    }
    const roll = this.#roll(dice, turn);
    const penalty = actionId === "power" ? 3 : 0;
    const total = roll + character.attackBonus - penalty;
    // 자연 20은 보정과 무관하게 적중, 자연 1은 무조건 빗나갑니다.
    const hit = roll === 20 || (roll !== 1 && total >= this.#monster.defense);
    // 플레이어는 빗나가도 견제로 1 피해를 줍니다. 응급 처치 횟수도 제한되어 전투가 끝없이 정체되지 않습니다.
    const damage = hit
      ? character.attackDamage +
        (actionId === "power" ? 3 : 0) +
        (roll === 20 ? 2 : 0)
      : 1;
    this.#enemyHealth = Math.max(0, this.#enemyHealth - damage);
    turn.lines.push(
      `d20 ${roll} + ${character.attackBonus}${penalty ? " − 3" : ""} / 방어 ${this.#monster.defense} · ${hit ? "명중" : "빗나감, 견제"}. 적에게 ${damage} 피해.`,
    );
  }

  /** 생존한 적의 반격을 판정합니다. 자연 20은 추가 피해 2, 빗나감은 피해 0입니다. */
  #enemyTurn(character, dice, turn) {
    const roll = this.#roll(dice, turn);
    const hit =
      roll === 20 ||
      (roll !== 1 && roll + this.#monster.attack >= character.defense);
    const damage = hit ? this.#monster.damage + (roll === 20 ? 2 : 0) : 0;
    character.takeCombatDamage(damage);
    turn.lines.push(
      `${this.#monster.name}: d20 ${roll} + ${this.#monster.attack} / 방어 ${character.defense} · ${hit ? `기력 ${damage} 피해` : "공격을 피했다"}.`,
    );
  }

  /** 적 기력·라운드·치료 횟수·턴 기록을 복제해 화면과 저장에 전달합니다. */
  toSnapshot() {
    return {
      monster: { ...this.#monster },
      enemyHealth: this.#enemyHealth,
      round: this.#round,
      remedies: this.#remedies,
      status: this.#status,
      reward: this.reward,
      turns: structuredClone(this.#turns),
    };
  }

  /** 비공개 필드는 Object.create로 복제할 수 없어 생성자로 새 전투를 만든 후 상태를 복사합니다. */
  clone() {
    // 비공개 필드가 있는 객체는 생성자를 통해 복제합니다.
    const session = new CombatSession(this.#monster, {
      level: this.#reward.playerLevel,
    });
    session.#enemyHealth = this.#enemyHealth;
    session.#round = this.#round;
    session.#remedies = this.#remedies;
    session.#status = this.#status;
    session.#turns = structuredClone(this.#turns);
    return session;
  }
}
