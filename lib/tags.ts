const translations = new Map<string, string>([
    ["日常", "Daily life"], ["生活", "Life"], ["日常记录", "Everyday notes"],
    ["学习", "Learning"], ["学习笔记", "Study notes"], ["随笔", "Thoughts"],
    ["算法", "Algorithms"], ["二分", "Binary search"], ["图论", "Graphs"],
    ["数据结构", "Data structures"], ["动态规划", "Dynamic programming"],
    ["贪心", "Greedy"], ["排序", "Sorting"], ["语言基础", "Language basics"],
    ["数据库", "Databases"], ["前端", "Front end"], ["后端", "Back end"],
    ["站点说明", "Site notes"], ["个人网站", "Personal website"],
]);
const keys = new Map([...translations].flatMap(([zh, en]) => [[zh, zh], [en.toLowerCase(), zh]]));

export function tagKey(value: string) {
    const text = value.trim();
    return keys.get(text.toLowerCase()) || text;
}
export function tagName(value: string | undefined, lang: "zh" | "en") {
    const key = tagKey(value || "");
    return lang === "en" ? translations.get(key) || key : key;
}
