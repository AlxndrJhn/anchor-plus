import { PALETTE_CSS_VARS } from "@/lib/design/schemes";
import { STYLE_CONFIG, styleOutput } from "@/lib/design/theme-style";

/** The <style> element that holds a custom theme's colours. */
export const CUSTOM_THEME_STYLE_ID = "custom-theme";

/**
 * [value] as a JavaScript literal that's safe inside an inline <script>:
 * JSON with the characters that could end the script or a line written as
 * \u escapes, which read back as the same characters.
 */
const scriptLiteral = (value: unknown) =>
  JSON.stringify(value).replace(
    new RegExp(`[<>/${String.fromCharCode(0x2028, 0x2029)}]`, "g"),
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );

/**
 * Runs before the first paint, from the saved preferences, so a chosen
 * scheme or custom theme doesn't flash Anchor's own colours on load. The
 * custom theme's colours are built as customThemeCss (lib/design/custom-theme)
 * builds them, checked again as storage can be edited by hand; its style
 * goes through styleOutput itself, whose source is embedded here. The line
 * heights are LINE_HEIGHTS (lib/design/custom-theme), written out: a test
 * keeps them the same.
 */
export const appearanceScript = `try{var u=(JSON.parse(localStorage.getItem("preferences"))||{}).state.ui||{};var h=document.documentElement;if(u.colorScheme&&u.colorScheme!=="anchor")h.dataset.scheme=u.colorScheme;var t=u.customTheme;if(t&&typeof t==="object"){var g=(${styleOutput.toString()})(t.style,${scriptLiteral(STYLE_CONFIG)});for(var a in g.attributes)h.dataset[a]=g.attributes[a];var m=${scriptLiteral(PALETTE_CSS_VARS)},c=[];["light","dark"].forEach(function(k){var p=t[k];if(!p||typeof p!=="object")return;var d="";for(var v in m){var x=p[m[v]];if(typeof x==="string"&&/^#[0-9a-f]{3,8}$/i.test(x))d+="--"+v+":"+x+";"}if(d)c.push(':root[data-custom-theme].'+k+"{"+d+"}")});var l={tight:1.5,default:1.7,relaxed:2}[t.lineSpacing];if(typeof l==="number")c.push(":root[data-custom-theme]{--note-line-height:"+l+";}");if(g.css)c.push(g.css);var s=document.createElement("style");s.id="${CUSTOM_THEME_STYLE_ID}";s.textContent=c.join("\\n");document.head.appendChild(s);h.dataset.customTheme=""}}catch(e){}`;
