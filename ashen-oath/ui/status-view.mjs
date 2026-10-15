/** @file 상태 이상 이름·효과·남은 횟수와 회복 방법만 표시합니다. 규칙은 Character가 계산합니다. */
import { createElement, getElement } from "./dom.mjs";

export class StatusView {
  /** 캐릭터가 반환한 복사본으로 다시 그려 오래된 상태 카드가 남지 않게 합니다. */
  render(character) {
    const panel = getElement("status-effects");
    panel.replaceChildren(createElement("h3", "상태 이상"));
    if (!character.statuses.length) {
      panel.append(createElement("p", "상태 이상 없음", "status-clear"));
      return;
    }
    for (const effect of character.statuses) {
      const card = createElement("div", undefined, "status-card");
      card.append(
        createElement("strong", `${effect.name} · 남은 ${effect.remaining}회`),
        createElement("p", effect.effect),
        createElement("small", effect.lore),
      );
      panel.append(card);
    }
    panel.append(
      createElement(
        "p",
        "다음 판정·공격·응급 처치마다 1회 소모. 이동·후퇴는 소모하지 않습니다. 휴식: 전부 해제 / 응급 처치: 먼저 걸린 상태 1개 해제. 레벨업으로는 해제되지 않습니다.",
        "status-help",
      ),
    );
  }
}
