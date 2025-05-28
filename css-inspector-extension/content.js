(function() {
  // Check if already injected
  if (window.cssInspectorActive) {
    // If active, and an old instance is somehow running without cleanup, try to clean it.
    if (typeof window.cssInspectorCleanup === 'function') {
        // console.log("CSS Inspector: Cleaning up previous instance before re-injecting.");
        // window.cssInspectorCleanup(); // Be cautious with this auto-cleanup
    } else {
        // console.log("CSS Inspector: Already active, but no cleanup function found. Exiting.");
        return;
    }
    // Fall-through to re-initialize if cleanup was attempted.
    // Ideally, popup.js ensures cleanup before re-injection.
  }
  window.cssInspectorActive = true;

  let overlay = null, cssPopup = null, controlBar = null, copyNotification = null;
  let currentElement = null, lastMouseEvent = null;
  let isPaused = false, isPinned = false;
  let hideTimeout = null;
  let activeTab = 'styles'; // 'styles', 'computed', 'sources'

  const theme = {
    popupBg: '#2A2A30', popupBorder: '#FF00FF', headerBg: '#1E1E1E',
    primaryText: '#E0E0E0', selectorText: '#FFFF00', sectionHeader: '#FF69B4',
    propertyName: '#00FFFF', sourceHref: '#AAAAAA', mediaCondition: '#39FF14',
    pseudoHeader: '#39FF14', accentBorder: '#39FF14', scrollbarThumb: '#FF00FF',
    scrollbarTrack: 'rgba(255,0,255,0.2)', controlBarBg: '#1E1E1E',
    btnPauseBg: '#FFA500', btnPauseHoverBg: '#FF8C00',
    btnToggleBg: '#39FF14', btnToggleHoverBg: '#2ECC71',
    btnStopBg: '#D21F3C', btnStopHoverBg: '#B21830',
    copyNotificationBg: '#D21F3C', copyNotificationText: '#FFFF00',
    overlayBorder: '#FFFF00', overlayBg: 'rgba(255, 255, 0, 0.1)',
    colorSwatchBorder: '#888888', pinnedOverlayBorder: '#FF00FF',
    closeButtonBg: 'rgba(255, 255, 255, 0.1)', closeButtonHoverBg: 'rgba(255, 0, 0, 0.7)',
    tabActiveBg: '#2A2A30', tabInactiveBg: 'rgba(255,255,255,0.05)',
    tabActiveText: '#FFFF00', tabInactiveText: '#E0E0E0',
    unpinButtonBg: '#D21F3C',
  };

  overlay = document.createElement('div');
  overlay.id = 'css-inspector-overlay';
  overlay.style.cssText = `
    position: fixed; border: 2px solid ${theme.overlayBorder};
    background-color: ${theme.overlayBg}; pointer-events: none;
    z-index: 10000; transition: border-color 0.2s ease; display: none;
    box-sizing: border-box;
  `;
  document.body.appendChild(overlay);

  controlBar = document.createElement('div');
  controlBar.id = 'css-inspector-controls';
  controlBar.style.cssText = `
    position: fixed; top: 20px; right: 20px; background-color: ${theme.controlBarBg};
    color: ${theme.primaryText}; padding: 10px 15px; border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px; z-index: 10002; display: flex; gap: 10px;
    align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    box-sizing: border-box;
  `;

  const commonButtonStyle = `
    color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer;
    font-size: 13px; font-weight: 500; transition: background-color 0.2s;
    box-sizing: border-box; line-height: normal;
  `;

  pauseBtn = document.createElement('button');
  // Base styling applied here, specific colors/text in updateButtonStates
  pauseBtn.style.cssText = commonButtonStyle + `background-color: ${theme.btnPauseBg};`;


  stopBtn = document.createElement('button');
  stopBtn.textContent = 'Stop';
  stopBtn.style.cssText = commonButtonStyle + `background-color: ${theme.btnStopBg};`;

  controlBar.appendChild(pauseBtn);
  controlBar.appendChild(stopBtn);
  document.body.appendChild(controlBar);

  cssPopup = document.createElement('div');
  cssPopup.id = 'css-inspector-popup';
  cssPopup.style.cssText = `
    position: fixed; background-color: ${theme.popupBg}; color: ${theme.primaryText};
    padding: 0px; border-radius: 12px; font-size: 13px; 
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    z-index: 10001; max-width: 550px; max-height: 450px;
    display: none; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    line-height: 1.6; border: 1px solid ${theme.popupBorder};
    flex-direction: column; box-sizing: border-box;
  `;

  const popupCloseButton = document.createElement('div');
  popupCloseButton.id = 'css-inspector-popup-close';
  popupCloseButton.innerHTML = '&times;';
  popupCloseButton.style.cssText = `
    position: absolute; top: 8px; right: 10px; font-size: 22px;
    color: ${theme.primaryText}; cursor: pointer; display: none; z-index: 10;
    padding: 0px 6px; line-height: 1; border-radius: 4px;
    background-color: ${theme.closeButtonBg}; transition: background-color 0.2s;
    box-sizing: border-box;
  `;
  popupCloseButton.onmouseenter = () => popupCloseButton.style.backgroundColor = theme.closeButtonHoverBg;
  popupCloseButton.onmouseleave = () => popupCloseButton.style.backgroundColor = theme.closeButtonBg;
  cssPopup.appendChild(popupCloseButton);

  tabsContainer = document.createElement('div');
  tabsContainer.id = 'css-inspector-tabs';
  tabsContainer.style.cssText = `
    display: flex; background-color: ${theme.headerBg};
    border-bottom: 1px solid ${theme.popupBorder};
    padding: 5px 5px 0 5px; border-radius: 11px 11px 0 0;
    position: relative; box-sizing: border-box;
  `;
  cssPopup.appendChild(tabsContainer);

  tabContentContainer = document.createElement('div');
  tabContentContainer.id = 'css-inspector-tab-content-container';
  tabContentContainer.style.cssText = `
    padding: 15px 20px; overflow-y: auto; flex-grow: 1;
    max-height: calc(450px - 40px - 30px); /* popup max-height - approx tab height - approx footer height */
    box-sizing: border-box;
  `;
  cssPopup.appendChild(tabContentContainer);

  copyNotification = document.createElement('div');
  copyNotification.style.cssText = `
    position: fixed; background-color: ${theme.copyNotificationBg}; color: ${theme.copyNotificationText};
    padding: 12px 20px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px; font-weight: 500; z-index: 10003; display: none; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    transform: translateY(-20px); opacity: 0; transition: all 0.3s ease;
    box-sizing: border-box;
  `;
  copyNotification.textContent = 'Sauce Copied 🍕';
  document.body.appendChild(copyNotification);

  const scrollbarStyle = document.createElement('style');
  scrollbarStyle.textContent = `
    #css-inspector-tab-content-container::-webkit-scrollbar { width: 10px; }
    #css-inspector-tab-content-container::-webkit-scrollbar-track { background: ${theme.scrollbarTrack}; border-radius: 5px; }
    #css-inspector-tab-content-container::-webkit-scrollbar-thumb { background: ${theme.scrollbarThumb}; border-radius: 5px; border: 1px solid ${theme.popupBg}; }
    #css-inspector-tab-content-container::-webkit-scrollbar-thumb:hover { background: ${theme.btnPauseHoverBg}; }

    .css-inspector-tab {
      padding: 8px 15px; margin-right: 3px; margin-bottom: -1px;
      cursor: pointer; border-radius: 6px 6px 0 0;
      font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 500; border: 1px solid transparent; border-bottom: none;
      transition: background-color 0.2s, color 0.2s, border-color 0.2s;
      box-sizing: border-box;
    }
    .css-inspector-tab.active {
      background-color: ${theme.popupBg}; color: ${theme.tabActiveText};
      border-color: ${theme.popupBorder} ${theme.popupBorder} transparent ${theme.popupBorder};
    }
    .css-inspector-tab:not(.active) { background-color: ${theme.tabInactiveBg}; color: ${theme.tabInactiveText}; }
    .css-inspector-tab:not(.active):hover { background-color: ${theme.headerBg}; color: ${theme.tabActiveText}; }

    .css-element-header { padding: 0 0 10px 0; margin: 0 0 15px 0; border-bottom: 1px solid ${theme.popupBorder}; }
    .css-selector { color: ${theme.selectorText}; font-weight: bold; font-size: 14px; margin-bottom: 8px; word-break: break-word; }
    .css-element-info { display: flex; gap: 15px; font-size: 12px; color: #b0b0b0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .css-dimensions::before { content: "📐"; font-size: 14px; margin-right: 5px; }
    .css-font-info::before { content: "🔤"; font-size: 14px; margin-right: 5px; }
    .css-section { margin-bottom: 15px; }
    .css-section-header { color: ${theme.sectionHeader}; margin: 15px 0 8px 0; font-style: italic; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed ${theme.sectionHeader}; padding-bottom: 3px; }
    .css-property-line { margin: 4px 0; padding: 2px 0; display: flex; align-items: center; }
    .css-property-name { color: ${theme.propertyName}; margin-right: 0.5em; }
    .css-property-value { color: ${theme.primaryText}; word-break: break-word; }
    .css-authored-rule-block { margin-bottom: 12px; padding: 10px; background-color: rgba(0,0,0,0.1); border: 1px solid ${theme.accentBorder}; border-radius: 4px; }
    .css-authored-selector { color: ${theme.selectorText}; font-weight: bold; margin-bottom: 5px; font-size: 1.05em; }
    .css-source-href { color: ${theme.sourceHref}; font-size: 0.85em; margin-bottom: 5px; font-style: italic; word-break: break-all; }
    .css-media-query-block { margin: 15px 0; padding:10px; padding-left: 15px; border-left: 3px solid ${theme.mediaCondition}; background-color: rgba(57, 255, 20, 0.05); border-radius: 4px; }
    .css-media-condition { color: ${theme.mediaCondition}; font-weight: bold; margin-bottom: 10px; font-size: 1.1em; }
    .css-pseudo-section { background-color: rgba(57, 255, 20, 0.05); padding: 10px; border-radius: 6px; margin-top: 10px; border: 1px solid ${theme.accentBorder}; }
    .css-pseudo-header { color: ${theme.pseudoHeader}; font-weight: bold; margin-bottom: 6px; }
    .css-copy-footer { text-align: center; margin-top: 15px; padding: 12px 0 0 0; border-top: 1px dashed ${theme.sectionHeader}; color: ${theme.sectionHeader}; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 1px; }
    .color-swatch { display: inline-block; width: 12px; height: 12px; border: 1px solid ${theme.colorSwatchBorder}; margin-right: 6px; vertical-align: middle; border-radius: 2px; }
    .sources-list { list-style-type: none; padding: 0; margin: 0; }
    .sources-list li { padding: 5px 0; border-bottom: 1px solid ${theme.headerBg}; color: ${theme.primaryText}; word-break: break-all; }
    .sources-list li:last-child { border-bottom: none; }
    .sources-list li .source-type { color: ${theme.sourceHref}; font-style: italic; margin-left: 10px; font-size: 0.9em; }
  `;
  document.head.appendChild(scrollbarStyle);
  document.body.appendChild(cssPopup);

  function createColorSwatchHtml(colorValue) { /* ... same as before ... */ 
    const s = String(colorValue).trim().toLowerCase(); let validColor = null;
    if (/^#(?:[0-9a-f]{3,4}){1,2}$/.test(s)) validColor = s;
    else if (/^rgba?\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d\.]+\s*)?\)$/.test(s)) validColor = s;
    else if (/^hsla?\(\s*[\d\.]+\s*,\s*[\d\.]+%\s*,\s*[\d\.]+%\s*(?:,\s*[\d\.]+\s*)?\)$/.test(s)) validColor = s;
    if (validColor && validColor !== "transparent") return `<span class="color-swatch" style="background-color: ${validColor};"></span>`;
    return '';
  }
  function getAuthoredRules(element) { /* ... same as before ... */ 
    const authoredRules = { inlineStyle: element.style.cssText || null, matchedRules: [], mediaQueryRules: [] };
    if (!element || typeof element.matches !== 'function') return authoredRules;
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        if (!sheet.cssRules) continue; const rules = Array.from(sheet.cssRules);
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) { try { if (element.matches(rule.selectorText)) authoredRules.matchedRules.push({ selectorText: rule.selectorText, cssText: rule.style.cssText, sourceHref: sheet.href || (sheet.ownerNode && sheet.ownerNode.tagName === 'STYLE' ? 'Inline <style> tag' : 'Embedded/Unknown') }); } catch (e) {} }
          else if (rule instanceof CSSMediaRule) { const mediaCondition = rule.media.mediaText; const innerRules = Array.from(rule.cssRules || []); for (const innerRule of innerRules) { if (innerRule instanceof CSSStyleRule) { try { if (element.matches(innerRule.selectorText)) authoredRules.mediaQueryRules.push({ selectorText: innerRule.selectorText, cssText: innerRule.style.cssText, mediaCondition: mediaCondition, sourceHref: sheet.href || 'Inline/Embedded' }); } catch (e) {} } } }
        }
      } catch (e) {}
    }
    authoredRules.matchedRules.sort((a, b) => b.selectorText.length - a.selectorText.length);
    return authoredRules;
  }
  function getHoverStyles(element) { /* ... same as before ... */ 
    const hoverStyles = []; if (!element || typeof element.matches !== 'function') return hoverStyles;
    const sheets = document.styleSheets;
    try { for (let sheet of sheets) { try { const rules = sheet.cssRules || sheet.rules; if (!rules) continue; for (let rule of rules) { if (rule instanceof CSSStyleRule && rule.selectorText) { const hoverSelector = rule.selectorText; if (hoverSelector.includes(':hover')) { try { const baseSelector = hoverSelector.split(':hover')[0]; if (element.matches(baseSelector)) { const style = rule.style; for (let i = 0; i < style.length; i++) { const prop = style[i]; const value = style.getPropertyValue(prop); const priority = style.getPropertyPriority(prop); if (value) hoverStyles.push({ property: prop, value: value + (priority ? ' !important' : '') }); } } } catch(e) {} } } } } catch (e) {} } } catch (e) {}
    return hoverStyles;
  }
  function getElementDimensions(element) { const rect = element.getBoundingClientRect(); return { width: Math.round(rect.width), height: Math.round(rect.height) }; }
  function getFontInfo(element) { const styles = window.getComputedStyle(element); const fontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, ''); const fontSize = styles.fontSize; return `${fontFamily} ${fontSize}`; }

  function getInspectedElementData(element) { /* ... same as before ... */ 
    const data = { selectorForDisplay: "N/A", cssData: null, rawCssToCopy: "Nothing to copy." };
    if (element && element.tagName) {
        data.selectorForDisplay = element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') + (element.className && typeof element.className === 'string' ? `.${element.className.split(' ').filter(c => c && !c.startsWith('css-inspector')).join(' .')}` : '');
    } else if (activeTab !== 'sources') { return data; }

    if (activeTab === 'computed') {
      if (!element || typeof window.getComputedStyle !== 'function') return data;
      const computedStyles = window.getComputedStyle(element); const cssLines = [];
      const importantProperties = ['display', 'position', 'width', 'height', 'margin', 'padding', 'border', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-radius', 'border-width', 'background', 'background-color', 'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'top', 'right', 'bottom', 'left', 'z-index', 'outline', 'outline-color', 'overflow', 'opacity', 'visibility', 'float', 'clear', 'flex', 'align-items', 'justify-content', 'grid', 'box-shadow', 'text-shadow', 'transition', 'transform', 'cursor', 'pointer-events'];
      for (const prop of importantProperties) { const value = computedStyles.getPropertyValue(prop); if (value && value !== 'none' && value !== 'auto' && value !== 'normal' && value !== '0px' && value !== 'rgba(0, 0, 0, 0)') cssLines.push(`${prop}: ${value};`);}
      data.cssData = cssLines.join('\n'); data.rawCssToCopy = `/* Computed for: ${data.selectorForDisplay} */\n${data.cssData}`;
    } else if (activeTab === 'styles') {
      if (!element) return data;
      data.authoredRules = getAuthoredRules(element); data.cssData = data.authoredRules;
      let rawAuthored = `/* Authored for: ${data.selectorForDisplay} */\n`;
      if(data.authoredRules.inlineStyle){ rawAuthored += `[style] {\n  ${data.authoredRules.inlineStyle.replace(/;\s*/g, ';\n  ')}}\n\n`; }
      data.authoredRules.matchedRules.forEach(rule => { rawAuthored += `${rule.selectorText} {\n  ${rule.cssText.replace(/;\s*/g, ';\n  ')}}\n\n`; });
      data.authoredRules.mediaQueryRules.forEach(rule => { rawAuthored += `@media ${rule.mediaCondition} {\n  ${rule.selectorText} {\n    ${rule.cssText.replace(/;\s*/g, ';\n    ')}}\n}\n\n`; });
      const hoverStyles = getHoverStyles(element); if(hoverStyles.length > 0){ rawAuthored += `/* Hover Styles (example) */\n`; hoverStyles.forEach(style => rawAuthored += `${data.selectorForDisplay}:hover { ${style.property}: ${style.value}; }\n`);}
      data.rawCssToCopy = rawAuthored.trim();
    } else if (activeTab === 'sources') { data.rawCssToCopy = "List of page stylesheets."; }
    return data;
  }

  function formatCSSForDisplay(element, inspectedData, dimensions, fontInfo) { /* ... same as before ... */ 
    let formattedHtml = ''; const commonColorProperties = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color'];
    if (activeTab === 'styles' || activeTab === 'computed') { if (!element || !inspectedData || !inspectedData.selectorForDisplay || inspectedData.selectorForDisplay === "N/A") return `<p style="color:${theme.sourceHref}; padding: 20px;">Hover over an element to inspect its ${activeTab}.</p>`; formattedHtml += '<div class="css-element-header">'; formattedHtml += `<div class="css-selector">${inspectedData.selectorForDisplay}</div>`; formattedHtml += '<div class="css-element-info">'; formattedHtml += `<div class="css-dimensions">${dimensions.width}x${dimensions.height}</div>`; formattedHtml += `<div class="css-font-info">${fontInfo}</div>`; formattedHtml += '</div></div>'; }
    function renderProperties(cssTextLinesOrArray, isAuthoredStyleBlock = false) { let blockHtml = ''; const lines = Array.isArray(cssTextLinesOrArray) ? cssTextLinesOrArray : cssTextLinesOrArray.split('\n'); lines.forEach(line => { let propName, value; if (isAuthoredStyleBlock) { const parts = line.split(':'); propName = parts.shift()?.trim(); value = parts.join(':').trim(); if (value.endsWith(';')) value = value.slice(0, -1); } else { if (line.startsWith('/*')) return; if (!line.includes(':')) return; const parts = line.split(':'); propName = parts.shift()?.trim(); value = parts.join(':').trim(); if (value.endsWith(';')) value = value.slice(0, -1); } if (propName && typeof value !== 'undefined' && value !== '') { let valueDisplay = `<span class="css-property-value">${value};</span>`; if (commonColorProperties.includes(propName.toLowerCase())) { const colorSwatch = createColorSwatchHtml(value.replace(/!important/gi, '').trim()); valueDisplay = colorSwatch + valueDisplay; } blockHtml += `<div class="css-property-line"><span class="css-property-name">${propName}</span>: ${valueDisplay}</div>`; } }); return blockHtml; }
    if (activeTab === 'computed') { formattedHtml += '<div class="css-section">'; formattedHtml += `<div class="css-section-header">Main Computed Properties</div>`; formattedHtml += renderProperties(inspectedData.cssData); formattedHtml += '</div>';
    } else if (activeTab === 'styles') { const { authoredRules } = inspectedData.cssData; if (authoredRules.inlineStyle) { formattedHtml += '<div class="css-section"><div class="css-section-header">Inline Style</div><div class="css-authored-rule-block">' + renderProperties(authoredRules.inlineStyle.split(';').filter(s => s.trim()), true) + '</div></div>';} if (authoredRules.matchedRules.length > 0) { formattedHtml += '<div class="css-section"><div class="css-section-header">Matched Rules</div>'; authoredRules.matchedRules.forEach(rule => { formattedHtml += `<div class="css-authored-rule-block"><div class="css-authored-selector">${rule.selectorText}</div>` + (rule.sourceHref ? `<div class="css-source-href">${rule.sourceHref.substring(rule.sourceHref.lastIndexOf('/') + 1)}</div>` : '') + renderProperties(rule.cssText.split(';').filter(s => s.trim()), true) + `</div>`; }); formattedHtml += '</div>'; } const hoverStyles = getHoverStyles(element); if (hoverStyles.length > 0) { formattedHtml += '<div class="css-pseudo-section"><div class="css-pseudo-header">:hover Rules</div>'; hoverStyles.forEach(style => { let valueDisplay = `<span class="css-property-value">${style.value}</span>`; if (commonColorProperties.includes(style.property.toLowerCase())) { const colorSwatch = createColorSwatchHtml(style.value.replace(/!important/gi, '').trim()); valueDisplay = colorSwatch + valueDisplay; } formattedHtml += `<div class="css-property-line"><span class="css-property-name">${style.property}</span>: ${valueDisplay}</div>`; }); formattedHtml += '</div>';} if (authoredRules.mediaQueryRules.length > 0) { formattedHtml += '<div class="css-section"><div class="css-section-header">Media Query Rules</div>'; const mediaGroups = authoredRules.mediaQueryRules.reduce((acc, rule) => {acc[rule.mediaCondition] = acc[rule.mediaCondition] || []; acc[rule.mediaCondition].push(rule); return acc;}, {}); for (const mediaCondition in mediaGroups) { formattedHtml += `<div class="css-media-query-block"><div class="css-media-condition">@media ${mediaCondition}</div>`; mediaGroups[mediaCondition].forEach(rule => { formattedHtml += `<div class="css-authored-rule-block"><div class="css-authored-selector">${rule.selectorText}</div>` + (rule.sourceHref ? `<div class="css-source-href">${rule.sourceHref.substring(rule.sourceHref.lastIndexOf('/') + 1)}</div>` : '') + renderProperties(rule.cssText.split(';').filter(s => s.trim()), true) + `</div>`; }); formattedHtml += `</div>`; } formattedHtml += '</div>'; } if (!authoredRules.inlineStyle && authoredRules.matchedRules.length === 0 && hoverStyles.length === 0 && authoredRules.mediaQueryRules.length === 0) { formattedHtml += `<div class="css-section"><div class="css-section-header" style="color: ${theme.sourceHref};">No specific authored rules</div><p style="color:${theme.sourceHref};">Check Computed.</p></div>`;}
    } else if (activeTab === 'sources') { formattedHtml += '<div class="css-section"><div class="css-section-header">Stylesheet Sources</div>'; formattedHtml += '<ul class="sources-list">'; const sheets = Array.from(document.styleSheets); if (sheets.length === 0) { formattedHtml += `<li>No stylesheets found or accessible by the extension.</li>`; } else { sheets.forEach((sheet, index) => { let title = `Sheet ${index + 1}`; let type = 'Unknown'; try { if (sheet.href) { title = sheet.href.substring(sheet.href.lastIndexOf('/') + 1) || sheet.href; type = 'Linked'; } else if (sheet.ownerNode && sheet.ownerNode.tagName === 'STYLE') { title = 'Inline &lt;style&gt; tag'; type = 'Inline'; } else if (sheet.ownerNode && sheet.ownerNode.tagName === 'LINK') { title = 'Linked Stylesheet (empty or error)'; type = 'Linked (Error)'; } else { type = 'Embedded/Other'; }} catch (e) { title = `Sheet ${index+1} (Error accessing properties)`; type = "Error"} formattedHtml += `<li>${title} <span class="source-type">(${type})</span></li>`; }); } formattedHtml += '</ul></div>'; formattedHtml += `<p style="color:${theme.sourceHref}; font-size:0.9em; padding: 5px 0;">Note: Viewing content of external stylesheets is limited due to browser security (CORS).</p>`;}
    if (activeTab !== 'sources' || (activeTab === 'sources' && element)) { formattedHtml += `<div class="css-copy-footer">Click popup to copy relevant info</div>`; }
    return formattedHtml;
  }

  function createTabs() { /* ... same as before ... */ 
    tabsContainer.innerHTML = ''; const tabIds = ['styles', 'computed', 'sources']; const tabNames = ['Styles', 'Computed', 'Sources'];
    tabIds.forEach((id, index) => { const tabButton = document.createElement('div'); tabButton.className = 'css-inspector-tab' + (id === activeTab ? ' active' : ''); tabButton.textContent = tabNames[index]; tabButton.dataset.tabId = id; tabButton.addEventListener('click', (e) => { e.stopPropagation(); switchTab(id); }); tabsContainer.appendChild(tabButton); });
  }
  function switchTab(tabId) { /* ... same as before ... */ activeTab = tabId; createTabs(); renderCurrentView(); }

  function renderCurrentView() {
    if (!currentElement && activeTab !== 'sources') {
      tabContentContainer.innerHTML = `<p style="color:${theme.sourceHref}; padding: 20px;">Hover over an element to inspect.</p>`;
      cssPopup.removeAttribute('data-raw-css');
      if (activeTab === 'sources') {
         tabContentContainer.innerHTML = formatCSSForDisplay(null, getInspectedElementData(null), {}, "");
         cssPopup.setAttribute('data-raw-css', "List of page stylesheets.");
      }
      return;
    }
    const dimensions = currentElement ? getElementDimensions(currentElement) : {};
    const fontInfo = currentElement ? getFontInfo(currentElement) : "";
    const inspectedData = getInspectedElementData(currentElement);
    tabContentContainer.innerHTML = formatCSSForDisplay(currentElement, inspectedData, dimensions, fontInfo);
    if(inspectedData && inspectedData.rawCssToCopy) cssPopup.setAttribute('data-raw-css', inspectedData.rawCssToCopy);
  }

  function updateButtonStates() {
    popupCloseButton.style.display = isPinned ? 'block' : 'none';
    overlay.style.borderColor = isPinned ? theme.pinnedOverlayBorder : theme.overlayBorder;
    if (isPinned) {
      pauseBtn.textContent = 'Unpin';
      pauseBtn.style.backgroundColor = theme.unpinButtonBg;
      pauseBtn.style.color = 'white';
    } else {
      pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
      pauseBtn.style.backgroundColor = isPaused ? theme.btnToggleBg : theme.btnPauseBg;
      pauseBtn.style.color = isPaused ? 'black' : 'white';
    }
  }

  function handleMouseMove(e) {
    lastMouseEvent = e;
    if (isPinned || isPaused) { // If pinned or paused, do not process mouse moves for new elements
        // However, if merely paused (not pinned), still allow popup to hide if mouse leaves it.
        if (isPaused && !isPinned && !cssPopup.contains(e.target) && !controlBar.contains(e.target) && e.target !== cssPopup) {
            hideTimeout = setTimeout(() => {
                if (isPaused && !isPinned) { // Check again before hiding
                    overlay.style.display = 'none';
                    cssPopup.style.display = 'none';
                }
            }, 300);
        }
        return;
    }

    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (element && element.id !== 'css-inspector-overlay' && element.id !== 'css-inspector-popup' && !cssPopup.contains(element) && element.id !== 'css-inspector-controls' && !controlBar.contains(element) && element.id !== 'css-inspector-copy-notification') {
      currentElement = element; // Set currentElement immediately
      renderCurrentView(); // Render based on the new currentElement

      const rect = element.getBoundingClientRect();
      overlay.style.left = rect.left + 'px'; overlay.style.top = rect.top + 'px'; overlay.style.width = rect.width + 'px'; overlay.style.height = rect.height + 'px';
      overlay.style.display = 'block';
      cssPopup.style.display = 'flex';

      if (hideTimeout) clearTimeout(hideTimeout);
      
      // Popup positioning is always handled if not pinned (this block is guarded by !isPinned already)
      const x = Math.min(e.clientX + 10, window.innerWidth - (cssPopup.offsetWidth || 550) -10 );
      const y = Math.min(e.clientY + 10, window.innerHeight - (cssPopup.offsetHeight || 450) -10);
      cssPopup.style.left = x + 'px';
      cssPopup.style.top = y + 'px';

    } else if (!isPinned && (!cssPopup.contains(element) && !controlBar.contains(element)) ) { // Don't hide if pinned
      hideTimeout = setTimeout(() => {
        if (!isPinned) { 
            overlay.style.display = 'none'; 
            cssPopup.style.display = 'none'; 
            // currentElement = null; // Keep last element context for potential pinning
        }
      }, 300);
    }
  }

  function handleKeyDown(e) { /* ... same as before ... */ 
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.code === 'Space' && (cssPopup.style.display === 'flex' || isPinned)) {
      e.preventDefault(); isPinned = !isPinned; isPaused = isPinned; updateButtonStates();
      if (isPinned) { cssPopup.style.display = 'flex'; overlay.style.display = currentElement ? 'block' : 'none'; renderCurrentView(); } 
      else if (lastMouseEvent) { handleMouseMove(lastMouseEvent); }
    }
  }
  popupCloseButton.addEventListener('click', (e) => { /* ... same as before ... */ 
    e.stopPropagation(); isPinned = false; isPaused = false; cssPopup.style.display = 'none'; overlay.style.display = 'none'; updateButtonStates();
  });
  pauseBtn.addEventListener('click', (e) => { /* ... same as before ... */ 
    e.stopPropagation();
    if (isPinned) { isPinned = false; isPaused = false; if (lastMouseEvent) { handleMouseMove(lastMouseEvent); } else { cssPopup.style.display = 'none'; overlay.style.display = 'none';}}
    else { isPaused = !isPaused; if (!isPaused && currentElement && lastMouseEvent) { handleMouseMove(lastMouseEvent); cssPopup.style.display = 'flex'; overlay.style.display = 'block';} else if (isPaused) { overlay.style.display = 'none'; }}
    updateButtonStates();
  });
  stopBtn.addEventListener('click', (e) => { e.stopPropagation(); window.cssInspectorCleanup(); });
  cssPopup.addEventListener('click', (e) => { /* ... same as before ... */ 
    if (tabsContainer.contains(e.target) || popupCloseButton.contains(e.target)) return;
    e.stopPropagation(); const cssText = cssPopup.getAttribute('data-raw-css'); if (cssText) copyCSS(cssText, e.clientX, e.clientY);
  });
  function copyCSS(cssText, x, y) { /* ... same as before ... */ 
    navigator.clipboard.writeText(cssText).then(() => { copyNotification.style.left = x - 75 + 'px'; copyNotification.style.top = y - 50 + 'px'; copyNotification.style.display = 'block'; setTimeout(() => { copyNotification.style.transform = 'translateY(0)'; copyNotification.style.opacity = '1'; }, 10); setTimeout(() => { copyNotification.style.transform = 'translateY(-20px)'; copyNotification.style.opacity = '0'; setTimeout(() => { copyNotification.style.display = 'none'; }, 300); }, 2000); }).catch(err => console.error('CSS Inspector: Failed to copy CSS:', err));
  }
  cssPopup.addEventListener('mouseenter', () => { if (hideTimeout) clearTimeout(hideTimeout); });
  cssPopup.addEventListener('mouseleave', (e) => { /* ... same as before ... */ 
    if (isPinned || (controlBar && controlBar.contains(e.relatedTarget)) || (e.relatedTarget && cssPopup.contains(e.relatedTarget)) ) return;
    hideTimeout = setTimeout(() => { if (!isPinned) { overlay.style.display = 'none'; cssPopup.style.display = 'none'; } }, 300);
  });

  createTabs(); 
  updateButtonStates(); 
  renderCurrentView(); // Render initial empty/default state

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('keydown', handleKeyDown, true);

  window.cssInspectorCleanup = function() { 
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (cssPopup && cssPopup.parentNode) cssPopup.parentNode.removeChild(cssPopup);
    if (controlBar && controlBar.parentNode) controlBar.parentNode.removeChild(controlBar);
    if (copyNotification && copyNotification.parentNode) copyNotification.parentNode.removeChild(copyNotification);
    if (scrollbarStyle && scrollbarStyle.parentNode) scrollbarStyle.parentNode.removeChild(scrollbarStyle);
    if (hideTimeout) clearTimeout(hideTimeout); window.cssInspectorActive = false; delete window.cssInspectorCleanup;
  };

  // Initial UI update for buttons
  updateButtonStates();
})();