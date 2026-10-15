/**
 * @file 한 캐릭터의 상태 이상을 관리합니다. 주사위·HP·DOM에는 의존하지 않습니다.
 * 효과마다 남은 횟수만 소유하고 수치는 data/status-effects.mjs에서 읽습니다.
 */
import { STATUS_EFFECTS } from "../data/status-effects.mjs";

export class StatusEffects {
  // Map의 삽입 순서로 먼저 걸린 효과부터 응급 처치합니다.
  #remaining = new Map();

  /** 화면·저장에는 복사본을 반환합니다. 외부에서 남은 횟수를 바꿀 수 없습니다. */
  get active() {
    return [...this.#remaining].map(([id, remaining]) => ({
      ...STATUS_EFFECTS[id],
      remaining,
    }));
  }

  /** 같은 상태는 강도를 더하지 않고 다음 3회로 갱신합니다. 알 수 없는 효과는 거부합니다. */
  apply(id) {
    if (!Object.hasOwn(STATUS_EFFECTS, id))
      throw new Error("알 수 없는 상태 이상입니다.");
    this.#remaining.set(id, STATUS_EFFECTS[id].duration);
    return { ...STATUS_EFFECTS[id], remaining: STATUS_EFFECTS[id].duration };
  }

  /** 해당 능력치의 이야기 판정에 적용할 감소량입니다. */
  statPenalty(stat) {
    return this.active
      .filter((effect) => effect.stat === stat)
      .reduce((sum, effect) => sum + effect.statPenalty, 0);
  }

  /** 명중·피해·방어의 별도 전투 감소량입니다. 기본 능력치와 이중 차감하지 않습니다. */
  combatPenalty(kind) {
    return this.active.reduce(
      (sum, effect) => sum + (effect[`${kind}Penalty`] ?? 0),
      0,
    );
  }

  /** 행동을 모두 계산한 뒤 소모합니다. 이번에 새로 걸리는 효과는 그다음에 적용해야 합니다. */
  advance() {
    const expired = [];
    for (const [id, remaining] of this.#remaining) {
      if (remaining === 1) {
        expired.push({ ...STATUS_EFFECTS[id], remaining: 0 });
        this.#remaining.delete(id);
      } else this.#remaining.set(id, remaining - 1);
    }
    return expired;
  }

  /** 응급 처치로 먼저 걸린 상태 하나를 해제합니다. 없으면 null입니다. */
  relieveOne() {
    const first = this.active[0];
    if (!first) return null;
    this.#remaining.delete(first.id);
    return first;
  }

  /** 전용 치료는 지정한 효과만 해제합니다. 없는 효과를 치료해 자원을 낭비하지 않습니다. */
  relieve(id) {
    const effect = this.active.find((entry) => entry.id === id);
    if (!effect) return null;
    this.#remaining.delete(id);
    return effect;
  }

  /** 거점 휴식과 막 사이 안전한 여행에서 모든 상태를 해제합니다. */
  clear() {
    this.#remaining.clear();
  }

  /** Map까지 복제하여 분기 탐색에서 다른 캐릭터의 상태가 변하지 않게 합니다. */
  clone() {
    const copy = new StatusEffects();
    copy.#remaining = new Map(this.#remaining);
    return copy;
  }

  /** 이야기·전투 로그가 같은 수치와 지속 횟수를 안내하도록 문구를 공유합니다. */
  static describe(effect) {
    return `상태 이상 · ${effect.name}: ${effect.effect} · 다음 위험 행동 ${effect.remaining}회. 같은 효과는 강도 대신 기간만 갱신됩니다.`;
  }
}
