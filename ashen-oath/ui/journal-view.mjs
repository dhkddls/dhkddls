/**
 * @file 여정·세계관·기록 탭을 관리합니다. 선택된 탭은 화면 상태이고 모험 저장 정보가 아닙니다.
 * 방문 기록과 행동 이력은 Adventure에서 읽어 목표와 지난 사건을 표시합니다.
 */

import { LORE } from "../data/lore.mjs";
import { SCENES } from "../data/scenes.mjs";
import { createElement, getElement } from "./dom.mjs";

export class JournalView {
  // 화면에서 선택된 탭 ID: quest / lore / log. 게임 규칙에는 영향을 주지 않습니다.
  #activeTab = "quest";
  // 가장 최근 render로 전달된 모험. 탭만 바뀔 때도 같은 진행을 표시합니다.
  #adventure;
  // 탭 내용이 들어가는 공통 영역입니다.
  #content = getElement("journal-content");
  // NodeList를 배열로 바꿔 방향키로 앞뒤 탭을 찾기 쉽게 합니다.
  #tabs = [...document.querySelectorAll('[role="tab"]')];

  /** 각 탭의 클릭과 방향키 입력을 한 번 연결합니다. 반복 렌더링 때 이벤트가 중복 등록되지 않습니다. */
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

  /** 표시할 탭을 바꾸고 모험 데이터가 들어온 뒤라면 내용도 즉시 다시 그립니다. */
  selectTab(tab) {
    this.#activeTab = tab;
    if (this.#adventure) this.render(this.#adventure);
  }

  /** 새 게임용 탭 상태만 초기화합니다. 렌더링은 새 모험이 준비된 뒤 호출합니다. */
  reset() {
    this.#activeTab = "quest";
  }

  /** 최신 모험을 보관하고 현재 탭 내용만 다시 만듭니다. 게임 진행 자체는 변경하지 않습니다. */
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

  /** 선택 상태와 Tab 키 진입점을 하나로 맞춥니다. aria-labelledby는 본문과 선택된 탭을 연결합니다. */
  #renderTabs() {
    for (const button of this.#tabs) {
      const selected = button.dataset.tab === this.#activeTab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    this.#content.setAttribute("aria-labelledby", `tab-${this.#activeTab}`);
  }

  /** 좌우 키는 순환 이동, Home·End는 처음·끝으로 이동합니다. 브라우저의 기본 스크롤 대신 탭 이동을 수행합니다. */
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

  /** 현재 막의 목표 소개를 표시한 뒤 세부 체크리스트와 발견 단서를 붙입니다. */
  #renderQuest() {
    const adventure = this.#adventure;
    this.#content.append(
      createElement(
        "span",
        adventure.isComplete ? "COMPLETED" : "MAIN QUEST",
        "quest-category",
      ),
      createElement(
        "h3",
        adventure.isMidgame ? "기억의 운송장을 찾아서" : "사라진 이름을 찾아서",
        "quest-title",
      ),
      createElement(
        "p",
        adventure.isMidgame
          ? "야영지에서 경험을 쌓고 별무덤 주조소를 조사해 제9보관소의 반출 증거를 확보하세요."
          : "새벽의 대봉헌이 시작되기 전, 침묵한 종과 사라진 주민들의 관계를 밝혀내세요.",
        "quest-desc",
      ),
    );
    this.#renderObjectives();
    this.#renderClues();
  }

  /** 방문한 장면으로 목표 완료 여부를 계산합니다. 따로 완료 플래그를 저장하지 않아 진행과 어긋나지 않습니다. */
  #renderObjectives() {
    const adventure = this.#adventure;
    const objectives = adventure.isMidgame
      ? [
          {
            label: "염로의 첫 전투에서 승리하기",
            done: adventure.hasVisited("road-trace"),
          },
          {
            label: "밀랍 파수병을 넘어 기록실 조사",
            done: adventure.hasVisited("foundry-truth"),
          },
          {
            label: "제9보관소의 출고 명령 확보",
            done: adventure.hasVisited("vault-door"),
          },
          {
            label: "문지기를 멈추고 기억 용기 보호",
            done: adventure.sceneId === "act2-ending",
          },
        ]
      : [
          { label: "서리여울에 도착하기", done: adventure.hasVisited("inn") },
          {
            label: "사라진 이들의 흔적 찾기",
            done: adventure.hasVisited("crossroads"),
          },
          {
            label: "종 아래의 진실 마주하기",
            done: adventure.hasVisited("heart"),
          },
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

  /** 단서 개수와 목록을 표시합니다. 아직 없을 때는 빈 화면 대신 탐색 안내를 넣습니다. */
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

  /** 세계관 항목을 기본 details/summary 요소로 만들어 별도 펼침 상태 코드 없이 열고 닫게 합니다. */
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

  /** 복사한 이력을 역순으로 표시합니다. 이야기 판정과 전투 문장을 모두 보여주되 원래 저장 순서는 건드리지 않습니다. */
  #renderHistory() {
    const history = this.#adventure.history;
    if (!history.length)
      this.#content.append(
        createElement("p", "첫 번째 선택을 기다리고 있습니다.", "quest-desc"),
      );
    // history는 복사본이므로 reverse()가 저장된 시간순 이력을 바꾸지 않습니다.
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
      if (entry.combat) {
        for (const line of entry.combat.lines)
          item.append(createElement("p", line));
      }
      this.#content.append(item);
    }
  }
}
