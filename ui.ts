/// <reference no-default-lib="true" />
/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { getCodeBlocks, scrapbox, TinyCodeBlock } from "./deps.ts";
import { addCursorEventListener, CursorEventHandler } from "./cursor.ts";

export interface Button {
  iconClass: string[];
  title: string;
  onClick: (event: MouseEvent) => void;
}

const ButtonDOM = HTMLSpanElement;
type ButtonDOM = HTMLSpanElement;

interface AttachedCodeBlock {
  codeBlock: Pick<TinyCodeBlock, "titleLine" | "pageInfo">;
  // handler: CursorEventHandler;
}
/**
 * ボタンを表示するようにしたコードブロックを管理する。 \
 * `cursor.ts`の`cursorEvents`とも役割が被るが、あちらは実際にボタンを追加する際に使われるのに対し、
 * こちらはコードブロックの追加・削除を追跡するために使用される。
 */
let attachedCodeBlocks: AttachedCodeBlock[] = [];

/**
 * コードブロックのタイトル行にボタンを追加する。 \
 * 追加したボタンはページ遷移するまで有効。
 *
 * @param button 追加するボタン
 * @param title 追加先のコードブロック
 */
export function attachButtonToCodeBlock(
  buttons: Button | Button[],
  title: Pick<TinyCodeBlock, "titleLine" | "pageInfo">,
): void {
  const btn = Array.isArray(buttons) ? buttons : [buttons];
  const { titleLine, pageInfo } = title;
  if (
    pageInfo.pageTitle != scrapbox.Page.title ||
    pageInfo.projectName != scrapbox.Project.name
  ) return;
  const buttonArea = getButtonAreaByID(titleLine.id);
  if (buttonArea === null) return;
  addCursorEventListener((e) => {
    if (e.cursorLineId != titleLine.id) {
      removeButton(btn, buttonArea);
      return;
    }
    addButton(btn, buttonArea);
  });

  // アタッチしたらデタッチ用の関数を返す
  // …やっぱ返すのやめた
  // ページ遷移時に削除するようにする
}

/**
 * 現在のページ内の全てのコードブロックのタイトル行にボタンを追加する。 \
 * 関数実行後に追加されたコードブロックも対象になる（予定）。
 */
export async function attachButtonToAllCodeBlocks(
  buttons: Button | Button[],
): Promise<void> {
  const btn = Array.isArray(buttons) ? buttons : [buttons];
  if (scrapbox.Page.title === null) return;

  const codeBlocks = await getCodeBlocks({
    project: scrapbox.Project.name,
    title: scrapbox.Page.title,
    lines: scrapbox.Page.lines,
  });
  attachedCodeBlocks.push(...codeBlocks.map((e): AttachedCodeBlock => {
    return { codeBlock: e };
  }));
  console.log(attachedCodeBlocks);

  const handler: CursorEventHandler = (e) => {
    for (const { codeBlock: { titleLine } } of attachedCodeBlocks) {
      const buttonArea = getButtonAreaByID(titleLine.id);
      if (buttonArea === null) continue;
      if (e.cursorLineId != titleLine.id) {
        removeButton(btn, buttonArea);
        continue;
      }
      addButton(btn, buttonArea);
    }
  };
  addCursorEventListener(handler);
}

/** 行IDから行のDOMを取得するやつだけど結局使わなかった */
function getLineByID(lineId: string): HTMLElement | null {
  return document.getElementById(lineId);
}

/** 行IDからコードブロックタイトル内のボタン領域を取得する */
function getButtonAreaByID(lineId: string): Element | null {
  const selector = `#L${lineId} .code-block .code-block-start .tool-buttons`;
  return document.querySelector(selector);
}

/** ボタンのDOMオブジェクトを作成する */
function createButton(buttons: Button[]): ButtonDOM[] {
  const buttonDOMs: ButtonDOM[] = [];
  for (const button of buttons) {
    const buttonDOM = document.createElement("span");
    buttonDOM.title = button.title;
    buttonDOM.classList.add(...["button", button.title.toLowerCase()]);
    buttonDOM.onclick = button.onClick;
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
function addButton(buttons: Button[], buttonArea: Element): void {
  const childs = buttonArea.children;
  for (const button of buttons) {
    const isButtonExist = Array(...childs).some((e) => {
      if (!(e instanceof ButtonDOM)) return false;
      return e.title == button.title;
    });
    if (isButtonExist) continue;
    buttonArea.append(...createButton([button]));
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
