import { STAT_NAMES } from "../data/origins.mjs";
import { createElement, getElement } from "./dom.mjs";

export class StoryView {
  #onChoose;

  constructor(onChoose) {
    this.#onChoose = onChoose;
  }

  render(adventure) {
    const scene = adventure.scene;
    getElement("location").textContent = scene.place;
    getElement("chapter").textContent = scene.chapter;
    getElement("scene-number").textContent =
      `${String(adventure.choiceCount + 1).padStart(2, "0")} / I`;
    getElement("scene-title").textContent = scene.title;
    getElement("quote").textContent = scene.quote ?? "";
    getElement("quote").hidden = !scene.quote;
    getElement("ending-tools").hidden = !adventure.isComplete;
    this.#renderProse(adventure);
    this.#renderCheck(adventure.lastCheck);
    this.#renderChoices(adventure.choices);
  }

  focusHeading() {
    getElement("scene-title").focus({ preventScroll: true });
  }

  scrollToScene() {
    this.focusHeading();
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    getElement("chapter").scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "start",
    });
  }

  #renderProse(adventure) {
    const prose = getElement("prose");
    prose.replaceChildren(
      ...adventure.scene.paragraphs.map((text) => createElement("p", text)),
    );
    if (adventure.character.isWounded) {
      prose.prepend(
        createElement(
          "div",
          "부상 · 몸은 지쳤지만 여정은 계속됩니다. 네라가 당신을 부축합니다.",
          "wounded",
        ),
      );
    }
  }

  #renderCheck(result) {
    const container = getElement("roll-result");
    container.replaceChildren();
    container.hidden = !result;
    if (!result) return;

    const outcome = result.success ? "판정 성공" : "판정 실패";
    const label = `${outcome} · ${STAT_NAMES[result.stat]} ${result.roll} + ${result.bonus} / 난이도 ${result.dc}`;
    const description = createElement("div");
    description.append(
      createElement("div", label, "roll-label"),
      createElement("p", result.text),
    );
    container.className = `roll-result ${result.success ? "success" : "failure"}`;
    container.append(
      createElement("div", String(result.roll), "die"),
      description,
    );
  }

  #renderChoices(choices) {
    const buttons = choices.map((choice, index) =>
      this.#createChoiceButton(choice, index),
    );
    getElement("choices").replaceChildren(...buttons);
  }

  #createChoiceButton(choice, index) {
    const button = createElement("button", undefined, "choice");
    const description = createElement("span");
    description.append(
      createElement("span", choice.label, "choice-title"),
      createElement("span", choice.detail, "choice-detail"),
    );
    button.append(
      createElement("span", String(index + 1).padStart(2, "0"), "choice-index"),
      description,
      createElement("span", "→", "choice-arrow"),
    );
    button.addEventListener("click", () => this.#onChoose(choice.id));
    return button;
  }
}
