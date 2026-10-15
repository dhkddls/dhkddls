/** @file 왕도부터 완결까지의 진행, 이전 저장 수치, 최종 보스 재도전과 후일담을 검증합니다. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  Adventure,
  Character,
  ExperiencePolicy,
  SkillCheck,
} from "./engine.mjs";
import { SaveRepository } from "./save-repository.mjs";
import { JournalExporter } from "./journal-exporter.mjs";
import { SCENES } from "./data/scenes.mjs";
import { MONSTERS } from "./data/monsters.mjs";
import { CHAPTER_TRANSITIONS } from "./data/campaign.mjs";
import {
  newRun,
  reachCapital,
  reachLastOath,
  trainTo,
  winFight,
} from "./test-support/campaign.mjs";

/** 변경 전 실제 v2 기록을 읽습니다. 현재 코드로 만든 기대값을 사용하지 않습니다. */
function fixture(name) {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  );
}

test("변경 전 v2 저장은 높은 누적 경험치와 전투 중 수치까지 정확히 복원한다", () => {
  for (const name of [
    "v2-act2-complete",
    "v2-high-experience",
    "v2-failed-check",
    "v2-failed-combat",
  ]) {
    const original = fixture(name);
    const game = SaveRepository.decode(JSON.stringify(original));
    assert.ok(game);
    assert.deepEqual(game.toSnapshot(), {
      ...original,
      version: 4,
      tacticsFrom: original.log.length,
      debuffsFrom: original.log.length,
      statuses: [],
    });
  }
  const high = Adventure.fromSnapshot(fixture("v2-high-experience"));
  assert.equal(high.character.level, 5);
  assert.equal(high.character.levelCap, 5);
  assert.equal(high.combat.reward.playerLevel, 5);
});

test("왕도에 진입할 때만 Lv.8 성장을 열고 Lv.6~8 경계를 정확하게 계산한다", () => {
  const character = new Character();
  character.gainExperience(2000);
  assert.equal(character.level, 5);
  character.unlockFinaleGrowth();
  character.rest();
  assert.equal(character.level, 8);
  assert.equal(character.maxHealth, 38);
  assert.equal(character.experienceProgress.required, null);
  assert.equal(character.clone().levelCap, 8);
  for (const [xp, level] of [
    [949, 5],
    [950, 6],
    [1399, 6],
    [1400, 7],
    [1999, 7],
    [2000, 8],
  ]) {
    assert.equal(ExperiencePolicy.levelFor(xp), level);
  }
  const game = Adventure.fromSnapshot(fixture("v2-act2-complete"));
  assert.equal(game.canContinue, true);
  game.continueJourney();
  assert.equal(game.actNumber, 3);
  assert.equal(game.character.levelCap, 8);
  assert.equal(game.character.health, game.character.maxHealth);
  assert.deepEqual(
    Adventure.fromSnapshot(game.toSnapshot()).toSnapshot(),
    game.toSnapshot(),
  );
});

test("3 출신 × 3 첫 서약 × 3 최종 서약을 조사 유무에 따라 모두 완결한다", () => {
  let endings = 0;
  for (const origin of ["warden", "scribe", "ranger"]) {
    for (const firstOath of ["restore", "break", "bargain"]) {
      for (const investigate of [true, false]) {
        const run = newRun(origin, firstOath);
        reachCapital(run);
        reachLastOath(run, { investigate });
        assert.equal(run.game.evidenceCount, investigate ? 3 : 1);
        for (const choice of run.game.choices) {
          const game = run.game.clone();
          game.choose(choice.id);
          endings++;
          assert.equal(game.isFinished, true);
          assert.equal(game.canContinue, false);
          assert.deepEqual(game.choices, []);
          assert.equal(game.character.level, 8);
          assert.ok(game.endingSummary.victories >= 10);
          assert.equal(game.endingSummary.evidence, investigate ? 3 : 1);
          assert.ok(
            game.scene.paragraphs.every(
              (p) => typeof p === "string" && p.trim(),
            ),
          );
          const text = game.scene.paragraphs.join("\n");
          assert.match(text, /이야기는 여기서 끝난다/);
          assert.match(text, /네라.*미르/);
          assert.match(text, /칼드/);
          if (firstOath === "bargain")
            assert.match(text, /시한부 거래도 끝나고/);
          if (firstOath === "break") assert.match(text, /노래/);
          assert.deepEqual(
            Adventure.fromSnapshot(game.toSnapshot()).toSnapshot(),
            game.toSnapshot(),
          );
          const journal = new JournalExporter().toMarkdown(game);
          assert.match(journal, /마지막 서약:/);
          assert.ok(journal.includes(game.scene.paragraphs.at(-1)));
          assert.throws(() => game.continueJourney());
          assert.throws(() => game.performCombatAction("attack"));
        }
      }
    }
  }
  assert.equal(endings, 54);
});

test("왕도 조사와 자백 판정에 실패해도 기본 증거와 모든 마지막 선택에 도달한다", () => {
  const run = newRun();
  reachCapital(run);
  reachLastOath(run, { failChecks: true });
  assert.equal(run.game.evidenceCount, 3);
  assert.ok(!run.game.clues.includes("칼드의 자백"));
  assert.ok(!run.game.clues.includes("백야 삭제 명령"));
  assert.equal(run.game.choices.length, 3);
  run.game.choose("choose-covenant");
  assert.match(run.game.scene.paragraphs.join("\n"), /항변했다/);
  assert.match(run.game.scene.paragraphs.join("\n"), /독립 재판/);
});

test("두 번째 보스 단계에서 후퇴·패배해도 첫 단계를 재생하거나 보상을 중복 지급하지 않는다", () => {
  const run = newRun();
  reachCapital(run);
  trainTo(run, 8);
  const game = run.game;
  game.choose("breach-vault", { acceptLevelMismatch: true });
  winFight(run);
  game.choose("take-experiment-ledger");
  game.choose("preserve-trial");
  game.choose("shatter-crown", { acceptLevelMismatch: true });
  winFight(run);
  const experience = game.character.experience;
  game.choose("face-unwritten");
  game.performCombatAction("flee");
  assert.equal(game.sceneId, "breathing-vault");
  assert.equal(game.character.experience, experience);
  game.choose("train-before-heart");
  assert.ok(game.choices.some((c) => c.id === "return-heart"));
  assert.ok(
    !game.choices.some((c) => ["return-core", "breach-vault"].includes(c.id)),
  );
  game.choose("return-heart");
  game.choose("rest-before-heart");
  game.choose("face-unwritten");
  while (game.isInCombat) {
    run.setRolls([1, 20]);
    game.performCombatAction("attack");
  }
  assert.equal(game.lastBattle.status, "defeat");
  assert.equal(game.sceneId, "breathing-vault");
  assert.equal(game.character.health, 1);
  assert.equal(game.character.experience, experience);
  assert.deepEqual(
    Adventure.fromSnapshot(game.toSnapshot()).toSnapshot(),
    game.toSnapshot(),
  );
  game.choose("rest-before-heart");
  game.choose("face-unwritten");
  winFight(run);
  assert.equal(game.sceneId, "last-oath");
  assert.equal(game.character.experience, experience + 340);
  assert.equal(
    game.history.filter(
      (e) => e.scene === "core-breach" && e.combat?.status === "victory",
    ).length,
    1,
  );
});

test("최종 전투 도중 저장을 복구하고 복제본과 새 주사위를 구분한다", () => {
  const run = newRun();
  reachCapital(run);
  trainTo(run, 8);
  run.game.choose("breach-vault", { acceptLevelMismatch: true });
  winFight(run);
  run.game.choose("take-experiment-ledger");
  run.game.choose("preserve-trial");
  run.game.choose("shatter-crown", { acceptLevelMismatch: true });
  winFight(run);
  run.game.choose("face-unwritten");
  run.setRolls([20, 1]);
  run.game.performCombatAction("attack");
  const snapshot = run.game.toSnapshot();
  const restored = Adventure.fromSnapshot(snapshot, new SkillCheck(() => 0));
  assert.deepEqual(restored.toSnapshot(), snapshot);
  restored.performCombatAction("attack");
  // 두 번째 행동은 힘 모으기이므로 적의 주사위 없이 새 플레이어 주사위만 소비합니다.
  assert.deepEqual(restored.combat.turns.at(-1).rolls, [1]);
  assert.deepEqual(run.game.toSnapshot(), snapshot);
});

test("모든 장면·전투·막 이동 참조가 존재하며 완결 장면에 미구현 이동이 없다", () => {
  for (const [id, scene] of Object.entries(SCENES)) {
    const choiceIds = new Set();
    for (const choice of scene.choices ?? []) {
      assert.ok(!choiceIds.has(choice.id), id);
      choiceIds.add(choice.id);
      assert.ok(SCENES[choice.next], `${id}: ${choice.next}`);
      if (choice.encounter) {
        assert.ok(MONSTERS[choice.encounter]);
        assert.ok(SCENES[choice.retreat]);
      }
      for (const key of ["unvisited", "requiresVisited", "unlessVisited"])
        if (choice[key]) assert.ok(SCENES[choice[key]]);
    }
    if (scene.ending) assert.ok(scene.final || CHAPTER_TRANSITIONS[id], id);
    if (scene.final) {
      assert.equal(scene.choices?.length ?? 0, 0);
      assert.ok(!CHAPTER_TRANSITIONS[id]);
    }
  }
});
