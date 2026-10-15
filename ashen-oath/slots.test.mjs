/** @file 수동 슬롯과 자동 저장의 분리·손상 보존·권한/용량 오류를 검증합니다. */
import test from "node:test";
import assert from "node:assert/strict";
import { Adventure } from "./engine.mjs";
import { SaveRepository } from "./save-repository.mjs";
function memory() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
}

test("세 슬롯은 서로와 자동 저장을 덮어쓰지 않는다", () => {
  const storage = memory(),
    repo = new SaveRepository(() => storage);
  const game = new Adventure();
  repo.save(game);
  const auto = storage.getItem("ashen-oath.v1");
  assert.equal(repo.saveSlot(1, game), true);
  game.choose("lantern");
  assert.equal(repo.saveSlot(2, game), true);
  game.choose("archive");
  assert.equal(repo.saveSlot(3, game), true);
  assert.equal(storage.getItem("ashen-oath.v1"), auto);
  assert.deepEqual(
    repo.listSlots().map((s) => s.valid),
    [true, true, true],
  );
  assert.equal(repo.loadSlot(1).sceneId, "arrival");
  assert.equal(repo.loadSlot(2).sceneId, "inn");
  assert.equal(repo.loadSlot(3).sceneId, "archive");
  assert.equal(repo.saveSlot(0, game), false);
  assert.equal(repo.saveSlot(4, game), false);
});
test("목록을 열거나 불러오기 전에 검증해도 기록이나 자동 저장은 변하지 않는다", () => {
  const storage = memory(),
    repo = new SaveRepository(() => storage),
    g = new Adventure();
  repo.save(g);
  repo.saveSlot(1, g);
  const raw = storage.getItem("ashen-oath.slot.1");
  repo.listSlots();
  const copy = repo.loadSlot(1);
  copy.choose("lantern");
  assert.equal(storage.getItem("ashen-oath.slot.1"), raw);
  assert.equal(repo.load().sceneId, "arrival");
});
test("손상된 슬롯은 자동으로 삭제하지 않고 다른 슬롯과 현재 진행을 보존한다", () => {
  const storage = memory(),
    repo = new SaveRepository(() => storage),
    g = new Adventure();
  repo.save(g);
  repo.saveSlot(2, g);
  storage.setItem("ashen-oath.slot.1", "broken");
  const slots = repo.listSlots();
  assert.equal(slots[0].exists, true);
  assert.equal(slots[0].valid, false);
  assert.equal(repo.loadSlot(1), null);
  assert.equal(storage.getItem("ashen-oath.slot.1"), "broken");
  assert.equal(slots[1].valid, true);
  assert.equal(repo.load().sceneId, "arrival");
});
test("저장소 거부·용량 오류는 슬롯과 자동 저장을 지우지 않는다", () => {
  const storage = memory(),
    repo = new SaveRepository(() => storage),
    g = new Adventure();
  repo.save(g);
  repo.saveSlot(1, g);
  const raw = storage.getItem("ashen-oath.slot.1");
  storage.setItem = () => {
    throw new Error("quota");
  };
  g.choose("lantern");
  assert.equal(repo.saveSlot(1, g), false);
  assert.equal(storage.getItem("ashen-oath.slot.1"), raw);
  assert.equal(repo.load().sceneId, "arrival");
  const denied = new SaveRepository(() => {
    throw new Error("denied");
  });
  assert.equal(denied.loadSlot(1), null);
  assert.ok(denied.listSlots().every((s) => s.unavailable));
});
