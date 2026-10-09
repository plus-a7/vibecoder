import { Game } from './game.mjs';
import QUESTIONS from '../data/questions.json' with { type: 'json' };

const game = new Game(QUESTIONS);
const main = document.querySelector('main');
const caveat = '判定はこのゲーム独自のジョークです。単語や返答だけで、現実の職業が分かるわけではありません。';
let rendering = 0;
// A reload starts at the title. Browser history never rolls back an answered question.
if (location.hash) history.replaceState(null, '', location.pathname + location.search);

function element(tag, text, className = '') {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function paragraph(text, className) { main.append(element('p', text, className)); }
function english(text, tag = 'p', className = '') {
  const node = element(tag, text, className);
  node.lang = 'en';
  main.append(node);
  return node;
}
function heading(text, isEnglish = false) {
  const node = element('h1', text);
  node.tabIndex = -1;
  if (isEnglish) node.lang = 'en';
  main.append(node);
  return node;
}
function button(text, id, action, { secondary = false, isEnglish = false } = {}) {
  const node = element('button', text, secondary ? 'secondary' : 'primary');
  node.type = 'button';
  node.dataset.action = id;
  if (isEnglish) node.lang = 'en';
  const currentRender = rendering;
  node.addEventListener('click', event => {
    if (currentRender !== rendering || event.detail > 1) return;
    action();
  });
  main.append(node);
}
function openTitle() {
  if (location.hash === '#play') location.hash = '';
  else render();
}
function start() {
  game.start();
  if (location.hash !== '#play') {
    history.pushState(null, '', '#play');
  }
  render();
}
function render({ focus = true } = {}) {
  rendering++;
  main.replaceChildren();
  const onTitle = location.hash !== '#play' || game.phase === 'title';
  const revision = game.revision;
  let focusTarget;
  if (onTitle) {
    main.className = 'title-screen';
    focusTarget = heading('Who is JSON?', true);
    paragraph('自分がバイブコーダーであることを英語で証明しよう！');
    paragraph('日常会話を続けられればセーフ、エンジニアとバレたらアウトです。');
    paragraph(`${game.pool.length}問から毎回${game.runLength}問。1回でもバレたらゲームオーバー。回答後に日本語の解説が読めます。`);
    button('はじめる', 'start', start);
    paragraph(caveat, 'note');
  } else if (game.phase === 'question') {
    main.className = 'question-screen';
    const progress = element('p', `${game.index + 1} / ${game.questions.length}`, 'progress');
    progress.setAttribute('aria-label', `第${game.index + 1}問、全${game.questions.length}問`);
    main.append(progress);
    focusTarget = heading(game.question.dialogue, true);
    if (game.question.colors) {
      const swatches = element('div', '', 'swatches');
      swatches.setAttribute('aria-hidden', 'true');
      swatches.append(element('span', 'Blue', 'blue'), element('span', 'Purple', 'purple'));
      main.append(swatches);
    }
    for (const reply of game.replies) {
      button(reply.text, reply.id, () => {
        if (game.answer(reply.id, revision)) render();
      }, { secondary: true, isEnglish: true });
    }
  } else if (game.phase === 'feedback') {
    main.className = 'feedback-screen';
    focusTarget = heading(game.selected.isSafe ? 'セーフ！' : 'アウト！');
    focusTarget.className = game.selected.isSafe ? 'safe' : 'out';
    english(`A: ${game.question.dialogue}`, 'p', 'dialogue');
    english(`B: ${game.selected.text}`, 'p', 'answer');
    paragraph(game.selected.reason);
    main.append(element('hr'));
    english(game.question.term, 'h2');
    paragraph(game.question.meaning);
    paragraph(game.question.englishNote, 'english-note');
    const nextLabel = !game.selected.isSafe ? 'ゲームオーバーへ' : game.index + 1 === game.questions.length ? 'クリア結果へ' : '次の会話へ';
    button(nextLabel, 'next', () => { if (game.next(revision)) render(); });
  } else if (game.phase === 'gameOver') {
    main.className = 'game-over-screen';
    focusTarget = heading('You are an engineer!!', true);
    paragraph('ゲームオーバー');
    paragraph(`${game.safeCount} / ${game.questions.length}問を切り抜けました。`);
    english(`B: ${game.selected.text}`, 'p', 'answer');
    paragraph(game.selected.reason);
    button('もう一度', 'retry', start);
    button('タイトルへ', 'title', openTitle, { secondary: true });
  } else if (game.phase === 'cleared') {
    main.className = 'clear-screen';
    focusTarget = heading('全問クリア！');
    paragraph(`${game.questions.length} / ${game.questions.length}問、正体を隠しきりました。`);
    english('You blended right in.', 'p', 'answer');
    paragraph('「すっかり周囲に溶け込めたね」という意味です。');
    button('もう一度', 'retry', start);
    button('タイトルへ', 'title', openTitle, { secondary: true });
    paragraph(caveat, 'note');
  }
  if (focus) {
    focusTarget?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}
// Holding Enter/Space must not answer the next question or skip an explanation.
document.addEventListener('keydown', event => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); return; }
  // Arrow navigation also works when Safari's default Tab preference skips buttons.
  if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) {
    const buttons = [...main.querySelectorAll('button')];
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement);
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    const index = current < 0 ? (forward ? 0 : buttons.length - 1)
      : (current + (forward ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus();
  }
});
window.addEventListener('popstate', () => render());
render({ focus: false });
