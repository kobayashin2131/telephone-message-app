const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_16x9";

// ==========================================
// Slide 1: Title Slide
// ==========================================
const slide1 = pptx.addSlide();
slide1.addText("📞 電話連絡DXツール「CallSync（コールシンク）」", { 
  x: 0.5, y: 1.5, w: "90%", h: 1, 
  fontSize: 40, bold: true, color: "1E3A8A", align: "center" 
});
slide1.addText("「紙のメモ」から「デジタル」への完全移行。\n伝言漏れをゼロにし、組織全体の顧客対応スピードを劇的に向上させます。", { 
  x: 0.5, y: 2.8, w: "90%", h: 1, 
  fontSize: 18, color: "4B5563", align: "center" 
});

// ==========================================
// Slide 2: Challenges & Benefits (課題とメリット)
// ==========================================
const slide2 = pptx.addSlide();
slide2.addText("🎯 解決する課題と導入のメリット", { 
  x: 0.5, y: 0.5, w: "90%", h: 0.6, 
  fontSize: 24, bold: true, color: "2563EB", border: [0, 0, {pt: 2, color: "2563EB"}, 0]
});

slide2.addText([
  { text: "【課題】 従来の電話メモ運用における問題点\n", options: { bold: true, fontSize: 16, color: "DC2626" } },
  { text: "・付箋の紛失や、口頭伝達による「言った・言わない」のトラブル。\n・営業マンが外出先で「自分宛ての連絡」をリアルタイムに把握できない。\n・誰が折り返し対応をしたのかわからず、二重対応や放置が発生する。\n\n", options: { fontSize: 14, color: "333333" } },
  
  { text: "【解決策】 CallSync導入による劇的変化\n", options: { bold: true, fontSize: 16, color: "059669" } },
  { text: "1. 全データクラウド保存: ", options: { bold: true, fontSize: 14 } },
  { text: "すべての受電内容をデータベース化し、情報紛失を完全に防ぎます。\n", options: { fontSize: 14 } },
  
  { text: "2. いつでもどこでも確認: ", options: { bold: true, fontSize: 14 } },
  { text: "スマホからリアルタイム確認。事務所への確認電話が不要になります。\n", options: { fontSize: 14 } },
  
  { text: "3. 対応状況の完全見える化: ", options: { bold: true, fontSize: 14 } },
  { text: "「未対応」「対応済（誰が対応したか）」が一目でわかり、放置を防ぎます。", options: { fontSize: 14 } },
], { x: 0.5, y: 1.5, w: "90%", h: 3.5, valign: "top" });

// ==========================================
// Slide 3: Concrete Features & Future (具体的な機能と将来像)
// ==========================================
const slide3 = pptx.addSlide();
slide3.addText("✨ 具体的な機能と今後の展望", { 
  x: 0.5, y: 0.5, w: "90%", h: 0.6, 
  fontSize: 24, bold: true, color: "2563EB", border: [0, 0, {pt: 2, color: "2563EB"}, 0]
});

slide3.addText([
  { text: "■ 直感的な専用画面（PC / スマホ）\n", options: { bold: true, fontSize: 16, color: "1E3A8A" } },
  { text: "・事務員ビュー (PC): 受電しながらキーボードでサクサク入力できる無駄のないUI。\n・現場ビュー (スマホ): 外出先で「自分宛ての未対応連絡」だけを絞り込み、ワンタップで対応完了。\n\n", options: { fontSize: 14, color: "333333" } },
  
  { text: "■ 柔軟な宛先指定と絞り込み検索\n", options: { bold: true, fontSize: 16, color: "1E3A8A" } },
  { text: "・「田中さん個人」や「営業部全体」など、用件に合わせて柔軟に宛先を組み合わせて指定可能。\n・過去のすべての履歴から「特定の部署」「特定の担当者」の対応状況を瞬時に検索。\n\n", options: { fontSize: 14, color: "333333" } }
], { x: 0.5, y: 1.5, w: "90%", h: 2.5, valign: "top" });

slide3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.5, w: "90%", h: 1.2, fill: "F3F4F6", line: { color: "D1D5DB" } });
slide3.addText("🚀 本格導入に向けた今後の拡張予定（Firebase / Google連携）\n・スマホへの直接プッシュ通知機能（アプリ化により、LINEを使わずに即時通知を実現）\n・Googleアカウント（SSO）連携（ログインするだけで自分の情報が自動表示され、セキュリティも向上）", { 
  x: 0.6, y: 4.6, w: "88%", h: 1.0, 
  fontSize: 14, color: "1F2937", valign: "top"
});

const outputPath = path.join(__dirname, 'CallSync_Presentation.pptx');
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log('PPTX created at ' + outputPath);
});
