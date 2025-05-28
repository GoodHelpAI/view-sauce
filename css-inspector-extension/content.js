(function() {
  // Check if already injected
  if (window.cssInspectorActive) {
    return;
  }
  window.cssInspectorActive = true;

  let overlay = null;
  let cssPopup = null;
  let controlBar = null;
  let copyNotification = null;
  let currentElement = null;
  let isPaused = false;
  let isPinned = false; // Added state variable for pinning
  let hideTimeout = null;
  let currentViewMode = 'computed'; // Default view mode

  // --- THEME COLORS (90s Punk Rock Pizza) ---
  const theme = {
    popupBg: '#2A2A30', // Dark Punk Grey
    popupBorder: '#FF00FF', // Hot Pink
    headerBg: '#1E1E1E', // Slightly darker grey
    primaryText: '#E0E0E0', // Off-White (for property values, general readability)
    selectorText: '#FFFF00', // Bright Yellow (Cheese/Electric)
    sectionHeader: '#FF69B4', // Hot Pink (Punk Accent)
    propertyName: '#00FFFF', // Aqua/Cyan (Electric Blue)
    sourceHref: '#AAAAAA', // Dimmed Grey
    mediaCondition: '#39FF14', // Neon Green (Radioactive Ooze/Basil)
    pseudoHeader: '#39FF14', // Neon Green
    accentBorder: '#39FF14', // Neon Green (for media/pseudo blocks)
    scrollbarThumb: '#FF00FF', // Hot Pink
    scrollbarTrack: 'rgba(255,0,255,0.2)', // Hot Pink Transparent

    controlBarBg: '#1E1E1E',
    btnPauseBg: '#FFA500', // Orange
    btnPauseHoverBg: '#FF8C00',
    btnToggleBg: '#39FF14', // Neon Green
    btnToggleHoverBg: '#2ECC71', // Darker Green
    btnStopBg: '#D21F3C', // Pizza Red
    btnStopHoverBg: '#B21830',

    copyNotificationBg: '#D21F3C', // Pizza Red
    copyNotificationText: '#FFFF00', // Yellow

    overlayBorder: '#FFFF00', // Bright Yellow
    overlayBg: 'rgba(255, 255, 0, 0.1)', // Transparent Yellow

    colorSwatchBorder: '#888888' // Neutral border for color swatches
  };

  // Create overlay element
  overlay = document.createElement('div');
  overlay.id = 'css-inspector-overlay';
  overlay.style.cssText = `
    position: fixed;
    border: 2px solid ${theme.overlayBorder};
    background-color: ${theme.overlayBg};
    pointer-events: none;
    z-index: 10000;
    transition: all 0.1s ease;
    display: none;
    box-sizing: border-box; /* Added for consistency */
  `;
  document.body.appendChild(overlay);

  // Create control bar at top of page
  controlBar = document.createElement('div');
  controlBar.id = 'css-inspector-controls';
  controlBar.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: ${theme.controlBarBg};
    color: ${theme.primaryText};
    padding: 10px 15px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    z-index: 10002;
    display: flex;
    gap: 10px;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    box-sizing: border-box; /* Added for consistency */
  `;

  const commonButtonStyle = `
    color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer;
    font-size: 13px; font-weight: 500; transition: background-color 0.2s;
    box-sizing: border-box; line-height: normal;
  `;

  const pauseBtn = document.createElement('button');
  pauseBtn.id = 'css-inspector-pause-btn'; // Added ID
  pauseBtn.textContent = 'Pause';
  pauseBtn.style.cssText = commonButtonStyle + `background-color: ${theme.btnPauseBg};`;

  const viewToggleBtn = document.createElement('button');
  viewToggleBtn.id = 'css-inspector-view-toggle-btn';
  viewToggleBtn.textContent = 'Show Authored'; // Initial text based on default 'computed' mode
  viewToggleBtn.style.cssText = commonButtonStyle + `background-color: ${theme.btnToggleBg}; color: black;`; // color black for better contrast on green

  const stopBtn = document.createElement('button');
  stopBtn.id = 'css-inspector-stop-btn'; // Added ID
  stopBtn.textContent = 'Stop';
  stopBtn.style.cssText = commonButtonStyle + `background-color: ${theme.btnStopBg};`;

  controlBar.appendChild(pauseBtn);
  controlBar.appendChild(viewToggleBtn);
  controlBar.appendChild(stopBtn);

  const pinHintText = document.createElement('span'); // Or 'p'
  pinHintText.id = 'css-inspector-pin-hint';
  pinHintText.textContent = 'Click page element to copy, Press Spacebar to pin';
  pinHintText.style.cssText = `
    font-size: 10px; 
    color: ${theme.sourceHref}; 
    margin-left: 15px; /* Add some space from the buttons */
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; /* Match other control bar text */
  `;
  controlBar.appendChild(pinHintText);
  document.body.appendChild(controlBar);

  // Control button hover effects (will be managed by updateButtonStyles)
  // pauseBtn.onmouseenter = () => { pauseBtn.style.backgroundColor = theme.btnPauseHoverBg; };
  // pauseBtn.onmouseleave = () => { pauseBtn.style.backgroundColor = isPaused ? theme.btnToggleBg : theme.btnPauseBg; }; // This logic will move
  // viewToggleBtn.onmouseenter = () => { viewToggleBtn.style.backgroundColor = theme.btnToggleHoverBg; };
  // viewToggleBtn.onmouseleave = () => { viewToggleBtn.style.backgroundColor = theme.btnToggleBg; };
  // stopBtn.onmouseenter = () => { stopBtn.style.backgroundColor = theme.btnStopHoverBg; };
  // stopBtn.onmouseleave = () => { stopBtn.style.backgroundColor = theme.btnStopBg; };

  // Create CSS popup
  cssPopup = document.createElement('div');
  cssPopup.id = 'css-inspector-popup';
  cssPopup.style.cssText = `
    position: fixed;
    background-color: ${theme.popupBg};
    color: ${theme.primaryText};
    padding: 0px; /* Padding will be handled by inner containers */
    border-radius: 12px;
    font-size: 13px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    z-index: 10001; max-width: 550px; max-height: 450px; /* Increased max-width slightly */
    /* overflow-y: auto; /* Moved to tabContentContainer */
    box-shadow: 0 4px 20px rgba(0,0,0,0.5); display: none; /* cursor: pointer; /* Removed cursor pointer from main popup */
    line-height: 1.6;
    border: 1px solid ${theme.popupBorder};
    flex-direction: column; /* Added for header/content structure */
    box-sizing: border-box; /* Added for consistency */
  `;
  // Popup header for element info
  const popupHeader = document.createElement('div');
  popupHeader.id = 'css-inspector-popup-header';
  popupHeader.className = 'css-element-header'; // Use class for styling
  // cssPopup.appendChild(popupHeader); // Appended in renderCurrentView

  // Popup content area
  const tabContentContainer = document.createElement('div'); // Re-using similar name for structure
  tabContentContainer.id = 'css-inspector-tab-content-container';
  tabContentContainer.style.cssText = `
    padding: 15px 20px; overflow-y: auto; flex-grow: 1;
    max-height: calc(450px - 70px); /* Adjusted for header */
    box-sizing: border-box;
  `;
  // cssPopup.appendChild(tabContentContainer); // Appended in renderCurrentView


  // Create copy notification
  copyNotification = document.createElement('div');
  copyNotification.id = 'css-inspector-copy-notification'; // Added ID
  copyNotification.style.cssText = `
    position: fixed;
    background-color: ${theme.copyNotificationBg};
    color: ${theme.copyNotificationText};
    padding: 12px 20px; border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px; font-weight: 500; z-index: 10003; display: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3); transform: translateY(-20px);
    opacity: 0; transition: all 0.3s ease;
    box-sizing: border-box; /* Added for consistency */
  `;
  copyNotification.textContent = 'Sauce Copied 🍕';
  document.body.appendChild(copyNotification);

  // Add scrollbar and element styling
  const scrollbarStyle = document.createElement('style');
  scrollbarStyle.id = 'css-inspector-dynamic-styles'; // Added ID
  scrollbarStyle.textContent = `
    #css-inspector-tab-content-container::-webkit-scrollbar { width: 10px; }
    #css-inspector-tab-content-container::-webkit-scrollbar-track { background: ${theme.scrollbarTrack}; border-radius: 5px; }
    #css-inspector-tab-content-container::-webkit-scrollbar-thumb { background: ${theme.scrollbarThumb}; border-radius: 5px; border: 1px solid ${theme.popupBg}; }
    #css-inspector-tab-content-container::-webkit-scrollbar-thumb:hover { background: ${theme.btnPauseHoverBg}; }

    .css-element-header {
      background-color: ${theme.headerBg};
      padding: 12px 20px; /* Adjusted padding */
      margin: 0; /* Reset margin, it's part of the popup flex */
      border-radius: 11px 11px 0 0;
      border-bottom: 1px solid ${theme.popupBorder};
      box-sizing: border-box;
    }
    .css-selector { color: ${theme.selectorText}; font-weight: bold; font-size: 14px; margin-bottom: 8px; word-break: break-word; }
    .css-element-info { display: flex; gap: 15px; font-size: 12px; color: #b0b0b0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .css-dimensions::before { content: "📐"; font-size: 14px; margin-right: 5px; }
    .css-font-info::before { content: "🔤"; font-size: 14px; margin-right: 5px; }

    .css-section { margin-bottom: 15px; }
    .css-section-header {
      color: ${theme.sectionHeader}; margin: 15px 0 8px 0; font-style: italic;
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px dashed ${theme.sectionHeader}; padding-bottom: 3px;
    }
    .css-property-line { margin: 4px 0; padding: 2px 0; display: flex; align-items: center; }
    .css-property-name { color: ${theme.propertyName}; margin-right: 0.5em; }
    .css-property-value { color: ${theme.primaryText}; word-break: break-word; }

    .css-authored-rule-block {
      margin-bottom: 12px; padding: 10px;
      background-color: rgba(0,0,0,0.1);
      border: 1px solid ${theme.accentBorder}; border-radius: 4px;
    }
    .css-authored-selector { color: ${theme.selectorText}; font-weight: bold; margin-bottom: 5px; font-size: 1.05em; }
    .css-source-href { color: ${theme.sourceHref}; font-size: 0.85em; margin-bottom: 5px; font-style: italic; word-break: break-all; }

    .css-media-query-block {
      margin: 15px 0; padding:10px; padding-left: 15px;
      border-left: 3px solid ${theme.mediaCondition};
      background-color: rgba(57, 255, 20, 0.05);
      border-radius: 4px;
    }
    .css-media-condition { color: ${theme.mediaCondition}; font-weight: bold; margin-bottom: 10px; font-size: 1.1em; }

    .css-pseudo-section {
      background-color: rgba(57, 255, 20, 0.05);
      padding: 10px; border-radius: 6px; margin-top: 10px;
      border: 1px solid ${theme.accentBorder};
    }
    .css-pseudo-header { color: ${theme.pseudoHeader}; font-weight: bold; margin-bottom: 6px; }

    .css-copy-footer {
      text-align: center; margin-top: 15px; padding: 12px 0 0 0; /* Adjusted padding */
      border-top: 1px dashed ${theme.sectionHeader};
      color: ${theme.sectionHeader}; font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .color-swatch {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid ${theme.colorSwatchBorder};
      margin-right: 6px;
      vertical-align: middle;
      border-radius: 2px;
    }
  `;
  document.head.appendChild(scrollbarStyle);
  document.body.appendChild(cssPopup); // Popup is created and added, but content is built in renderCurrentView

  // Helper function to create color swatches
  function createColorSwatchHtml(colorValue) {
    let s = String(colorValue).trim().toLowerCase();
    if (s === 'inherit' || s === 'currentcolor' || s === 'transparent') {
      return ''; // No swatch for these
    }

    let validColor = null;
    // Keep existing regex checks first for common, precise formats
    if (/^#(?:[0-9a-f]{3,4}){1,2}$/.test(s)) validColor = s;
    else if (/^rgba?\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d\.]+\s*)?\)$/.test(s)) validColor = s;
    else if (/^hsla?\(\s*[\d\.]+\s*,\s*[\d\.]+%\s*,\s*[\d\.]+%\s*(?:,\s*[\d\.]+\s*)?\)$/.test(s)) validColor = s;
    else {
      // Attempt to resolve non-regex-matching colors (e.g., named colors)
      const tempEl = document.createElement('div');
      // Element must be in DOM for getComputedStyle to work reliably for all cases,
      // though for simple color resolution it might work without appending for some browsers.
      // Appending to document.body is safer.
      tempEl.style.position = 'fixed'; // Avoid layout shifts
      tempEl.style.visibility = 'hidden'; // Keep it off-screen and non-interactive
      document.body.appendChild(tempEl); 
      
      tempEl.style.color = ''; // Reset color first
      tempEl.style.color = s; // Assign original string
      const computedColor = window.getComputedStyle(tempEl).color;
      
      document.body.removeChild(tempEl);

      // Check if computedColor is a resolvable format (rgb/rgba primarily)
      // and it's not the default black for invalid color names (unless original was 'black')
      if (computedColor && /^rgba?\((.+)\)$/.test(computedColor)) {
        // This check aims to avoid showing a swatch (especially a black one) if the original colorValue was invalid.
        // Browsers often default to 'rgb(0, 0, 0)' for invalid color strings.
        // We make an exception if the original string was 'black', as 'rgb(0, 0, 0)' is its correct resolution.
        // This is still imperfect for cases where an element might *inherit* black, making an invalid color resolve to black.
        // A fully robust solution for named colors might involve a predefined list of valid CSS named colors.
        if (computedColor !== 'rgb(0, 0, 0)' || s === 'black') { 
            validColor = computedColor;
        } else {
            // If it resolved to black and the original string wasn't 'black',
            // it's likely an invalid color name. We don't want a black swatch for "blak" or "notacolor".
            // No explicit validColor assignment means no swatch.
        }
      }
    }

    if (validColor) { // validColor could now be an rgb/rgba string from resolution
      return `<span class="color-swatch" style="background-color: ${validColor};"></span>`;
    }
    return '';
  }

  function getAuthoredRules(element) {
    const authoredRules = {
      inlineStyle: element.style.cssText ? element.style.cssText : null,
      matchedRules: [],
      mediaQueryRules: [],
    };
    if (!element || typeof element.matches !== 'function') return authoredRules; // Added guard
    const sheets = Array.from(document.styleSheets);

    for (const sheet of sheets) {
      try {
        if (!sheet.cssRules) continue;
        const rules = Array.from(sheet.cssRules);

        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            try {
              if (element.matches(rule.selectorText)) {
                authoredRules.matchedRules.push({
                  selectorText: rule.selectorText,
                  cssText: rule.style.cssText,
                  sourceHref: sheet.href || (sheet.ownerNode && sheet.ownerNode.tagName === 'STYLE' ? 'Inline <style> tag' : 'Embedded/Unknown'), // Adjusted source
                });
              }
            } catch (e) { /* element.matches can fail with some pseudo-elements, ignore */ }
          } else if (rule instanceof CSSMediaRule) {
            const mediaCondition = rule.media.mediaText;
            const innerRules = Array.from(rule.cssRules || []);
            for (const innerRule of innerRules) {
              if (innerRule instanceof CSSStyleRule) {
                try {
                  if (element.matches(innerRule.selectorText)) {
                    authoredRules.mediaQueryRules.push({
                      selectorText: innerRule.selectorText,
                      cssText: innerRule.style.cssText,
                      mediaCondition: mediaCondition,
                      sourceHref: sheet.href || (sheet.ownerNode && sheet.ownerNode.tagName === 'STYLE' ? 'Inline <style> tag' : 'Embedded/Unknown'), // Adjusted source
                    });
                  }
                } catch (e) { /* ... */ }
              }
            }
          }
        }
      } catch (e) {
        // console.warn("CSS Inspector: Cannot access stylesheet rules: ", sheet.href, e.message);
      }
    }
    // Sort matched rules by specificity (approximated by selector length)
    authoredRules.matchedRules.sort((a, b) => {
        // Basic specificity: ID > Class > Tag. Count them.
        const countSpecificity = (selector) => {
            const idCount = (selector.match(/#/g) || []).length;
            const classCount = (selector.match(/\./g) || []).length;
            const pseudoClassCount = (selector.match(/:[^:\s]+/g) || []).length; // e.g. :hover, :nth-child(n)
            const attrCount = (selector.match(/\[.*?\]/g) || []).length; // e.g. [type="text"]
            const tagCount = (selector.match(/^[a-zA-Z]+|[^\w#.:>~+\s][a-zA-Z]+/g) || []).length; // More robust tag count
            return [idCount, classCount + pseudoClassCount + attrCount, tagCount]; // Specificity array [IDs, Classes/Attributes/PseudoClasses, Tags]
        };
        const specA = countSpecificity(a.selectorText);
        const specB = countSpecificity(b.selectorText);

        if (specA[0] !== specB[0]) return specB[0] - specA[0]; // Sort by ID count desc
        if (specA[1] !== specB[1]) return specB[1] - specA[1]; // Sort by Class/Attr/PseudoClass count desc
        return specB[2] - specA[2]; // Sort by Tag count desc
    });
    return authoredRules;
  }

  function getHoverStyles(element) {
    const hoverStyles = [];
    if (!element || typeof element.matches !== 'function') return hoverStyles; // Added guard
    const sheets = document.styleSheets;
    try {
      for (let sheet of sheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          for (let rule of rules) {
            if (rule instanceof CSSStyleRule && rule.selectorText) {
              const hoverSelector = rule.selectorText;
              if (hoverSelector.includes(':hover')) {
                 try {
                    // More robustly find the base selector part
                    const baseSelector = hoverSelector.substring(0, hoverSelector.lastIndexOf(':hover'));
                     // Ensure the element actually matches the base part of the :hover rule
                    if (element.matches(baseSelector)) {
                        const style = rule.style;
                        for (let i = 0; i < style.length; i++) {
                            const prop = style[i];
                            const value = style.getPropertyValue(prop);
                            const priority = style.getPropertyPriority(prop);
                            if (value) { // Ensure value is not empty
                                hoverStyles.push({ property: prop, value: value + (priority ? ' !important' : '') });
                            }
                        }
                    }
                 } catch(e) { /* element.matches might fail on complex selectors */ }
              }
            }
          }
        } catch (e) { /* Cross-origin or inaccessible rules */ }
      }
    } catch (e) { /* General error accessing stylesheets */ }
    return hoverStyles;
  }

  function getInspectedElementData(element) {
    if (!element) return null; // Added guard for no element
    const data = {};
    data.selectorForDisplay = element.tagName.toLowerCase() +
                           (element.id ? `#${element.id}` : '') +
                           (element.className && typeof element.className === 'string' ? `.${element.className.split(' ').filter(c => c.trim() && !c.startsWith('css-inspector')).map(c => c.trim()).join('.')}` : ''); // Refined class filtering


    if (currentViewMode === 'computed') {
      const computedStyles = window.getComputedStyle(element);
      const cssLines = [];
      // cssLines.push(`/* Computed Styles for: ${data.selectorForDisplay} */`); // Commented out as it's displayed in header now
      const importantProperties = [ /* ... same as before ... */
        'display', 'position', 'width', 'height', 'margin', 'padding',
        'border', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'border-radius', 'border-width', 'background', 'background-color',
        'color', 'font-family', 'font-size', 'font-weight', 'line-height',
        'text-align', 'top', 'right', 'bottom', 'left', 'z-index', 'outline', 'outline-color',
        'overflow', 'opacity', 'visibility', 'float', 'clear', 'flex', 'align-items', 'justify-content',
        'grid', 'box-shadow', 'text-shadow', 'transition', 'transform',
        'cursor', 'pointer-events'
      ];
      for (const prop of importantProperties) {
        const value = computedStyles.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'auto' && value !== 'normal' && value !== '0px' && value !== 'rgba(0, 0, 0, 0)' && value.trim() !== '') { // Added trim check
          cssLines.push(`${prop}: ${value};`);
        }
      }
      data.computedCssText = cssLines.join('\n');
      data.rawCssToCopy = `/* Computed Styles for: ${data.selectorForDisplay} */
${data.computedCssText}`;
    } else { // Authored view
      data.authoredRules = getAuthoredRules(element);
      let rawAuthored = `/* Authored rules for ${data.selectorForDisplay} */
`;
      if(data.authoredRules.inlineStyle){
        rawAuthored += `/* Inline Style */
${element.tagName.toLowerCase()}[style] {
  ${data.authoredRules.inlineStyle.replace(/;\s*/g, ';\n  ')}}

`;
      }
      data.authoredRules.matchedRules.forEach(rule => {
        rawAuthored += `${rule.selectorText} {
  ${rule.cssText.replace(/;\s*/g, ';\n  ')}}

`;
      });
      data.authoredRules.mediaQueryRules.forEach(rule => {
        rawAuthored += `@media ${rule.mediaCondition} {
  ${rule.selectorText} {
    ${rule.cssText.replace(/;\s*/g, ';\n    ')}}
}

`;
      });
      const hoverStyles = getHoverStyles(element);
      if(hoverStyles.length > 0){
        rawAuthored += `/* Detected Hover Styles (apply as needed for testing) */
/* ${data.selectorForDisplay}:hover { 
`;
        hoverStyles.forEach(style => rawAuthored += `  ${style.property}: ${style.value};\n`);
        rawAuthored += `} */
`;
      }
      data.rawCssToCopy = rawAuthored.trim();
    }
    return data;
   }

  // Format CSS for display with color swatches
  function formatCSSForDisplay(element, inspectedData, dimensions, fontInfo) {
    if (!inspectedData) { // Handle case where no data is available (e.g., element is null)
        return `<p style="color:${theme.sourceHref}; padding: 20px;">Hover over an element to inspect.</p>`;
    }

    let formattedHtml = '';
    const commonColorProperties = [ /* ... same as before ... */
        'color', 'background-color', 'border-color', 'border-top-color', 
        'border-right-color', 'border-bottom-color', 'border-left-color', 
        'outline-color'
    ];
    
    // This is now handled by constructing popupHeader and tabContentContainer separately in renderCurrentView
    // formattedHtml += '<div class="css-element-header">';
    // formattedHtml += `<div class="css-selector">${inspectedData.selectorForDisplay}</div>`;
    // formattedHtml += '<div class="css-element-info">';
    // formattedHtml += `<div class="css-dimensions">${dimensions.width}x${dimensions.height}</div>`;
    // formattedHtml += `<div class="css-font-info">${fontInfo}</div>`;
    // formattedHtml += '</div></div>';


    function renderProperties(cssTextLinesOrArray, isAuthoredStyleBlock = false) {
        let blockHtml = '';
        const lines = Array.isArray(cssTextLinesOrArray) ? cssTextLinesOrArray : cssTextLinesOrArray.split('\n');

        lines.forEach(line => {
            let propName, value;
            // For authored, we split by lines which are already prop:value;
            // For computed, it's also prop: value;
            if (line.startsWith('/*')) return; // Skip comments like "Computed Styles for:"
            if (!line.includes(':')) return;

            const parts = line.split(':');
            propName = parts.shift()?.trim();
            value = parts.join(':').trim();
            if (value.endsWith(';')) value = value.slice(0, -1);
            

            if (propName && typeof value !== 'undefined' && value !== '') { // Added value not empty
                let valueDisplay = `<span class="css-property-value">${value};</span>`;
                if (commonColorProperties.includes(propName.toLowerCase())) {
                    const colorSwatch = createColorSwatchHtml(value.replace(/!important/gi, '').trim());
                    valueDisplay = colorSwatch + valueDisplay;
                }
                blockHtml += `<div class="css-property-line"><span class="css-property-name">${propName}</span>: ${valueDisplay}</div>`;
            }
        });
        return blockHtml;
    }

    if (currentViewMode === 'computed') {
      formattedHtml += '<div class="css-section">';
      formattedHtml += `<div class="css-section-header">Main Computed Properties</div>`;
      formattedHtml += renderProperties(inspectedData.computedCssText);
      formattedHtml += '</div>';
    } else { // Authored view
      const { authoredRules } = inspectedData;
      if (authoredRules.inlineStyle) {
        formattedHtml += '<div class="css-section"><div class="css-section-header">Inline Style (style="")</div>';
        formattedHtml += '<div class="css-authored-rule-block">';
        formattedHtml += renderProperties(authoredRules.inlineStyle.split(';').filter(s => s.trim()), true); // true indicates parsing individual properties
        formattedHtml += '</div></div>';
      }

      if (authoredRules.matchedRules.length > 0) {
        formattedHtml += '<div class="css-section"><div class="css-section-header">Matched Stylesheet Rules</div>';
        authoredRules.matchedRules.forEach(rule => {
          formattedHtml += `<div class="css-authored-rule-block">`;
          formattedHtml += `<div class="css-authored-selector">${rule.selectorText}</div>`;
          if (rule.sourceHref && rule.sourceHref !== 'Embedded/Unknown') { // Hide if unknown
            formattedHtml += `<div class="css-source-href">${rule.sourceHref.substring(rule.sourceHref.lastIndexOf('/') + 1)}</div>`;
          }
          formattedHtml += renderProperties(rule.cssText.split(';').filter(s => s.trim()), true); // true indicates parsing individual properties
          formattedHtml += `</div>`;
        });
        formattedHtml += '</div>';
      }

      const hoverStyles = getHoverStyles(element);
      if (hoverStyles.length > 0) {
        formattedHtml += '<div class="css-pseudo-section">';
        formattedHtml += '<div class="css-pseudo-header">:hover Rules Detected</div>'; // Changed header
        hoverStyles.forEach(style => {
            let valueDisplay = `<span class="css-property-value">${style.value}</span>`;
            if (commonColorProperties.includes(style.property.toLowerCase())) {
                 const colorSwatch = createColorSwatchHtml(style.value.replace(/!important/gi, '').trim());
                 valueDisplay = colorSwatch + valueDisplay;
            }
            formattedHtml += `<div class="css-property-line"><span class="css-property-name">${style.property}</span>: ${valueDisplay}</div>`;
        });
        formattedHtml += '</div>';
      }

      if (authoredRules.mediaQueryRules.length > 0) {
        formattedHtml += '<div class="css-section"><div class="css-section-header">Media Query Rules</div>';
        const mediaGroups = authoredRules.mediaQueryRules.reduce((acc, rule) => {
            acc[rule.mediaCondition] = acc[rule.mediaCondition] || [];
            acc[rule.mediaCondition].push(rule);
            return acc;
        }, {});
        for (const mediaCondition in mediaGroups) {
          formattedHtml += `<div class="css-media-query-block">`;
          formattedHtml += `<div class="css-media-condition">@media ${mediaCondition}</div>`;
          mediaGroups[mediaCondition].forEach(rule => {
            formattedHtml += `<div class="css-authored-rule-block">`;
            formattedHtml += `<div class="css-authored-selector">${rule.selectorText}</div>`;
             if (rule.sourceHref && rule.sourceHref !== 'Embedded/Unknown') { // Hide if unknown
                formattedHtml += `<div class="css-source-href">${rule.sourceHref.substring(rule.sourceHref.lastIndexOf('/') + 1)}</div>`;
             }
            formattedHtml += renderProperties(rule.cssText.split(';').filter(s => s.trim()), true); // true indicates parsing individual properties
            formattedHtml += `</div>`;
          });
          formattedHtml += `</div>`;
        }
        formattedHtml += '</div>';
      }

      if (!authoredRules.inlineStyle && authoredRules.matchedRules.length === 0 && hoverStyles.length === 0 && authoredRules.mediaQueryRules.length === 0) {
        formattedHtml += `<div class="css-section"><div class="css-section-header" style="color: ${theme.sourceHref};">No specific authored rules found</div><p style="color:${theme.sourceHref}; padding: 0 10px;">Element may inherit styles or use browser defaults. Check Computed view.</p></div>`; // Updated message
      }
    }

    formattedHtml += `<div class="css-copy-footer">Click popup to copy ${currentViewMode} CSS</div>`;
    return formattedHtml;
  }

  function getElementDimensions(element) {
    if (!element) return { width: 0, height: 0 }; // Guard
    const rect = element.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  function getFontInfo(element) {
    if (!element) return "N/A"; // Guard
    const styles = window.getComputedStyle(element);
    const fontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    const fontSize = styles.fontSize;
    return `${fontFamily} ${fontSize}`;
  }

  // This function was incomplete in the provided snippet.
  // It needs to handle element selection, popup positioning, and content rendering.
  function handleMouseMove(e) {
    if (isPinned || isPaused) return; // Combined check for pinned or paused state

    // Get element from point, excluding inspector UI
    const x = e.clientX;
    const y = e.clientY;
    let element = document.elementFromPoint(x, y);

    if (!element || 
        element.id.startsWith('css-inspector-') || 
        (element.closest && element.closest('#css-inspector-popup')) ||
        (element.closest && element.closest('#css-inspector-controls'))) {
      // If mouse is over inspector UI, try to get element underneath if possible,
      // or simply return if it's not feasible to avoid self-inspection.
      // For simplicity now, if it's inspector UI, don't update.
      if (!cssPopup.contains(element) && !controlBar.contains(element) && element !== overlay) {
         hideTimeout = setTimeout(() => {
            overlay.style.display = 'none';
            cssPopup.style.display = 'none';
        }, 200); // Short delay
      }
      return;
    }
    
    if (hideTimeout) clearTimeout(hideTimeout); // Clear hide timeout if on a valid element

    currentElement = element;
    // Note: renderCurrentView() is called after positioning, as per original partial implementation and typical flow.
    // If renderCurrentView significantly changed popup size, it might need re-positioning or pre-calculation.

    const rect = element.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px'; // Completed
    overlay.style.width = rect.width + 'px'; // Completed
    overlay.style.height = rect.height + 'px'; // Completed
    overlay.style.display = 'block'; // Completed

    cssPopup.style.display = 'flex'; // Completed - ensure popup is visible before measuring

    // Popup positioning logic
    // Use max values from CSS as fallbacks if offsetWidth/Height are 0 (e.g. display:none just changed)
    const popupWidth = cssPopup.offsetWidth || parseInt(cssPopup.style.maxWidth) || 550; 
    const popupHeight = cssPopup.offsetHeight || parseInt(cssPopup.style.maxHeight) || 450;
    
    let popupX = e.clientX + 20; // Desired position: right of cursor
    let popupY = e.clientY + 20; // Desired position: below cursor

    // Adjust if popup goes off-screen horizontally
    if (popupX + popupWidth > window.innerWidth) {
      popupX = e.clientX - popupWidth - 20; // Move to left of cursor
    }
    if (popupX < 0) { // Still off-screen (e.g. small window or large popup, or cursor near left edge)
        // Clamp to left edge or try to fit by aligning to right edge if it was due to window size
        popupX = Math.max(10, window.innerWidth - popupWidth - 10); 
    }
     // Ensure it's not less than a small margin from the left edge if the above adjustment made it so
    if (popupX < 10) popupX = 10;


    // Adjust if popup goes off-screen vertically
    if (popupY + popupHeight > window.innerHeight) {
      popupY = e.clientY - popupHeight - 20; // Move above cursor
    }
    if (popupY < 0) { // Still off-screen (e.g. cursor near top edge)
        // Clamp to top edge or try to fit by aligning to bottom edge
        popupY = Math.max(10, window.innerHeight - popupHeight - 10);
    }
    // Ensure it's not less than a small margin from the top edge
    if (popupY < 10) popupY = 10;


    cssPopup.style.left = popupX + 'px';
    cssPopup.style.top = popupY + 'px';
    
    renderCurrentView(); // Now call renderCurrentView to populate with data.
  }


  // Function to update button styles based on state (isPaused, currentViewMode)
  function updateButtonStyles() {
      // Pause Button
      if (isPaused) {
          pauseBtn.textContent = 'Resume';
          pauseBtn.style.backgroundColor = theme.btnToggleBg; // Use green for "Resume"
          pauseBtn.style.color = 'black';
          pauseBtn.onmouseenter = () => { pauseBtn.style.backgroundColor = theme.btnToggleHoverBg; };
          pauseBtn.onmouseleave = () => { pauseBtn.style.backgroundColor = theme.btnToggleBg; };
      } else {
          pauseBtn.textContent = 'Pause';
          pauseBtn.style.backgroundColor = theme.btnPauseBg;
          pauseBtn.style.color = 'white';
          pauseBtn.onmouseenter = () => { pauseBtn.style.backgroundColor = theme.btnPauseHoverBg; };
          pauseBtn.onmouseleave = () => { pauseBtn.style.backgroundColor = theme.btnPauseBg; };
      }

      // View Toggle Button
      if (currentViewMode === 'computed') {
          viewToggleBtn.textContent = 'Show Authored';
      } else {
          viewToggleBtn.textContent = 'Show Computed';
      }
      // Keep viewToggleBtn hover standard as its text changes, not its fundamental state color
      viewToggleBtn.onmouseenter = () => { viewToggleBtn.style.backgroundColor = theme.btnToggleHoverBg; };
      viewToggleBtn.onmouseleave = () => { viewToggleBtn.style.backgroundColor = theme.btnToggleBg; };


      // Stop button hover is static
      stopBtn.onmouseenter = () => { stopBtn.style.backgroundColor = theme.btnStopHoverBg; };
      stopBtn.onmouseleave = () => { stopBtn.style.backgroundColor = theme.btnStopBg; };
  }


  // Function to render the popup content based on currentElement and currentViewMode
  function renderCurrentView() {
    if (!currentElement) {
      cssPopup.innerHTML = `<p style="color:${theme.sourceHref}; padding: 20px;">Hover over an element to inspect.</p>`; // Simple message
      cssPopup.style.cursor = 'default';
      cssPopup.removeAttribute('data-raw-css');
      // Clear header and content if they exist from previous state
      popupHeader.innerHTML = '';
      tabContentContainer.innerHTML = '';
      if (cssPopup.contains(popupHeader)) cssPopup.removeChild(popupHeader);
      if (cssPopup.contains(tabContentContainer)) cssPopup.removeChild(tabContentContainer);
      return;
    }

    const dimensions = getElementDimensions(currentElement);
    const fontInfo = getFontInfo(currentElement);
    const inspectedData = getInspectedElementData(currentElement);

    if (!inspectedData) { // Should not happen if currentElement is set, but as a guard
        cssPopup.innerHTML = `<p style="color:${theme.sourceHref}; padding: 20px;">Could not get data for element.</p>`;
        return;
    }
    
    // Build header
    popupHeader.innerHTML = `
        <div class="css-selector">${inspectedData.selectorForDisplay}</div>
        <div class="css-element-info">
            <div class="css-dimensions">${dimensions.width}x${dimensions.height}</div>
            <div class="css-font-info">${fontInfo}</div>
        </div>`;

    // Build content
    tabContentContainer.innerHTML = formatCSSForDisplay(currentElement, inspectedData, dimensions, fontInfo);
    
    // Assemble popup
    cssPopup.innerHTML = ''; // Clear previous content before appending (important!)
    cssPopup.appendChild(popupHeader);
    cssPopup.appendChild(tabContentContainer);

    cssPopup.style.cursor = 'pointer'; // Make popup clickable to copy
    if(inspectedData.rawCssToCopy) {
        cssPopup.setAttribute('data-raw-css', inspectedData.rawCssToCopy);
    } else {
        cssPopup.removeAttribute('data-raw-css');
    }
  }

  // Event Listeners for control bar buttons
  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isPaused = !isPaused;
    updateButtonStyles();
    if (!isPaused && currentElement) {
      // If resuming and there's a current element, re-show overlay.
      // handleMouseMove will position it if mouse is still over it or a new element.
      overlay.style.display = 'block';
      cssPopup.style.display = 'flex';
    } else if (isPaused) {
      // If pausing, hide overlay. Popup hiding is handled by mouseleave logic.
      overlay.style.display = 'none';
    }
  });

  viewToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentViewMode = currentViewMode === 'computed' ? 'authored' : 'computed';
    updateButtonStyles();
    if (currentElement) { // Re-render if an element is selected
      renderCurrentView();
    }
  });

  stopBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.cssInspectorCleanup();
  });

  // Event listener for clicking on the popup to copy CSS
  cssPopup.addEventListener('click', (e) => {
    // Prevent copy if clicking on scrollbar or if no data to copy
    if (e.target === cssPopup || tabContentContainer.contains(e.target)) {
        const rawCss = cssPopup.getAttribute('data-raw-css');
        if (rawCss) {
            copyCSS(rawCss, e.clientX, e.clientY);
        }
    }
  });
  
  // Hide popup if mouse leaves it (unless over control bar or another inspector element)
  cssPopup.addEventListener('mouseleave', (e) => {
    if (isPaused) return; // Don't hide if paused and user is just mousing out
    // Check if relatedTarget (where mouse is going) is part of inspector UI
    if (e.relatedTarget && (
        controlBar.contains(e.relatedTarget) || 
        e.relatedTarget.id.startsWith('css-inspector-'))) {
        return;
    }
    hideTimeout = setTimeout(() => {
        overlay.style.display = 'none';
        cssPopup.style.display = 'none';
    }, 300); // Delay before hiding
  });
  // Clear hide timeout if mouse re-enters popup
  cssPopup.addEventListener('mouseenter', () => {
      if (hideTimeout) clearTimeout(hideTimeout);
  });
  // Also clear hide for control bar
   controlBar.addEventListener('mouseenter', () => {
      if (hideTimeout) clearTimeout(hideTimeout);
  });
   controlBar.addEventListener('mouseleave', (e) => {
    if (isPaused) return;
    if (e.relatedTarget && (cssPopup.contains(e.relatedTarget) || e.relatedTarget.id.startsWith('css-inspector-'))) {
        return;
    }
     hideTimeout = setTimeout(() => {
        overlay.style.display = 'none';
        cssPopup.style.display = 'none';
    }, 300);
   });


  // Function to copy CSS to clipboard and show notification
  function copyCSS(cssText, x, y) {
    navigator.clipboard.writeText(cssText).then(() => {
      copyNotification.style.left = (x - copyNotification.offsetWidth / 2) + 'px'; // Centered on click
      copyNotification.style.top = (y - copyNotification.offsetHeight - 10) + 'px'; // Above click
      copyNotification.style.display = 'block';
      setTimeout(() => {
        copyNotification.style.transform = 'translateY(0)';
        copyNotification.style.opacity = '1';
      }, 10); // Transition in

      setTimeout(() => {
        copyNotification.style.transform = 'translateY(-20px)';
        copyNotification.style.opacity = '0';
        setTimeout(() => {
          copyNotification.style.display = 'none';
        }, 300); // Transition out
      }, 2000); // Notification visible for 2 seconds
    }).catch(err => {
      console.error('CSS Inspector: Failed to copy CSS:', err);
      copyNotification.textContent = 'Error copying!';
      copyNotification.style.backgroundColor = 'red'; // Indicate error
      // Show error notification (similar logic as above)
    });
  }

  // Cleanup function
  window.cssInspectorCleanup = function() {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handlePageElementClick, false); // THIS LINE
    // document.removeEventListener('keydown', handleKeyDown, true); // Comment for keydown is fine

    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (cssPopup && cssPopup.parentNode) cssPopup.parentNode.removeChild(cssPopup);
    if (controlBar && controlBar.parentNode) controlBar.parentNode.removeChild(controlBar);
    if (copyNotification && copyNotification.parentNode) copyNotification.parentNode.removeChild(copyNotification);
    if (scrollbarStyle && scrollbarStyle.parentNode) scrollbarStyle.parentNode.removeChild(scrollbarStyle);
    
    if (hideTimeout) clearTimeout(hideTimeout);
    window.cssInspectorActive = false; // Mark as inactive
    delete window.cssInspectorCleanup; 
  };

  // Add main event listener
  document.addEventListener('mousemove', handleMouseMove, true);
  // No keydown listeners in this version (for pinning etc.)

  // Function to handle keydown events (e.g., for pinning)
  function handleKeyDown(e) {
    // Allow spacebar if target is not an input/textarea/contenteditable
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
      // If user is typing in an input, don't let spacebar pin.
      return;
    }

    if (e.code === 'Space' && currentElement && !isPinned && !isPaused && cssPopup.style.display === 'flex') {
      // Prevent default spacebar action (scrolling)
      e.preventDefault();
      // console.log("Spacebar pressed, currentElement exists, not pinned, not paused, popup is visible. Ready to pin.");
      // Pinning logic will be added here.
    }
  }
  document.addEventListener('keydown', handleKeyDown, false);


  // Function to handle clicks on page elements to copy CSS
  function handlePageElementClick(e) {
    if (isPaused) { // isPinned is not used in this version
      return;
    }
    if (!currentElement) {
      return;
    }

    // Check if click was on inspector UI itself
    if (e.target.id.startsWith('css-inspector-') ||
        (e.target.closest && e.target.closest('#css-inspector-popup')) ||
        (e.target.closest && e.target.closest('#css-inspector-controls'))) {
      return; 
    }

    // Check if the click is on the currently highlighted element or its children
    if (currentElement.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation(); // Use true for capture phase if needed, but false is usually fine.
      
      const rawCss = cssPopup.getAttribute('data-raw-css');
      if (rawCss) {
        copyCSS(rawCss, e.clientX, e.clientY);
      }
    }
  }
  document.addEventListener('click', handlePageElementClick, false); // Add click listener for page elements


  // Initial setup
  updateButtonStyles(); // Set initial button text/styles
  renderCurrentView(); // Render empty state for popup initially
})();