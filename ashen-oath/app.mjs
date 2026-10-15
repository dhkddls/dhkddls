import { Adventure } from "./engine.mjs";
import { SaveRepository } from "./save-repository.mjs";
import { JournalExporter } from "./journal-exporter.mjs";
import { GameView } from "./ui/game-view.mjs";

/** 사용자 행동을 게임 진행 → 저장 → 화면 갱신 순서로 연결합니다. */
class GameApplication {
  #adventure;
  #saveRepository;
  #journalExporter;
  #gameView;

  constructor({
    saves = new SaveRepository(),
    exporter = new JournalExporter(),
  } = {}) {
    this.#saveRepository = saves;
    this.#journalExporter = exporter;
    this.#gameView = new GameView({
      onChoose: (choiceId) => this.#choose(choiceId),
      onOriginSelected: (originId) => this.#selectOrigin(originId),
      onRestart: () => this.#restart(),
      onExport: () => this.#exportJournal(),
    });
  }

  start() {
    const savedAdventure = this.#saveRepository.load();
    this.#adventure = savedAdventure ?? new Adventure();
    this.#render();
    if (!savedAdventure) this.#gameView.showOriginDialog();
  }

  #choose(choiceId) {
    this.#adventure.choose(choiceId);
    this.#saveAndRender({ focusScene: true });
  }

  #selectOrigin(originId) {
    this.#adventure = new Adventure(originId);
    this.#saveAndRender();
  }

  #restart() {
    this.#adventure = new Adventure();
    this.#gameView.resetJournal();
    this.#saveAndRender({ focusScene: true });
    this.#gameView.showOriginDialog();
  }

  #exportJournal() {
    this.#gameView.exportJournal(
      this.#journalExporter.toMarkdown(this.#adventure),
    );
  }

  #saveAndRender(options) {
    this.#saveRepository.save(this.#adventure);
    this.#render(options);
  }

  #render(options) {
    this.#gameView.render(
      this.#adventure,
      this.#saveRepository.available,
      options,
    );
  }
}

new GameApplication().start();
