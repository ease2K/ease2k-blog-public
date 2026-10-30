# ease2k 个人博客

个人博客源码，包含公开日常、技术文章、项目、竞赛奖项与证书，以及 Codeforces / AtCoder Rating 和历史曲线。支持中英文、浅色与深色主题、文章目录、Markdown 和数学公式。

当前自建服务器使用 `self-hosted/` 中的公开只读版本，页面不提供登录、在线编辑或私密内容查看。

## 本地构建

需要 Node.js >= 22.13。

```bash
npm ci
node self-hosted/build.mjs
node self-hosted/build/server.mjs
```

启动后访问 http://localhost:3000。服务默认监听本机地址；部署时由 Nginx 转发。

## 修改内容

| 内容 | 文件或目录 |
| --- | --- |
| 公开日常 | `lib/journal.json` |
| 文章、项目、个人介绍、奖项元数据 | `lib/content.ts` |
| 竞赛教程原稿 | `content/competitions/` |
| 已脱敏证书和缩略图 | `public/awards/` |
| 页面布局 | `components/blog.tsx` |
| 页面样式 | `app/globals.css` |
| Rating 数据与历史获取 | `lib/ratings.mjs` |

修改教程原稿后，执行 `node scripts/import-competition-tutorials.mjs` 更新教程数据。

## 打包部署

```bash
node self-hosted/package.mjs
```

部署包生成于 `outputs/ease2k-blog-linux.tar.gz`，附带 SHA-256 校验文件。具体上传、更新和服务检查步骤见 [自建服务器部署说明](self-hosted/README.md)。

## 仓库内容与本地备份

仓库保留源码、依赖锁文件、公开内容、已脱敏图片及部署脚本。环境变量、密钥、数据库文件、证书原图、构建产物、部署包、浏览器日志和测试截图均应留在仓库之外。

证书原图位于本地 `work/certificate-originals/`，不会上传。只有持有这些原图时才运行 `scripts/redact-certificates.mjs`；正常构建直接使用仓库内已脱敏图片。

新增忽略规则不能清除旧提交中的文件；提交前应同时检查暂存区和历史记录。数据库及原图需要另行备份。

## 原有 Sites / Cloudflare 开发流程

项目同时保留 Vinext、Cloudflare Worker / D1 的源码和数据库迁移，用于原有托管开发流程。`npm run dev`、`npm run build` 对应这一流程，不是当前自建服务器部署入口。公开版本的 `.openai/hosting.json` 使用 `.openai/hosting.example.json` 的示例值，不绑定现有托管项目。若使用 Sites 托管，应创建自己的项目并设置配置；其中不应写入凭据。

## 平台账号

- [GitHub](https://github.com/ease2K)
- [Codeforces](https://codeforces.com/profile/ease2k)
- [AtCoder](https://atcoder.jp/users/ease2k)

## 源码与内容使用说明

本仓库用于展示本站实现，目前未选择统一的开源许可证。阅读、Fork 与其他使用范围见 [使用说明](USAGE.md)。原创文章、日常、证书图片及第三方素材各自保留相应权利，源码公开不表示这些内容可以整体转载或替换署名后发布。
