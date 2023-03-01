/// <reference no-default-lib="true" />
/// <reference lib="es2022" />

import {
  buildInAlertModes,
  getCodeBlocks,
  scrapbox,
  scrapboxAlert,
  TinyCodeBlock,
  updateCodeBlock,
} from "./deps.ts";
import {
  attachButtonToAllCodeBlocks,
  attachButtonToCodeBlock,
  Button,
  detachButtonFromCodeBlock,
} from "./ui.ts";

/**
 * 更新履歴。 \
 * Undoする時に使用する履歴を保存する。
 */
interface UpdateHistory {
  /** 前のコード本文 */
  prevCode: string;
  /** 対象のコードブロック */
  targetCodeBlock: TinyCodeBlock;
}
let updateHistories: UpdateHistory[] = [];

const pasteButton: Button = {
  title: "Paste",
  iconClass: ["fa-regular", "fa-paste"],
  onClick: async (ev, codeBlock) => {
    ev.preventDefault();
    if (scrapbox.Page.title === null) return;
    const clipboardText = (await navigator.clipboard.readText()
      .catch(async () => {
        // 何らかの要因によりクリップボード内のテキストを取得できなかった場合
        // 大抵はクリップボードの読み取り権限を取得できなかった場合
        await scrapboxAlert(
          buildInAlertModes.OK,
          "クリップボード内のテキストの取得に失敗しました",
          "ブラウザの権限設定にてクリップボードへのアクセスを許可しているかご確認下さい。",
        );
      }))
      ?.replaceAll("\r\n", "\n");
    if (clipboardText === undefined) return;

    // undoボタンを追加して変更を反映する
    const nowCodeBlocks = await getCodeBlocks({
      project: scrapbox.Project.name,
      title: scrapbox.Page.title,
      lines: scrapbox.Page.lines,
    }, {
      titleLineId: codeBlock.titleLine.id,
    });
    if (nowCodeBlocks.length <= 0) return;
    const nowCodeBlock = nowCodeBlocks[0];
    const indent = nowCodeBlock.titleLine.text.length -
      nowCodeBlock.titleLine.text.trimStart().length + 1;
    const codeContent = nowCodeBlock.bodyLines.map((e) => e.text.slice(indent))
      .join("\n");
    console.log("target code block: %o", nowCodeBlock);
    console.log("clipboard text: %o", clipboardText);
    console.log("code of adding history: %o", codeContent);
    await pushHistory({ prevCode: codeContent, targetCodeBlock: nowCodeBlock });
    await updateCodeBlock(clipboardText, nowCodeBlock);
  },
};

const undoButton: Button = {
  title: "Undo",
  iconClass: ["fa-solid", "fa-arrow-rotate-left"],
  onClick: async (_ev, codeBlock) => {
    if (scrapbox.Page.title === null) return;
    const nowCodeBlocks = await getCodeBlocks({
      project: scrapbox.Project.name,
      title: scrapbox.Page.title,
      lines: scrapbox.Page.lines,
    }, {
      titleLineId: codeBlock.titleLine.id,
    });
    if (nowCodeBlocks.length <= 0) return;
    const nowCodeBlock = nowCodeBlocks[0];
    const indent = nowCodeBlock.titleLine.text.length -
      nowCodeBlock.titleLine.text.trimStart().length + 1;
    const nowCode = nowCodeBlock.bodyLines.map((e) => e.text.slice(indent))
      .join("\n");
    const prevHistory = updateHistories.find((e) =>
      e.targetCodeBlock.titleLine.id == nowCodeBlock.titleLine.id
    );
    if (prevHistory === undefined) return;
    const { prevCode } = prevHistory;
    console.log("prev code: %o", prevCode);
    console.log("now code: %o", nowCode);
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

    // undoボタンを削除
    await deleteHistory(prevHistory);
    await updateCodeBlock(prevCode, nowCodeBlock);
  },
};

export async function addPasteButton() {
  await attachButtonToAllCodeBlocks(pasteButton);
}

/**
 * コードブロックの編集履歴を保存する。 \
 * 必要に応じてundoボタンの表示する。
 */
async function pushHistory(history: UpdateHistory) {
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

  await attachButtonToCodeBlock(undoButton, history.targetCodeBlock);
}

/**
 * コードブロックの編集履歴を削除する。 \
 * 必要に応じてundoボタンを非表示にする。
 */
async function deleteHistory(history: UpdateHistory) {
  updateHistories = updateHistories.filter((e) => {
    e.targetCodeBlock.titleLine.id != history.targetCodeBlock.titleLine.id;
  });

  await detachButtonFromCodeBlock(undoButton, history.targetCodeBlock);
}
