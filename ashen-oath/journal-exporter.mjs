import { Character } from "./engine.mjs";
import { SCENES } from "./data/scenes.mjs";

/** 파일 다운로드와 분리된 Markdown 생성기. Node에서도 검증할 수 있습니다. */
export class JournalExporter {
  toMarkdown(adventure) {
    const character = adventure.character;
    const lines = [
      "# 잿빛 서약 — 모험 기록",
      "",
      `출신: ${character.origin.name}`,
      `기력: ${character.health}/${Character.MAX_HEALTH}`,
      `결말: ${adventure.scene.title}`,
      "",
      "## 발견한 단서",
      ...adventure.clues.map((clue) => `- ${clue}`),
      "",
      "## 나의 선택",
    ];
    for (const entry of adventure.history) {
      lines.push("", `### ${SCENES[entry.scene].title}`, entry.label);
      if (entry.result) {
        const result = entry.result;
        lines.push(
          `판정: ${result.roll} + ${result.bonus} / 난이도 ${result.dc} · ${result.success ? "성공" : "실패"}`,
          result.text,
        );
      }
    }
    lines.push("", "## 에필로그", ...adventure.scene.paragraphs);
    return lines.join("\n");
  }
}
