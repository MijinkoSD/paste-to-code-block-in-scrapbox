/// <reference no-default-lib="true" />
/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { scrapbox, TinyCodeBlock } from "./deps.ts";
import { addCursorEventListener } from "./cursor.ts";

export interface Button {
  iconClass: string[];
  title: string;
  onClick: (event: MouseEvent) => void;
}

// 後でbuttons（複数形）にする
export function attachButtonToCodeBlock(
  button: Button,
  title: Pick<TinyCodeBlock, "titleLine" | "pageInfo">,
) {
  const { titleLine, pageInfo } = title;
  if (
    pageInfo.pageTitle != scrapbox.Page.title ||
    pageInfo.projectName != scrapbox.Project.name
  ) return;
  const buttonArea = getButtonAreaByID(titleLine.id);
  if (buttonArea === null) return;
  const childs = buttonArea.children;
  for (const child of childs) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.title == button.title) return;
  }

  addCursorEventListener((e) => {
    if (e.cursorLineId != titleLine.id) {
      removeButton(button, buttonArea);
      return;
    }
    buttonArea.append(createButton(button));
  });

  // アタッチしたらデタッチ用の関数を返す
  // …やっぱ返すのやめた
  // ページ遷移時に削除するようにする
}

function getLineByID(lineId: string) {
  return document.getElementById(lineId);
}

function getButtonAreaByID(lineId: string) {
  const selector = `#L${lineId} .code-block .code-block-start .tool-buttons`;
  return document.querySelector(selector);
}

function createButton(button: Button) {
  const buttonDOM = document.createElement("span");
  buttonDOM.title = button.title;
  buttonDOM.classList.add(...["button", button.title.toLowerCase()]);
  buttonDOM.onclick = button.onClick;
  const icon = document.createElement("i");
  icon.classList.add(...button.iconClass);
  buttonDOM.append(icon);
  return buttonDOM;
}

function removeButton(button: Button, buttonArea: Element) {
  const nodes = buttonArea.children;
  for (const node of nodes) {
    if (!(node instanceof HTMLSpanElement)) continue;
    if (node.title == button.title) node.remove();
  }
}
