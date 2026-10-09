export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Error('Questions must not be empty');
  const ids = new Set();
  const dialogues = new Set();
  for (const question of questions) {
    for (const key of ['id', 'dialogue', 'term', 'meaning', 'englishNote']) {
      if (typeof question[key] !== 'string' || !question[key].trim()) throw new Error(`Missing question ${key}`);
    }
    if (ids.has(question.id)) throw new Error('Duplicate question ID');
    ids.add(question.id);
    const normalizedDialogue = question.dialogue.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    if (dialogues.has(normalizedDialogue)) throw new Error('Duplicate conversation');
    dialogues.add(normalizedDialogue);
    if (!Array.isArray(question.replies) || question.replies.length !== 3) throw new Error('Each question needs three replies');
    if (new Set(question.replies.map(reply => reply.id)).size !== 3) throw new Error('Duplicate reply ID');
    for (const reply of question.replies) {
      for (const key of ['id', 'text', 'reason']) {
        if (typeof reply[key] !== 'string' || !reply[key].trim()) throw new Error(`Missing reply ${key}`);
      }
      if (typeof reply.isSafe !== 'boolean') throw new Error('Reply requires a boolean verdict');
    }
    if (question.replies.filter(reply => reply.isSafe).length !== 1) throw new Error('Each question needs exactly one safe reply');
  }
  return questions;
}

export function shuffleReplies(replies, random = Math.random) {
  const result = [...replies];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class Game {
  constructor(questions, random = Math.random, runLength = Math.min(10, questions.length)) {
    validateQuestions(questions);
    if (!Number.isInteger(runLength) || runLength < 1 || runLength > questions.length) throw new Error('Invalid run length');
    this.pool = structuredClone(questions);
    this.runLength = runLength;
    this.questions = this.pool.slice(0, runLength);
    this.previousChoices = new Map();
    this.random = random;
    this.phase = 'title';
    this.index = 0;
    this.safeCount = 0;
    this.selected = null;
    this.choices = [];
    this.revision = 0;
  }
  get question() { return this.questions[this.index]; }
  get replies() { return this.choices[this.index] ?? []; }
  start() {
    this.questions = shuffleReplies(this.pool, this.random).slice(0, this.runLength);
    this.choices = this.questions.map(question => {
      const replies = shuffleReplies(question.replies, this.random);
      const previous = this.previousChoices.get(question.id);
      if (previous?.every((reply, i) => reply.id === replies[i].id)) replies.push(replies.shift());
      this.previousChoices.set(question.id, replies);
      return replies;
    });
    this.phase = 'question';
    this.index = 0;
    this.safeCount = 0;
    this.selected = null;
    this.revision++;
  }
  answer(id, revision = this.revision) {
    if (this.phase !== 'question' || revision !== this.revision) return false;
    const reply = this.replies.find(item => item.id === id);
    if (!reply) return false;
    this.selected = reply;
    if (reply.isSafe) this.safeCount++;
    this.phase = 'feedback';
    this.revision++;
    return true;
  }
  next(revision = this.revision) {
    if (this.phase !== 'feedback' || revision !== this.revision) return false;
    if (!this.selected.isSafe) this.phase = 'gameOver';
    else if (this.index + 1 === this.questions.length) this.phase = 'cleared';
    else {
      this.index++;
      this.selected = null;
      this.phase = 'question';
    }
    this.revision++;
    return true;
  }
}
