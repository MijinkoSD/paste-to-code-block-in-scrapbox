/// <reference no-default-lib="true" />
/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { getCodeBlocks, scrapbox, TinyCodeBlock } from "./deps.ts";
import { addCursorEventListener, CursorEventHandler } from "./cursor.ts";

export interface Button {
  iconClass: string[];
  title: string;
  onClick: (
    event: MouseEvent,
    codeBlock: TinyCodeBlock,
  ) => void;
}

const ButtonDOM = HTMLSpanElement;
type ButtonDOM = HTMLSpanElement;

interface AttachedCodeBlock {
  /** ボタンを追加する対象のコードブロック */
  codeBlock: TinyCodeBlock;
  /**
   * このコードブロック限定で追加されたボタン。 \
   * ページ遷移時などにリセットされる。
   */
  buttons: Button[];
}
/**
 * ボタンを表示するようにしたコードブロックを管理する。 \
 * `cursor.ts`の`cursorEvents`とも役割が被るが、あちらは実際にボタンを追加する際に使われるのに対し、
 * こちらはコードブロックの追加・削除を追跡するために使用される。
 */
let attachedCodeBlocks: AttachedCodeBlock[] = [];
/** 全てのコードブロックへアタッチされたボタン */
let attachedButtonsForAll: Button[] = [];
/** コードブロックを監視していたら`true` */
let isAddHandler = false;

/**
 * コードブロックのタイトル行にボタンを追加する。 \
 * 追加したボタンはページ遷移するまで有効。
 *
 * @param button 追加するボタン
 * @param codeBlock 追加先のコードブロック
 */
export async function attachButtonToCodeBlock(
  buttons: Button | Button[],
  codeBlock: TinyCodeBlock,
): Promise<void> {
  const btns = Array.isArray(buttons) ? buttons : [buttons];
  const { titleLine, pageInfo } = codeBlock;
  if (
    pageInfo.pageTitle != scrapbox.Page.title ||
    pageInfo.projectName != scrapbox.Project.name
  ) return;
  console.debug("attachedCodeBlocks: %o", attachedCodeBlocks);
  const attached = attachedCodeBlocks.find((e) =>
    e.codeBlock.titleLine.id == titleLine.id
  );
  console.debug("attached: %o", attached);
  if (attached === undefined) {
    // アタッチリストにボタンが無ければ追加して終了
    attachedCodeBlocks.push({
      codeBlock: codeBlock,
      buttons: btns,
    });
    return;
  }
  for (const button of btns) {
    const buttonIndex = attached.buttons.findIndex((e) =>
      e.title == button.title
    );
    if (buttonIndex < 0) {
      attached.buttons.push(button);
    } else {
      attached.buttons[buttonIndex] = button;
    }
  }
  await addCursorEventHandler();
}

/**
 * 開いているページ内の全てのコードブロックのタイトル行にボタンを追加する。 \
 * 関数実行後に追加されたコードブロックも対象になる。 \
 * プロジェクト遷移時に解除される（ページ遷移時などは解除されない）。
 *
 * @param buttons 追加するボタン
 */
export async function attachButtonToAllCodeBlocks(
  buttons: Button | Button[],
): Promise<void> {
  const btn = Array.isArray(buttons) ? buttons : [buttons];
  attachedButtonsForAll.push(...btn);
  await addCursorEventHandler();
}

/**
 * コードブロックのタイトル行にボタンを追加するのをやめる。
 *
 * @param button 追加するのをやめるボタン
 * @param codeBlock 対象のコードブロック
 */
export function detachButtonFromCodeBlock(
  buttons: Button | Button[],
  codeBlock: TinyCodeBlock,
) {
  const btns = Array.isArray(buttons) ? buttons : [buttons];
  const attached = attachedCodeBlocks.find((e) =>
    e.codeBlock.titleLine.id == codeBlock.titleLine.id
  );
  if (attached === undefined) return;
  attached.buttons = attached.buttons.filter((e) => {
    !btns.some((f) => {
      e.title == f.title;
    });
  });
}

/**
 * コードブロックのタイトル行へのボタン追加するのを、全てのコードブロックでやめる。 \
 * `attachButtonToAllCodeBlocks()`に渡したボタンとこの関数に渡したボタンのtitleが
 * 合致していないとうまく動作しない。 \
 * また、`attachButtonToCodeBlock()`にて個別に追加したボタンに関しては解除されない
 * （個別に`detachButtonFromCodeBlock()`を実行して解除する必要がある）。
 *
 * @param buttons 追加するのをやめるボタン
 */
export function detachButtonFromAllCodeBlocks(
  buttons: Button | Button[],
): void {
  const btn = Array.isArray(buttons) ? buttons : [buttons];
  attachedButtonsForAll = attachedButtonsForAll.filter((e) => {
    btn.some((f) => f.title == e.title);
  });
}

/**
 * カーソル移動や行の変更の度に実行されるハンドラ関数を追加する。 \
 * ハンドラ関数は、カーソルを置かれたコードブロックのタイトル行にボタンを表示したり、
 * カーソルが外れたコードブロックのタイトル行からボタンを外したりする。
 */
async function addCursorEventHandler() {
  if (!isAddHandler) {
    const handler: CursorEventHandler = (e) => {
      for (
        const { codeBlock, buttons: additionalButtons } of attachedCodeBlocks
      ) {
        const buttons = [...attachedButtonsForAll, ...additionalButtons];
        const titleId = codeBlock.titleLine.id;
        const buttonArea = getButtonAreaByID(titleId);
        if (buttonArea === null) continue;
        if (e.cursorLineId != titleId) {
          removeButton(buttons, buttonArea);
          continue;
        }
        addButton(buttons, buttonArea, codeBlock);
      }
    };
    addCursorEventListener(handler);
    isAddHandler = true;
  }

  // コードブロックの変更を監視
  await observeCodeBlock();
  scrapbox.on("lines:changed", observeCodeBlock);
}

/** コードブロックの追加・削除を`attachedCodeBlocks`に反映する */
async function observeCodeBlock(): Promise<void> {
  if (scrapbox.Page.title === null) return;
  const codeBlocks = await getCodeBlocks({
    project: scrapbox.Project.name,
    title: scrapbox.Page.title,
    lines: scrapbox.Page.lines,
  });
  attachedCodeBlocks = codeBlocks.map((e): AttachedCodeBlock => {
    const old = attachedCodeBlocks.find((f) =>
      f.codeBlock.titleLine.id == e.titleLine.id
    );
    return old ?? { codeBlock: e, buttons: [] };
  });
}

/** 行IDから行のDOMを取得するやつだけど結局使わなかった */
function _getLineByID(lineId: string): HTMLElement | null {
  return document.getElementById(lineId);
}

/** 行IDからコードブロックタイトル内のボタン領域を取得する */
function getButtonAreaByID(lineId: string): Element | null {
  const selector = `#L${lineId} .code-block .code-block-start .tool-buttons`;
  return document.querySelector(selector);
}

/** ボタンのDOMオブジェクトを作成する */
function createButton(
  buttons: Button[],
  codeBlock: TinyCodeBlock,
): ButtonDOM[] {
  const buttonDOMs: ButtonDOM[] = [];
  for (const button of buttons) {
    const buttonDOM = document.createElement("span");
    buttonDOM.title = button.title;
    buttonDOM.classList.add(...["button", button.title.toLowerCase()]);
    buttonDOM.onclick = (e) => button.onClick(e, codeBlock);
    const icon = document.createElement("i");
    icon.classList.add(...button.iconClass);
    buttonDOM.append(icon);
    buttonDOMs.push(buttonDOM);
  }
  return buttonDOMs;
}

/**
 * ボタンを特定のDOMの直下に追加する。 \
 * 既に同名（title属性が同じ）DOMが存在していれば作成しない。
 */
function addButton(
  buttons: Button[],
  buttonArea: Element,
  codeBlock: TinyCodeBlock,
): void {
  const childs = buttonArea.children;
  for (const button of buttons) {
    const isButtonExist = Array(...childs).some((e) => {
      if (!(e instanceof ButtonDOM)) return false;
      return e.title == button.title;
    });
    if (isButtonExist) continue;
    buttonArea.append(...createButton([button], codeBlock));
  }
}

/** コードブロックタイトルに追加したボタンを削除する */
function removeButton(buttons: Button[], buttonArea: Element): void {
  const childs = buttonArea.children;
  const removeTargets: ButtonDOM[] = [];
  for (const child of childs) {
    if (!(child instanceof ButtonDOM)) continue;
    for (const button of buttons) {
      if (child.title != button.title) continue;
      removeTargets.push(child);
    }
  }
  removeTargets.forEach((e) => e.remove());
}
