/**
 * @file 현재 장면의 본문, 이야기 판정, 선택지와 막 종료 버튼을 표시합니다.
 * DOM의 id는 index.html과 연결되는 약속이며, 선택의 유효성은 Adventure가 판단합니다.
 */

import { STAT_NAMES } from "../data/origins.mjs";
import { ACT_PRESENTATION } from "../data/campaign.mjs";
import { createElement, getElement } from "./dom.mjs";

export class StoryView {
  // 버튼 클릭을 컨트롤러로 전달할 함수. 콜백 인수는 선택지 ID입니다.
  #onChoose;

  /** 선택지 ID를 받을 콜백을 보관합니다. 화면에서는 그 선택의 결과를 계산하지 않습니다. */
  constructor(onChoose) {
    this.#onChoose = onChoose;
  }

  /** 막·장소·본문·판정·선택지를 갱신합니다. 막 사이에는 계속하기, 완결에서는 결과 요약을 표시합니다. */
  render(adventure) {
    const scene = adventure.scene;
    getElement("location").textContent = scene.place;
    const act = ACT_PRESENTATION[adventure.actNumber];
    getElement("act-label").textContent = act.label;
    getElement("footer-chapter").textContent = act.footer;
    getElement("scene-art").dataset.act = String(adventure.actNumber);
    getElement("scene-art").setAttribute("aria-label", act.art);
    getElement("chapter").textContent = scene.chapter;
    getElement("scene-number").textContent =
      `${String(adventure.choiceCount + 1).padStart(2, "0")} / ${act.numeral}`;
    getElement("scene-title").textContent = scene.title;
    getElement("quote").textContent = scene.quote ?? "";
    getElement("quote").hidden = !scene.quote;
    getElement("ending-tools").hidden = !adventure.isComplete;
    getElement("continue-journey").hidden = !adventure.canContinue;
    getElement("continue-journey").textContent = adventure.continuationLabel;
    getElement("ending-note").textContent = adventure.isFinished
      ? "잿빛 서약 · 완결. 당신의 선택과 후일담을 모험 기록으로 남길 수 있습니다."
      : adventure.actNumber === 2
        ? "증거를 지니고 왕도로 향하세요. 최종막에서는 Lv.8까지 성장할 수 있습니다."
        : "첫 번째 서약을 기억한 채, 전투와 성장이 기다리는 중반부로 이어집니다.";
    this.#renderEndingSummary(adventure.endingSummary);
    getElement("prose").hidden = adventure.isInCombat;
    this.#renderProse(adventure);
    this.#renderCheck(adventure.lastCheck);
    this.#renderChoices(adventure);
  }

  /** 실제 플레이의 첫·마지막 서약, 전투 승리와 증거 수집량을 완결 화면에 남깁니다. */
  #renderEndingSummary(summary) {
    const container = getElement("ending-summary");
    container.replaceChildren();
    container.hidden = !summary;
    if (!summary) return;
    container.append(createElement("h3", "당신이 남긴 서약"));
    const list = createElement("dl", undefined, "ending-statistics");
    for (const [label, value] of [
      ["첫 번째 서약", summary.firstOath],
      ["마지막 서약", summary.lastOath],
      ["최종 성장", `Lv.${summary.level} · ${summary.experience} XP`],
      ["전투 승리", `${summary.victories}회`],
      ["책임 규명 증거", `${summary.evidence} / ${summary.evidenceTotal}`],
    ])
      list.append(createElement("dt", label), createElement("dd", value));
    container.append(
      list,
      createElement("p", "THE ASHEN OATH · 끝", "ending-credits"),
    );
  }

  /** 키보드·보조기술 사용자가 새 제목을 읽도록 초점만 옮깁니다. 스크롤은 여기서 바꾸지 않습니다. */
  focusHeading() {
    getElement("scene-title").focus({ preventScroll: true });
  }

  /** 제목에 초점을 둔 뒤 장면 시작으로 스크롤합니다. 동작 줄이기 설정이 있으면 애니메이션을 생략합니다. */
  scrollToScene() {
    this.focusHeading();
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    getElement("chapter").scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "start",
    });
  }

  /** 문단을 텍스트 요소로 교체하고 기력 1이면 현재 막에 맞는 부상 안내를 덧붙입니다. */
  #renderProse(adventure) {
    const prose = getElement("prose");
    prose.replaceChildren(
      ...adventure.scene.paragraphs.map((text) => createElement("p", text)),
    );
    if (adventure.character.isWounded) {
      prose.prepend(
        createElement(
          "div",
          adventure.actNumber === 3
            ? "부상 · 은신처나 확보한 통로에서 회복하고 다음 전투를 준비하세요."
            : adventure.isMidgame
              ? "부상 · 야영지에서 휴식하고 다음 전투를 준비하세요."
              : "부상 · 몸은 지쳤지만 여정은 계속됩니다. 네라가 당신을 부축합니다.",
          "wounded",
        ),
      );
    }
  }

  /** 판정이 있을 때만 주사위·보정·난이도·결과를 보여줍니다. 이전 표시를 먼저 비워 중복을 막습니다. */
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

  /** Adventure가 허용한 선택만 버튼으로 만듭니다. 전투 선택은 미리보기 보상과 경고도 함께 전달합니다. */
  #renderChoices(adventure) {
    const buttons = adventure.choices.map((choice, index) =>
      this.#createChoiceButton(
        choice,
        index,
        adventure.encounterPreview(choice.id),
      ),
    );
    getElement("choices").replaceChildren(...buttons);
  }

  /** 화면 문구와 순번을 만들고 클릭 시 고정 ID만 전달합니다. 배율 표시는 1.25를 125%로 바꿉니다. */
  #createChoiceButton(choice, index, preview) {
    const button = createElement("button", undefined, "choice");
    const description = createElement("span");
    description.append(
      createElement("span", choice.label, "choice-title"),
      createElement("span", choice.detail, "choice-detail"),
    );
    if (preview) {
      const reward = `${preview.reward.amount} XP · 기본 ${preview.reward.base} × ${Math.round(preview.reward.multiplier * 100)}%`;
      description.append(createElement("span", reward, "encounter-reward"));
      if (preview.warning)
        description.append(
          createElement(
            "span",
            "⚠ 레벨 차이 안내 확인 후 도전",
            "encounter-warning",
          ),
        );
    }
    button.append(
      createElement("span", String(index + 1).padStart(2, "0"), "choice-index"),
      description,
      createElement("span", "→", "choice-arrow"),
    );
    button.addEventListener("click", () => this.#onChoose(choice.id));
    return button;
  }
}
