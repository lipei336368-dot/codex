# 毅研每日一题生成器

毅研每日一题生成器是一款面向药学考研复习的桌面工具，用于管理题库、录入题目、生成每日一题，并导出适合发布的题目图和答案图。

> 当前仓库只包含应用源码和必要文档，不包含商业题库、用户数据库、OCR 临时文件或打包产物。

## 功能

- 题库管理：支持章节筛选、题型筛选、搜索、分页/懒加载、编辑和删除。
- 题目录入：支持单选题、多选题、简答论述题录入。
- 每日一题生成：支持选择生成日期，并根据考研日期计算倒计时。
- 图片导出：导出“每日一题”和“每日一题答案”两张图片。
- 预览日历：查看哪些日期已经生成，点击日期切换预览。
- 数据管理：默认使用本机 AppData 数据库，也可以在设置页更改数据文件夹。
- 图片处理：支持题干、选项、答案、解析图片，并包含图片压力测试用例。

## 技术栈

- Tauri v2
- React
- TypeScript
- Rust
- SQLite
- Vite
- Vitest
- Playwright

## 下载使用

普通用户建议从 GitHub Releases 下载压缩包：

1. 下载最新的 `yiyan-daily-question-generator-v*.zip`。
2. 解压到本地文件夹。
3. 双击 `毅研每日一题生成器.exe` 启动。
4. 在题库页导入自己的 JSON 题库。

软件不会把题库数据内置在本仓库中。用户导入题库后，数据会写入本机 SQLite 数据库。

## 数据位置

默认数据目录位于系统 AppData 下，数据库文件名为：

```text
yiyan-daily-question-generator.sqlite
```

可以在软件“设置”页更改数据文件夹。更改后，软件会复制当前数据库和附件目录，新位置将在重启后生效。

## 开发

```powershell
cd apps\desktop
npm install
npm run dev
```

## 构建

```powershell
cd apps\desktop
npm run build
```

构建后的 exe 会出现在：

```text
apps/desktop/src-tauri/target/release/
```

## 验证

```powershell
cd apps\desktop
npm run typecheck
npm test -- --run
cd src-tauri
cargo test
```

说明：真实题库导入测试默认不依赖任何本机私有文件。如需启用真实题库 fixture 测试，可设置 `YIYAN_REAL_CHAPTER_JSON_FIXTURES` 为本机 JSON 文件路径列表，多个路径用英文分号分隔；未设置时该测试会自动跳过。

## 题库 JSON 格式

项目支持按章节组织的 JSON 题库。基本结构如下：

```json
{
  "chapters": [
    {
      "chapter": "第一章 绪论",
      "question_types": [
        {
          "type": "single_choice",
          "questions": []
        },
        {
          "type": "multiple_choice",
          "questions": []
        },
        {
          "type": "short_answer",
          "questions": []
        }
      ]
    }
  ]
}
```

题型说明：

- `single_choice`：单选题
- `multiple_choice`：多选题
- `short_answer`：简答论述题

历史版本中的 `essay` 会在导入/导出时统一视作 `short_answer`。

## 开源协议

本项目使用 MIT License。源码可以自由使用、修改和分发，但题库内容、教材内容、OCR 来源文件等第三方资料不包含在本开源协议范围内。
