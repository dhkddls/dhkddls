/** @file 확률 미리보기와 실제 d20 판정의 일치, 상태 반영, 무작위·진행 보존을 검사합니다. */
import test from "node:test";
import assert from "node:assert/strict";
import { Adventure, Character, SkillCheck } from "./engine.mjs";
import { ORIGINS } from "./data/origins.mjs";

const choice = (stat = "spirit", dc = 11) => ({
  check: { stat, dc },
  success: "성공",
  failure: "실패",
});

test("확률은 현재 능력치·디버프·성장과 자연 1·20의 한계를 반영한다", () => {
  const character = new Character("warden");
  assert.equal(SkillCheck.successChance(choice(), character), 60);
  character.applyStatus("dread");
  assert.equal(SkillCheck.successChance(choice(), character), 50);
  character.rest();
  character.gainExperience(80);
  assert.equal(SkillCheck.successChance(choice(), character), 65);
  assert.equal(SkillCheck.successChance(choice("spirit", 100), character), 5);
  assert.equal(SkillCheck.successChance(choice("spirit", -100), character), 95);
});

test("모든 출신·능력치에서 미리보기와 20개 실제 주사위 결과가 일치한다", () => {
  for (const origin of Object.keys(ORIGINS)) {
    const character = new Character(origin);
    for (const affected of [false, true]) {
      if (affected) {
        for (const status of ["wound", "fog", "dread"]) character.applyStatus(status);
      }
      for (const stat of ["might", "wit", "spirit"]) {
        for (const dc of [1, 11, 12, 13, 20, 100]) {
          const action = choice(stat, dc);
          let successes = 0;
          for (let roll = 1; roll <= 20; roll++) {
            const dice = new SkillCheck(() => (roll - 0.5) / 20);
            if (dice.resolve(action, character).success) successes++;
          }
          assert.equal(SkillCheck.successChance(action, character), successes * 5);
        }
      }
    }
  }
});

test("미리보기를 반복해도 난수·모험 저장·디버프 횟수는 그대로다", () => {
  let rolls = 0;
  const adventure = new Adventure("warden", new SkillCheck(() => { rolls++; return 0.5; }));
  adventure.character.applyStatus("dread");
  const before = adventure.toSnapshot();
  for (let i = 0; i < 3; i++) {
    for (const action of adventure.choices.filter((entry) => entry.check)) {
      SkillCheck.successChance(action, adventure.character);
    }
  }
  assert.equal(rolls, 0);
  assert.deepEqual(adventure.toSnapshot(), before);
  adventure.choose("listen");
  assert.equal(rolls, 1);
  assert.equal(adventure.lastCheck.roll, 11);
});
