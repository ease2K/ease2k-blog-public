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
    ...tutorials as Entry[],
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
        body: "这个站点围绕 eAs1nGG-_- / ease2k 的日常与技术记录设计。\n\n## 视觉与阅读\n\n主色来自 2026 红牛亮面蓝的网页适配方案。系统字体优先使用苹果设备原生字形，浅色与深色主题均可以独立切换。\n\n## 内容组织\n\n首页按日常、文章、项目、算法、Java、MySQL、HTML、CSS、JavaScript 排列，每部分最多展示三条，空分区隐藏。列表页显示该分类的全部有效内容。\n\n## 站外账号\n\n竞赛和关于我页面提供 Codeforces 与 AtCoder 入口，项目和关于我页面提供 GitHub 入口。",
        enBody: "A personal site for eAs1nGG-_- / ease2k.\n\n## Design\n\nA glossy racing-blue palette, Apple system typography, and light and dark themes.\n\n## Content\n\nSections include everyday notes, writing, projects, algorithms, Java, MySQL, HTML, CSS, and JavaScript. The home page shows up to three entries per section and hides empty sections. Detail pages contain the full entry.",
        date: "2026-10-27T09:00:00+08:00", tags: ["React", "TypeScript", "个人网站"], read: 2,
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
