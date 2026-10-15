/**
 * @file 모험 정보를 Markdown 문자열로 바꿉니다. DOM이나 파일 다운로드에는 의존하지 않습니다.
 * 문자열 생성과 다운로드를 분리해 Node 테스트에서도 같은 내보내기를 검증할 수 있습니다.
 */

import { SCENES } from "./data/scenes.mjs";

/** 파일 다운로드와 분리된 Markdown 생성기. Node에서도 검증할 수 있습니다. */
export class JournalExporter {
  /** 캐릭터 요약 → 단서 → 시간순 행동·판정·전투 → 현재 장면 순으로 문서를 만듭니다. 모험 상태는 바꾸지 않습니다. */
  toMarkdown(adventure) {
    const character = adventure.character;
    // 배열에 문서의 각 줄을 모은 뒤 마지막에 줄바꿈으로 합칩니다.
    const lines = [
      "# 잿빛 서약 — 모험 기록",
      "",
      `출신: ${character.origin.name}`,
      `기력: ${character.health}/${character.maxHealth}`,
      `레벨: ${character.level} · 누적 경험치: ${character.experience} XP`,
      `결말: ${adventure.scene.title}`,
      "",
      "## 발견한 단서",
      ...adventure.clues.map((clue) => `- ${clue}`),
      "",
      "## 나의 선택",
    ];
    if (adventure.isFinished) {
      const summary = adventure.endingSummary;
      lines.splice(
        1,
        0,
        "",
        `첫 서약: ${summary.firstOath}`,
        `마지막 서약: ${summary.lastOath}`,
        `전투 승리: ${summary.victories}회 · 책임 규명 증거: ${summary.evidence}/${summary.evidenceTotal}`,
      );
    }
    for (const entry of adventure.history) {
      lines.push("", `### ${SCENES[entry.scene].title}`, entry.label);
      if (entry.result) {
        const result = entry.result;
        lines.push(
          `판정: ${result.roll} + ${result.bonus} / 난이도 ${result.dc} · ${result.success ? "성공" : "실패"}`,
          result.text,
        );
      }
      if (entry.combat) lines.push(...entry.combat.lines);
    }
    lines.push("", "## 에필로그", ...adventure.scene.paragraphs);
    return lines.join("\n");
  }
}
