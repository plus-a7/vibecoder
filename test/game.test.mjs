import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, shuffleReplies, validateQuestions } from '../src/game.mjs';
const questions = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url)));
function seeded(seed) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
}
function allGame(seed = 1) { return new Game(questions, seeded(seed), questions.length); }

test('100 complete questions, three replies and exactly one safe answer per question', () => {
  assert.equal(questions.length, 100);
  assert.equal(validateQuestions(questions), questions);
});
test('data validation rejects corrupt content before a build or game begins', () => {
  for (const mutate of [
    data => data.push(data[0]),
    data => data[1].dialogue = data[0].dialogue,
    data => data[0].replies.pop(),
    data => data[0].replies[1].isSafe = true,
    data => data[0].replies[1].isSafe = 'false',
    data => data[0].replies[1].id = data[0].replies[0].id,
    data => data[0].meaning = '',
    data => data[0].replies[0].reason = '',
  ]) {
    const data = structuredClone(questions); mutate(data);
    assert.throws(() => validateQuestions(data));
  }
  assert.throws(() => validateQuestions([]));
  assert.throws(() => new Game(questions, Math.random, 101));
});
test('each run picks ten unique questions from the pool and varies with randomness', () => {
  const a = new Game(questions, seeded(1)); const b = new Game(questions, seeded(2));
  a.start(); b.start();
  assert.equal(a.questions.length, 10);
  assert.equal(new Set(a.questions.map(q => q.id)).size, 10);
  assert.ok(a.questions.every(q => questions.some(source => source.id === q.id)));
  assert.notDeepEqual(a.questions.map(q => q.id), b.questions.map(q => q.id));
  const before = a.questions.map(q => q.id); a.start();
  assert.notDeepEqual(a.questions.map(q => q.id), before);
});
test('shuffle makes a permutation without modifying the original', () => {
  const source = questions[0].replies;
  const copy = structuredClone(source);
  const result = shuffleReplies(source, () => 0);
  assert.deepEqual(source, copy);
  assert.deepEqual(new Set(result.map(r => r.id)), new Set(source.map(r => r.id)));
  assert.notDeepEqual(result, source);
});
test('verdict comes from reply ID across shuffled placements for all 300 answers', () => {
  for (const question of questions) {
    for (const reply of question.replies) {
      for (const random of [() => 0, () => .5, () => .999]) {
        const game = new Game([question], random); game.start();
        assert.equal(game.answer(reply.id), true);
        assert.equal(game.phase, 'feedback');
        assert.equal(game.selected.isSafe, reply.isSafe);
        assert.equal(game.safeCount, reply.isSafe ? 1 : 0);
        game.next();
        assert.equal(game.phase, reply.isSafe ? 'cleared' : 'gameOver');
      }
    }
  }
});
test('title → question → explanation → next → ten-question clear', () => {
  const game = new Game(questions, seeded(3));
  assert.equal(game.phase, 'title');
  game.start();
  for (let i = 0; i < 10; i++) {
    assert.equal(game.phase, 'question'); assert.equal(game.index, i);
    game.answer(game.replies.find(reply => reply.isSafe).id);
    assert.equal(game.phase, 'feedback'); assert.equal(game.safeCount, i + 1);
    game.next();
    assert.equal(game.phase, i === 9 ? 'cleared' : 'question');
  }
  assert.equal(game.next(), false);
  assert.equal(game.answer(game.replies[0].id), false);
  assert.equal(game.safeCount, 10);
});
test('failure exposes reason before game over; retry resets all state and placement', () => {
  const game = allGame(); game.start();
  const previous = new Map(game.questions.map((q, i) => [q.id, game.choices[i].map(r => r.id)]));
  game.answer(game.replies.find(reply => reply.isSafe).id); game.next();
  game.answer(game.replies.find(reply => !reply.isSafe).id);
  assert.equal(game.phase, 'feedback');
  assert.ok(game.selected.reason); assert.equal(game.safeCount, 1);
  game.next(); assert.equal(game.phase, 'gameOver');
  game.start();
  assert.equal(game.phase, 'question'); assert.equal(game.index, 0);
  assert.equal(game.safeCount, 0); assert.equal(game.selected, null);
  game.questions.forEach((q, i) => assert.notDeepEqual(game.choices[i].map(r => r.id), previous.get(q.id)));
});
test('identical random order still changes every reply arrangement on retry', () => {
  const game = new Game(questions, () => .999); game.start();
  const previous = game.choices.map(replies => replies.map(reply => reply.id));
  game.start(); assert.notDeepEqual(game.choices.map(replies => replies.map(reply => reply.id)), previous);
  game.choices.forEach((replies, i) => assert.notDeepEqual(replies.map(reply => reply.id), previous[i]));
});
test('invalid, repeated and stale actions cannot skip explanations or change scores', () => {
  const game = allGame();
  assert.equal(game.next(), false); assert.equal(game.answer('anything'), false);
  game.start(); const before = game.revision;
  assert.equal(game.next(), false); assert.equal(game.answer('unknown'), false);
  assert.equal(game.revision, before);
  const safe = game.replies.find(reply => reply.isSafe).id;
  game.answer(safe, before);
  assert.equal(game.answer(safe, before), false); assert.equal(game.safeCount, 1);
  assert.equal(game.next(before), false); // An event from the old question cannot advance feedback.
  const feedbackRevision = game.revision;
  game.next(feedbackRevision);
  assert.equal(game.next(feedbackRevision), false);
  assert.equal(game.answer(game.replies[0].id, before), false);
  assert.equal(game.index, 1); assert.equal(game.phase, 'question');
});
test('specified cherry joke and explicit cherry-pick question have distinct verdicts', () => {
  const merge = questions.find(q => q.id === 'branch');
  assert.equal(merge.replies.find(reply => reply.text.includes('cherries')).isSafe, false);
  assert.equal(merge.replies.find(reply => reply.text.includes('fruit?')).isSafe, true);
  const pick = questions.find(q => q.id === 'cherry-pick');
  assert.equal(pick.replies.find(reply => reply.text.includes('jam')).isSafe, true);
  assert.match(pick.replies[0].reason, /文脈が違います/);
});


test('100-question pool has distinct conversations and all questions are reached by repeated sampling', () => {
  assert.equal(new Set(questions.map(q => q.dialogue.toLocaleLowerCase())).size, 100);
  const game = new Game(questions, seeded(71));
  const counts = new Map(questions.map(q => [q.id, 0]));
  for (let run = 0; run < 1000; run++) {
    game.start();
    assert.equal(new Set(game.questions.map(q => q.id)).size, 10);
    for (const question of game.questions) counts.set(question.id, counts.get(question.id) + 1);
  }
  assert.equal([...counts.values()].filter(count => count > 0).length, 100);
  // Fixed seed: catches sampling that favors a fixed subset, without flaky random tests.
  assert.ok([...counts.values()].every(count => count > 50 && count < 150));
});
