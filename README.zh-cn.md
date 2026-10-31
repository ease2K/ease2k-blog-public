# ease2k 个人博客

**简体中文** | [English](README.en.md)

个人博客源码，包含公开日常、技术文章、项目、竞赛奖项与证书，以及 Codeforces / AtCoder Rating 和历史曲线。支持中英文、浅色与深色主题、文章目录、Markdown 和数学公式。

项目使用 React、Vite 和 Node.js。公网展示公开内容；站主通过 SSH 隧道访问独立工作台，以密码登录后在线编辑。

## 本地开发

需要 Node.js >= 22.13。

```bash
npm ci
npm run dev
```

浏览器打开终端输出的本机地址（默认 http://127.0.0.1:5173）。开发服务支持页面组件和样式热更新，公开内容与 Rating API 由本机 Node.js 服务提供。修改 `lib/content.ts`、日常或教程数据后，重启开发服务。

## 构建与运行

```bash
npm run build
npm start
```

启动后访问 http://localhost:3000。服务默认监听本机地址；部署时由 Nginx 转发。可通过 `PORT` 和 `BLOG_ORIGIN` 设置监听端口与服务接受的 Host，二者需与反向代理配置一致。

## 站主在线编辑

工作台入口为 `/_owner`，不会出现在公开导航中。当前只允许本机或 SSH 隧道访问，公网代理访问站主入口和接口会返回 404。

本机试用：

```bash
npm run build
npm run owner:setup
npm start
```

在终端设置至少 12 位密码，输入不会显示。随后打开 http://localhost:3000/_owner 登录。密码只保存为加盐哈希，不要写入源码、环境示例或提交记录。

服务器首次设置和 SSH 隧道方法见 [站主工作台说明](self-hosted/OWNER.md)。工作台支持 Markdown 编辑和预览、草稿、发布、修改记录、回收站及 JSON 备份导出。首次发布时由服务器自动记录发布时间，按北京时间显示到分钟；保存草稿不会确定发布时间，后续编辑或重新发布保留原时间。

常用标签随站点语言切换显示，中英文对应写法共用筛选条件，并支持中英文搜索。技术名称和未收录的自定义标签保留原文。

在线内容、草稿和认证信息保存在独立数据目录，默认本机路径为 `self-hosted/data/editor/`，服务器为 `/var/lib/ease2k-blog/editor/`。它们不会随代码重新部署而覆盖，也不会自动提交到 GitHub。请定期导出备份或备份服务器数据目录。

## 修改内容

| 内容 | 文件或目录 |
| --- | --- |
| 公开日常 | `lib/journal.json` |
| 文章、项目、个人介绍、奖项元数据 | `lib/content.ts` |
| 竞赛教程原稿 | `content/competitions/` |
| 已脱敏证书和缩略图 | `public/awards/` |
| 页面布局 | `components/blog.tsx` |
| 页面样式 | `styles/globals.css` |
| Rating 数据与历史获取 | `lib/ratings.mjs` |

文章的 `date` 建议使用带时区的 ISO 8601 时间，例如 `2026-10-30T19:30:00+08:00`。列表和详情页按北京时间展示到分钟；只填写日期的记录保留日期显示。

修改教程原稿后，执行 `node scripts/import-competition-tutorials.mjs` 更新教程数据。

## 打包部署

```bash
npm run package
```

部署包生成于 `outputs/ease2k-blog-linux.tar.gz`，附带 SHA-256 校验文件。具体上传、更新和服务检查步骤见 [自建服务器部署说明](self-hosted/README.md)。

## 仓库内容与本地备份

仓库保留源码、依赖锁文件、公开内容、已脱敏图片及部署脚本。环境变量、密钥、数据库文件、证书原图、构建产物、部署包、浏览器日志和测试截图均应留在仓库之外。

证书原图位于本地 `work/certificate-originals/`，不会上传。只有持有这些原图时才运行 `scripts/redact-certificates.mjs`；正常构建直接使用仓库内已脱敏图片。

新增忽略规则不能清除旧提交中的文件；提交前应同时检查暂存区和历史记录。数据库及原图需要另行备份。

## 验证

```bash
npm run check
npm test
npm run test:ratings
npm run test:owner
```

`npm test` 需要先执行构建；测试公开接口、证书、私密内容隔离和只读限制。安装 Nginx 后，可用 `NGINX_BIN=/path/to/nginx npm run test:nginx` 检查反向代理脚本。

随包内容作为初始数据，在线修改使用 Node.js 内置 SQLite 持久化，不需要另装数据库服务或第三方托管配置。

## 平台账号

- [GitHub](https://github.com/ease2K)
- [Codeforces](https://codeforces.com/profile/ease2k)
- [AtCoder](https://atcoder.jp/users/ease2k)

## 源码与内容使用说明

本仓库用于展示本站实现，目前未选择统一的开源许可证。阅读、Fork 与其他使用范围见 [使用说明](USAGE.md)。原创文章、日常、证书图片及第三方素材各自保留相应权利，源码公开不表示这些内容可以整体转载或替换署名后发布。
