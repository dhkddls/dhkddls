/**
 * @file 브라우저 실행 시작점. 사용자 입력을 Adventure에 전달하고 저장한 뒤 GameView를 갱신합니다.
 * 게임 규칙은 domain/, 화면 생성은 ui/에 있어 이 파일에서는 순서만 조율합니다.
 */

import { Adventure } from "./engine.mjs";
import { SaveRepository } from "./save-repository.mjs";
import { JournalExporter } from "./journal-exporter.mjs";
import { GameView } from "./ui/game-view.mjs";

/** 사용자 행동을 게임 진행 → 저장 → 화면 갱신 순서로 연결합니다. */
class GameApplication {
  // 진행 중인 모험 모델입니다. 화면에 표시되는 수치의 기준이 됩니다.
  #adventure;
  // 브라우저 저장소 읽기·쓰기 담당 객체입니다.
  #saveRepository;
  // 다운로드할 모험 기록을 문자열로 만드는 객체입니다.
  #journalExporter;
  // 모든 화면과 대화상자를 조합하는 객체입니다.
  #gameView;

  /**
   * 저장소와 내보내기 객체를 받고, 화면 콜백을 이 객체의 메서드에 연결합니다.
   * 화살표 함수는 이벤트에서 호출되어도 this가 GameApplication을 가리키게 합니다.
   */
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
      onContinue: () => this.#continueJourney(),
      onCombatAction: (actionId) => this.#combatAction(actionId),
      onBackupSave: () => this.#backupSave(),
      onImportSave: (raw) => this.#prepareImport(raw),
      onOpenSlots: () => this.#openSlots(),
      onSaveSlot: (slot) => this.#saveSlot(slot),
      onLoadSlot: (slot) => this.#loadSlot(slot),
    });
  }

  /** 저장 기록이 있으면 복구하고, 없으면 기본 출신으로 새 모험을 만듭니다. 처음 시작할 때만 출신 선택창을 엽니다. */
  start() {
    // ??는 왼쪽이 null 또는 undefined일 때만 오른쪽 새 게임을 사용한다는 뜻입니다.
    const savedAdventure = this.#saveRepository.load();
    this.#adventure = savedAdventure ?? new Adventure();
    this.#render();
    if (!savedAdventure) this.#gameView.showOriginDialog();
  }

  /** 행동을 적용하기 전에 전투의 레벨 차이를 조회합니다. 경고가 있으면 확인 콜백을 넘기고 여기서 멈춥니다. */
  #choose(choiceId) {
    const preview = this.#adventure.encounterPreview(choiceId);
    // ?.는 일반 이동처럼 preview가 null이어도 안전하게 경고 유무를 확인합니다.
    if (preview?.warning) {
      this.#gameView.confirmEncounter(preview, () =>
        this.#commitChoice(choiceId, true),
      );
      return;
    }
    this.#commitChoice(choiceId, false);
  }

  /**
   * 확인된 행동을 게임에 적용한 뒤 저장하고 새 장면으로 초점을 옮깁니다.
   * acceptLevelMismatch는 레벨 차이 안내를 수락했는지 나타냅니다.
   */
  #commitChoice(choiceId, acceptLevelMismatch) {
    this.#adventure.choose(choiceId, { acceptLevelMismatch });
    this.#saveAndRender({ focusScene: true });
  }

  /** 막 사이를 이동하고 새 구간의 성장 상한을 포함해 즉시 저장합니다. */
  #continueJourney() {
    this.#adventure.continueJourney();
    this.#saveAndRender({ focusScene: true });
  }

  /** 공격·치료·후퇴 한 번을 처리하고, 적 기력과 행동 기록까지 함께 저장합니다. */
  #combatAction(actionId) {
    this.#adventure.performCombatAction(actionId);
    this.#saveAndRender({ focusScene: true });
  }

  /** 출신 선택에 맞는 새 모험을 생성합니다. 출신 선택 버튼은 여정 시작 뒤 비활성화됩니다. */
  #selectOrigin(originId) {
    this.#adventure = new Adventure(originId);
    this.#saveAndRender();
  }

  /** 진행을 새 객체로 초기화하고 기록서 탭도 여정으로 되돌립니다. 확인창 수락 뒤에만 호출됩니다. */
  #restart() {
    this.#adventure = new Adventure();
    this.#gameView.resetJournal();
    this.#saveAndRender({ focusScene: true });
    this.#gameView.showOriginDialog();
  }

  /** 게임을 Markdown으로 변환한 뒤 화면 계층에 다운로드를 요청합니다. */
  #exportJournal() {
    this.#gameView.exportJournal(
      this.#journalExporter.toMarkdown(this.#adventure),
    );
  }

  /** 실행 파일 교체나 다른 브라우저로의 이동에 사용할 JSON 백업을 만듭니다. */
  #backupSave() {
    this.#gameView.exportSave(
      JSON.stringify(this.#adventure.toSnapshot(), null, 2),
    );
  }

  /** 입력 기록을 먼저 검증하고, 사용자가 확인했을 때만 현재 진행을 교체합니다. */
  #prepareImport(raw) {
    const restored = SaveRepository.decode(raw);
    if (!restored) {
      this.#gameView.showSaveError(
        "유효한 진행 파일이 아닙니다. 현재 모험은 그대로 유지했습니다.",
      );
      return;
    }
    this.#gameView.confirmSaveImport(restored, () => {
      this.#adventure = restored;
      this.#gameView.resetJournal();
      this.#saveAndRender({ focusScene: true });
    });
  }

  /** 자동 저장과 분리한 슬롯 목록을 열고, 저장 권한이 없으면 원인을 알립니다. */
  #openSlots() {
    this.#gameView.showSlots(this.#saveRepository.listSlots());
  }

  /** 빈 슬롯 저장도 확인하고, 덮어쓰기는 현재 슬롯의 장면을 함께 보여줍니다. */
  #saveSlot(slot) {
    const info = this.#saveRepository
      .listSlots()
      .find((entry) => entry.slot === slot);
    if (!info || info.unavailable) {
      this.#gameView.showSlotMessage(
        "이 브라우저에서는 저장소에 접근할 수 없습니다. 진행 백업을 이용하세요.",
      );
      return;
    }
    this.#gameView.confirmSlotAction(
      `슬롯 ${slot}에 저장할까요?`,
      info.exists
        ? `기존 기록(${info.title ?? "손상된 기록"})을 현재 여정으로 교체합니다.`
        : `${this.#adventure.scene.title}의 현재 진행을 저장합니다.`,
      () => {
        const saved = this.#saveRepository.saveSlot(slot, this.#adventure);
        this.#gameView.showSlots(this.#saveRepository.listSlots());
        this.#gameView.showSlotMessage(
          saved
            ? `슬롯 ${slot}에 저장했습니다. 자동 저장과 별도로 보존됩니다.`
            : "슬롯 저장에 실패했습니다. 기존 기록은 지우지 않았습니다. 진행 백업을 이용하세요.",
        );
      },
    );
  }

  /** 확인 전에는 현재 진행을 유지합니다. 다시 검증한 기록만 자동 저장과 화면에 적용합니다. */
  #loadSlot(slot) {
    const restored = this.#saveRepository.loadSlot(slot);
    if (!restored) {
      this.#gameView.showSlotMessage(
        "불러올 수 없는 기록입니다. 현재 여정은 그대로 유지했습니다.",
      );
      return;
    }
    this.#gameView.confirmSlotAction(
      `슬롯 ${slot}을 불러올까요?`,
      `${restored.character.origin.name} · Lv.${restored.character.level} · ${restored.scene.title}. 현재 진행이 이 기록으로 교체됩니다.`,
      () => {
        this.#adventure = restored;
        this.#gameView.closeSlots();
        this.#gameView.resetJournal();
        this.#saveAndRender({ focusScene: true });
      },
    );
  }

  /** 게임 변경 뒤의 공통 순서입니다. 저장 성공 여부도 화면에 전달하도록 저장을 먼저 시도합니다. */
  #saveAndRender(options) {
    this.#saveRepository.save(this.#adventure);
    this.#render(options);
  }

  /** 현재 모험과 저장 가능 여부를 화면에 넘깁니다. options는 초점 이동 같은 표시 옵션입니다. */
  #render(options) {
    this.#gameView.render(
      this.#adventure,
      this.#saveRepository.available,
      options,
    );
  }
}

// 모듈을 불러온 뒤 한 번 실행합니다. 실제 DOM 참조는 index.html이 파싱된 이후에 이루어집니다.
new GameApplication().start();
