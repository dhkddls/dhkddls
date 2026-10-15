/**
 * @file 현재 버전의 전술 전투. 적의 예고 행동, 대응·출신 기술·단서·치료 도구를 소유합니다.
 * CombatSession은 이전 저장의 전투를 당시 규칙대로 재생하는 용도로 유지합니다.
 */
import { COMBAT_ACTIONS } from "../data/monsters.mjs";
import {
  ENEMY_PATTERNS,
  INTENTS,
  ORIGIN_SKILLS,
  COMBAT_CLUES,
  TACTICAL_ACTIONS,
  TACTICAL_MONSTER_STATS,
} from "../data/tactics.mjs";
import { ExperiencePolicy } from "./experience-policy.mjs";
import { StatusEffects } from "./status-effects.mjs";

export class TacticalSession {
  #monster;
  #originId;
  #enemyHealth;
  #reward;
  #round = 0;
  #remedies = 2;
  #status = "ongoing";
  #turns = [];
  // 대기 횟수는 자기 행동이 끝날 때만 줄입니다. 저장·화면 확인은 소모하지 않습니다.
  #cooldowns = { skill: 0, interrupt: 0 };
  #supplies = { wound: 1, fog: 1, dread: 1 };
  #evidence = null;
  #evidenceUsed = false;
  #exposed = 0;
  #brokenCharge = false;

  /** 시작 레벨 보상과 그 시점에 알고 있던 단서를 고정합니다. */
  constructor(monster, character, { knowledge = [] } = {}) {
    this.#monster = { ...monster, ...TACTICAL_MONSTER_STATS[monster.id] };
    this.#originId = character.originId;
    this.#enemyHealth = this.#monster.health;
    this.#reward = ExperiencePolicy.reward(monster, character.level);
    this.#evidence =
      COMBAT_CLUES.find(
        (entry) =>
          entry.monsters.includes(monster.id) && knowledge.includes(entry.clue),
      ) ?? null;
  }
  /** Adventure가 구형 전투와 같은 인터페이스로 승패·보상을 처리합니다. */
  get isOver() {
    return this.#status !== "ongoing";
  }
  get status() {
    return this.#status;
  }
  get reward() {
    return { ...this.#reward };
  }

  /** round는 완료한 행동 수이므로 이 값으로 '이번에 실행할' 적 행동을 예고합니다. */
  get intent() {
    const pattern = ENEMY_PATTERNS[this.#monster.id] ?? ["strike"];
    const kind = pattern[this.#round % pattern.length];
    return {
      ...INTENTS[kind === "heavy" && this.#brokenCharge ? "stagger" : kind],
    };
  }
  /** 봉인 방어·해독·단서의 수치를 실제 공격과 화면에서 똑같이 사용합니다. */
  get enemyDefense() {
    return Math.max(
      1,
      this.#monster.defense +
        (this.intent.defenseBonus ?? 0) -
        (this.#evidenceUsed ? 2 : 0) -
        (this.#exposed ? 2 : 0),
    );
  }

  /** 화면에 행동별 사용 가능 여부와 이유를 넘깁니다. 도메인도 실행 전에 같은 검사를 합니다. */
  actions(character) {
    const definitions = { ...COMBAT_ACTIONS, ...TACTICAL_ACTIONS };
    return [
      "attack",
      "power",
      "guard",
      "interrupt",
      "skill",
      "evidence",
      "recover",
      "flee",
      "treat-wound",
      "treat-fog",
      "treat-dread",
    ].map((id) => {
      const action = definitions[id];
      const skill = ORIGIN_SKILLS[this.#originId];
      return {
        id,
        ...action,
        name: id === "skill" ? skill.name : action.name,
        detail:
          id === "skill"
            ? `${skill.detail} · 재사용 대기 ${skill.cooldown}행동${this.#cooldowns.skill ? ` (남은 ${this.#cooldowns.skill}회)` : " · 사용 가능"}`
            : id === "evidence"
              ? this.#evidence
                ? `${this.#evidence.clue} · ${action.detail}`
                : "활용할 단서가 없습니다. 조사로 전투의 빈틈을 찾을 수 있습니다."
              : id === "recover"
                ? `${action.detail} · 남은 ${this.#remedies}회`
                : id.startsWith("treat-")
                  ? `${action.detail} · 남은 ${this.#supplies[id.slice(6)]}개`
                  : id === "interrupt"
                    ? `${action.detail} · 남은 대기 ${this.#cooldowns.interrupt}행동`
                    : action.detail,
        disabled: Boolean(this.#unavailable(id, character)),
        reason: this.#unavailable(id, character),
      };
    });
  }

  /** 잘못된 행동은 횟수·주사위·기력·기록을 바꾸기 전에 거부합니다. */
  #unavailable(id, character) {
    if (this.isOver) return "끝난 전투입니다.";
    if (
      !Object.hasOwn(COMBAT_ACTIONS, id) &&
      !Object.hasOwn(TACTICAL_ACTIONS, id)
    )
      return "알 수 없는 행동입니다.";
    if (id === "recover" && this.#remedies === 0)
      return "응급 처치를 모두 사용했습니다.";
    if (
      id === "recover" &&
      character.health === character.maxHealth &&
      !character.statuses.length
    )
      return "기력과 상태가 모두 온전합니다.";
    if ((this.#cooldowns[id] ?? 0) > 0)
      return `다른 행동 ${this.#cooldowns[id]}회 뒤 사용할 수 있습니다.`;
    if (id === "interrupt" && ["strike", "stagger"].includes(this.intent.kind))
      return "특수 행동을 예고할 때 사용할 수 있습니다.";
    if (id === "evidence" && (!this.#evidence || this.#evidenceUsed))
      return this.#evidenceUsed
        ? "이번 전투에서 단서를 이미 사용했습니다."
        : "이 적에게 활용할 단서가 없습니다.";
    if (id.startsWith("treat-")) {
      const status = id.slice(6);
      if (!this.#supplies[status])
        return "이번 전투의 치료 도구를 모두 사용했습니다.";
      if (!character.statuses.some((effect) => effect.id === status))
        return "치료할 상태 이상이 없습니다.";
    }
    return null;
  }

  /** 한 행동 전체를 계산한 뒤 상태·대기 시간을 줄이고 이번에 새로 걸린 효과를 적용합니다. */
  act(id, character, dice) {
    const error = this.#unavailable(id, character);
    if (error) throw new Error(error);
    const action = this.actions(character).find((entry) => entry.id === id);
    const intent = this.intent;
    const turn = { actionId: id, label: action.name, rolls: [], lines: [] };
    const response = {
      guarded: false,
      immune: false,
      cancel: false,
      missed: false,
      counter: false,
      freshExposure: false,
      statuses: [],
    };
    if (id === "flee") {
      this.#status = "escaped";
      turn.lines.push(
        this.#monster.retreatText ??
          "교전을 끊고 안전한 곳으로 물러났다. 경험치는 얻지 못했다.",
      );
    } else {
      this.#playerAction(id, character, dice, turn, intent, response);
      if (this.#enemyHealth === 0) this.#status = "victory";
      else this.#enemyAction(character, dice, turn, intent, response);
      if (this.#enemyHealth === 0) this.#status = "victory";
      else if (character.health === 0) this.#status = "defeat";
      for (const effect of character.advanceStatuses())
        turn.lines.push(`지속 종료 · ${effect.name}`);
      if (response.missed) response.statuses.push("dread");
      for (const effect of new Set(response.statuses))
        turn.lines.push(StatusEffects.describe(character.applyStatus(effect)));
      for (const key of Object.keys(this.#cooldowns))
        if (key !== id && this.#cooldowns[key] > 0) this.#cooldowns[key]--;
      if (!response.freshExposure && this.#exposed > 0) this.#exposed--;
      if (["heavy", "stagger"].includes(intent.kind))
        this.#brokenCharge = false;
      if (this.#status === "victory")
        turn.lines.push(`${this.#monster.name}의 형체가 흩어졌다.`);
      if (this.#status === "defeat")
        turn.lines.push(
          this.#monster.defeatText ??
            "동료가 당신을 안전한 곳으로 옮겼다. 경험치 없이 기력 1로 돌아왔다.",
        );
    }
    this.#round++;
    this.#turns.push(turn);
    return structuredClone(turn);
  }

  /** 주사위는 기존 저장 형식과 마찬가지로 한 행동에 최대 두 개입니다. */
  #roll(dice, turn) {
    const roll = dice.roll();
    turn.rolls.push(roll);
    return roll;
  }
  #damage(amount) {
    this.#enemyHealth = Math.max(0, this.#enemyHealth - amount);
  }
  /** 현재의 특수 행동을 막고, 준비 중이었다면 다음 강타까지 끊습니다. */
  #interrupt(intent, response, turn) {
    if (!["strike", "stagger"].includes(intent.kind)) {
      response.cancel = true;
      if (intent.kind === "gather") this.#brokenCharge = true;
      turn.lines.push(
        `${intent.name}을 끊었다. ${intent.kind === "gather" ? "다음 강타도 취소된다." : "이번 적 행동은 실행되지 않는다."}`,
      );
    }
  }

  /** 출신 기술·방어·치료는 각자의 자원을 쓰며, 적의 차례를 자동으로 생략하지 않습니다. */
  #playerAction(id, c, dice, turn, intent, response) {
    if (id === "guard") {
      response.guarded = true;
      turn.lines.push("방어 자세 · 이번 방어 +3, 피해 절반, 상태 이상 차단.");
      return;
    }
    if (id === "recover" || id.startsWith("treat-")) {
      const before = c.health;
      if (id === "recover") {
        c.heal(4 + c.level);
        this.#remedies--;
        const relieved = c.relieveStatus();
        turn.lines.push(
          `응급 처치 · 기력 ${c.health - before} 회복${relieved ? ` · ${relieved.name} 해제` : ""}. 남은 ${this.#remedies}회.`,
        );
      } else {
        const status = id.slice(6);
        this.#supplies[status]--;
        const relieved = c.treatStatus(status);
        if (status === "wound") c.heal(2 + c.level);
        turn.lines.push(
          `${TACTICAL_ACTIONS[id].name} · ${relieved.name} 해제${status === "wound" ? ` · 기력 ${c.health - before} 회복` : ""}.`,
        );
      }
      return;
    }
    if (id === "evidence") {
      this.#evidenceUsed = true;
      this.#damage(0);
      turn.lines.push(
        `단서 활용 · ${this.#evidence.clue}: ${this.#evidence.text} 이번 전투 동안 적 방어 −2.`,
      );
      this.#interrupt(intent, response, turn);
      return;
    }
    if (id === "skill") {
      this.#cooldowns.skill = ORIGIN_SKILLS[this.#originId].cooldown;
      if (this.#originId === "warden") {
        response.immune = true;
        response.counter = true;
        turn.lines.push(
          "서약의 방패 · 이번 공격과 상태 이상을 막는다. 적이 공격하면 반격한다.",
        );
        return;
      }
      if (this.#originId === "scribe") {
        const damage = 2 + c.level;
        this.#damage(damage);
        this.#exposed = 2;
        response.freshExposure = true;
        turn.lines.push(
          `이름 해독 · 확정 ${damage} 피해, 다음 2행동 동안 적 방어 −2.`,
        );
        this.#interrupt(intent, response, turn);
        return;
      }
      response.immune = true;
      turn.lines.push(
        "그림자 걸음 · 이번 적 공격과 상태 이상을 피하며 약점을 겨눈다.",
      );
    }
    // 명중 보정과 피해를 분리합니다. 방해는 약한 공격 대신 적 행동을 끊는 선택입니다.
    const roll = this.#roll(dice, turn);
    const modifier =
      id === "power" ? -3 : id === "interrupt" ? -2 : id === "skill" ? 3 : 0;
    const defense = this.enemyDefense;
    const hit =
      roll === 20 || (roll !== 1 && roll + c.attackBonus + modifier >= defense);
    const damage = hit
      ? (id === "interrupt"
          ? Math.max(1, Math.floor(c.attackDamage / 2))
          : c.attackDamage + (id === "power" ? 3 : id === "skill" ? 2 : 0)) +
        (roll === 20 ? 2 : 0)
      : 1;
    this.#damage(damage);
    response.missed = !hit;
    turn.lines.push(
      `d20 ${roll} + ${c.attackBonus}${modifier ? ` ${modifier > 0 ? "+" : "−"} ${Math.abs(modifier)}` : ""} / 방어 ${defense} · ${hit ? "명중" : "빗나감, 견제"}. 적에게 ${damage} 피해.`,
    );
    if (id === "interrupt") {
      this.#cooldowns.interrupt = 2;
      if (hit) this.#interrupt(intent, response, turn);
    }
  }

  /** 예고한 행동을 그대로 실행합니다. 방어·출신 기술은 피해와 상태 부여를 함께 막을 수 있습니다. */
  #enemyAction(c, dice, turn, intent, response) {
    if (response.cancel) return;
    if (["gather", "guard", "stagger"].includes(intent.kind)) {
      turn.lines.push(
        `${this.#monster.name}: ${intent.name}. 이번에는 공격하지 않았다.`,
      );
      return;
    }
    const roll = this.#roll(dice, turn);
    const defense = c.defense + (response.guarded ? 3 : 0);
    const hit =
      roll === 20 || (roll !== 1 && roll + this.#monster.attack >= defense);
    let damage = hit
      ? Math.max(
          1,
          this.#monster.damage + intent.damageBonus + (roll === 20 ? 2 : 0),
        )
      : 0;
    if (response.immune) damage = 0;
    else if (response.guarded) damage = Math.ceil(damage / 2);
    c.takeCombatDamage(damage);
    turn.lines.push(
      `${this.#monster.name} · ${intent.name}: d20 ${roll} + ${this.#monster.attack} / 방어 ${defense} · 기력 ${damage} 피해${response.immune ? " (출신 기술로 회피·방어)" : response.guarded ? " (방어로 경감)" : ""}.`,
    );
    if (hit && intent.status && !response.guarded && !response.immune)
      response.statuses.push(intent.status);
    if (response.counter) {
      const counter = 3 + c.level;
      this.#damage(counter);
      turn.lines.push(`서약의 반격 · 적에게 ${counter} 피해.`);
    }
  }

  /** 규칙·예고·자원까지 복구할 수 있도록 상태를 복사합니다. 재생 시 저장 수치는 직접 대입하지 않습니다. */
  toSnapshot() {
    return {
      monster: { ...this.#monster },
      enemyHealth: this.#enemyHealth,
      round: this.#round,
      remedies: this.#remedies,
      status: this.#status,
      reward: this.reward,
      turns: structuredClone(this.#turns),
      tactics: {
        intent: this.intent,
        enemyDefense: this.enemyDefense,
        cooldowns: { ...this.#cooldowns },
        supplies: { ...this.#supplies },
        evidence: this.#evidence
          ? { clue: this.#evidence.clue, used: this.#evidenceUsed }
          : null,
        exposed: this.#exposed,
        brokenCharge: this.#brokenCharge,
        originId: this.#originId,
      },
    };
  }
  /** 비공개 필드와 단서 정보를 함께 복제하여 원래 전투의 대기 시간과 도구를 보존합니다. */
  clone() {
    const copy = new TacticalSession(
      this.#monster,
      { originId: this.#originId, level: this.#reward.playerLevel },
      { knowledge: this.#evidence ? [this.#evidence.clue] : [] },
    );
    copy.#enemyHealth = this.#enemyHealth;
    copy.#round = this.#round;
    copy.#remedies = this.#remedies;
    copy.#status = this.#status;
    copy.#turns = structuredClone(this.#turns);
    copy.#cooldowns = { ...this.#cooldowns };
    copy.#supplies = { ...this.#supplies };
    copy.#evidenceUsed = this.#evidenceUsed;
    copy.#exposed = this.#exposed;
    copy.#brokenCharge = this.#brokenCharge;
    return copy;
  }
}
