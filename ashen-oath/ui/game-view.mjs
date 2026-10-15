import { ORIGINS, STAT_NAMES } from "../data/origins.mjs";
import { CharacterView } from "./character-view.mjs";
import { StoryView } from "./story-view.mjs";
import { JournalView } from "./journal-view.mjs";
import { createElement, getElement, downloadText } from "./dom.mjs";

/** 화면 구성과 DOM 이벤트만 처리하고 게임 규칙은 콜백에 위임합니다. */
export class GameView {
  #characterView = new CharacterView();
  #storyView;
  #journalView = new JournalView();
  #dialogs = {
    origin: getElement("origin-dialog"),
    help: getElement("help-dialog"),
    restart: getElement("restart-dialog"),
  };

  constructor({ onChoose, onOriginSelected, onRestart, onExport }) {
    this.#storyView = new StoryView(onChoose);
    this.#renderOriginCards(onOriginSelected);
    this.#bindDialogButtons(onRestart);
    getElement("export").addEventListener("click", onExport);
  }

  render(adventure, storageAvailable, { focusScene = false } = {}) {
    this.#characterView.render(adventure);
    this.#storyView.render(adventure);
    this.#journalView.render(adventure);
    getElement("save-status").textContent = storageAvailable
      ? "선택할 때마다 이 브라우저에 자동 저장"
      : "저장 불가 · 이 탭을 닫으면 진행이 사라집니다";
    if (focusScene) this.#storyView.scrollToScene();
  }

  showOriginDialog() {
    this.#dialogs.origin.showModal();
  }

  resetJournal() {
    this.#journalView.reset();
  }

  exportJournal(markdown) {
    downloadText(markdown, "잿빛-서약-모험기록.md");
  }

  #bindDialogButtons(onRestart) {
    getElement("choose-origin").addEventListener("click", () =>
      this.showOriginDialog(),
    );
    getElement("help").addEventListener("click", () =>
      this.#dialogs.help.showModal(),
    );
    getElement("restart").addEventListener("click", () =>
      this.#dialogs.restart.showModal(),
    );
    getElement("cancel-restart").addEventListener("click", () =>
      this.#dialogs.restart.close(),
    );
    getElement("confirm-restart").addEventListener("click", () => {
      this.#dialogs.restart.close();
      onRestart();
    });
  }

  #renderOriginCards(onOriginSelected) {
    const cards = Object.entries(ORIGINS).map(([originId, origin]) => {
      const button = createElement("button", undefined, "origin-card");
      const stats = Object.entries(origin.stats)
        .map(([stat, bonus]) => `${STAT_NAMES[stat]} +${bonus}`)
        .join("  ·  ");
      button.append(
        createElement("strong", `${origin.icon} ${origin.name}`),
        createElement("p", origin.text),
        createElement("small", stats),
      );
      button.addEventListener("click", () => {
        this.#dialogs.origin.close();
        onOriginSelected(originId);
        this.#storyView.focusHeading();
      });
      return button;
    });
    getElement("origins").replaceChildren(...cards);
  }
}
