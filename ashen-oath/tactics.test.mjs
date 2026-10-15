/** @file 적 예고·대응·직업 기술·단서·치료·자원과 v3 전투의 무변경 복구를 검증합니다. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  Adventure,
  Character,
  TacticalSession,
  SkillCheck,
  ExperiencePolicy,
} from "./engine.mjs";
import { MONSTERS } from "./data/monsters.mjs";
import { ENEMY_PATTERNS } from "./data/tactics.mjs";
import { SCENES } from "./data/scenes.mjs";
import {
  newRun,
  reachCapital,
  reachLastOath,
} from "./test-support/campaign.mjs";

/** 전투마다 독립 캐릭터와 실제 몬스터 데이터를 사용합니다. */
function battle(id = "crown-engine", origin = "warden", knowledge = []) {
  const c = new Character(origin);
  c.unlockFinaleGrowth();
  c.gainExperience(2000);
  c.rest();
  return { c, b: new TacticalSession(MONSTERS[id], c, { knowledge }) };
}
function dice(...rolls) {
  return new SkillCheck(() => {
    assert.ok(rolls.length, "예상하지 못한 추가 주사위");
    return (rolls.shift() - 1) / 20;
  });
}

// 예고는 화면 확인·저장·복제로 바뀌지 않으며 모든 실제 적에게 순환 패턴이 있습니다.
test("모든 몬스터에 예고 패턴이 있고 저장·복제는 다음 행동을 바꾸지 않는다", () => {
  for (const id of Object.keys(MONSTERS)) {
    const { b } = battle(id);
    assert.ok(ENEMY_PATTERNS[id].length >= 2);
    const before = b.toSnapshot();
    assert.deepEqual(b.clone().toSnapshot(), before);
    assert.deepEqual(b.toSnapshot(), before);
    assert.ok(before.tactics.intent.name);
    assert.ok(before.tactics.intent.detail);
  }
});

test("힘 모으기를 방해하면 다음 강타도 취소되고 대기 2행동은 반복 사용을 막는다", () => {
  const { b, c } = battle();
  assert.equal(b.intent.kind, "gather");
  b.act("interrupt", c, dice(20));
  assert.equal(b.toSnapshot().enemyHealth, 54);
  assert.equal(b.intent.kind, "stagger");
  assert.equal(c.health, c.maxHealth);
  const before = b.toSnapshot();
  assert.throws(() => b.act("interrupt", c, dice()), /다른 행동/);
  assert.deepEqual(b.toSnapshot(), before);
  b.act("guard", c, dice());
  assert.equal(b.toSnapshot().tactics.cooldowns.interrupt, 1);
  b.act("guard", c, dice(1));
  assert.equal(b.toSnapshot().tactics.cooldowns.interrupt, 0);
  assert.equal(b.intent.kind, "strike");
});

test("방해가 빗나가면 준비와 다음 강타가 유지되며 실패 공포가 생긴다", () => {
  const { b, c } = battle();
  b.act("interrupt", c, dice(1));
  assert.equal(b.intent.kind, "heavy");
  assert.equal(c.statuses[0].id, "dread");
  assert.equal(b.toSnapshot().tactics.brokenCharge, false);
});

test("방어는 예고된 강타 피해를 절반으로 줄이고 저주의 상태 이상을 차단한다", () => {
  const protectedRun = battle();
  protectedRun.b.act("guard", protectedRun.c, dice());
  protectedRun.b.act("guard", protectedRun.c, dice(20));
  assert.equal(protectedRun.c.maxHealth - protectedRun.c.health, 7); // (기본8 + 강타4 + 자연20의2) / 2
  const exposed = battle();
  exposed.b.act("guard", exposed.c, dice());
  exposed.b.act("attack", exposed.c, dice(1, 20));
  assert.equal(exposed.c.maxHealth - exposed.c.health, 14);
  assert.deepEqual(
    exposed.c.statuses.map((e) => e.id),
    ["wound", "dread"],
  );
  assert.deepEqual(protectedRun.c.statuses, []);
  const ward = battle("unwritten-heart");
  ward.b.act("guard", ward.c, dice(20));
  assert.equal(ward.c.statuses.length, 0);
  const unguarded = battle("unwritten-heart");
  unguarded.b.act("attack", unguarded.c, dice(1, 20));
  assert.deepEqual(
    unguarded.c.statuses.map((e) => e.id),
    ["fog", "dread"],
  );
});

test("기사의 방패는 피해·상태를 막고 반격하며 직업 기술 대기 3행동을 지킨다", () => {
  const { b, c } = battle("unwritten-heart", "warden");
  b.act("skill", c, dice(20));
  assert.equal(c.health, c.maxHealth);
  assert.equal(c.statuses.length, 0);
  assert.equal(b.toSnapshot().enemyHealth, 78 - 11);
  assert.equal(b.toSnapshot().tactics.cooldowns.skill, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal(b.actions(c).find((a) => a.id === "skill").disabled, true);
    b.act(
      "guard",
      c,
      ["gather", "guard", "stagger"].includes(b.intent.kind) ? dice() : dice(1),
    );
  }
  assert.equal(b.actions(c).find((a) => a.id === "skill").disabled, false);
});

test("서기관은 특수 행동을 끊고 이후 정확히 두 행동 동안 방어를 낮춘다", () => {
  const { b, c } = battle("crown-engine", "scribe");
  b.act("skill", c, dice());
  assert.equal(b.toSnapshot().enemyHealth, 54);
  assert.equal(b.intent.kind, "stagger");
  assert.equal(b.enemyDefense, 14);
  b.act("guard", c, dice());
  assert.equal(b.toSnapshot().tactics.exposed, 1);
  b.act("guard", c, dice(1));
  assert.equal(b.toSnapshot().tactics.exposed, 0);
  assert.equal(b.enemyDefense, 16);
});

test("길잡이는 이번 공격을 피하며 약점 사격하고 자연 1에는 여전히 실패한다", () => {
  const { b, c } = battle("unwritten-heart", "ranger");
  const turn = b.act("skill", c, dice(20, 20));
  assert.equal(c.health, c.maxHealth);
  assert.equal(c.statuses.length, 0);
  assert.match(turn.lines.join("\n"), /\+ 3/);
  const failed = battle("unwritten-heart", "ranger");
  failed.b.act("skill", failed.c, dice(1, 20));
  assert.equal(failed.c.health, failed.c.maxHealth);
  assert.deepEqual(
    failed.c.statuses.map((e) => e.id),
    ["dread"],
  );
});

test("실제로 조사한 단서만 한 전투에 한 번 사용하고 방어 감소·준비 차단을 유지한다", () => {
  const { b, c } = battle("crown-engine", "warden", ["왕실 반출 원본"]);
  b.act("evidence", c, dice());
  assert.equal(b.intent.kind, "stagger");
  assert.equal(b.enemyDefense, 14);
  assert.equal(b.toSnapshot().tactics.evidence.used, true);
  b.act("attack", c, dice(3));
  assert.equal(b.toSnapshot().enemyHealth, 48); // 3 + 11은 약화된 방어 14에 정확히 명중합니다.
  const before = b.toSnapshot();
  assert.throws(() => b.act("evidence", c, dice()), /이미 사용/);
  assert.deepEqual(b.toSnapshot(), before);
  const missing = battle();
  assert.throws(() => missing.b.act("evidence", missing.c, dice()), /단서/);
});

test("전용 치료는 지정한 상태만 해제하고 도구를 소모하며 적의 행동은 진행된다", () => {
  const { b, c } = battle("unwritten-heart");
  c.applyStatus("wound");
  c.applyStatus("fog");
  c.takeDamage(5);
  b.act("treat-fog", c, dice(1));
  assert.deepEqual(
    c.statuses.map((e) => [e.id, e.remaining]),
    [["wound", 2]],
  );
  assert.equal(b.toSnapshot().tactics.supplies.fog, 0);
  c.applyStatus("fog");
  const before = b.toSnapshot();
  assert.throws(() => b.act("treat-fog", c, dice()), /도구/);
  assert.deepEqual(b.toSnapshot(), before);
  b.act("treat-wound", c, dice());
  assert.deepEqual(
    c.statuses.map((e) => e.id),
    ["fog"],
  );
  assert.equal(c.health, c.maxHealth);
});

test("전술 자원과 적 행동은 실제 여정의 저장·복구에서 재계산하고 조작값을 무시한다", () => {
  const run = newRun();
  run.game.continueJourney();
  run.game.choose("reach-camp");
  run.game.choose("first-wolf");
  run.setRolls([20]);
  run.game.performCombatAction("guard");
  run.setRolls([1, 1]);
  run.game.performCombatAction("interrupt");
  const original = run.game.toSnapshot();
  const forged = structuredClone(original);
  forged.combat.tactics.cooldowns.interrupt = 0;
  forged.combat.tactics.supplies.fog = 999;
  forged.combat.tactics.intent.kind = "stagger";
  assert.deepEqual(Adventure.fromSnapshot(forged).toSnapshot(), original);
  const invalid = { ...original, tacticsFrom: original.log.length + 1 };
  assert.equal(Adventure.fromSnapshot(invalid), null);
});

test("v3의 상태·진행 중 전투는 그대로 복구하고 다음 새 전투부터 전술을 연다", () => {
  for (const name of ["v3-active-debuff", "v3-capital-check"]) {
    const old = JSON.parse(
      readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
    );
    const g = Adventure.fromSnapshot(old);
    assert.deepEqual(g.toSnapshot(), {
      ...old,
      version: 4,
      tacticsFrom: old.log.length,
    });
    assert.deepEqual(
      Adventure.fromSnapshot(g.toSnapshot()).toSnapshot(),
      g.toSnapshot(),
    );
  }
  const old = JSON.parse(
    readFileSync(
      new URL("./fixtures/v3-active-debuff.json", import.meta.url),
      "utf8",
    ),
  );
  const g = Adventure.fromSnapshot(old);
  assert.equal(g.combat.tactics, undefined);
  g.performCombatAction("flee");
  g.choose("first-wolf");
  assert.ok(g.combat.tactics);
});

test("전 장면에 쉬운 목표·요약이 있고 전술을 써도 세 출신 모두 완결할 수 있다", () => {
  for (const [id, s] of Object.entries(SCENES)) {
    assert.ok(s.objective, id);
    assert.ok(s.recap, id);
    assert.ok(
      s.paragraphs.every((p) => typeof p === "string" && p.trim()),
      id,
    );
  }
  for (const origin of ["warden", "scribe", "ranger"]) {
    const run = newRun(origin);
    reachCapital(run);
    reachLastOath(run);
    run.game.choose("choose-covenant");
    assert.equal(run.game.isFinished, true);
  }
});
