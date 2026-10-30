# ease2k 博客：文件更新版

网站只展示公开内容，支持搜索、主题切换、双语、竞赛奖项、教程和自动更新 Rating。公网入口保持只读；站主工作台通过 SSH 隧道提供密码登录、在线编辑和草稿管理。详见 [站主工作台说明](OWNER.md)。

## 修改内容

在克隆得到的项目目录中修改：

| 内容 | 文件 |
| --- | --- |
| 日常记录 | `lib/journal.json` |
| 文章、项目、站点介绍、奖项与原创题目元数据 | `lib/content.ts` |
| C++ 教程原稿 | `content/competitions/*.md` |
| 获奖证书图片 | `public/awards/` |
| 页面布局与文案 | `components/blog.tsx` |
| 配色与样式 | `styles/globals.css` |

现有公开日记已经导入 `lib/journal.json`。添加日记时可参考其中现有记录，填写唯一 id、title、summary、body、date、tags、read，kind 保持 daily；英文内容可暂留空。正文支持 Markdown。

部署包只放准备公开的内容，不要把个人凭据或未公开记录写入源码或 public 目录。构建会拒绝标记为 private 的静态条目。

## 本地生成部署包

修改教程原稿后先运行导入脚本，再生成部署包：

```bash
cd ease2k-blog-public
node scripts/import-competition-tutorials.mjs
node self-hosted/package.mjs
```

如果未修改教程，只需执行最后的打包命令。输出为 `outputs/ease2k-blog-linux.tar.gz`，旁边附 SHA-256 校验文件。运行依赖在本机构建，服务器无需安装 npm 依赖。

## 上传与更新

Mac 终端上传：

```bash
scp -i /path/to/ssh_private_key outputs/ease2k-blog-linux.tar.gz root@YOUR_SERVER_IP:/root/
```

服务器 root 终端安装（推荐解压到新目录，避免残留旧资源）：

```bash
blog_update_dir=$(mktemp -d /root/ease2k-update.XXXXXX)
tar -xzf /root/ease2k-blog-linux.tar.gz -C "$blog_update_dir" &&
bash "$blog_update_dir/ease2k-blog-linux/install.sh"
```

安装脚本创建新 release、修正资源读取权限、切换 current 并重启服务。原 `/var/lib/ease2k-blog` 数据与旧 release 保留。在线文章和凭据使用独立的 `/var/lib/ease2k-blog/editor/` 目录，后续更新不会覆盖；在线修改优先于随包初始数据。旧版数据库和旧认证文件不会自动导入。

## 访问和检查

将示例中的 `YOUR_SERVER_IP` 和 `/path/to/ssh_private_key` 替换成自己的服务器地址和 SSH 私钥路径。私钥只保存在本机。已有 Nginx 入口可继续使用，日常更新无需重配 Nginx。

```bash
systemctl is-active ease2k-blog
curl http://127.0.0.1:3000/healthz
curl -H 'Host: localhost:3000' http://127.0.0.1:3000/api/blog
journalctl -u ease2k-blog -n 30 --no-pager
```

服务仅监听本机 3000，默认 BLOG_ORIGIN 为 http://localhost:3000，与当前 Nginx 转发 Host 一致。首次建立 IP 入口可运行包内 `bash configure-ip-preview.sh YOUR_SERVER_IP`，该脚本会检查与备份 Nginx 配置，失败时回退。域名入口使用源码中的 `bash self-hosted/deploy/configure-domain.sh example.com`，将 `example.com` 替换成自己的根域名。

备案完成后配置域名解析和 HTTPS，调整 Nginx 的域名入口即可；站主工作台当前仍通过 SSH 隧道访问。中国内地服务器通过公网 IP 提供网站服务同样适用备案要求。

## 竞赛与 Rating

竞赛首页每栏最多预览三条，查看更多进入完整列表。秦皇岛银奖置顶，其余按日期排序。证书日期以原件为准，月份精度不补造具体日期。

公开证书仅遮挡参赛者和教练姓名，保留主席等颁奖人员的签名；秦皇岛证书另遮挡二维码。发布图片位于 `public/awards/`；原图仅保存在本地忽略目录 `work/certificate-originals/`，不纳入构建和部署包。需要重新生成遮挡版本时运行 `node scripts/redact-certificates.mjs`，不要用未处理原图覆盖公开文件。

构建会从公开打码图片生成 240 / 480 / 768px WebP 缩略图，放在 `public/awards/thumbnails/`。列表按屏幕尺寸选择缩略图，证书详情和原图链接继续使用高清打码图。

文章正文自动识别二至四级标题，桌面侧栏显示目录，手机端显示可展开目录。点击章节会更新地址锚点并聚焦标题，刷新带锚点的地址仍能定位到对应章节。没有足够标题的短文不展示目录。

代码复制优先使用 HTTPS 剪贴板接口；HTTP 预览使用由点击触发的兼容复制。浏览器拒绝复制时明确提示手动选取，不显示虚假的成功状态。

Rating 与历史曲线统一读取 Codeforces `user.rating` 和 AtCoder 公开比赛历史，过滤未计分比赛，独立缓存 15 分钟。当前值、历史最高和曲线均由同一份历史数据计算。图上可以选择比赛，也可使用下拉框操作，显示比赛名、名次、分数变化及官方比赛链接。失败时保留上次的完整历史；随包快照也包含已验证历史数据。

Codeforces 与 AtCoder 算法 Rating 由服务端分别缓存 15 分钟，页面打开及持续停留时自动检查。失败保留上次核验值并显示时间；数值和历史最高值各自按官方颜色显示。图内彩色水平虚线标识当前平台的颜色分界值，纵轴保留自适应范围并显示下一个颜色等级目标；分界线、数值和圆点共用 `lib/rating-colors.mjs` 中的颜色定义。
