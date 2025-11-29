# Third-Party Licenses / サードパーティライセンス

This document lists the licenses of third-party libraries and dependencies used in this project.

このドキュメントには、本プロジェクトで使用しているサードパーティライブラリおよび依存関係のライセンス情報を記載しています。

---

## Table of Contents / 目次

1. [Overview / 概要](#overview--概要)
2. [Dependencies / 依存関係](#dependencies--依存関係)
3. [License Summary / ライセンス要約](#license-summary--ライセンス要約)

---

## Overview / 概要

This project is licensed under the **Apache License 2.0**. See the [LICENSE](./LICENSE) file for details.

本プロジェクトは **Apache License 2.0** の下でライセンスされています。詳細は [LICENSE](./LICENSE) ファイルをご覧ください。

The third-party libraries used in this project are listed below along with their respective licenses.

本プロジェクトで使用しているサードパーティライブラリとそれぞれのライセンスを以下に記載します。

---

## Dependencies / 依存関係

> **Note**: Please update this section when adding new dependencies.
>
> **注意**: 新しい依存関係を追加する際は、このセクションを更新してください。

### Example Format / 記載例

| Library Name | Version | License | URL |
|--------------|---------|---------|-----|
| example-library | 1.0.0 | MIT | https://github.com/example/library |

### Current Dependencies / 現在の依存関係

| Library Name | Version | License | URL |
|--------------|---------|---------|-----|
| *(Add dependencies here)* | - | - | - |

---

## License Summary / ライセンス要約

### Common License Types / よく使われるライセンスの種類

- **MIT License**: A permissive license that allows reuse with few restrictions.
  - MITライセンス: 制限の少ない寛容なライセンスで、再利用を許可します。

- **Apache License 2.0**: A permissive license that also provides an express grant of patent rights.
  - Apache License 2.0: 寛容なライセンスで、特許権の明示的な付与も含まれます。

- **BSD License**: A family of permissive licenses with minimal restrictions.
  - BSDライセンス: 制限が最小限の寛容なライセンスファミリーです。

- **ISC License**: A permissive license functionally equivalent to MIT.
  - ISCライセンス: MITと機能的に同等の寛容なライセンスです。

### License Compatibility / ライセンスの互換性

When adding new dependencies, please ensure:

新しい依存関係を追加する際は、以下を確認してください：

1. The library's license is compatible with Apache License 2.0
   - ライブラリのライセンスがApache License 2.0と互換性があること
2. The license allows commercial and non-commercial use
   - 商用・非商用の使用が許可されていること
3. The license permits modification and distribution
   - 変更と配布が許可されていること

---

## How to Update This Document / このドキュメントの更新方法

When adding a new dependency:

新しい依存関係を追加する場合：

1. Add the library information to the table above
   - 上記のテーブルにライブラリ情報を追加
2. Include: Library name, version, license type, and homepage URL
   - 記載項目: ライブラリ名、バージョン、ライセンスタイプ、ホームページURL
3. Verify the license is compatible with this project
   - このプロジェクトとライセンスの互換性を確認

### Automated Tools / 自動化ツール

For Node.js projects, you can use tools like:
- `license-checker`: `npx license-checker --summary`
- `npm-license-crawler`: Lists all licenses in dependencies

Node.jsプロジェクトでは以下のツールが利用可能です：
- `license-checker`: `npx license-checker --summary`
- `npm-license-crawler`: 依存関係のすべてのライセンスをリスト化

---

*Last updated: 2024*

*最終更新: 2024年*
