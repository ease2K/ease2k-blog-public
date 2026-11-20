type Localized = Record<"zh" | "en", string>;
type Release = { date: string; title: Localized; changes: Localized[] };

export { changelogPath, changelogCopy } from "./changelog-meta";

export const releases: Release[] = [
    {
        date: "2026-11-17",
        title: { zh: "加快首页和教程加载", en: "Faster home and tutorial pages" },
        changes: [
            { zh: "教程打开时直接显示排版好的正文和公式，修复了部分公式字体无法加载的问题。", en: "Tutorials open with formatted text and equations, and math fonts load correctly." },
            { zh: "缩小了首页脚本和平台图标，竞赛曲线和文章工具改为按需加载。", en: "Reduced homepage scripts and icon sizes, and load rating charts and article tools when needed." },
            { zh: "启用 HTTP/2。首页时钟独立刷新，手机端只显示到分钟。", en: "Enabled HTTP/2. The homepage clock updates independently and shows hours and minutes on mobile." },
        ],
    },
    {
        date: "2026-11-09",
        title: { zh: "补全建站以来的更新记录", en: "Added the blog's early history" },
        changes: [
            { zh: "根据早期站点源码、发布包和部署记录，把时间线补回博客初版。", en: "Reconstructed the timeline back to the first version using early source files, release packages, and deployment records." },
            { zh: "增加「最早在前」，可以从搭建初版一路看到现在。", en: "Added an oldest-first view so you can follow the blog from the beginning." },
        ],
    },
    {
        date: "2026-11-09",
        title: { zh: "更新日志上线", en: "The changelog is live" },
        changes: [
            { zh: "新增更新日志栏目，顶部导航、手机「更多」菜单和页脚均可进入。", en: "Added a changelog accessible from the desktop navigation, the mobile More menu, and the footer." },
        ],
    },
    {
        date: "2026-11-09",
        title: { zh: "侧栏个人卡片增加入口", en: "The profile card links to About" },
        changes: [
            { zh: "点击侧栏头像或昵称即可前往「关于我」，竞赛平台链接仍可分别打开。", en: "The sidebar avatar and name open About, and each contest platform still has its own link." },
        ],
    },
    {
        date: "2026-11-09",
        title: { zh: "细化导航反馈", en: "Clearer navigation feedback" },
        changes: [
            { zh: "导航链接和搜索入口在悬停或键盘聚焦时显示短下划线。", en: "Navigation links and search show a short underline on hover or keyboard focus." },
        ],
    },
    {
        date: "2026-11-09",
        title: { zh: "移动端导航与阅读体验", en: "Mobile navigation and reading" },
        changes: [
            { zh: "窄屏导航增加「更多」菜单，集中放置项目、竞赛和关于我。", en: "A More menu groups Projects, Contests, and About on narrow screens." },
            { zh: "简化文章进度条和纠错入口，把首页续读卡片压得更紧凑。", en: "Simplified the article progress bar and correction controls, and made the homepage resume card more compact." },
            { zh: "为排序、栈和队列、优先队列教程补充英文标题和摘要，并标明只有中文正文的文章。", en: "Added English titles and summaries for the sorting, stacks and queues, and priority queue tutorials, and labeled entries whose full text is in Chinese." },
        ],
    },
    {
        date: "2026-11-08",
        title: { zh: "页脚补充备案信息", en: "Filing information in the footer" },
        changes: [
            { zh: "在网站页脚展示备案号，并链接到工信部备案查询。", en: "The footer now shows the site's ICP filing number and links to the official lookup." },
        ],
    },
    {
        date: "2026-11-07",
        title: { zh: "更正 Codeforces 账号", en: "Codeforces profile correction" },
        changes: [
            { zh: "将 Codeforces 账号更正为 ease2kk，并更新对应的 Rating 快照和个人主页链接。", en: "Corrected the Codeforces handle to ease2kk and updated the rating snapshot and profile link." },
        ],
    },
    {
        date: "2026-11-06",
        title: { zh: "从手动标记到自动续读", en: "Automatic reading progress" },
        changes: [
            { zh: "自动保存文章的阅读位置和百分比，重新打开时可以恢复到上次读到的段落。", en: "The blog saves your position and percentage automatically and can return you to the paragraph you last read." },
            { zh: "读到末尾并停留后自动标记已读，专栏随之更新已读章节数。", en: "Articles are marked complete after you reach the end and pause there, updating the series chapter count." },
            { zh: "增加首页续读与重新阅读入口，进度保存在当前浏览器。随后把进度条颜色调整为跟随主题。", en: "Added homepage resume and restart controls. Progress stays in the current browser, and the progress bar now follows the theme." },
        ],
    },
    {
        date: "2026-11-06",
        title: { zh: "恢复本机翻译与统一圆角", en: "Translation recovery and shared corners" },
        changes: [
            { zh: "修复站主工作台的 Chrome 本机翻译检测，显示语言包状态，并允许重新检测。", en: "Fixed detection for Chrome's on-device translation, showed language pack status, and added a recheck option." },
            { zh: "站主工作台与首页共用连续圆角尺寸。", en: "The owner workspace and homepage now share the same continuous corner sizes." },
        ],
    },
    {
        date: "2026-11-06",
        title: { zh: "域名启用 HTTPS，工作台迁入", en: "HTTPS for the site and owner workspace" },
        changes: [
            { zh: "为根域名和 www 域名配置 HTTPS 证书和自动续期，访客可以通过 HTTPS 浏览。", en: "Configured HTTPS certificates and automatic renewal for the main and www domains." },
            { zh: "修复 HTTPS 域名下的站主入口，把原来的公网 IP 登录入口迁到正式域名，并停用明文登录。", en: "Fixed owner access on the HTTPS domain, moved sign-in from the public IP to the main domain, and disabled plaintext sign-in." },
        ],
    },
    {
        date: "2026-11-06",
        title: { zh: "首页精选、项目展示与文章维护", en: "Featured posts, projects, and article maintenance" },
        changes: [
            { zh: "首页增加精选，避免同一篇文章在多个推荐区重复出现，并把连续圆角应用到主要组件。", en: "Added featured posts, removed duplicates across homepage sections, and applied continuous corners to key components." },
            { zh: "为项目增加截图和链接展示，为文章增加实质更新时间、更新说明和纠错入口。", en: "Added project screenshots and links, plus article revision dates, update notes, and a correction link." },
            { zh: "在专栏中加入阅读进度与继续阅读入口，当时可以手动标记已读。", en: "Added progress and resume controls to series, initially with a manual completion toggle." },
        ],
    },
    {
        date: "2026-11-01",
        title: { zh: "Markdown 实时预览与滚动修复", en: "Live Markdown preview and scroll fixes" },
        changes: [
            { zh: "中英文正文均可实时预览图片、代码和公式，支持仅编辑、分栏预览和仅预览。", en: "Both languages support live previews for images, code, and math, with edit-only, split, and preview-only modes." },
            { zh: "让桌面文章列表、编辑区和预览各自滚动，随后修复正文滚到顶部时无法继续上滑到标题的问题。", en: "Gave the desktop article list, editor, and preview independent scrolling, then fixed scrolling from the top of the editor back to the title." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "在线工作台的过渡访问方案", en: "Transitional access for the owner workspace" },
        changes: [
            { zh: "为公网在线编辑准备 HTTPS。域名 HTTPS 尚未接通时，曾短期开放带明文提示的 IP 登录。", en: "Prepared HTTPS for online editing. While domain HTTPS was unavailable, sign-in by IP was temporarily offered with a plaintext warning." },
            { zh: "修复过渡期的旧跳转和代理检查问题。正式域名接通 HTTPS 后，于 11 月 6 日停用这套明文入口。", en: "Fixed stale redirects and proxy checks during the transition. The plaintext entry was retired on November 6 after domain HTTPS became available." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "页脚站主入口与记住设备", en: "Owner entry and remembered devices" },
        changes: [
            { zh: "在页脚昵称处增加站主入口，并提供可选的 30 天记住设备。", en: "Added an owner entry at the footer nickname and an optional 30-day remembered session." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "文章草稿支持本机中英翻译", en: "On-device translation for drafts" },
        changes: [
            { zh: "接入 Chrome 本机中英翻译，可先预览译文，再应用到草稿。", en: "Added Chrome's on-device Chinese–English translation, with a preview before applying it to a draft." },
            { zh: "翻译时保护 Markdown 中的代码、公式和链接地址。", en: "Preserved code, formulas, and link destinations during translation." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "修正页面标题与控件对齐", en: "Page title and control alignment fixes" },
        changes: [
            { zh: "修复站内切换文章后浏览器标签页标题未及时更新的问题。", en: "Fixed browser tab titles that stayed stale after navigating between articles." },
            { zh: "统一下拉框箭头内边距，避免箭头贴边。", en: "Aligned dropdown arrows and gave them consistent inset spacing." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "搜索定位、RSS 与集中内容管理", en: "Search highlights, RSS, and content management" },
        changes: [
            { zh: "搜索结果展示命中片段，打开文章后可定位并高亮正文中的关键词。", en: "Search results show matching snippets and can highlight and jump to matching text in an article." },
            { zh: "上线 RSS 订阅页，提供全站、技术文章和各学习专栏的订阅源。", en: "Launched RSS feeds for the entire blog, technical articles, and individual series." },
            { zh: "工作台增加专栏集中管理和图片库，支持调整章节顺序、查看图片引用和恢复删除的资源。", en: "Added series management and a media library, with chapter reordering, image reference checks, and resource recovery." },
            { zh: "建立 Mac 异地备份与恢复校验，减少同一故障的重复提醒。", en: "Added verified off-site backups on Mac and reduced duplicate alerts for the same failure." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "学习专栏和可运行的前端示例", en: "Learning series and runnable examples" },
        changes: [
            { zh: "新增学习专栏，首个专栏按顺序组织三篇 C++ STL 教程。", en: "Introduced learning series, starting with three C++ STL tutorials in order." },
            { zh: "文章可嵌入 HTML、CSS、JavaScript 示例，支持编辑、运行、停止、重置和隔离预览。", en: "Articles can embed editable HTML, CSS, and JavaScript examples with run, stop, reset, and isolated previews." },
            { zh: "代码块支持行号、重点行和长代码折叠，语法高亮按需加载。", en: "Code blocks gained line numbers, highlighted lines, and folding for long examples, with syntax highlighting loaded on demand." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "重做文章加载与发布流程", en: "Article loading and publishing improvements" },
        changes: [
            { zh: "首屏由服务端输出页面，列表只取摘要，打开文章再加载完整正文。", en: "Pages render on the server, lists load summaries, and full article text loads when opened." },
            { zh: "增加前后篇、同主题文章、服务端搜索、分享元数据、站点地图和 404 页面。", en: "Added previous and next posts, related articles, server-side search, sharing metadata, a sitemap, and a 404 page." },
            { zh: "工作台增加自动草稿和图片上传。图片随引用它的公开文章开放。", en: "Added autosaved drafts and image uploads. Uploaded images become visible when referenced by a published article." },
            { zh: "建立每日备份和恢复验证，修复切换发布版本时备份命令的运行问题。", en: "Added daily backups with restore verification and fixed the backup command across release switches." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "新增 Web 技术主题", en: "Web development topics" },
        changes: [
            { zh: "在算法、C++、Java 和 MySQL 之外加入 HTML、CSS、JavaScript 主题及文章筛选入口。", en: "Added HTML, CSS, and JavaScript alongside Algorithms, C++, Java, and MySQL in the article topic filters." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "统一中英文标签", en: "Consistent bilingual tags" },
        changes: [
            { zh: "常用标签在文章卡片、详情页和筛选器中随界面语言一致切换。", en: "Common tags follow the interface language consistently across cards, article pages, and filters." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "工作台自动记录首次发布时间", en: "Automatic first publication timestamps" },
        changes: [
            { zh: "由服务端记录文章首次公开的时间，后续修改保留原发布时间。", en: "The server records the first publication time and preserves it through later edits." },
            { zh: "统一工作台表单控件高度和对齐方式。", en: "Aligned the workspace form controls and standardized their height." },
        ],
    },
    {
        date: "2026-10-31",
        title: { zh: "正文先显示，公式按需加载", en: "Faster article text and on-demand math" },
        changes: [
            { zh: "打开文章先显示正文，有公式的页面再按需加载排版资源。", en: "Article text appears first, and math rendering resources load when needed." },
            { zh: "为脚本、样式和 JSON 启用压缩，减少访问时的传输量。", en: "Enabled compression for scripts, stylesheets, and JSON to reduce transfer size." },
        ],
    },
    {
        date: "2026-10-30",
        title: { zh: "站主工作台上线", en: "The owner workspace launches" },
        changes: [
            { zh: "加入独立的站主工作台，最初通过 SSH 隧道访问，支持编辑、草稿、发布、版本记录和回收站。", en: "Launched a separate owner workspace over an SSH tunnel for editing, drafts, publishing, revision history, and trash." },
            { zh: "将在线内容保存在独立数据目录，使其在换包部署后仍可保留。", en: "Stored online content separately so it survives release updates." },
        ],
    },
    {
        date: "2026-10-30",
        title: { zh: "文章发布时间精确到分钟", en: "Publication times to the minute" },
        changes: [
            { zh: "有完整时间的文章按北京时间显示发布时间，精确到分钟。", en: "Posts with full timestamps display their Beijing publication time to the minute." },
        ],
    },
    {
        date: "2026-10-30",
        title: { zh: "公开源码与独立部署", en: "Public source and standalone deployment" },
        changes: [
            { zh: "建立公开源码仓库，在关于页和页脚增加源码入口，整理站点项目链接。", en: "Created a public source repository, linked it from About and the footer, and organized links to the blog project." },
            { zh: "把自托管版本整理为独立的 React、Vite 和 Node 应用，增加中英文项目文档。", en: "Simplified the self-hosted version into a standalone React, Vite, and Node app and added bilingual project documentation." },
        ],
    },
    {
        date: "2026-10-29",
        title: { zh: "Rating 曲线补充等级分界", en: "Rating chart tier boundaries" },
        changes: [
            { zh: "在 Rating 折线图加入平台官方等级颜色和分数分界线，方便对照当前位置和下一档目标。", en: "Added official tier colors and rating boundaries so readers can see the current tier and the next threshold." },
        ],
    },
    {
        date: "2026-10-29",
        title: { zh: "长文目录、证书缩略图与比赛历史", en: "Article outlines, thumbnails, and contest history" },
        changes: [
            { zh: "长文增加目录、章节锚点和当前章节高亮，手机端可以折叠目录。", en: "Added outlines, section anchors, and active-section highlighting for long posts, with a collapsible outline on mobile." },
            { zh: "证书列表使用多尺寸 WebP 缩略图，点击详情仍可查看清晰版。", en: "Added responsive WebP thumbnails for certificates, with full-resolution images on detail pages." },
            { zh: "加入 Codeforces 和 AtCoder 的 Rating 历史折线图，可查看单场比赛的名次和分数变化。", en: "Added Codeforces and AtCoder rating histories with per-contest rank and rating changes." },
            { zh: "兼容当时的 HTTP 入口下的代码复制，失败时给出手动复制提示。", en: "Made code copying work with the HTTP entry used at the time and added a manual fallback message." },
        ],
    },
    {
        date: "2026-10-29",
        title: { zh: "竞赛资料与真实文章整理", en: "Contest records and published articles" },
        changes: [
            { zh: "移除示例文章，文章页汇总各栏目的真实内容，并补充 C++ 和 STL 教程入口。", en: "Removed sample posts and gathered published writing across sections, including C++ and STL tutorials." },
            { zh: "竞赛页拆分奖项、原创题目和算法教程，每栏先展示三条，并提供完整列表。", en: "Split Contests into awards, authored problems, and tutorials, with three-item previews and full lists." },
            { zh: "统一 HZAUOJ 的名称，补齐六张公开证书的隐私遮挡，并展示两个平台的当前与历史最高 Rating。", en: "Standardized the HZAUOJ label, refined redactions on six public certificates, and displayed current and peak ratings for both platforms." },
        ],
    },
    {
        date: "2026-10-29",
        title: { zh: "公开浏览与域名接入尝试", en: "Read-only browsing and first domain setup" },
        changes: [
            { zh: "公开版改为只读浏览，日常和文章通过本地文件更新后再部署。", en: "Made the public site read-only, with journal and article updates published from local files." },
            { zh: "完成域名解析与服务器接入配置，备案完成前主要通过公网 IP 访问。", en: "Configured domain routing and used the public IP as the main entry while filing was pending." },
        ],
    },
    {
        date: "2026-10-28",
        title: { zh: "首批竞赛内容", en: "First contest content" },
        changes: [
            { zh: "自托管版加入首批竞赛证书和 C++ 排序、栈与队列、优先队列教程。", en: "Added the first contest certificates and C++ tutorials on sorting, stacks and queues, and priority queues to the self-hosted site." },
        ],
    },
    {
        date: "2026-10-28",
        title: { zh: "自托管初版与山峦首页", en: "First self-hosted build and mountain homepage" },
        changes: [
            { zh: "把早期站点部署到自建服务器，形成后续持续更新的自托管版本。", en: "Deployed the early site to its own server, establishing the self-hosted version used for later updates." },
            { zh: "绘制昼夜山峦背景，首页时间栏使用蓝色渐变。", en: "Drew day and night mountain backgrounds and gave the homepage clock a blue gradient." },
            { zh: "改善手机排版、键盘导航、分类返回和加载失败提示。", en: "Improved mobile layout, keyboard navigation, returns to topic lists, and loading error messages." },
        ],
    },
    {
        date: "2026-10-27",
        title: { zh: "博客初版", en: "The first blog version" },
        changes: [
            { zh: "搭起首页、日常、文章、项目、竞赛、关于我和站内搜索，首页显示实时北京时间。", en: "Built Home, Journal, Writing, Projects, Contests, About, and site search, with a live Beijing clock on the homepage." },
            { zh: "加入明暗主题和中英文切换，确定双 ID、E 字标和竞赛平台图标。", en: "Added light and dark themes and Chinese and English controls, and established the dual names, E mark, and contest platform icons." },
        ],
    },
];
