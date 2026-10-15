/**
 * @file 진행 중인 전투 또는 직전 전투 결과를 표시합니다. 주사위를 직접 굴리지 않습니다.
 * 행동 버튼을 누르면 콜백을 통해 Adventure의 전투 처리로 연결합니다.
 */

import { COMBAT_ACTIONS } from "../data/monsters.mjs";
import { createElement, getElement } from "./dom.mjs";

export class CombatView {
  // 전투 행동을 실행하도록 요청할 콜백입니다.
  #onAction;
  // 이 View가 교체하는 전투 전용 DOM 영역입니다.
  #panel = getElement("combat-panel");

  /** 전투 행동 ID를 받을 콜백을 보관합니다. 판정·피해·저장은 컨트롤러와 도메인이 담당합니다. */
  constructor(onAction) {
    this.#onAction = onAction;
  }

  /** 진행 중 전투를 우선 표시하고, 없으면 직전 결과를 표시합니다. 둘 다 없으면 패널을 숨깁니다. */
  render(adventure) {
    this.#panel.replaceChildren();
    const battle = adventure.combat ?? adventure.lastBattle;
    this.#panel.hidden = !battle;
    if (!battle) return;
    const heading = createElement(
      "h3",
      `${battle.monster.name} · Lv.${battle.monster.level}`,
    );
    heading.id = "combat-heading";
    heading.tabIndex = -1;
    this.#panel.append(
      createElement(
        "p",
        adventure.isInCombat
          ? `전투 중 · ${battle.round + 1}번째 행동`
          : "전투 결과",
        "eyebrow",
      ),
      heading,
    );
    if (adventure.isInCombat) this.#renderBattle(battle, adventure.character);
    else this.#renderOutcome(battle);
  }

  /** 새 턴이나 전투 결과 제목에 초점과 화면 위치를 맞춰 매번 본문 위로 돌아가지 않게 합니다. */
  focus() {
    const heading = getElement("combat-heading");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  /** 적·플레이어 기력, 고정 보상과 행동 버튼을 표시합니다. 치료가 소진되었거나 기력이 가득 차면 치료 버튼을 잠급니다. */
  #renderBattle(battle, character) {
    this.#panel.append(
      createElement("p", battle.monster.description, "combat-description"),
      createElement(
        "p",
        `적 기력 ${battle.enemyHealth} / ${battle.monster.health} · 방어 ${battle.monster.defense} · 나의 기력 ${character.health} / ${character.maxHealth}`,
        "combat-health",
      ),
      createElement(
        "p",
        `승리 시 ${battle.reward.amount} XP · 기본 ${battle.reward.base} × ${Math.round(battle.reward.multiplier * 100)}% (전투 시작 레벨 기준)`,
        "combat-reward",
      ),
    );
    const meter = createElement("progress");
    meter.max = battle.monster.health;
    meter.value = battle.enemyHealth;
    meter.setAttribute("aria-label", "적의 남은 기력");
    this.#panel.append(meter);
    // 전투 화면은 최근 두 턴만 보여 길이를 제한합니다. 전체 이력은 기록서에서 확인할 수 있습니다.
    this.#renderTurns(battle.turns.slice(-2));
    const actions = createElement("div", undefined, "combat-actions");
    for (const [actionId, action] of Object.entries(COMBAT_ACTIONS)) {
      const button = createElement("button", undefined, "combat-action");
      button.dataset.combatAction = actionId;
      button.append(
        createElement("strong", action.name),
        createElement(
          "span",
          actionId === "recover"
            ? `${action.detail} · 남은 ${battle.remedies}회`
            : action.detail,
        ),
      );
      // 화면에서도 불가능하거나 불필요한 치료를 잠급니다. 소진 여부는 도메인에서도 별도로 검사합니다.
      button.disabled =
        actionId === "recover" &&
        (battle.remedies === 0 || character.health === character.maxHealth);
      button.addEventListener("click", () => this.#onAction(actionId));
      actions.append(button);
    }
    this.#panel.append(actions);
  }

  /** 승패·실제 획득 경험치를 표시하고 이전 레벨보다 올랐으면 성장 안내를 덧붙입니다. */
  #renderOutcome(battle) {
    const labels = {
      victory: "승리",
      defeat: "패배 · 야영지에서 회복하세요",
      escaped: "후퇴 완료",
    };
    this.#panel.append(
      createElement(
        "p",
        `${labels[battle.status]} · 획득 ${battle.earnedExperience} XP`,
        "combat-reward",
      ),
    );
    if (battle.level > battle.previousLevel) {
      this.#panel.append(
        createElement(
          "p",
          `레벨 업! Lv.${battle.previousLevel} → Lv.${battle.level} · 최대 기력과 모든 능력치가 증가하고 기력을 전부 회복했습니다.`,
          "level-up",
        ),
      );
    }
    this.#renderTurns(battle.turns.slice(-1));
  }

  /** 전달받은 최근 턴만 표시합니다. 전체 기록은 기록서에 남고 role=status는 갱신 내용을 보조기술에 알립니다. */
  #renderTurns(turns) {
    const log = createElement("div", undefined, "combat-log");
    log.setAttribute("role", "status");
    for (const turn of turns) {
      log.append(createElement("strong", turn.label));
      for (const line of turn.lines) log.append(createElement("p", line));
    }
    this.#panel.append(log);
  }
}
