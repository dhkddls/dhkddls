/** @file 실제 게임 입력으로 캠페인을 준비하는 테스트 도우미. 앱이 읽는 모듈이 아닙니다. */
import assert from "node:assert/strict";
import { Adventure, SkillCheck } from "../engine.mjs";

/** 주사위를 주입하되 장면 이동·보상은 실제 Adventure 규칙으로 처리합니다. */
export function newRun(origin = "warden", firstOath = "restore") {
  let rolls = [];
  const dice = new SkillCheck(() => ((rolls.shift() ?? 20) - 1) / 20);
  const game = new Adventure(origin, dice);
  const run = {
    game,
    dice,
    setRolls: (values) => {
      rolls = [...values];
    },
  };
  for (const id of [
    "lantern",
    "archive",
    "blueprint",
    "descend",
    "true-name",
    firstOath,
  ])
    game.choose(id);
  return run;
}

/** 플레이어 명중·적 빗나감으로 전투를 결정적으로 끝냅니다. 정체 시에는 실패합니다. */
export function winFight(run, action = "power") {
  let turns = 0;
  while (run.game.isInCombat) {
    assert.ok(turns++ < 80, "전투가 종료되지 않습니다.");
    run.setRolls([20, 1]);
    run.game.performCombatAction(action);
  }
  assert.equal(run.game.lastBattle.status, "victory");
}

/** 초반·중반을 실제로 완료하여 첫 서약을 보존한 Lv.4 기록을 만듭니다. */
export function reachCapital(run) {
  const game = run.game;
  game.continueJourney();
  game.choose("reach-camp");
  game.choose("first-wolf");
  winFight(run);
  game.choose("track-foundry");
  for (let i = 0; i < 4; i++) {
    game.choose("hunt-wolf", { acceptLevelMismatch: true });
    winFight(run);
  }
  game.choose("break-sentinel");
  winFight(run);
  game.choose("copy-orders");
  game.choose("face-keeper");
  winFight(run);
  assert.equal(game.sceneId, "act2-ending");
  game.continueJourney();
  game.choose("enter-safehouse");
}

/** 현재 성장 구간에 맞는 반복 전투를 선택합니다. 경험치를 직접 주입하지 않습니다. */
export function trainTo(run, target) {
  let battles = 0;
  while (run.game.character.level < target) {
    assert.ok(battles++ < 40, "레벨업 경로가 막혔습니다.");
    run.game.choose("rest-capital");
    const level = run.game.character.level;
    run.game.choose(
      level < 5 ? "train-envoy" : level < 6 ? "train-bailiff" : "train-marshal",
      { acceptLevelMismatch: true },
    );
    winFight(run);
  }
}

/** 조사 성공·실패를 제어하고, 필수 장부와 마지막 선택까지 진행합니다. */
export function reachLastOath(
  run,
  { investigate = true, failChecks = false } = {},
) {
  const game = run.game;
  if (investigate) {
    game.choose("seek-royal-record");
    run.setRolls([failChecks ? 1 : 20]);
    game.choose("read-undertext");
    game.choose("secure-royal-proof");
    game.choose("seek-citizens");
    run.setRolls([failChecks ? 1 : 20]);
    game.choose("hear-citizens");
    game.choose("secure-citizen-proof");
  }
  trainTo(run, 8);
  game.choose("breach-vault", { acceptLevelMismatch: true });
  winFight(run);
  game.choose("take-experiment-ledger");
  if (investigate) {
    run.setRolls([failChecks ? 1 : 20]);
    game.choose("demand-confession");
  } else game.choose("preserve-trial");
  game.choose("rest-before-crown");
  game.choose("shatter-crown", { acceptLevelMismatch: true });
  winFight(run);
  game.choose("rest-before-heart");
  game.choose("face-unwritten");
  winFight(run);
  assert.equal(game.sceneId, "last-oath");
}
