/// <reference no-default-lib="true" />

import { scrapbox } from "./deps.ts";

/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

export interface CursorEvent {
  cursorLineId: string | null;
}

export type CursorEventHandler = (evenet: CursorEvent) => void | Promise<void>;

let cursorEvents: CursorEventHandler[] = [];

let cursorObserver: MutationObserver | undefined;

/**
 * カーソル移動時に発火させたい関数を渡す
 * cursorEventとは言うけれど行を移動した時にしか発火しない
 */
export function addCursorEventListener(handler: CursorEventHandler): void {
  cursorEvents.push(handler);
  if (cursorObserver !== undefined) return;
  observeCursor();
}

/** `addCursorEventListener()`で追加した特定の関数を削除する。 */
export function removeCursorEventListener(handler: CursorEventHandler): void {
  cursorEvents = cursorEvents.filter((e) => Object.is(e, handler));
}

/** カーソル移動時に実行する関数の登録を全て削除する */
function removeAllCursorEventListener(): void {
  while (cursorEvents.length > 0) {
    cursorEvents.shift();
  }
}

/**
 * カーソル移動時のイベントを発生させる \
 * （登録した関数をまとめて実行するだけで、これ単体では自発的に実行されない）
 */
async function execCursorEvents(): Promise<void> {
  if (cursorEvents.length <= 0) return;
  const cursorLineId = findCursorLineId();
  const eventArgs: Parameters<CursorEventHandler> = [{ cursorLineId }];
  const wrappedEvents: (ReturnType<CursorEventHandler>)[] = [];
  for (const e of cursorEvents) {
    wrappedEvents.push(e(...eventArgs));
  }
  await Promise.all(wrappedEvents);
}

/** カーソル行の行IDを返す */
function findCursorLineId(): string | null {
  const lines = document.querySelector(".page .lines");
  const nodes = lines?.children;
  if (nodes === undefined) return null;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!(node instanceof HTMLDivElement)) continue;
    for (const c of node.classList) {
      if (c == "cursor-line") return node.id.slice(1);
    }
  }
  return null;
}

/** カーソルを監視する */
function observeCursor(): void {
  const targetNode = document.querySelector("#editor .cursor");
  if (
    targetNode == null ||
    !(targetNode instanceof HTMLElement)
  ) return;
  const observerOptions: MutationObserverInit = {
    attributes: true,
  };
  cursorObserver = new MutationObserver(execCursorEvents);
  cursorObserver.observe(targetNode, observerOptions);
  scrapbox.on("page:changed", disconnectObserver);
  scrapbox.on("project:changed", disconnectObserver);
}

/** カーソルの監視を停止する */
function disconnectObserver(): void {
  removeAllCursorEventListener();
  if (cursorObserver === undefined) return;
  cursorObserver.disconnect();
}
