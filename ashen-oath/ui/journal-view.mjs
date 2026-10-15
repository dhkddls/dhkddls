import { LORE } from "../data/lore.mjs";
import { SCENES } from "../data/scenes.mjs";
import { createElement, getElement } from "./dom.mjs";

export class JournalView {
  #activeTab = "quest";
  #adventure;
  #content = getElement("journal-content");
  #tabs = [...document.querySelectorAll('[role="tab"]')];

  constructor() {
    this.#tabs.forEach((button, index) => {
      button.addEventListener("click", () =>
        this.selectTab(button.dataset.tab),
      );
      button.addEventListener("keydown", (event) =>
        this.#handleTabKey(event, index),
      );
    });
  }

  selectTab(tab) {
    this.#activeTab = tab;
    if (this.#adventure) this.render(this.#adventure);
  }

  reset() {
    this.#activeTab = "quest";
  }

  render(adventure) {
    this.#adventure = adventure;
    this.#renderTabs();
    this.#content.replaceChildren();
    switch (this.#activeTab) {
      case "quest":
        this.#renderQuest();
        break;
      case "lore":
        this.#renderLore();
        break;
      case "log":
        this.#renderHistory();
        break;
    }
  }

  #renderTabs() {
    for (const button of this.#tabs) {
      const selected = button.dataset.tab === this.#activeTab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    this.#content.setAttribute("aria-labelledby", `tab-${this.#activeTab}`);
  }

  #handleTabKey(event, index) {
    const last = this.#tabs.length - 1;
    const destinations = {
      ArrowRight: (index + 1) % this.#tabs.length,
      ArrowLeft: (index + last) % this.#tabs.length,
      Home: 0,
      End: last,
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    const button = this.#tabs[destinations[event.key]];
    button.click();
    button.focus();
  }

  #renderQuest() {
    const adventure = this.#adventure;
    this.#content.append(
      createElement(
        "span",
        adventure.isComplete ? "COMPLETED" : "MAIN QUEST",
        "quest-category",
      ),
      createElement("h3", "사라진 이름을 찾아서", "quest-title"),
      createElement(
        "p",
        "새벽의 대봉헌이 시작되기 전, 침묵한 종과 사라진 주민들의 관계를 밝혀내세요.",
        "quest-desc",
      ),
    );
    this.#renderObjectives();
    this.#renderClues();
  }

  #renderObjectives() {
    const adventure = this.#adventure;
    const objectives = [
      { label: "서리여울에 도착하기", done: adventure.hasVisited("inn") },
      {
        label: "사라진 이들의 흔적 찾기",
        done: adventure.hasVisited("crossroads"),
      },
      { label: "종 아래의 진실 마주하기", done: adventure.hasVisited("heart") },
      { label: "첫 번째 서약 선택하기", done: adventure.isComplete },
    ];
    const list = createElement("ul", undefined, "objectives");
    for (const objective of objectives) {
      const item = createElement("li");
      item.append(
        createElement("span", objective.done ? "✓" : "◇", "objective-icon"),
        document.createTextNode(objective.label),
      );
      list.append(item);
    }
    this.#content.append(list);
  }

  #renderClues() {
    const clues = this.#adventure.clues;
    this.#content.append(
      createElement(
        "p",
        `발견한 단서 · ${String(clues.length).padStart(2, "0")}`,
        "clue-heading",
      ),
    );
    if (!clues.length) {
      this.#content.append(
        createElement(
          "p",
          "아직 기록된 단서가 없습니다. 사람들의 말과 오래된 기록에 귀를 기울이세요.",
          "quest-desc",
        ),
      );
    }
    for (const clue of clues)
      this.#content.append(createElement("div", `✧ ${clue}`, "clue"));
  }

  #renderLore() {
    this.#content.append(
      createElement(
        "p",
        "여행 전에 알아둘 이야기들. 이 기록은 모험의 결말을 드러내지 않습니다.",
        "lore-hint",
      ),
    );
    for (const entry of LORE) {
      const details = createElement("details");
      const summary = createElement("summary");
      const title = createElement("span");
      title.append(
        createElement("span", entry.tag, "lore-tag"),
        document.createTextNode(entry.title),
      );
      summary.append(title);
      details.append(summary, createElement("p", entry.body));
      this.#content.append(details);
    }
  }

  #renderHistory() {
    const history = this.#adventure.history;
    if (!history.length)
      this.#content.append(
        createElement("p", "첫 번째 선택을 기다리고 있습니다.", "quest-desc"),
      );
    for (const entry of history.reverse()) {
      const item = createElement("div", undefined, "log-item");
      item.append(
        createElement("strong", SCENES[entry.scene].title),
        createElement("p", entry.label),
      );
      if (entry.result) {
        const result = entry.result;
        const label = `d20 ${result.roll} + ${result.bonus} / 난이도 ${result.dc} · ${result.success ? "성공" : "실패"}`;
        item.append(
          createElement("div", label, "log-roll"),
          createElement("p", result.text),
        );
      }
      this.#content.append(item);
    }
  }
}
