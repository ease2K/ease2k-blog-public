export async function copyText(text: string) {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(text); return; } catch {}
    }
    // HTTP previews cannot use the modern clipboard API; keep a user-click fallback.
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selection = window.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
    const input = document.createElement("textarea");
    input.value = text;
    input.readOnly = true;
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    input.style.cssText = "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;font-size:16px";
    document.body.appendChild(input);
    try {
        input.focus({ preventScroll: true });
        input.select();
        input.setSelectionRange(0, input.value.length);
        if (!document.execCommand("copy")) throw Error("Copy unavailable");
    } finally {
        input.remove();
        active?.focus({ preventScroll: true });
        if (selection) { selection.removeAllRanges(); for (const range of ranges) selection.addRange(range); }
    }
}
