import { Character } from "../engine.mjs";
import { STAT_NAMES } from "../data/origins.mjs";
import { createElement, getElement } from "./dom.mjs";

export class CharacterView {
  render(adventure) {
    const character = adventure.character;
    const origin = character.origin;
    getElement("class-icon").textContent = origin.icon;
    getElement("class-name").textContent = origin.name;
    getElement("class-subtitle").textContent = origin.subtitle;
    this.#renderOriginButton(adventure.hasStarted);
    this.#renderHealth(character);
    this.#renderStats(origin.stats);
    getElement("inventory").replaceChildren(
      ...character.items.map((item) => createElement("li", item)),
    );
  }

  #renderOriginButton(hasStarted) {
    const button = getElement("choose-origin");
    button.disabled = hasStarted;
    button.textContent = hasStarted
      ? "여정이 시작되었습니다"
      : "출신 선택하기 →";
  }

  #renderHealth(character) {
    getElement("health-value").textContent =
      `${character.health} / ${Character.MAX_HEALTH}`;
    getElement("health-bar").style.width =
      `${(character.health / Character.MAX_HEALTH) * 100}%`;
  }

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
