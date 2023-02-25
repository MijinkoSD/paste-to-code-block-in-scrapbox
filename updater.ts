/// <reference no-default-lib="true" />
/// <reference lib="es2022" />

import { buildInAlertModes, scrapboxAlert, updateCodeBlock } from "./deps.ts";
import { attachButtonToAllCodeBlocks, Button } from "./ui.ts";

const pasteButton: Button = {
  title: "Paste",
  iconClass: ["fa-regular", "fa-paste"],
  onClick: async (e, codeBlock) => {
    e.preventDefault();
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
    const answer = await scrapboxAlert(
      buildInAlertModes.OK_CANCEL,
      "クリップボードの内容で以下のコードブロックを上書きしてもよろしいですか？",
      codeBlock.titleLine.text,
    );
    console.log("answer: %o", answer);
    if (answer.button != "OK") return;
    // ここのタイミングで前のコードを保存する。
    await updateCodeBlock(clipboardText, codeBlock);
  },
};

export async function addPasteButton() {
  await attachButtonToAllCodeBlocks(pasteButton);
}
