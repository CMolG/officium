/*
 * The Theater's own styles (Lib-Theater, "Quiet Bento"). A Theater is a small Javadaba desktop:
 * the product's colors as circles blurred behind frosted glass, one window on it, one real app in
 * the window. It is a product island, always light, so its values are its own and do not follow
 * the page's dark mode ("never a dark box").
 *
 * Hoisted into <head> once per document by TheaterRoot (`<style href precedence>`).
 */
export const STYLES = `
.theater{--theater-fg:#111;--theater-muted:rgba(17,17,17,.64);--theater-line:rgba(17,17,17,.12);--theater-bone:rgba(17,17,17,.12);--theater-stage:#FBFAF7;--theater-stone:#F2F1EC;--theater-transition:400ms;position:relative;isolation:isolate;overflow:hidden;border-radius:28px;background:var(--theater-stone);color:var(--theater-fg);font:inherit;font-size:13px;line-height:1.4;box-shadow:0 0 0 1px rgba(17,17,17,.08);container-type:inline-size}
.theater [class^=theater__],.theater [class*=" theater__"]{box-sizing:border-box}
.theater__sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.theater__desk{position:absolute;inset:-12%;z-index:0;pointer-events:none;filter:blur(clamp(18px,3.4cqw,38px))}
.theater__desk i{position:absolute;display:block;aspect-ratio:1;border-radius:9999px}
.theater__veil{position:absolute;inset:0;z-index:0;background:rgba(251,250,247,.16);pointer-events:none}
.theater__veil::after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(17,17,17,.16) 0 .8px,transparent 1.2px);background-size:5px 5px;opacity:.6}
.theater__inner{position:relative;z-index:1;display:flex;flex-direction:column;gap:12px;padding:14px 18px 16px}
.theater__top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:600}
.theater__chip{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px 0 8px;border-radius:9999px;background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.7)}
.theater__chip img,.theater__chip svg{display:block;flex:none}
.theater__window{position:relative;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.82);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 22px 50px rgba(17,17,17,.2),0 0 0 1px rgba(255,255,255,.7)}
.theater__titlebar{display:flex;align-items:center;justify-content:space-between;gap:10px;height:34px;padding:0 10px 0 12px;font-size:12px;font-weight:600;border-bottom:1px solid rgba(17,17,17,.06)}
.theater__titlebar>span:first-child{display:flex;align-items:center;gap:8px;min-width:0}
.theater__titlebar>span:first-child>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.theater__titlebar img,.theater__titlebar svg{display:block;flex:none}
.theater__dots{display:flex;gap:10px;color:rgba(17,17,17,.4)}
.theater__status{position:absolute;left:10px;top:10px;z-index:6;display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:9999px;background:#111;color:#fff;font-size:11.5px;font-weight:600;white-space:nowrap;max-width:calc(100% - 20px);overflow:hidden;text-overflow:ellipsis;opacity:0;pointer-events:none;transition:opacity 150ms}
.theater__status[data-visible=true]{opacity:1}
.theater__stage{position:relative;overflow:hidden;flex:none;background:var(--theater-stage);color:var(--theater-fg);outline:none}
.theater__stage[data-fit=fill]{min-height:240px}
.theater__stage:focus-visible{box-shadow:inset 0 0 0 2px #111}
.theater__layer{position:absolute;top:0;left:0;transform-origin:0 0;contain:layout;background:var(--theater-stage);animation:theater-in var(--theater-transition) ease-out backwards}
.theater__stage[data-fit=fill] .theater__layer{width:100%;height:100%}
.theater__layer[data-state=exiting]{animation:none;pointer-events:none}
.theater__stage[data-interactive=false] .theater__layer{pointer-events:none;user-select:none}
.theater__cursor{position:absolute;z-index:2;width:18px;height:22px;margin:-2px 0 0 -2px;opacity:0;pointer-events:none;transition:left .72s cubic-bezier(.2,.8,.2,1),top .72s cubic-bezier(.2,.8,.2,1),opacity .25s;filter:drop-shadow(0 2px 4px rgba(17,17,17,.3))}
.theater__cursor[data-visible=true]{opacity:1}
.theater__press{position:relative;display:block;width:100%;height:100%;transform-origin:2px 2px}
.theater__cursor[data-click=true] .theater__press{animation:theater-press .32s ease .72s}
.theater__cursor svg{display:block;width:100%;height:100%}
.theater__ripple{position:absolute;left:-7px;top:-7px;width:16px;height:16px;border-radius:9999px;box-shadow:0 0 0 2px rgba(17,17,17,.35);opacity:0;animation:theater-ripple .55s ease-out .78s}
.theater__ghost-name{position:absolute;left:16px;top:18px;display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:9999px;background:#111;color:#fff;font-size:11px;font-weight:600;white-space:nowrap}
.theater__note{position:absolute;z-index:6;left:50%;bottom:14px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:calc(100% - 24px);padding:8px 8px 8px 14px;border-radius:9999px;background:#111;color:#fff;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 10px 24px rgba(17,17,17,.25);animation:theater-in .2s ease-out backwards}
.theater__note span{overflow:hidden;text-overflow:ellipsis}
.theater__note a{display:inline-flex;align-items:center;gap:4px;flex:none;height:28px;padding:0 10px;border-radius:9999px;background:#fff;color:#111;text-decoration:none;font-size:11.5px;font-weight:700}
.theater__note a:hover{background:var(--theater-stone)}
.theater__notice{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;font-size:15px;color:var(--theater-muted)}
.theater__notice strong{color:var(--theater-fg);font-size:22px;font-weight:700}
.theater__notice-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin-top:6px}
.theater__action{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0 18px;border:0;border-radius:9999px;background:#111;color:#fff;font:inherit;font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap;cursor:pointer;appearance:none}
.theater__action:hover{background:#2b2b2b}
.theater__action--quiet{background:transparent;color:#111;box-shadow:inset 0 0 0 1px rgba(17,17,17,.24)}
.theater__action--quiet:hover{background:transparent;box-shadow:inset 0 0 0 1px #111}
.theater__action:focus-visible,.theater__round:focus-visible,.theater__open:focus-visible,.theater__segment:focus-visible,.theater__note a:focus-visible{outline:2px solid #111;outline-offset:2px}
.theater__bar{display:flex;align-items:center;gap:14px;padding:10px 12px 10px 10px;border-radius:9999px;background:rgba(255,255,255,.66);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.75)}
.theater__round{display:grid;place-items:center;flex:none;width:44px;height:44px;padding:0;border:0;border-radius:9999px;background:#111;color:#fff;cursor:pointer;transition:background-color 150ms}
.theater__round:hover{background:#2b2b2b}
.theater__round svg{display:block}
.theater__round[data-play=true] svg{transform:translateX(1px)}
.theater__cap{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:4px}
.theater__caption{margin:0;font-size:14px;line-height:1.35;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.theater__caption-text{display:block;overflow:hidden;text-overflow:ellipsis;animation:theater-in .35s ease-out backwards}
.theater__scenes{display:flex;align-items:center;gap:8px;min-width:0}
.theater__segment{flex:1;min-width:0;min-height:24px;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:0;border:0;background:transparent;color:rgba(17,17,17,.62);font:inherit;font-size:11.5px;line-height:1.2;font-weight:500;text-align:left;white-space:nowrap;cursor:pointer}
.theater__segment:hover{color:#111}
.theater__segment[aria-current=true]{color:#111;font-weight:700}
.theater__segment i{display:block;height:3px;border-radius:2px;background:rgba(17,17,17,.12);overflow:hidden}
.theater__segment i span{display:block;width:100%;height:100%;background:rgba(17,17,17,.42);transform:scaleX(0);transform-origin:left}
.theater__segment[data-state=done] i span{transform:none}
.theater__segment[aria-current=true] i span{background:#111;animation:theater-fill linear forwards}
.theater__loops{display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:none;height:28px;padding:0 10px;border-radius:9999px;background:rgba(17,17,17,.05);font-size:11.5px;font-weight:600;line-height:1;color:rgba(17,17,17,.7)}
.theater__loops svg{display:block;flex:none}
.theater__open{display:inline-flex;align-items:center;gap:6px;flex:none;min-height:44px;padding:0 16px;border-radius:9999px;box-shadow:inset 0 0 0 1px rgba(17,17,17,.24);color:#111;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap}
.theater__open:hover{box-shadow:inset 0 0 0 1px #111}
@container (max-width:560px){
.theater__inner{gap:8px;padding:8px 8px 10px}
.theater__bar{gap:10px;padding:8px 10px 8px 8px}
.theater__caption{font-size:12.5px}
.theater__loops{display:none}
.theater__open{padding:0 12px}
}
@keyframes theater-in{from{opacity:0}to{opacity:1}}
@keyframes theater-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes theater-ripple{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.7);opacity:0}}
@keyframes theater-press{0%,100%{transform:none}50%{transform:scale(.82)}}
@media (prefers-reduced-motion:reduce){.theater__layer,.theater__caption-text,.theater__press,.theater__ripple,.theater__note{animation:none!important}.theater__cursor{transition:none}}
[data-jd-animations=paused] .theater__ripple,[data-jd-animations=paused] .theater__press{animation:none!important}
`;
