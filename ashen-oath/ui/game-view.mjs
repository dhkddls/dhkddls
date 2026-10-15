/**
 * @file 화면 구성 관리자. 캐릭터·이야기·전투·기록서 View를 조합하고 대화상자를 연결합니다.
 * 버튼은 콜백으로 GameApplication에 의도를 알리고, 게임 상태를 직접 바꾸지 않습니다.
 */

import { ORIGINS, STAT_NAMES } from "../data/origins.mjs";
import { CharacterView } from "./character-view.mjs";
import { StoryView } from "./story-view.mjs";
import { JournalView } from "./journal-view.mjs";
import { CombatView } from "./combat-view.mjs";
import { createElement, getElement, downloadText } from "./dom.mjs";

/** 화면 구성과 DOM 이벤트만 처리하고 게임 규칙은 콜백에 위임합니다. */
export class GameView {
  // 각 하위 View가 담당 패널만 갱신하도록 역할을 나눕니다.
  #characterView = new CharacterView();
  #storyView;
  #journalView = new JournalView();
  #combatView;
  // 경고 확인을 기다리는 전투 시작 함수. 취소·실행 후 비워 오래된 요청이 남지 않게 합니다.
  #pendingEncounter = null;
  // 파일 내용이 검증되어도 확인 전에는 현재 진행을 교체하지 않습니다.
  #pendingSaveImport = null;
  // HTML dialog 요소를 한곳에서 참조합니다. showModal은 배경 조작을 잠급니다.
  #dialogs = {
    origin: getElement("origin-dialog"),
    help: getElement("help-dialog"),
    restart: getElement("restart-dialog"),
    encounter: getElement("encounter-dialog"),
    saveImport: getElement("save-import-dialog"),
  };

  /** 컨트롤러 콜백을 각 화면과 버튼에 연결합니다. 각 하위 View는 자신의 DOM 영역만 갱신합니다. */
  constructor({
    onChoose,
    onOriginSelected,
    onRestart,
    onExport,
    onContinue,
    onCombatAction,
    onBackupSave,
    onImportSave,
  }) {
    this.#storyView = new StoryView(onChoose);
    this.#combatView = new CombatView(onCombatAction);
    this.#renderOriginCards(onOriginSelected);
    this.#bindDialogButtons(onRestart);
    getElement("export").addEventListener("click", onExport);
    getElement("continue-journey").addEventListener("click", onContinue);
    this.#bindEncounterDialog();
    this.#bindSaveControls(onBackupSave, onImportSave);
  }

  /** 모든 패널을 같은 모험 상태로 갱신하고 저장 상태를 표시합니다. 전투 중에는 전투 제목으로 초점을 옮깁니다. */
  render(adventure, storageAvailable, { focusScene = false } = {}) {
    getElement("save-message").hidden = true;
    this.#characterView.render(adventure);
    this.#storyView.render(adventure);
    this.#journalView.render(adventure);
    this.#combatView.render(adventure);
    getElement("save-status").textContent = storageAvailable
      ? "선택할 때마다 이 브라우저에 자동 저장"
      : "저장 불가 · 이 탭을 닫으면 진행이 사라집니다";
    if (focusScene) {
      if (adventure.isInCombat || adventure.lastBattle)
        this.#combatView.focus();
      else this.#storyView.scrollToScene();
    }
  }

  /** 큰 파일과 읽기 실패를 처리합니다. JSON과 게임 기록의 검증은 컨트롤러에 위임합니다. */
  #bindSaveControls(onBackupSave, onImportSave) {
    const input = getElement("save-file");
    getElement("backup-save").addEventListener("click", onBackupSave);
    getElement("load-save").addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files[0];
      input.value = "";
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        this.showSaveError("진행 파일은 5MB 이하의 JSON이어야 합니다.");
        return;
      }
      try {
        onImportSave(await file.text());
      } catch {
        this.showSaveError(
          "파일을 읽을 수 없습니다. 현재 모험은 그대로 유지했습니다.",
        );
      }
    });
    getElement("cancel-import").addEventListener("click", () => {
      this.#pendingSaveImport = null;
      this.#dialogs.saveImport.close();
    });
    this.#dialogs.saveImport.addEventListener("cancel", () => {
      this.#pendingSaveImport = null;
    });
    getElement("confirm-import").addEventListener("click", () => {
      const confirm = this.#pendingSaveImport;
      this.#pendingSaveImport = null;
      this.#dialogs.saveImport.close();
      confirm?.();
    });
  }

  /** 검증된 기록의 위치를 보여주고 현재 진행을 덮어쓰기 전에 확인합니다. */
  confirmSaveImport(adventure, onConfirm) {
    this.#pendingSaveImport = onConfirm;
    getElement("import-description").textContent =
      `${adventure.character.origin.name} · Lv.${adventure.character.level} · ${adventure.scene.title}. 현재 진행이 이 기록으로 교체됩니다.`;
    this.#dialogs.saveImport.showModal();
  }

  /** 오류 메시지는 텍스트로만 넣고 현재 화면의 게임 상태를 보존합니다. */
  showSaveError(message) {
    const container = getElement("save-message");
    container.textContent = message;
    container.hidden = false;
  }

  /** 기계가 복구할 수 있는 JSON이며, 읽기용 Markdown 기록과 구분합니다. */
  exportSave(json) {
    downloadText(json, "잿빛-서약-진행.json", "application/json;charset=utf-8");
  }

  /** 실제 전투는 시작하지 않고 경고·보상을 표시합니다. onConfirm은 확인 버튼을 눌러야 실행됩니다. */
  confirmEncounter(preview, onConfirm) {
    this.#pendingEncounter = onConfirm;
    getElement("encounter-title").textContent =
      `${preview.monster.name}에게 도전할까요?`;
    getElement("encounter-warning").textContent = preview.warning;
    getElement("encounter-reward").textContent =
      `승리 보상 ${preview.reward.amount} XP = 기본 ${preview.reward.base} × ${Math.round(preview.reward.multiplier * 100)}%. 패배·후퇴 시 보상은 없습니다.`;
    this.#dialogs.encounter.showModal();
  }

  /** 취소·Esc는 대기 중 콜백을 버립니다. 확인은 콜백을 먼저 꺼내 비운 후 한 번만 실행합니다. */
  #bindEncounterDialog() {
    getElement("cancel-encounter").addEventListener("click", () => {
      this.#pendingEncounter = null;
      this.#dialogs.encounter.close();
    });
    this.#dialogs.encounter.addEventListener("cancel", () => {
      this.#pendingEncounter = null;
    });
    getElement("confirm-encounter").addEventListener("click", () => {
      const confirm = this.#pendingEncounter;
      this.#pendingEncounter = null;
      this.#dialogs.encounter.close();
      confirm?.();
    });
  }

  /** 기본 dialog를 모달로 열어 출신 선택 동안 배경 버튼 조작을 막습니다. */
  showOriginDialog() {
    this.#dialogs.origin.showModal();
  }

  /** 새 게임의 기록서를 여정 탭으로 돌립니다. 진행 초기화 자체는 GameApplication이 맡습니다. */
  resetJournal() {
    this.#journalView.reset();
  }

  /** 생성된 Markdown을 정해진 한국어 파일명으로 내려받습니다. */
  exportJournal(markdown) {
    downloadText(markdown, "잿빛-서약-모험기록.md");
  }

  /** 안내·출신·다시 시작 창의 열기와 닫기를 연결합니다. 초기화는 확인 버튼에서만 요청합니다. */
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

  /** 출신 설정을 카드로 만들고 선택된 originId만 컨트롤러에 전달합니다. 실제 캐릭터는 컨트롤러가 생성합니다. */
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
