import { PALETTE_CSS_VARS } from "@/lib/design/schemes";

/** The <style> element that holds a custom theme's colours. */
export const CUSTOM_THEME_STYLE_ID = "custom-theme";

/**
 * Runs before the first paint, from the saved preferences, so a chosen
 * scheme or custom theme doesn't flash Anchor's own colours on load. The
 * custom theme's CSS is built as customThemeCss (lib/design/custom-theme)
 * builds it; colours are checked again, as storage can be edited by hand.
 * The line heights are LINE_HEIGHTS (lib/design/custom-theme), written out:
 * a test keeps them the same.
 */
export const appearanceScript = `try{var u=(JSON.parse(localStorage.getItem("preferences"))||{}).state.ui||{};var h=document.documentElement;if(u.colorScheme&&u.colorScheme!=="anchor")h.dataset.scheme=u.colorScheme;if(u.style&&u.style!=="default")h.dataset.style=u.style;var t=u.customTheme;if(t&&typeof t==="object"){var m=${JSON.stringify(PALETTE_CSS_VARS)},c=[];["light","dark"].forEach(function(k){var p=t[k];if(!p||typeof p!=="object")return;var d="";for(var v in m){var x=p[m[v]];if(typeof x==="string"&&/^#[0-9a-f]{3,8}$/i.test(x))d+="--"+v+":"+x+";"}if(d)c.push(':root[data-custom-theme]:not([data-style="lofi"]).'+k+"{"+d+"}")});var l={tight:1.5,default:1.7,relaxed:2}[t.lineSpacing];if(typeof l==="number")c.push(":root[data-custom-theme]{--note-line-height:"+l+";}");var s=document.createElement("style");s.id="${CUSTOM_THEME_STYLE_ID}";s.textContent=c.join("\\n");document.head.appendChild(s);h.dataset.customTheme=""}}catch(e){}`;
