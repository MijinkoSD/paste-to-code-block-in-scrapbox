/// <reference no-default-lib="true" />

import { scrapbox } from "./deps.ts";

/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

export interface CursorEvent {
  cursorLineId: string | null;
}

export type CursorEventHandler = (evenet: CursorEvent) => void | Promise<void>;

const cursorEvents: CursorEventHandler[] = [];

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

function disconnectObserver() {
  removeAllCursorEventListener();
  if (cursorObserver === undefined) return;
  cursorObserver.disconnect();
}

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

function removeAllCursorEventListener(): void {
  while (cursorEvents.length > 0) {
    cursorEvents.shift();
  }
}
