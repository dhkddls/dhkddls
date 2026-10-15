/**
 * @file 왼쪽 캐릭터 패널을 갱신합니다. 능력치와 성장 수치는 Character에서 읽기만 합니다.
 * 레벨 계산이나 피해 처리는 domain/에 있어 표시 방식과 게임 규칙을 따로 바꿀 수 있습니다.
 */

import { STAT_NAMES } from "../data/origins.mjs";
import { createElement, getElement } from "./dom.mjs";

export class CharacterView {
  /** 출신 설명·현재 능력치·기력·경험치·소지품을 한 번에 갱신합니다. 성장 수치는 Character가 계산합니다. */
  render(adventure) {
    const character = adventure.character;
    const origin = character.origin;
    getElement("class-icon").textContent = origin.icon;
    getElement("class-name").textContent = origin.name;
    getElement("class-subtitle").textContent = origin.subtitle;
    this.#renderOriginButton(adventure.hasStarted);
    this.#renderHealth(character);
    this.#renderStats(character.stats);
    this.#renderProgression(character);
    getElement("inventory").replaceChildren(
      ...character.items.map((item) => createElement("li", item)),
    );
  }

  /** 첫 행동 이후 출신 변경을 잠가 진행 중 캐릭터가 교체되지 않게 합니다. */
  #renderOriginButton(hasStarted) {
    const button = getElement("choose-origin");
    button.disabled = hasStarted;
    button.textContent = hasStarted
      ? "여정이 시작되었습니다"
      : "출신 선택하기 →";
  }

  /** 현재/최대 기력을 표시하고 그 비율을 백분율 너비로 바꿉니다. 최대치는 레벨에 따라 달라집니다. */
  #renderHealth(character) {
    getElement("health-value").textContent =
      `${character.health} / ${character.maxHealth}`;
    getElement("health-bar").style.width =
      `${(character.health / character.maxHealth) * 100}%`;
  }

  /** 레벨 구간 내 경험치 비율을 표시합니다. 최고 레벨은 분모가 없으므로 막대를 100%로 채웁니다. */
  #renderProgression(character) {
    // 누적 경험치 자체가 아니라 현재 레벨 구간의 진행량으로 막대를 그립니다.
    const progress = character.experienceProgress;
    getElement("player-level").textContent = `Lv.${character.level}`;
    getElement("experience-value").textContent =
      progress.required === null
        ? `최고 레벨 · 누적 ${character.experience} XP`
        : `${progress.current} / ${progress.required} XP`;
    getElement("experience-bar").style.width =
      progress.required === null
        ? "100%"
        : `${(progress.current / progress.required) * 100}%`;
  }

  /** 능력치 키를 한국어 이름으로 바꾸고 보정값 카드를 만듭니다. */
  #renderStats(stats) {
    const cards = Object.entries(stats).map(([stat, bonus]) => {
      const card = createElement("div", undefined, "stat");
      card.append(
        createElement("span", STAT_NAMES[stat]),
        createElement("strong", `+${bonus}`),
      );
      return card;
    });
    getElement("stats").replaceChildren(...cards);
  }
}
