import test from "node:test";
import assert from "node:assert/strict";
import { Adventure, SkillCheck } from "./engine.mjs";
import { SaveRepository } from "./save-repository.mjs";
import { JournalExporter } from "./journal-exporter.mjs";

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
}

test("저장 후 다른 Repository에서도 진행을 복구한다", () => {
  const storage = memoryStorage();
  const repository = new SaveRepository(() => storage);
  assert.equal(repository.load(), null);
  const adventure = new Adventure();
  adventure.choose("lantern");
  assert.equal(repository.save(adventure), true);
  const anotherRepository = new SaveRepository(() => storage);
  assert.deepEqual(
    anotherRepository.load().toSnapshot(),
    adventure.toSnapshot(),
  );
  assert.equal(anotherRepository.available, true);
});

test("손상된 저장을 정리하고 브라우저 저장 권한이 없어도 예외를 전파하지 않는다", () => {
  const storage = memoryStorage();
  storage.setItem("ashen-oath.v1", "broken JSON");
  const repository = new SaveRepository(() => storage);
  assert.equal(repository.load(), null);
  assert.equal(storage.getItem("ashen-oath.v1"), null);
  let blocked = true;
  const restricted = new SaveRepository(() => {
    if (blocked) throw new Error("Storage denied");
    return storage;
  });
  assert.equal(restricted.load(), null);
  assert.equal(restricted.available, false);
  assert.equal(restricted.save(new Adventure()), false);
  blocked = false;
  assert.equal(restricted.save(new Adventure()), true);
  assert.equal(restricted.available, true);
});

test("저장 공간이 가득 찬 경우 실패를 알리고 플레이 상태는 유지한다", () => {
  const storage = memoryStorage();
  storage.setItem = () => {
    throw new Error("Quota exceeded");
  };
  const repository = new SaveRepository(() => storage);
  const adventure = new Adventure();
  adventure.choose("lantern");
  assert.equal(repository.save(adventure), false);
  assert.equal(repository.available, false);
  assert.equal(adventure.sceneId, "inn");
});

test("모험 기록에는 실제 출신·판정·선택·결말이 포함되고 진행은 바뀌지 않는다", () => {
  const adventure = new Adventure("scribe", new SkillCheck(() => 0.95));
  for (const choiceId of [
    "listen",
    "archive",
    "blueprint",
    "descend",
    "true-name",
    "restore",
  ])
    adventure.choose(choiceId);
  const before = adventure.toSnapshot();
  const markdown = new JournalExporter().toMarkdown(adventure);
  assert.match(markdown, /출신: 이름의 서기관/);
  assert.match(markdown, /기력: 10\/10/);
  assert.match(markdown, /결말: 다시 울리는 종/);
  assert.match(markdown, /판정: 20 \+ 3 \/ 난이도 11 · 성공/);
  assert.ok(markdown.includes(adventure.scene.paragraphs[2]));
  assert.deepEqual(adventure.toSnapshot(), before);
});
