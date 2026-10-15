/**
 * @file 전투와 성장 회귀 검사. 실제 선택 흐름을 따라 승패·경험치·저장 복구를 검증합니다.
 * 고정 주사위를 사용해 운에 따라 테스트 결과가 달라지지 않도록 합니다.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  Adventure,
  Character,
  SkillCheck,
  ExperiencePolicy,
} from "./engine.mjs";
import { MONSTERS } from "./data/monsters.mjs";
import { JournalExporter } from "./journal-exporter.mjs";

// 전투 테스트 준비: 원하는 출신·첫 결말로 중반부에 진입합니다.
// setRolls는 다음 행동의 주사위를 지정하고, 비어 있으면 20을 사용합니다.
function journey(origin = "warden", ending = "restore") {
  let rolls = [];
  const dice = new SkillCheck(() => ((rolls.shift() ?? 20) - 1) / 20);
  const game = new Adventure(origin, dice);
  for (const choiceId of [
    "lantern",
    "archive",
    "blueprint",
    "descend",
    "true-name",
    ending,
  ])
    game.choose(choiceId);
  game.continueJourney();
  game.choose("reach-camp");
  return {
    game,
    dice,
    setRolls: (values) => {
      rolls = [...values];
    },
  };
}

// 플레이어 20·적 1을 매 행동 공급해 승리를 재현하고 매 턴 저장 복구 결과도 확인합니다.
// 40회 제한은 진행이 멈추는 버그가 있으면 테스트가 끝없이 돌지 않고 실패하게 합니다.
function winBattle(run, actionId = "attack") {
  let rounds = 0;
  while (run.game.isInCombat) {
    assert.ok(rounds++ < 40, "전투가 종료되어야 합니다.");
    run.setRolls([20, 1]);
    run.game.performCombatAction(actionId);
    const snapshot = run.game.toSnapshot();
    assert.deepEqual(Adventure.fromSnapshot(snapshot).toSnapshot(), snapshot);
  }
  assert.equal(run.game.lastBattle.status, "victory");
}

// 첫 전투를 끝내고 반복 전투 거점으로 이동하는 공통 준비 과정입니다.
function reachForge(run) {
  run.game.choose("first-wolf");
  winBattle(run);
  run.game.choose("track-foundry");
}

// 검증 목적: 플레이어−적의 부호 방향, 같은 레벨, 배율 상하한과 소수 경험치 반올림을 검증합니다.
test("경험치는 플레이어가 높으면 증가하고 낮으면 감소하며 범위를 벗어나지 않는다", () => {
  const monster = { level: 3, experience: 100 };
  assert.equal(ExperiencePolicy.reward(monster, 3).amount, 100);
  assert.equal(ExperiencePolicy.reward(monster, 4).amount, 125);
  assert.equal(ExperiencePolicy.reward(monster, 2).amount, 75);
  assert.equal(ExperiencePolicy.reward(monster, 1).amount, 50);
  assert.equal(
    ExperiencePolicy.reward({ level: 10, experience: 100 }, 1).amount,
    25,
  );
  assert.equal(ExperiencePolicy.reward(monster, 20).amount, 200);
  assert.equal(ExperiencePolicy.warning(monster, 3), null);
  assert.match(ExperiencePolicy.warning(monster, 2), /높습니다.*감소/);
  assert.match(ExperiencePolicy.warning(monster, 4), /낮습니다.*증가/);
  assert.equal(ExperiencePolicy.reward(MONSTERS["reed-wolf"], 2).amount, 63);
});

// 검증 목적: 79→80의 정확한 경계와 한 번에 여러 레벨 상승, 최고 레벨 이후 누적을 구분해 확인합니다.
test("레벨 경계와 여러 단계 성장을 처리하고 최대 기력·능력치도 증가한다", () => {
  const character = new Character("scribe");
  character.gainExperience(79);
  assert.equal(character.level, 1);
  character.takeDamage(5);
  character.gainExperience(1);
  assert.equal(character.level, 2);
  assert.equal(character.maxHealth, 14);
  assert.equal(character.health, 14);
  assert.equal(character.bonusFor("wit"), 5);
  assert.deepEqual(character.experienceProgress, { current: 0, required: 120 });
  character.gainExperience(540);
  assert.equal(character.level, 5);
  assert.equal(character.maxHealth, 26);
  assert.equal(character.experienceProgress.required, null);
  character.gainExperience(1000);
  assert.equal(character.level, 5);
  assert.throws(() => character.gainExperience(-1));
});

// 검증 목적: 출신 3종 × 첫 결말 3종을 끝까지 진행해 어느 경로도 성장과 보스 보상에서 막히지 않는지 확인합니다.
test("세 출신과 세 초반 결말에서 중반부로 이어지고 보스를 처치해 성장한다", () => {
  for (const origin of ["warden", "scribe", "ranger"]) {
    for (const ending of ["restore", "break", "bargain"]) {
      const run = journey(origin, ending);
      reachForge(run);
      assert.equal(run.game.character.experience, 50);
      for (let i = 0; i < 4; i++) {
        run.game.choose("hunt-wolf", { acceptLevelMismatch: true });
        winBattle(run);
      }
      assert.equal(run.game.character.level, 3);
      run.game.choose("break-sentinel");
      winBattle(run, "power");
      assert.equal(run.game.character.level, 4);
      run.game.choose("copy-orders");
      run.game.choose("face-keeper");
      winBattle(run, "power");
      assert.equal(run.game.sceneId, "act2-ending");
      assert.equal(run.game.canContinue, false);
      assert.ok(run.game.character.experience > 500);
      assert.ok(run.game.clues.includes("주조소 공동 증언"));
      assert.match(
        new JournalExporter().toMarkdown(run.game),
        /획득 경험치 160 XP/,
      );
      const experience = run.game.character.experience;
      assert.throws(() => run.game.performCombatAction("attack"));
      assert.equal(run.game.character.experience, experience);
    }
  }
});

// 검증 목적: 레벨 경고는 전투 시작 전에 적용되어야 하므로 거절 전후 스냅샷이 완전히 같은지 비교합니다.
test("권장 레벨 불일치는 확인 전 진행·저장·보상을 바꾸지 않는다", () => {
  const run = journey();
  reachForge(run);
  const before = run.game.toSnapshot();
  const preview = run.game.encounterPreview("hunt-knight");
  assert.equal(preview.reward.amount, 33);
  assert.ok(preview.warning);
  assert.throws(() => run.game.choose("hunt-knight"), /레벨 차이/);
  assert.deepEqual(run.game.toSnapshot(), before);
  run.game.choose("hunt-knight", { acceptLevelMismatch: true });
  assert.equal(run.game.isInCombat, true);
  assert.throws(() => run.game.choose("rest-forge"));
});

// 검증 목적: 높은 적에게 일부러 패배한 뒤 휴식·후퇴를 이어서 경험치가 잘못 지급되거나 사라지지 않는지 확인합니다.
test("패배와 후퇴는 경험치를 지급하지 않으며 회복 후 재도전할 수 있다", () => {
  const run = journey();
  reachForge(run);
  const experience = run.game.character.experience;
  run.game.choose("hunt-knight", { acceptLevelMismatch: true });
  while (run.game.isInCombat) {
    run.setRolls([1, 20]);
    run.game.performCombatAction("attack");
  }
  assert.equal(run.game.lastBattle.status, "defeat");
  assert.equal(run.game.lastBattle.earnedExperience, 0);
  assert.equal(run.game.character.health, 1);
  assert.equal(run.game.character.experience, experience);
  assert.equal(run.game.sceneId, "forge-camp");
  assert.deepEqual(
    Adventure.fromSnapshot(run.game.toSnapshot()).toSnapshot(),
    run.game.toSnapshot(),
  );
  run.game.choose("rest-forge");
  assert.equal(run.game.character.health, run.game.character.maxHealth);
  assert.equal(run.game.character.experience, experience);
  run.game.choose("hunt-hound", { acceptLevelMismatch: true });
  run.game.performCombatAction("flee");
  assert.equal(run.game.lastBattle.status, "escaped");
  assert.equal(run.game.character.experience, experience);
});

// 검증 목적: 공격과 치료가 섞인 진행을 복구하고, 남은 처치와 적 기력을 보존하며 새 난수도 쓰는지 확인합니다.
test("전투 중 저장은 적 기력·행동 기록·처치 횟수를 복원하고 이후 새 주사위를 쓴다", () => {
  const run = journey();
  run.game.choose("first-wolf");
  run.setRolls([1, 20]);
  run.game.performCombatAction("attack");
  run.setRolls([1]);
  run.game.performCombatAction("recover");
  const snapshot = run.game.toSnapshot();
  const restored = Adventure.fromSnapshot(snapshot, new SkillCheck(() => 0));
  assert.deepEqual(restored.toSnapshot(), snapshot);
  assert.equal(restored.combat.remedies, 1);
  restored.performCombatAction("attack");
  assert.deepEqual(restored.combat.turns.at(-1).rolls, [1, 1]);
  assert.notDeepEqual(restored.combat, run.game.combat);
  const clone = run.game.clone();
  clone.performCombatAction("flee");
  assert.equal(run.game.isInCombat, true);
});

// 검증 목적: 보상·수치는 저장값을 믿지 않지만 주사위는 유효한 입력이어야 한다는 복구 원칙을 검증합니다.
test("조작된 경험치·적 기력·보상은 무시하고 잘못된 전투 주사위 기록은 거부한다", () => {
  const run = journey();
  run.game.choose("first-wolf");
  run.setRolls([1, 1]);
  run.game.performCombatAction("attack");
  const original = run.game.toSnapshot();
  const forged = structuredClone(original);
  forged.experience = 99999;
  forged.level = 5;
  forged.hp = 999;
  forged.combat.enemyHealth = 0;
  forged.combat.reward.amount = 99999;
  assert.deepEqual(Adventure.fromSnapshot(forged).toSnapshot(), original);
  const invalid = structuredClone(original);
  invalid.log.at(-1).combat.rolls = [21, 1];
  assert.equal(Adventure.fromSnapshot(invalid), null);
  invalid.log.at(-1).combat.rolls = [1];
  assert.equal(Adventure.fromSnapshot(invalid), null);
  invalid.log.at(-1).combat.rolls = [1, 1, 1];
  assert.equal(Adventure.fromSnapshot(invalid), null);
});

// 검증 목적: 치료 2회 소진 뒤 세 번째 요청이 라운드·기력·로그를 바꾸지 않는지 확인합니다.
test("응급 처치는 두 번으로 제한하고 소진된 행동은 턴을 소비하지 않는다", () => {
  const run = journey();
  run.game.choose("first-wolf");
  for (let i = 0; i < 2; i++) {
    run.setRolls([1]);
    run.game.performCombatAction("recover");
  }
  const before = run.game.toSnapshot();
  assert.throws(() => run.game.performCombatAction("recover"), /모두 사용/);
  assert.deepEqual(run.game.toSnapshot(), before);
});

// 검증 목적: 보스에게서 후퇴해도 이전에 연 통로와 확보한 물건이 유지되는지 확인합니다.
test("보관실을 연 뒤 후퇴하면 야영지에서 통로로 바로 재진입할 수 있다", () => {
  const run = journey();
  reachForge(run);
  run.game.choose("break-sentinel", { acceptLevelMismatch: true });
  winBattle(run);
  run.game.choose("copy-orders");
  run.game.choose("face-keeper", { acceptLevelMismatch: true });
  run.game.performCombatAction("flee");
  assert.equal(run.game.sceneId, "forge-camp");
  assert.ok(run.game.choices.some((choice) => choice.id === "shortcut-vault"));
  run.game.choose("rest-forge");
  run.game.choose("shortcut-vault");
  assert.equal(run.game.sceneId, "vault-door");
  assert.ok(run.game.character.items.includes("제9보관소 출고 명령"));
});
