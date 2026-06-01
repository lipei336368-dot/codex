# 发布流程

## 本地构建

```powershell
cd apps\desktop
npm install
npm run build
```

构建产物：

```text
apps/desktop/src-tauri/target/release/yiyan_daily_question_generator.exe
```

## 生成便携版压缩包

发布包只应包含：

- `毅研每日一题生成器.exe`
- `README.txt`
- `LICENSE.txt`

不应包含：

- 题库 JSON
- SQLite 数据库
- OCR/PDF/Word 原始资料
- 临时截图
- `node_modules`
- Rust `target`

## GitHub Release

建议发布 tag：

```text
v0.1.0
```

Release 标题：

```text
毅研每日一题生成器 v0.1.0
```

上传文件：

```text
yiyan-daily-question-generator-v0.1.0-windows-portable.zip
```
