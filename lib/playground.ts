export type PlaygroundSource = { html: string; css: string; js: string };
export const starterPlayground: PlaygroundSource = {
    html: '<button id="hello">点一下试试</button>\n<p id="result">Hello, world.</p>',
    css: 'body { font-family: system-ui; padding: 24px; }\nbutton { background: #153ccb; color: white; border: 0; border-radius: 8px; padding: 10px 16px; cursor: pointer; }',
    js: 'document.querySelector("#hello").addEventListener("click", () => {\n    document.querySelector("#result").textContent = "你好，JavaScript！";\n    console.log("按钮已点击");\n});',
};
export function playgroundDocument(source: PlaygroundSource, token: string) {
    const bridge = `const notify=(type,value)=>parent.postMessage({source:"ease2k-playground",token:${JSON.stringify(token)},type,value:String(value).slice(0,2000)},"*");
for(const level of ["log","info","warn","error"]) console[level]=(...values)=>notify(level,values.map(value=>{try{return typeof value==="string"?value:JSON.stringify(value)}catch{return String(value)}}).join(" "));
addEventListener("error",event=>notify("error",event.message));addEventListener("unhandledrejection",event=>notify("error",event.reason?.message||event.reason));`;
    const closeScript = (value: string) => value.replace(/<\/script/gi, "<\\/script");
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><script>' + closeScript(bridge) + '</script><style>' + source.css.replace(/<\/style/gi, "<\\/style") + '</style></head><body>' + source.html + '<script>\n' + closeScript(source.js) + '\n</script></body></html>';
}
