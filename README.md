# ease2k 个人博客

**简体中文** | [English](README.en.md)

个人博客源码，包含公开日常、技术文章、项目、竞赛奖项与证书，以及 Codeforces / AtCoder Rating 和历史曲线。支持中英文、浅色与深色主题、文章目录、Markdown 和数学公式。

项目使用 React、Vite 和 Node.js。公网展示公开内容；站主通过配置后的 HTTPS 入口或 SSH 隧道访问独立工作台，以密码登录后在线编辑。

## 本地开发

需要 Node.js >= 22.13。

```bash
npm ci
npm run dev
```

浏览器打开终端输出的本机地址（默认 http://127.0.0.1:5173） 。开发服务支持页面组件和样式热更新，公开内容与 Rating API 由本机 Node.js 服务提供。修改 `lib/content.ts`、日常或教程数据后，重启开发服务。

## 构建与运行

```bash
npm run build
npm start
```

启动后访问 http://localhost:3000 。服务默认监听本机地址；部署时由 Nginx 转发。可通过 `PORT` 和 `BLOG_ORIGIN` 设置监听端口与服务接受的 Host，二者需与反向代理配置一致。

## 站主在线编辑

工作台入口为 `/_owner`，不会出现在公开导航中。未配置公网入口时仅允许本机或 SSH 隧道访问；配置 HTTPS 域名后，可从网站页脚昵称进入同一域名下的安全工作台。

如果网站已经使用 HTTPS 域名，可按 [站主工作台说明](self-hosted/OWNER.md) 运行 `configure-owner-domain.sh`，把工作台与网站统一到同一个 HTTPS 来源。脚本复用现有证书，停用旧 HTTP IP 登录，并保存后续部署需要保留的公开来源配置。

本机试用：

```bash
npm run build
npm run owner:setup
npm start
```

在终端设置至少 12 位密码，输入不会显示。随后打开 http://localhost:3000/_owner 登录。密码只保存为加盐哈希，不要写入源码、环境示例或提交记录。

服务器首次设置和 SSH 隧道方法见 [站主工作台说明](self-hosted/OWNER.md)。工作台支持 Markdown 编辑和预览、草稿、发布、修改记录、回收站及 JSON 备份导出。首次发布时由服务器自动记录发布时间，按北京时间显示到分钟；保存草稿不会确定发布时间，后续编辑或重新发布保留原时间。

技术主题包含 Java、MySQL、HTML、CSS 和 JavaScript。发布文章时填写对应标签即可自动归类，`JS` 也会归入 JavaScript；首页仍隐藏空主题分区。

常用标签随站点语言切换显示，中英文对应写法共用筛选条件，并支持中英文搜索。技术名称和未收录的自定义标签保留原文。

在线内容、草稿和认证信息保存在独立数据目录，默认本机路径为 `self-hosted/data/editor/`，服务器为 `/var/lib/ease2k-blog/editor/`。它们不会随代码重新部署而覆盖，也不会自动提交到 GitHub。请定期导出备份或备份服务器数据目录。

## 阅读与发布体验

卡片、按钮、输入框和弹层使用连续圆角，保留各组件原有的半径层级。支持 `corner-shape` 的浏览器直接使用 `superellipse(1.5)`，其他浏览器按需加载 Hyperellipse 兼容模块；加载失败时保留普通圆角。兼容模式下，渐变与裁切容器省略部分阴影，非均匀强调描边及获得键盘焦点的原生表单控件保留普通圆角，以保证边框和焦点提示完整。

列表使用轻量摘要接口，单篇正文按需读取，搜索由服务器检索已发布内容。公开页面预渲染 HTML，文章提供独立描述、分享卡片、结构化数据；不存在或未发布的文章返回 404，`/sitemap.xml` 仅列出公开内容，`/robots.txt` 排除后台接口。

工作台支持自动编辑草稿及浏览器恢复副本、图片上传/粘贴/拖放、自动摘要与阅读时长。发布文章仍需手动点击确认。安装时同时配置每日自动备份，包含数据库、站主配置和图片，并验证恢复。详见 [工作台说明](self-hosted/OWNER.md) 和 [备份恢复说明](self-hosted/BACKUP.md)。

## 学习专栏、交互示例和代码阅读

`/series` 展示按顺序阅读的系列，已有 C++ STL 入门专栏。后台可设置系列标题、介绍、地址及章节顺序，公开目录只包含已发布章节。文章可附加一组 HTML、CSS、JavaScript 在线示例，读者点击运行后在隔离预览中交互；编辑内容不会改写原文章。代码块支持按需语法高亮、行号、长代码折叠及 `{2,4-6}` 重点行，复制保留完整原始代码。具体写法见 [站主说明](self-hosted/OWNER.md)。

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
npm run test:improvements
npm run test:learning
```

`npm test` 需要先执行构建；测试公开接口、证书、私密内容隔离和只读限制。安装 Nginx 后，可用 `NGINX_BIN=/path/to/nginx npm run test:nginx` 检查反向代理脚本。

随包内容作为初始数据，在线修改使用 Node.js 内置 SQLite 持久化，不需要另装数据库服务或第三方托管配置。

## 平台账号

- [GitHub](https://github.com/ease2K)
- [Codeforces](https://codeforces.com/profile/ease2k)
- [AtCoder](https://atcoder.jp/users/ease2k)

## 源码与内容使用说明

本仓库用于展示本站实现，目前未选择统一的开源许可证。阅读、Fork 与其他使用范围见 [使用说明](USAGE.md)。原创文章、日常、证书图片及第三方素材各自保留相应权利，源码公开不表示这些内容可以整体转载或替换署名后发布。

## 搜索、专栏与订阅

支持命中摘要与文章内定位、独立专栏管理及章节排序、带引用保护的图片资源库，以及全站/技术/专栏 RSS。页脚“订阅更新”进入 `/subscribe`。服务器每日备份可拉取至 Mac 独立保存，并检查失败、过期和磁盘空间；配置见 [备份说明](self-hosted/BACKUP.md)。

## 首页、阅读进度与项目记录

首页使用手动精选、最近更新、正在开发的项目和主题入口，完整条目在各区之间去重。工作台的“首页推荐、项目展示与文章维护”可以勾选精选；首页最多展示三篇，最近更新排除已展示的精选与项目。

专栏提供继续阅读、章节位置和手动已读标记，保存在当前浏览器的 `ease2k:reading:v1` 中，不要求注册，也不跨设备同步。打开文章或滚动到底不会自动标记已读。存储不可用时显示提示并保留本页会话内进度；删除或转为私密的章节不会计入公开专栏进度。

项目可以维护开发状态、技术栈、实际截图、解决的问题、完成成果、项目源码与在线入口。截图可以从本机上传；未发布项目的独占截图只允许站主读取，发布后可见，图片引用和替换沿用资源库保护。内置博客项目使用 `public/projects/personal-blog.webp` 中的本地实际截图。

文章保持首次发布时间，普通保存和编辑草稿不改变公开更新时间。站主勾选“本次发布记录为实质更新”并填写说明后，服务器生成 `modifiedAt`；客户端传入的时间不会作为更新时间。文章页、结构化数据和站点地图同步展示该信息。文章可注明示例环境，并通过带文章地址和版本的 GitHub Issues 链接提交纠错，也可复制纠错信息自行补充。

相关验证：`npm run test:experience`，以及浏览器中的专栏阅读、刷新恢复和禁用本地存储场景。

## 本机文章翻译

站主工作台支持桌面 Chrome 本机中英文互译。标题、摘要和 Markdown 正文生成后先预览，再应用到私有编辑草稿；代码、公式和链接地址保留。首次使用需准备语言包，不需要翻译 API 密钥。详见 [站主说明](self-hosted/OWNER.md)。

## 站主入口

点击页脚昵称进入在线站主工作台，无需本机 SSH。登录时可选记住设备 30 天。默认支持 HTTPS；站主明确接受明文传输与本机翻译不可用的限制后，可按 [站主说明](self-hosted/OWNER.md) 启用 HTTP。密码、CSRF、退出撤销和私有草稿保护仍保留。
