/**
 * @file 게임 규칙 회귀 검사. 초반부 분기, 판정 경계, 상태 복제, 이전 저장 호환성을 확인합니다.
 * node --test로 실행하며 describe 없이 각 test()가 독립된 검증 항목입니다.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Adventure, Character, SkillCheck } from "./engine.mjs";
import { ORIGINS } from "./data/origins.mjs";
import { SCENES } from "./data/scenes.mjs";
import { SaveRepository } from "./save-repository.mjs";

const originalSave = JSON.parse(
  readFileSync(new URL("./fixtures/v1-save.json", import.meta.url), "utf8"),
);

// 검증 목적: 모든 갈림길을 복제본으로 탐색해 원래 진행을 보존하고, 각 상태를 저장·복구한 값도 비교합니다.
test("모든 출신·조사 순서의 성공/실패 시나리오가 모든 결말까지 진행된다", () => {
  let endings = 0;
  for (const originId of Object.keys(ORIGINS)) {
    for (const randomValue of [0, 0.95]) {
      const walk = (adventure) => {
        assert.ok(adventure.character.health >= Character.MIN_HEALTH);
        assert.ok(adventure.character.health <= Character.MAX_HEALTH);
        const snapshot = adventure.toSnapshot();
        assert.deepEqual(
          Adventure.fromSnapshot(snapshot).toSnapshot(),
          snapshot,
        );
        assert.ok(
          snapshot.visited.filter((sceneId) =>
            ["chapel", "archive", "river"].includes(sceneId),
          ).length <= 2,
        );
        if (adventure.isComplete) {
          assert.equal(adventure.choices.length, 0);
          endings++;
          return;
        }
        assert.ok(
          adventure.choices.length > 0,
          `${adventure.sceneId}에서 진행 불가`,
        );
        for (const choice of adventure.choices) {
          assert.ok(SCENES[choice.next]);
          const branch = adventure.clone();
          branch.choose(choice.id);
          walk(branch);
        }
      };
      walk(new Adventure(originId, new SkillCheck(() => randomValue)));
    }
  }
  // 출신 × 주사위 시나리오 × 도입 × 조사 경로 × 구출 × 결말
  assert.equal(endings, 3 * 2 * 2 * 30 * 2 * 3);
});

// 검증 목적: 난이도와 합계가 같은 경계, 자연 1 실패, 자연 20 성공을 각각 분리해 확인합니다.
test("정확히 난이도에 도달하면 성공하며 자연 1과 20은 고정 판정이다", () => {
  const exact = new Adventure("warden", new SkillCheck(() => 8 / 20));
  exact.choose("listen"); // 9 + 의지 2 = 난이도 11
  assert.equal(exact.lastCheck.success, true);
  assert.deepEqual(exact.clues, ["소녀의 이름"]);
  const failure = new Adventure("warden", new SkillCheck(() => 0));
  failure.choose("listen");
  assert.equal(failure.lastCheck.success, false);
  assert.equal(failure.character.health, 9);
  assert.equal(failure.clues.length, 0);
  const critical = new Adventure("warden", new SkillCheck(() => 0.95));
  critical.choose("listen");
  assert.equal(critical.lastCheck.success, true);
});

// 검증 목적: 같은 장소 중복 방문과 세 번째 조사를 막고, 거절된 행동이 상태를 바꾸지 않는지 확인합니다.
test("방문한 조사 장소에는 재입장할 수 없고 두 곳 이후에는 지하만 남는다", () => {
  const adventure = new Adventure("warden", new SkillCheck(() => 0.95));
  for (const choiceId of ["lantern", "archive", "blueprint"])
    adventure.choose(choiceId);
  assert.ok(!adventure.choices.some((choice) => choice.next === "archive"));
  adventure.choose("more-river");
  adventure.choose("song");
  assert.deepEqual(
    adventure.choices.map((choice) => choice.id),
    ["descend"],
  );
  const before = adventure.toSnapshot();
  assert.throws(() => adventure.choose("more-chapel"));
  assert.deepEqual(adventure.toSnapshot(), before);
});

// 검증 목적: 형식·이동·주사위 오류를 거부하면서 저장된 수치 변조는 입력 기록으로 재계산하는지 확인합니다.
test("잘못된 저장과 불가능한 이동은 거부하고 상태는 기록에서 재계산한다", () => {
  for (const raw of [
    "invalid",
    "{}",
    "null",
    JSON.stringify({ version: 2 }),
    JSON.stringify({
      version: 1,
      origin: "__proto__",
      scene: "arrival",
      log: [],
    }),
  ]) {
    assert.equal(SaveRepository.decode(raw), null);
  }
  const forged = new Adventure().toSnapshot();
  forged.hp = 999;
  forged.clues = ["만든 단서"];
  assert.deepEqual(
    Adventure.fromSnapshot(forged).toSnapshot(),
    new Adventure().toSnapshot(),
  );
  forged.scene = "ending-seal";
  assert.equal(Adventure.fromSnapshot(forged), null);
  const invalidRoll = structuredClone(originalSave);
  invalidRoll.log[0].result.roll = 21;
  assert.equal(Adventure.fromSnapshot(invalidRoll), null);
});

// 검증 목적: 실제 이전 코드가 만든 JSON을 v2로 옮겨도 기존 진행은 같고 이후 새 주사위는 1이 되는지 확인합니다.
test("리팩터링 전 v1 저장을 그대로 복구하고 이후에는 새 주사위를 굴린다", () => {
  const adventure = Adventure.fromSnapshot(
    originalSave,
    new SkillCheck(() => 0),
  );
  const migrated = adventure.toSnapshot();
  assert.equal(migrated.version, 2);
  assert.equal(migrated.level, 1);
  assert.equal(migrated.experience, 0);
  const legacyFields = {
    version: 1,
    ...Object.fromEntries(
      Object.entries(migrated).filter(
        ([key]) => Object.hasOwn(originalSave, key) && key !== "version",
      ),
    ),
    log: migrated.log.map(({ kind, choiceId, ...entry }) => entry),
  };
  assert.deepEqual(legacyFields, originalSave);
  adventure.choose("descend");
  adventure.choose("true-name");
  assert.equal(adventure.lastCheck.roll, 1);
  assert.equal(adventure.lastCheck.success, false);
  assert.equal(adventure.sceneId, "heart");
});

// 검증 목적: 복사본의 이동·피해와 반환된 배열 수정이 원래 모험에 새어 들어가지 않는지 확인합니다.
test("복제본과 외부로 전달한 스냅샷의 변경은 원래 진행을 바꾸지 않는다", () => {
  const adventure = Adventure.fromSnapshot(originalSave);
  const before = adventure.toSnapshot();
  const branch = adventure.clone();
  branch.choose("descend");
  branch.character.takeDamage(3);
  const snapshot = adventure.toSnapshot();
  snapshot.clues.push("변조한 단서");
  snapshot.log[0].label = "변조한 선택";
  snapshot.items.length = 0;
  assert.deepEqual(adventure.toSnapshot(), before);
  assert.notEqual(branch.sceneId, adventure.sceneId);
});

// 검증 목적: 이야기 피해의 하한 1과 중복 소지품 방지, 알 수 없는 출신 거부를 확인합니다.
test("캐릭터의 부상 하한과 중복 없는 소지품을 관리한다", () => {
  const character = new Character("ranger");
  character.takeDamage(100);
  assert.equal(character.health, 1);
  assert.equal(character.isWounded, true);
  character.addItem("등불");
  character.addItem("등불");
  const items = character.items;
  items.push("외부 변경");
  assert.deepEqual(character.items, ["검은 갈대 부적", "등불"]);
  assert.throws(() => new Character("missing"));
});
