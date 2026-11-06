import type { SeriesInfo } from "./series";
import journal from "./journal.json" with { type: "json" };
import tutorials from "./tutorials.json" with { type: "json" };

export type Entry = {
    searchSnippet?: string;
    searchLanguage?: "en";
    id: string;
    kind: "daily" | "article" | "project";
    title: string;
    enTitle: string;
    summary: string;
    enSummary: string;
    body: string;
    enBody: string;
    date: string;
    tags: string[];
    read: number;
    sample?: boolean;
    hasBody?: boolean;
    visibility?: "public" | "private";
    section?: "competitions";
    series?: SeriesInfo;
    playground?: { html: string; css: string; js: string };
    featured?: boolean;
    modifiedAt?: string;
    updateNote?: string;
    enUpdateNote?: string;
    environment?: string;
    project?: {
        status: "active" | "complete" | "paused";
        stack: string[];
        problem: string;
        enProblem?: string;
        outcomes: string[];
        enOutcomes?: string[];
        screenshot?: string;
        screenshotAlt?: string;
        sourceUrl?: string;
        demoUrl?: string;
    };
};

export const profiles = {
    codeforces: "https://codeforces.com/profile/ease2k",
    atcoder: "https://atcoder.jp/users/ease2k",
    github: "https://github.com/ease2K",
};

export const portals = {
    hzauacm: "http://acm.hzau.edu.cn/portal/",
};

export const authoredProblems = [
    {
        id: "P15654", title: "yuanzhe的F1车手选拔", enTitle: "yuanzhe's F1 Driver Selection",
        summary: "按总积分、最快单圈和编号整理车手排行榜。", enSummary: "Rank drivers by total points, fastest lap time, and driver number.",
        href: "http://acm.hzau.edu.cn/problem/P15654", topic: "sort", tutorialId: "cpp-sort-introduction",
    },
    {
        id: "P15651", title: "社团物资打包", enTitle: "Packing Club Supplies",
        summary: "将社团物资逐步合成一包，计算最小合并总费用。", enSummary: "Combine the club's supply packages into one while minimizing the total merging cost.",
        href: "http://acm.hzau.edu.cn/problem/P15651", topic: "priority_queue", tutorialId: "cpp-priority-queue-introduction",
    },
    {
        id: "P15649", title: "食堂取餐盘", enTitle: "Collecting Cafeteria Trays",
        summary: "记录学生排队与餐盘堆叠的操作，模拟每次取餐结果。", enSummary: "Simulate a line of students and a stack of trays to record each serving operation.",
        href: "http://acm.hzau.edu.cn/problem/P15649", topic: "stack / queue", tutorialId: "cpp-stack-queue-introduction",
    },
];

export type Award = {
    id: string;
    event: string;
    award: string;
    date: string;
    team?: string;
    description: string;
    certificate?: string;
    pinned?: boolean;
    enEvent?: string;
    enAward?: string;
    enDescription?: string;
};
// 日期以证书为准，只标注月份的记录不补造具体日期。
export const awards: Award[] = [
    {
        id: "ccpc-qinhuangdao-2026", event: "2026 年中国大学生程序设计竞赛全国邀请赛（秦皇岛）", award: "银奖", date: "2026-05-24", pinned: true,
        enEvent: "2026 China Collegiate Programming Contest National Invitational (Qinhuangdao)", enAward: "Silver Medal",
        description: "代表华中农业大学参加 2026 年中国大学生程序设计竞赛全国邀请赛（秦皇岛），获得银奖。比赛于 2026 年 5 月 24 日在东北大学秦皇岛分校举行。",
        enDescription: "Represented Huazhong Agricultural University and won a silver medal at the 2026 CCPC National Invitational (Qinhuangdao), held at Northeastern University at Qinhuangdao on May 24, 2026.",
        certificate: "/awards/ccpc-qinhuangdao-2026.jpg",
    },
    {
        id: "nowcoder-summer-2026", event: "2026 年第九届牛客暑期多校训练营", award: "三等奖", date: "2026-08",
        enEvent: "2026 9th Nowcoder Summer Multi-School Training Camp", enAward: "Third Prize",
        description: "参加第九届牛客暑期多校训练营，获得三等奖。证书颁发时间为 2026 年 8 月。",
        enDescription: "Won third prize at the 9th Nowcoder Summer Multi-School Training Camp. The certificate was issued in August 2026.",
        certificate: "/awards/nowcoder-summer-2026.png",
    },
    {
        id: "gplt-hubei-2026", event: "2026 年中国高校计算机大赛—团体程序设计天梯赛（湖北省“华山论剑”组）", award: "团队三等奖", date: "2026-05-06", team: "华农二队",
        enEvent: "2026 China Collegiate Computing Contest—Group Programming Ladder Tournament, Hubei “Huashan Lunjian” Group", enAward: "Team Third Prize",
        description: "作为华农二队队员，代表华中农业大学参加 2026 年中国高校计算机大赛—团体程序设计天梯赛，在湖北省“华山论剑”组获得团队三等奖。证书日期为 2026 年 5 月 6 日。",
        enDescription: "Represented Huazhong Agricultural University as a member of the university’s second team and won team third prize in the Hubei “Huashan Lunjian” group. The certificate is dated May 6, 2026.",
        certificate: "/awards/gplt-hubei-2026.jpg",
    },
    {
        id: "hzau-programming-2026", event: "华中农业大学第十五届程序设计竞赛", award: "三等奖", date: "2026-04",
        enEvent: "15th Huazhong Agricultural University Programming Contest", enAward: "Third Prize",
        description: "在华中农业大学第十五届程序设计竞赛中获得三等奖。证书颁发时间为 2026 年 4 月。",
        enDescription: "Won third prize at the 15th Huazhong Agricultural University Programming Contest. The certificate was issued in April 2026.",
        certificate: "/awards/hzau-programming-2026.jpg",
    },
    {
        id: "nowcoder-winter-2026", event: "2026 年第九届牛客寒假算法基础集训营", award: "二等奖", date: "2026-02",
        enEvent: "2026 9th Nowcoder Winter Algorithm Foundation Training Camp", enAward: "Second Prize",
        description: "参加第九届牛客寒假算法基础集训营，获得二等奖。证书颁发时间为 2026 年 2 月。",
        enDescription: "Won second prize at the 9th Nowcoder Winter Algorithm Foundation Training Camp. The certificate was issued in February 2026.",
        certificate: "/awards/nowcoder-winter-2026.jpg",
    },
    {
        id: "hzau-freshman-2025", event: "华中农业大学第十五届程序设计竞赛（新生赛）", award: "二等奖", date: "2025-12",
        enEvent: "15th Huazhong Agricultural University Programming Contest (Freshman Contest)", enAward: "Second Prize",
        description: "在华中农业大学第十五届程序设计竞赛（新生赛）中获得二等奖。证书颁发时间为 2025 年 12 月。",
        enDescription: "Won second prize in the freshman division of the 15th Huazhong Agricultural University Programming Contest. The certificate was issued in December 2025.",
        certificate: "/awards/hzau-freshman-2025.jpg",
    },
];
export const orderedAwards = [...awards].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date));

export const entries: Entry[] = [
    ...journal as Entry[],
    ...(tutorials as Entry[]).map(entry => ({ ...entry, featured: ["cpp-sort-introduction", "cpp-stack-queue-introduction"].includes(entry.id) })),
    {
        id: "hello-journal", kind: "daily", title: "给日常留一个位置", enTitle: "A little room for everyday life",
        summary: "一些片段，一些没想完的事。长短不限，慢慢记录。", enSummary: "Small moments and unfinished thoughts. A place to keep them, at my own pace.",
        body: "这里是日常手记。\n\n可以记下一次散步、一张照片，或者一句突然想到的话。不必每条都有完整的标题，也不必等到有了长篇感想才开始。\n\n这是一条站点介绍，不是个人经历示例。之后会在这里继续分享学习与生活中的片段。",
        enBody: "This is a place for everyday notes.\n\nA walk, a photograph, or a thought worth keeping. A short note is enough.\n\nThis is an introduction to the journal, rather than a personal event.",
        date: "2026-10-27T08:00:00+08:00", tags: ["站点说明"], read: 1, visibility: "public",
    },
    {
        id: "personal-blog", kind: "project", title: "这个蓝色的个人站点", enTitle: "This little blue corner of the web",
        summary: "把日常、学习与项目放在一起，为持续记录留一个自己的地方。", enSummary: "A personal space for everyday notes, learning, and things I build.",
        body: "这个站点用于持续整理 ease2k 的日常、学习笔记和项目记录，目前仍在开发与维护。\n\n## 解决什么问题\n\n把分散的笔记、竞赛学习和项目过程放在自己的站点里，既方便回顾，也能向其他读者分享。\n\n## 阅读与内容组织\n\n首页用手动精选、最近更新和主题入口组织内容，避免同一篇记录在多个分类中反复出现。学习专栏支持章节目录、继续阅读和手动已读标记，阅读进度仅保存在当前浏览器。文章支持 Markdown、代码高亮、数学公式、目录定位和 RSS 订阅。\n\n## 编辑与发布\n\nReact 和 TypeScript 负责页面，Vite 构建，Node.js 提供接口，SQLite 保存在线文章和编辑草稿。工作台支持图片上传、编辑预览、历史版本、回收站和备份恢复。草稿与已发布正文分开保存，修改草稿不会自动公开。\n\n## 两个实现取舍\n\n连续圆角优先使用浏览器原生能力，兼容模式为尚不支持的浏览器补充轮廓。专栏进度先保存在本机，不要求访客注册账户。\n\n文章的首次发布时间保持不变。普通修订和自动保存不更新时间；只有站主明确记录实质更新并填写说明时，服务器才生成新的公开更新时间。\n\n## 源码与体验\n\n项目卡片提供本站对应的源码、在线入口和本地实际截图。后续改动会继续在这里整理。",
        enBody: "A personal website for everyday writing, learning notes and projects. It is still in development.\n\n## Purpose\n\nKeep scattered notes and project work in one place that I can revisit and share.\n\n## Reading\n\nThe home page separates selected reading, recent updates and topic links without repeating full entries. Series offer chapter navigation, a resume action and manual completion markers stored in the current browser. Articles support Markdown, code, math, outlines and RSS.\n\n## Publishing\n\nReact and TypeScript render the pages, Vite builds them, and Node.js with SQLite stores articles and private working drafts. The owner workspace includes uploads, previews, revision history, a recycle bin and backup restoration. Saving a working draft does not publish it.\n\n## Tradeoffs\n\nContinuous corners use native browser rendering where available and an optional compatibility layer elsewhere. Reading progress stays local without requiring an account. Original publication dates are preserved; a public modification date is only recorded when the author explicitly marks a substantive update and provides a note.",
        date: "2026-10-27T09:00:00+08:00", tags: ["React", "TypeScript", "个人网站"], read: 2,
        modifiedAt: "2026-11-06T05:16:25.718Z", updateNote: "补充首页、专栏进度和文章维护的本地实现说明及项目成果。", enUpdateNote: "Document the local homepage, reading progress and article maintenance improvements.",
        project: {
            status: "active", stack: ["React", "TypeScript", "Vite", "Node.js", "SQLite"],
            problem: "把分散的学习笔记、日常和项目整理到自己的站点，并能持续编辑与发布。",
            enProblem: "Bring learning notes, everyday writing and projects into one place that I can keep editing and publishing.",
            outcomes: ["中英文阅读与深浅主题", "Markdown、代码和公式排版", "草稿、在线发布与备份恢复"],
            enOutcomes: ["Chinese / English and light / dark themes", "Markdown, code and math rendering", "Drafts, online publishing and backup restoration"],
            screenshot: "/projects/personal-blog.webp", screenshotAlt: "个人博客首页的本地实际截图",
            sourceUrl: "https://github.com/ease2K/ease2k-blog-public", demoUrl: "/",
        },
    },
];

export const technologyTopics = ["Java", "MySQL", "HTML", "CSS", "JavaScript"] as const;
export const sections = ["daily", "articles", "projects", "algorithms", "java", "mysql", "html", "css", "javascript"] as const;
export type Section = typeof sections[number];
export function inSection(entry: Entry, section: string) {
    if (section === "daily") return entry.kind === "daily";
    if (section === "projects") return entry.kind === "project";
    if (section === "articles") return true;
    if (section === "competitions") return entry.section === "competitions";
    if (section === "algorithms") return entry.tags.includes("算法");
    if (technologyTopics.some(topic => topic.toLowerCase() === section)) return entry.tags.some(value => value.trim().toLowerCase() === section || (section === "javascript" && value.trim().toLowerCase() === "js"));
    if (section === "cpp") return entry.tags.includes("C++");
    return false;
}
