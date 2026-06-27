export const DEFAULTS = {
  text: 'Text',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 48,
  fill: '#ffffff',
  bg: '#000000',
  bgOpacity: 0.5,
};

export function advToolbarHtml() {
  return `
    <button class="imgv-adv-add">+ Text</button>
    <button class="imgv-adv-rect" title="Add rectangle">▭</button>
    <button class="imgv-adv-ellipse" title="Add ellipse">◯</button>
    <button class="imgv-adv-line" title="Add line">╱</button>
    <button class="imgv-adv-arrow" title="Add arrow">➤</button>
    <button class="imgv-adv-poly" title="Add polygon">⬠</button>
    <button class="imgv-adv-star" title="Add star">★</button>
    <button class="imgv-adv-more" title="Add circle, ring, wedge, or arc">More</button>
    <span class="imgv-sep"></span>
    <input class="imgv-adv-text imgv-adv-txtctl" type="text" placeholder="Selected text" style="min-width:120px">
    <label class="imgv-adv-txtctl" style="font-size:.8em">Size <input class="imgv-adv-size" type="number" min="6" max="400" value="${DEFAULTS.fontSize}" style="width:56px"></label>
    <select class="imgv-adv-font imgv-adv-txtctl" title="Font"><option value="system-ui, sans-serif">Sans</option><option value="Georgia, serif">Serif</option><option value="monospace">Mono</option><option value="Impact, sans-serif">Impact</option><option value="cursive">Cursive</option></select>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-bold" type="checkbox"> B</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-italic" type="checkbox"> I</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-underline" type="checkbox"> U</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-strike" type="checkbox"> S</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Align <select class="imgv-adv-talign"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">V <select class="imgv-adv-valign"><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Line <input class="imgv-adv-lineh" type="number" min=".5" max="4" step=".1" value="1" style="width:48px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Wrap <select class="imgv-adv-wrap"><option value="word">Word</option><option value="char">Char</option><option value="none">None</option></select></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TW <input class="imgv-adv-tw" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TH <input class="imgv-adv-th" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Pad <input class="imgv-adv-pad" type="number" min="0" max="200" value="6" style="width:48px"></label>
    <label style="font-size:.8em">Fill <input class="imgv-adv-fill" type="color" value="${DEFAULTS.fill}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG <input class="imgv-adv-bg" type="color" value="${DEFAULTS.bg}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG opacity <input class="imgv-adv-bgop" type="range" min="0" max="100" value="${DEFAULTS.bgOpacity * 100}" style="width:70px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Text stroke <input class="imgv-adv-tstroke" type="color" value="#000000"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TS width <input class="imgv-adv-tstrokew" type="number" min="0" max="40" value="0" style="width:48px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Text shadow <input class="imgv-adv-tshadow" type="range" min="0" max="40" value="0" style="width:70px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TS color <input class="imgv-adv-tshadowc" type="color" value="#000000"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Stroke <input class="imgv-adv-stroke" type="color" value="#1144aa"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Width <input class="imgv-adv-strokew" type="number" min="0" max="80" value="2" style="width:48px"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Dash <select class="imgv-adv-dash"><option value="">Solid</option><option value="8,5">Dash</option><option value="2,5">Dot</option><option value="12,5,2,5">Dash-dot</option></select></label>
    <label class="imgv-adv-linectl" style="font-size:.8em">Cap <select class="imgv-adv-cap"><option>butt</option><option>round</option><option>square</option></select></label>
    <label class="imgv-adv-linectl" style="font-size:.8em">Join <select class="imgv-adv-join"><option>miter</option><option>round</option><option>bevel</option></select></label>
    <button class="imgv-adv-pointedit imgv-adv-linectl" title="Edit line/arrow points">Points</button>
    <label class="imgv-adv-anyctl" style="font-size:.8em">Opacity <input class="imgv-adv-opacity" type="range" min="0" max="100" value="100" style="width:70px"></label>
    <label class="imgv-adv-anyctl" style="font-size:.8em">X <input class="imgv-adv-x" type="number" style="width:54px"></label>
    <label class="imgv-adv-anyctl" style="font-size:.8em">Y <input class="imgv-adv-y" type="number" style="width:54px"></label>
    <label class="imgv-adv-sizectl" style="font-size:.8em">W <input class="imgv-adv-w" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-sizectl" style="font-size:.8em">H <input class="imgv-adv-h" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-anyctl" style="font-size:.8em">Rot <input class="imgv-adv-rot" type="number" step="1" style="width:54px"></label>
    <label class="imgv-adv-rectctl" style="font-size:.8em">Corner <input class="imgv-adv-corner" type="number" min="0" max="200" value="4" style="width:50px"></label>
    <label class="imgv-adv-polyctl" style="font-size:.8em">Sides <input class="imgv-adv-sides" type="number" min="3" max="24" value="5" style="width:48px"></label>
    <label class="imgv-adv-starctl" style="font-size:.8em">Points <input class="imgv-adv-points" type="number" min="3" max="24" value="5" style="width:48px"></label>
    <label class="imgv-adv-innerctl" style="font-size:.8em">Inner <input class="imgv-adv-inner" type="number" min="1" value="26" style="width:50px"></label>
    <label class="imgv-adv-radctl" style="font-size:.8em">Radius <input class="imgv-adv-radius" type="number" min="1" value="56" style="width:50px"></label>
    <label class="imgv-adv-arcctl" style="font-size:.8em">Angle <input class="imgv-adv-angle" type="number" min="1" max="360" value="120" style="width:50px"></label>
    <label class="imgv-adv-arrowctl" style="font-size:.8em">Head <input class="imgv-adv-head" type="number" min="1" max="120" value="12" style="width:48px"></label>
    <label class="imgv-adv-arrowctl" style="font-size:.8em"><input class="imgv-adv-headstart" type="checkbox"> Start</label>
    <label class="imgv-adv-linectl" style="font-size:.8em">Tension <input class="imgv-adv-tension" type="number" min="0" max="1" step=".1" value="0" style="width:48px"></label>
    <label class="imgv-adv-lineonlyctl" style="font-size:.8em"><input class="imgv-adv-closed" type="checkbox"> Closed</label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Shadow <input class="imgv-adv-shadow" type="range" min="0" max="40" value="0" style="width:70px"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Shadow color <input class="imgv-adv-shadowc" type="color" value="#000000"></label>
    <label class="imgv-adv-xformctl" style="font-size:.8em"><input class="imgv-adv-ratio" type="checkbox"> Ratio</label>
    <label class="imgv-adv-xformctl" style="font-size:.8em"><input class="imgv-adv-center" type="checkbox"> Center</label>
    <label class="imgv-adv-xformctl" style="font-size:.8em"><input class="imgv-adv-flip" type="checkbox" checked> Flip</label>
    <label class="imgv-adv-anyctl" style="font-size:.8em" title="How this object blends with the objects BEHIND it in the overlay (not the base image)">Blend <select class="imgv-adv-blend"><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="color-dodge">Dodge</option><option value="color-burn">Burn</option><option value="hard-light">Hard light</option><option value="soft-light">Soft light</option><option value="difference">Difference</option><option value="exclusion">Exclusion</option></select></label>
    <button class="imgv-adv-group" title="Group selected objects">Group</button>
    <button class="imgv-adv-ungroup" title="Ungroup selected groups">Ungroup</button>
    <button class="imgv-adv-front" title="Bring selected to front">Front</button>
    <button class="imgv-adv-back" title="Send selected to back">Back</button>
    <label style="font-size:.8em"><input class="imgv-adv-grid" type="checkbox"> Grid</label>
    <button class="imgv-adv-align" data-align="left" title="Align left">L</button>
    <button class="imgv-adv-align" data-align="hcenter" title="Align horizontal center">HC</button>
    <button class="imgv-adv-align" data-align="right" title="Align right">R</button>
    <button class="imgv-adv-align" data-align="top" title="Align top">T</button>
    <button class="imgv-adv-align" data-align="vcenter" title="Align vertical center">VC</button>
    <button class="imgv-adv-align" data-align="bottom" title="Align bottom">B</button>
    <button class="imgv-adv-dist" data-axis="x" title="Distribute horizontally">DH</button>
    <button class="imgv-adv-dist" data-axis="y" title="Distribute vertically">DV</button>
    <span class="imgv-sep"></span>
    <button class="imgv-adv-flatten" title="Merge all objects into the image (bake to pixels), then continue in normal Edit">⤵ Merge to image</button>
    <button class="imgv-adv-del" title="Delete selected">🗑 Delete</button>`;
}
