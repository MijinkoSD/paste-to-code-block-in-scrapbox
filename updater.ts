/// <reference no-default-lib="true" />
/// <reference lib="es2022" />

import {
  buildInAlertModes,
  scrapboxAlert,
  TinyCodeBlock,
  updateCodeBlock,
} from "./deps.ts";
import { attachButtonToAllCodeBlocks, Button } from "./ui.ts";

interface UpdateHistory {
  prevCode: string;
  targetCodeBlock: TinyCodeBlock;
}
let updateHistories: UpdateHistory[] = [];

const pasteButton: Button = {
  title: "Paste",
  iconClass: ["fa-regular", "fa-paste"],
  onClick: async (ev, codeBlock) => {
    ev.preventDefault();
    const clipboardText = await navigator.clipboard.readText()
      .catch(async (e) => {
        // 何らかの要因によりクリップボード内のテキストを取得できなかった場合
        await scrapboxAlert(
          buildInAlertModes.OK,
          "クリップボード内のテキストの取得に失敗しました",
          "ブラウザの権限設定にてクリップボードへのアクセスを許可しているかご確認下さい。",
        );
      });
    // 権限がないとここでrejectされるので、分岐を作っておく
    if (clipboardText === undefined) return;
    console.log(clipboardText);
    // ここの確認ダイアログは、コードを元に戻せるようになったら不要
    const answer = await scrapboxAlert(
      buildInAlertModes.OK_CANCEL,
      "クリップボードの内容で以下のコードブロックを上書きしてもよろしいですか？",
      codeBlock.titleLine.text,
    );
    console.log("answer: %o", answer);
    if (answer.button != "OK") return;
    pushHistory({ prevCode: clipboardText, targetCodeBlock: codeBlock });
    await updateCodeBlock(clipboardText, codeBlock);
  },
};

const undoButton: Button = {
  title: "Undo",
  iconClass: ["fa-solid", "fa-arrow-rotate-left"],
  onClick: async (ev, codeBlock) => {
    const nowCode = codeBlock.bodyLines.map((e) => e.text).join("\n");
    const prevHistory = updateHistories.find((e) =>
      e.targetCodeBlock.titleLine.id == codeBlock.titleLine.id
    );
    if (prevHistory === undefined) return;
    const { prevCode } = prevHistory;
    if (nowCode != prevCode) {
      const answer = await scrapboxAlert(
        buildInAlertModes.OK_CANCEL,
        "コードブロックの中身を戻しても大丈夫ですか？",
        "前回の貼り付け時から、コードブロックへ編集が加えられています。\n" +
          "コードブロックを貼り付け前の状態に戻すと、貼り付け後に加えた編集は破棄され戻すことができなくなります。\n" +
          "それでもよろしいですか？",
      );
      if (answer.button != "OK") return;
    }
    await updateCodeBlock(prevCode, codeBlock);
    deleteHistory(prevHistory);
  },
};

export async function addPasteButton() {
  await attachButtonToAllCodeBlocks(pasteButton);
}

function addUndoButton() {
}

function pushHistory(history: UpdateHistory) {
  const { targetCodeBlock: target } = history;
  const index = updateHistories.findIndex((e) => {
    const id = e.targetCodeBlock.titleLine.id;
    return id == target.titleLine.id;
  });
  if (index < 0) {
    updateHistories.push(history);
  } else {
    updateHistories[index] = history;
  }
}

function deleteHistory(history: UpdateHistory) {
  updateHistories = updateHistories.filter((e) => {
    e.targetCodeBlock.titleLine.id != history.targetCodeBlock.titleLine.id;
  });
}
