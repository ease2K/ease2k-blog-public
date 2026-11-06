// Browsers with corner-shape render directly from CSS and load no polyfill.
export function smoothCorners() {
    if (CSS.supports("corner-shape", "superellipse(1.5)")) return;
    void import("hyperellipse").then(({ registerHyperellipse }) => {
        const controller = registerHyperellipse({ pendingRadiusScale: 1 });
        const observer = new MutationObserver(() => controller.refresh());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        if (import.meta.hot) import.meta.hot.dispose(() => { observer.disconnect(); controller.destroy(); });
    }).catch(() => {
        // Keep the existing border-radius if the optional compatibility chunk fails.
    });
}
