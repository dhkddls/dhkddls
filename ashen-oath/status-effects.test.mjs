/** @file 상태 이상 수치, 지속 순서, 전투·회복과 이전 규칙 경계를 실제 입력으로 검증합니다. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  Adventure,
  Character,
  CombatSession,
  SkillCheck,
  StatusEffects,
} from "./engine.mjs";
import { JournalExporter } from "./journal-exporter.mjs";
import { newRun } from "./test-support/campaign.mjs";

/** 적은 쓰러지지 않을 만큼만 강하게 하여 지속 횟수와 반격을 분리해서 검사합니다. */
const trainingEnemy = {
  id: "test",
  name: "검사 수호체",
  level: 1,
  health: 100,
  defense: 12,
  attack: 0,
  damage: 2,
  experience: 0,
};
/** 지정한 주사위만 순서대로 공급합니다. 부족하면 검사가 실패합니다. */
function dice(...rolls) {
  return new SkillCheck(() => {
    assert.ok(rolls.length);
    return (rolls.shift() - 1) / 20;
  });
}
/** 실제 구버전 코드로 작성한 고정 기록입니다. */
function oldSave(name) {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  );
}

test("세 효과는 이야기 능력치와 명중·피해·방어에 각각 고정 감소량을 적용한다", () => {
  const c = new Character();
  const stats = c.baseStats;
  c.applyStatus("wound");
  assert.equal(c.bonusFor("might"), stats.might - 2);
  assert.equal(c.attackDamage, 4);
  assert.equal(c.attackBonus, 4);
  c.applyStatus("fog");
  assert.equal(c.bonusFor("wit"), -1);
  assert.equal(c.attackBonus, 2);
  assert.equal(c.attackDamage, 4);
  c.applyStatus("dread");
  assert.equal(c.bonusFor("spirit"), 0);
  assert.equal(c.defense, 8);
  assert.deepEqual(c.baseStats, stats);
  assert.equal(c.statuses.length, 3);
});

test("같은 효과는 강도·개수를 중첩하지 않고 남은 3회만 갱신한다", () => {
  const effects = new StatusEffects();
  effects.apply("fog");
  effects.advance();
  effects.advance();
  assert.equal(effects.active[0].remaining, 1);
  effects.apply("fog");
  assert.equal(effects.active.length, 1);
  assert.equal(effects.active[0].remaining, 3);
  assert.equal(effects.combatPenalty("attack"), 2);
  const copy = effects.clone();
  copy.advance();
  assert.equal(effects.active[0].remaining, 3);
  const exposed = effects.active;
  exposed[0].remaining = 999;
  assert.equal(effects.active[0].remaining, 3);
  assert.throws(() => effects.apply("__proto__"));
});

test("무력·통찰·의지 실패마다 설정에 맞는 효과가 다음 행동 3회로 새로 걸린다", () => {
  for (const [ids, expected] of [
    [["listen"], "dread"],
    [["lantern", "archive", "blueprint"], "fog"],
    [["lantern", "archive", "shelves"], "wound"],
  ]) {
    const g = new Adventure("warden", new SkillCheck(() => 0));
    for (const id of ids) g.choose(id);
    assert.equal(g.character.statuses[0].id, expected);
    assert.equal(g.character.statuses[0].remaining, 3);
    assert.match(g.lastCheck.statusChanges[0], /상태 이상/);
    assert.deepEqual(
      Adventure.fromSnapshot(g.toSnapshot()).toSnapshot(),
      g.toSnapshot(),
    );
  }
});

test("이동은 기간을 소모하지 않고 다음 판정에는 감소량을 적용한 뒤 기간을 소모한다", () => {
  const g = new Adventure("warden", new SkillCheck(() => 0));
  for (const id of ["lantern", "archive", "blueprint", "more-chapel"])
    g.choose(id);
  assert.equal(g.character.statuses[0].remaining, 3);
  const restored = Adventure.fromSnapshot(g.toSnapshot(), dice(14));
  restored.choose("rubbing");
  assert.equal(restored.lastCheck.bonus, -1);
  assert.equal(restored.lastCheck.baseBonus, 1);
  assert.equal(restored.lastCheck.statusPenalty, 2);
  assert.equal(restored.lastCheck.success, true);
  assert.equal(restored.character.statuses[0].remaining, 2);
  assert.deepEqual(
    Adventure.fromSnapshot(restored.toSnapshot()).toSnapshot(),
    restored.toSnapshot(),
  );
});

test("상태 감소를 포함한 난이도 경계에서도 자연 20 성공·자연 1 실패를 유지한다", () => {
  const c = new Character();
  c.applyStatus("fog");
  const choice = {
    check: { stat: "wit", dc: 12 },
    success: "성공",
    failure: "실패",
  };
  assert.equal(dice(13).resolve(choice, c).success, true);
  assert.equal(dice(12).resolve(choice, c).success, false);
  assert.equal(
    dice(20).resolve({ ...choice, check: { stat: "wit", dc: 999 } }, c).success,
    true,
  );
  assert.equal(
    dice(1).resolve({ ...choice, check: { stat: "wit", dc: -999 } }, c).success,
    false,
  );
});

test("자연 1과 명중 합계 부족 모두 공포를 남기고 다음 반격부터 방어를 낮춘다", () => {
  for (const missedRoll of [1, 7]) {
    const c = new Character();
    const b = new CombatSession(trainingEnemy, c);
    b.act("attack", c, dice(missedRoll, 8)); // 7 + 4도 적 방어 12에 미달합니다.
    assert.equal(c.health, 10);
    assert.equal(c.statuses[0].remaining, 3);
    b.act("attack", c, dice(20, 8));
    assert.equal(c.health, 8);
    assert.equal(c.statuses[0].remaining, 2);
    assert.match(b.toSnapshot().turns[0].lines.join("\n"), /메아리 공포/);
  }
});

test("세 번째 전투 행동의 반격까지 효과를 적용하고 이후 자동 해제한다", () => {
  const c = new Character();
  c.applyStatus("dread");
  const b = new CombatSession(trainingEnemy, c);
  for (let i = 0; i < 3; i++) b.act("attack", c, dice(20, 8));
  assert.equal(c.health, 4);
  assert.deepEqual(c.statuses, []);
  assert.match(b.toSnapshot().turns.at(-1).lines.join("\n"), /지속 종료/);
  b.act("attack", c, dice(20, 8));
  assert.equal(c.health, 4);
});

test("기력이 가득해도 응급 처치로 먼저 걸린 효과 하나를 해제하고 적은 행동한다", () => {
  const c = new Character();
  c.applyStatus("fog");
  c.applyStatus("dread");
  const b = new CombatSession(trainingEnemy, c);
  b.act("recover", c, dice(8));
  assert.equal(c.health, 8);
  assert.equal(b.toSnapshot().remedies, 1);
  assert.deepEqual(
    c.statuses.map((e) => [e.id, e.remaining]),
    [["dread", 2]],
  );
  assert.equal(c.attackBonus, 4);
  assert.match(b.toSnapshot().turns[0].lines.join("\n"), /기억 혼탁 해제/);
});

test("레벨업은 효과를 유지하고 휴식은 전부 해제하며 복제본은 독립적이다", () => {
  const c = new Character();
  c.applyStatus("fog");
  c.applyStatus("wound");
  c.takeDamage(4);
  c.gainExperience(80);
  assert.equal(c.health, c.maxHealth);
  assert.equal(c.statuses.length, 2);
  const clone = c.clone();
  clone.rest();
  assert.equal(clone.statuses.length, 0);
  assert.equal(c.statuses.length, 2);
  c.rest();
  assert.deepEqual(c.statuses, []);
  assert.equal(c.attackBonus, 5);
});

test("후퇴와 거절된 행동은 기간을 소모하지 않으며 막 사이의 회복은 모두 해제한다", () => {
  const run = newRun();
  run.game.continueJourney();
  run.game.choose("reach-camp");
  run.game.choose("first-wolf");
  run.setRolls([1, 1]);
  run.game.performCombatAction("attack");
  const remaining = run.game.character.statuses[0].remaining;
  assert.throws(() => run.game.choose("rest-forge"));
  assert.equal(run.game.character.statuses[0].remaining, remaining);
  run.game.performCombatAction("flee");
  assert.equal(run.game.character.statuses[0].remaining, remaining);
  const g = new Adventure("warden", new SkillCheck(() => 0));
  for (const id of [
    "lantern",
    "archive",
    "blueprint",
    "descend",
    "true-name",
    "restore",
  ])
    g.choose(id);
  assert.ok(g.character.statuses.length);
  g.continueJourney();
  assert.deepEqual(g.character.statuses, []);
});

test("이전 실패에는 소급하지 않고 v3로 저장한 뒤에도 새 행동의 효과만 정확히 재생한다", () => {
  const old = oldSave("v2-failed-check");
  const g = Adventure.fromSnapshot(old, dice(1));
  assert.deepEqual(g.character.statuses, []);
  assert.equal(g.character.health, old.hp);
  g.choose("archive");
  g.choose("blueprint");
  assert.deepEqual(
    g.character.statuses.map((e) => e.id),
    ["fog"],
  );
  assert.equal(g.toSnapshot().debuffsFrom, old.log.length);
  assert.deepEqual(
    Adventure.fromSnapshot(g.toSnapshot()).toSnapshot(),
    g.toSnapshot(),
  );
  const original = oldSave("v2-failed-combat");
  const active = Adventure.fromSnapshot(original, dice(1, 1));
  assert.deepEqual(active.combat, original.combat);
  assert.deepEqual(active.character.statuses, []);
  active.performCombatAction("attack");
  assert.equal(active.character.statuses[0].id, "dread");
  assert.deepEqual(
    Adventure.fromSnapshot(active.toSnapshot()).toSnapshot(),
    active.toSnapshot(),
  );
});

test("현재 상태·HP의 저장값 변조는 무시하고 잘못된 적용 시작점은 거부한다", () => {
  const g = new Adventure("warden", dice(1));
  g.choose("listen");
  const original = g.toSnapshot();
  const forged = structuredClone(original);
  forged.statuses = [{ id: "fog", remaining: 999 }];
  forged.hp = 999;
  assert.deepEqual(Adventure.fromSnapshot(forged).toSnapshot(), original);
  for (const bad of [-1, 0.5, original.log.length + 1, null]) {
    const invalid = { ...original, debuffsFrom: bad };
    assert.equal(Adventure.fromSnapshot(invalid), null);
  }
});

test("효과가 남은 상태의 기록·백업은 수치와 횟수를 보존하고 Markdown에도 실패 대가를 남긴다", () => {
  const g = new Adventure("warden", dice(1));
  g.choose("listen");
  const snapshot = g.toSnapshot();
  const journal = new JournalExporter().toMarkdown(g);
  assert.match(journal, /메아리 공포/);
  assert.match(journal, /남은 3회/);
  const copy = g.clone();
  copy.choose("archive");
  assert.deepEqual(g.toSnapshot(), snapshot);
  assert.deepEqual(
    Adventure.fromSnapshot(snapshot).character.statuses,
    g.character.statuses,
  );
});
