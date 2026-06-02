# Silent Rhythm 🎸

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Active-brightgreen.svg)](https://jackasser.github.io/silent-rythm/)

**Silent Rhythm** は、ギター指板上のすべての音名を網羅的にハント（発見）して、直感的に暗記・学習するためのプレミアムなインタラクティブ・トレーニングツールです。  
ミッドナイト・ジャズクラブを彷彿とさせる洗練されたデザインで、PC・スマートフォンの両方に完全対応しています。

---

## 🌟 主な機能 / Features

1. **五線譜＆指板のダイナミック双方向連携**
   - 五線譜上の音符をクリックすると、指板上で対応するすべてのポジション（オクターブ違い・異弦同音）が自動的にハイライト表示されます。
2. **Note Run（音名ハントゲーム）**
   - 出題された自然音（C, D, E, F, G, A, B）に対して、0〜12フレットの指板上に存在する**すべての正しい位置（5〜6箇所）をすべて探し出す**網羅的な暗記トレーニング。
   - 重複ピッチも座標（弦・フレット）ごとに厳密に個別判定する設計です。
3. **ローカルログイン＆進行度自動保存**
   - 美しいグラスモルフィズム（磨りガラス風）の新規登録・ログインモーダル。
   - スコアやアンロックしたロードマップの進行度（レベル）はブラウザの `localStorage` に自動的に保存され、リロードしても引き継がれます。
4. **モバイル・レスポンシブ対応**
   - スマートフォンのような縦長画面でも、横スクロール可能なロードマップタブやスワイプ操作に対応した指板エリアなど、快適なタップ操作を保証します。

---

## 🛠 使い方 / How to run locally

本プロジェクトは純粋なHTML/CSS/JavaScriptのみで構成されているため、ビルド不要でローカル環境ですぐに動かすことができます。

1. このリポジトリをクローンするか、ファイルをダウンロードします。
   ```bash
   git clone https://github.com/jackasser/silent-rythm.git
   cd silent-rythm
   ```
2. `index.html` を任意のブラウザで直接開くか、ローカルの開発サーバー（`Live Server`等）を起動して開きます。
   ```bash
   # 例: Pythonを使用してローカルサーバーを起動する場合
   python -m http.server 8000
   ```
   ブラウザで `http://localhost:8000` にアクセスしてください。

---

## 📜 ライセンス / License

このプロジェクトは **MIT License** の下でオープンソースとして公開されています。  
商業利用、修正、配布など、ライセンスの条件に従って自由に行っていただけます。

詳細については [LICENSE](./LICENSE) ファイルをご確認ください。

---

*Created by [jackasser](https://github.com/jackasser)*
