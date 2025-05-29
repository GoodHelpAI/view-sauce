color', 'border-color', 'border-top-color', 
        'border-right-color', 'border-bottom-color', 'border-left-color', 
        'outline-color', 'box-shadow', 'text-shadow'
    ];
    
    // Group properties by category
    const layoutProps = ['display', 'position', 'width', 'height', 'margin', 'padding', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear', 'overflow', 'visibility'];
    const typographyProps = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'text-transform', 'letter-spacing', 'text-decoration'];
    const visualProps = ['background', 'background-color', 'border', 'border-radius', 'box-shadow', 'opacity', 'transition', 'transform'];
    const flexGridProps = ['flex', 'grid', 'align-items', 'justify-content', 'gap', 'grid-template-columns', 'grid-template-rows'];

    function renderProperties(cssTextLinesOrArray, isAuthoredStyleBlock = false) {
        // Sort and organize properties
        const properties = [];
        const lines = Array.isArray(cssTextLinesOrArray) ? cssTextLinesOrArray : cssTextLinesOrArray.split('\n');
        
        lines.forEach(line => {
            if (line.startsWith('/*') || !line.includes(':')) return;
            
            const parts = line.split(':');
            const propName = parts.shift()?.trim();
            let value = parts.join(':').trim();
            if (value.endsWith(';')) value = value.slice(0, -1);
            
            if (propName && typeof value !== 'undefined' && value !== '') {
                properties.push({ name: propName, value: value });
            }
        });
        
        // Group properties by category
        const grouped = {
            layout: properties.filter(p => layoutProps.includes(p.name)),
            typography: properties.filter(p => typographyProps.includes(p.name)),
            visual: properties.filter(p => visualProps.includes(p.name)),
            flexGrid: properties.filter(p => flexGridProps.includes(p.name)),
            other: properties.filter(p => !layoutProps.includes(p.name) && 
                                           !typographyProps.includes(p.name) && 
                                           !visualProps.includes(p.name) && 
                                           !flexGridProps.includes(p.name))
        };
        
        // Render each group
        let blockHtml = '';
        
        // Important properties always at top
        const criticalProps = ['display', 'position', 'width', 'height', 'color', 'background-color', 'font-size', 'font-family'];
        const criticalFound = properties.filter(p => criticalProps.includes(p.name));
        
        if (criticalFound.length > 0 && !isAuthoredStyleBlock) {
            blockHtml += `<div class="css-property-group"><div class="css-group-label">Key Properties</div>`;
            criticalFound.forEach(prop => {
                let valueDisplay = `<span class="css-property-value">${prop.value};</span>`;
                if (commonColorProperties.includes(prop.name.toLowerCase())) {
                    const colorSwatch = createColorSwatchHtml(prop.value);
                    valueDisplay = colorSwatch + valueDisplay;
                }
                blockHtml += `<div class="css-property-line"><span class="css-property-name">${prop.name}</span>: ${valueDisplay}</div>`;
            });
            blockHtml += `</div>`;
        }
        
        // If not an authored block, show categorized properties
        if (!isAuthoredStyleBlock) {
            // Layout group
            if (grouped.layout.length > 0) {
                blockHtml += `<div class="css-property-group"><div class="css-group-label">Layout</div>`;
                grouped.layout.forEach(prop => {
                    if (criticalProps.includes(prop.name)) return; // Skip if already shown in critical
                    let valueDisplay = `<span class="css-property-value">${prop.value};</span>`;
                    blockHtml += `<div class="css-property-line"><span class="css-property-name">${prop.name}</span>: ${valueDisplay}</div>`;
                });
                blockHtml += `</div>`;
            }
            
            // Typography group
            if (grouped.typography.length > 0) {
                blockHtml += `<div class="css-property-group"><div class="css-group-label">Typography</div>`;
                grouped.typography.forEach(prop => {
                    if (criticalProps.includes(prop.name)) return; // Skip if already shown in critical
                    let valueDisplay = `<span class="css-property-value">${prop.value};</span>`;
                    if (commonColorProperties.includes(prop.name.toLowerCase())) {
                        const colorSwatch = createColorSwatchHtml(prop.value);
                        valueDisplay = colorSwatch + valueDisplay;
                    }
                    blockHtml += `<div class="css-property-line"><span class="css-property-name">${prop.name}</span>: ${valueDisplay}</div>`;
                });
                blockHtml += `</div>`;
            }
            
            // Visual group
            if (grouped.visual.length > 0) {
                blockHtml += `<div class="css-property-group"><div class="css-group-label">Visual</div>`;
                grouped.visual.forEach(prop => {
                    if (criticalProps.includes(prop.name)) return; // Skip if already shown in critical
                    let valueDisplay = `<span class="css-property-value">${prop.value};</span>`;
                    if (commonColorProperties.includes(prop.name.toLowerCase())) {
                        const colorSwatch = createColorSwatchHtml(prop.value);
                        valueDisplay = colorSwatch + valueDisplay;
                    }
                    blockHtml += `<div class="css-property-line"><span class="css-property-name">${prop.name}</span>: ${valueDisplay}</div>`;
                });
                blockHtml += `</div>`;
            }
            
            // Flex/Grid group
            if (grouped.flexGrid.length > 0) {
                blockHtml += `<div class="css-property-group"><div class="css-group-label">Flex/Grid</div>`;
                grouped.flexGrid.forEach(prop => {
                    let valueDisplay = `<span class="css-property-value">${prop.value};</span>`;
                    blockHtml += `<div class="css-property-line"><span class="css-property-name">${prop.name}</span>: ${valueDisplay}</div>`;
                });
                blockHtml += `</div>`;
            }
            
            // Other properties
            if (grouped.other.length > 0) {
                blockHtml += `<div class="css-property-group"><div class="css-group-label">Other</div>`;
                grouped.other.forEach(prop => {
                    if (criticalProps.includes(prop.name)) return; // Skip if already shown in critical
                    let valueDisplay = `<span class="css-property-value">${prop.value};</span>`;
                    if (commonColorProperties.includes(prop.name.toLowerCase())) {
                        const colorSwatch = createColorSwatchHtml(prop.value);
                        valueDisplay = colorSwatch + valueDisplay;
                    }
                    blockHtml += `<div class="css-property-line"><span class="css-property-name">${prop.name}</span>: ${valueDisplay}</div>`;
                });
                blockHtml += `</div>`;
            }
        } else {
            // For authored blocks, just show properties without categorization
            properties.forEach(prop => {
                let valueDisplay = `<span class="css-property-value">${prop.value};</span>`;
                if (commonColorProperties.includes(prop.name.toLowerCase())) {
                    const colorSwatch = createColorSwatchHtml(prop.value);
                    valueDisplay = colorSwatch + valueDisplay;
                }
                blockHtml += `<div class="css-property-line"><span class="css-property-name">${prop.name}</span>: ${valueDisplay}</div>`;
            });
        }
        
        return blockHtml;
    }

    if (currentViewMode === 'computed') {
      formattedHtml += renderProperties(inspectedData.computedCssText);
    } else { // Authored view
      const { authoredRules } = inspectedData;
      if (authoredRules.inlineStyle) {
        formattedHtml += '<div class="css-section"><div class="css-section-header">Inline Style (style="")</div>';
        formattedHtml += '<div class="css-authored-rule-block">';
        formattedHtml += renderProperties(authoredRules.inlineStyle.split(';').filter(s => s.trim()), true);
        formattedHtml += '</div></div>';
      }

      if (authoredRules.matchedRules.length > 0) {
        formattedHtml += '<div class="css-section"><div class="css-section-header">Matched Stylesheet Rules</div>';
        authoredRules.matchedRules.forEach(rule => {
          formattedHtml += `<div class="css-authored-rule-block">`;
          formattedHtml += `<div class="css-authored-selector">${rule.selectorText}</div>`;
          if (rule.sourceHref && rule.sourceHref !== 'Embedded/Unknown') {
            formattedHtml += `<div class="css-source-href">${rule.sourceHref.substring(rule.sourceHref.lastIndexOf('/') + 1)}</div>`;
          }
          formattedHtml += renderProperties(rule.cssText.split(';').filter(s => s.trim()), true);
          formattedHtml += `</div>`;
        });
        formattedHtml += '</div>';
      }

      const hoverStyles = getHoverStyles(element);
      if (hoverStyles.length > 0) {
        formattedHtml += '<div class="css-pseudo-section">';
        formattedHtml += '<div class="css-pseudo-header">:hover Rules Detected</div>';
        hoverStyles.forEach(style => {
            let valueDisplay = `<span class="css-property-value">${style.value}</span>`;
            if (commonColorProperties.includes(style.property.toLowerCase())) {
                 const colorSwatch = createColorSwatchHtml(style.value);
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
             if (rule.sourceHref && rule.sourceHref !== 'Embedded/Unknown') {
                formattedHtml += `<div class="css-source-href">${rule.sourceHref.substring(rule.sourceHref.lastIndexOf('/') + 1)}</div>`;
             }
            formattedHtml += renderProperties(rule.cssText.split(';').filter(s => s.trim()), true);
            formattedHtml += `</div>`;
          });
          formattedHtml += `</div>`;
        }
        formattedHtml += '</div>';
      }

      if (!authoredRules.inlineStyle && authoredRules.matchedRules.length === 0 && hoverStyles.length === 0 && authoredRules.mediaQueryRules.length === 0) {
        formattedHtml += `<div class="css-section"><div class="css-section-header" style="color: ${theme.sourceHref};">No specific authored rules found</div><p style="color:${theme.sourceHref}; padding: 0 10px;">Element may inherit styles or use browser defaults. Check Computed view.</p></div>`;
      }
    }

    // Only show "Click to copy" footer when not pinned
    if (!isPinned) {
      formattedHtml += `<div class="css-copy-footer">Click popup to copy ${currentViewMode} CSS</div>`;
    }
    
    return formattedHtml;
  }

  // Get element dimensions
  function getElementDimensions(element) {
    if (!element) return { width: 0, height: 0 };
    const rect = element.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  // Get font info
  function getFontInfo(element) {
    if (!element) return "N/A";
    const styles = window.getComputedStyle(element);
    const fontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    const fontSize = styles.fontSize;
    return `${fontFamily} ${fontSize}`;
  }

  // Handle mouse movement
  function handleMouseMove(e) {
    if (isPinned || isPaused) return;

    // Get element from point, excluding inspector UI
    const x = e.clientX;
    const y = e.clientY;
    let element = document.elementFromPoint(x, y);

    if (!element || 
        element.id.startsWith('css-inspector-') || 
        (element.closest && element.closest('#css-inspector-popup')) ||
        (element.closest && element.closest('#css-inspector-controls'))) {
      if (!cssPopup.contains(element) && !controlBar.contains(element) && element !== overlay) {
         hideTimeout = setTimeout(() => {
            overlay.style.display = 'none';
            cssPopup.style.display = 'none';
        }, 200);
      }
      return;
    }
    
    if (hideTimeout) clearTimeout(hideTimeout);

    currentElement = element;

    const rect = element.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';

    cssPopup.style.display = 'flex'; 

    // Popup positioning
    const popupWidth = cssPopup.offsetWidth || parseInt(cssPopup.style.maxWidth) || 550; 
    const popupHeight = cssPopup.offsetHeight || parseInt(cssPopup.style.maxHeight) || 450;
    
    let popupX = e.clientX + 20;
    let popupY = e.clientY + 20;

    // Adjust if popup goes off-screen
    if (popupX + popupWidth > window.innerWidth) {
      popupX = e.clientX - popupWidth - 20;
    }
    if (popupX < 0) {
        popupX = Math.max(10, window.innerWidth - popupWidth - 10); 
    }
    if (popupX < 10) popupX = 10;

    if (popupY + popupHeight > window.innerHeight) {
      popupY = e.clientY - popupHeight - 20;
    }
    if (popupY < 0) {
        popupY = Math.max(10, window.innerHeight - popupHeight - 10);
    }
    if (popupY < 10) popupY = 10;

    cssPopup.style.left = popupX + 'px';
    cssPopup.style.top = popupY + 'px';
    
    renderCurrentView();
  }

  // Update button styles
  function updateButtonStyles() {
      // Pause Button
      if (isPaused) {
          pauseBtn.textContent = 'Resume';
          pauseBtn.style.backgroundColor = theme.btnToggleBg;
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
      viewToggleBtn.onmouseenter = () => { viewToggleBtn.style.backgroundColor = theme.btnToggleHoverBg; };
      viewToggleBtn.onmouseleave = () => { viewToggleBtn.style.backgroundColor = theme.btnToggleBg; };

      // Stop button
      stopBtn.onmouseenter = () => { stopBtn.style.backgroundColor = theme.btnStopHoverBg; };
      stopBtn.onmouseleave = () => { stopBtn.style.backgroundColor = theme.btnStopBg; };
      
      // Update pinned action buttons visibility
      const pinnedActions = document.getElementById('css-inspector-pinned-actions');
      if (pinnedActions) {
          pinnedActions.style.display = isPinned ? 'flex' : 'none';
      }
      
      // Update hint text
      if (isPinned) {
          pinHintText.textContent = 'Pinned view - use controls to copy or close';
      } else {
          pinHintText.textContent = 'Click page element to copy, Press Spacebar to pin';
      }
  }

  // Pin popup
  function pinPopup() {
    if (!currentElement || !cssPopup || isPinned) return;
    
    isPinned = true;
    updateButtonStyles();
    makeDraggable(cssPopup);
    renderCurrentView();
  }

  // Unpin popup
  function unpinPopup() {
    isPinned = false;
    updateButtonStyles();
    removeDraggable(cssPopup);
    
    if (currentElement) {
      renderCurrentView();
    } else {
      cssPopup.style.display = 'none';
      overlay.style.display = 'none';
    }
  }

  // Make element draggable
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    popupHeader.style.cursor = 'move';
    popupHeader.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  
  // Remove draggable behavior
  function removeDraggable(element) {
    popupHeader.onmousedown = null;
    popupHeader.style.cursor = 'default';
  }

  // Render popup content
  function renderCurrentView() {
    if (!currentElement) {
      cssPopup.innerHTML = `<p style="color:${theme.sourceHref}; padding: 20px;">Hover over an element to inspect.</p>`;
      cssPopup.style.cursor = 'default';
      cssPopup.removeAttribute('data-raw-css');
      return;
    }

    const dimensions = getElementDimensions(currentElement);
    const fontInfo = getFontInfo(currentElement);
    const inspectedData = getInspectedElementData(currentElement);

    if (!inspectedData) {
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
        
    // Re-add pinned action buttons
    const pinnedActions = document.createElement('div');
    pinnedActions.id = 'css-inspector-pinned-actions';
    pinnedActions.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        display: ${isPinned ? 'flex' : 'none'};
        gap: 8px;
        background-color: ${theme.pinnedActionsBg};
        border-radius: 4px;
        padding: 4px;
        z-index: 2;
    `;
    
    // Recreate buttons
    const newPinCopyBtn = document.createElement('button');
    newPinCopyBtn.id = 'css-inspector-pin-copy';
    newPinCopyBtn.innerHTML = '📋';
    newPinCopyBtn.title = 'Copy CSS';
    newPinCopyBtn.style.cssText = `
        background: none;
        border: none;
        color: ${theme.pinnedActionsBtnColor};
        font-size: 16px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border-radius: 4px;
        transition: background-color 0.2s;
    `;
    newPinCopyBtn.onmouseenter = () => { newPinCopyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };
    newPinCopyBtn.onmouseleave = () => { newPinCopyBtn.style.backgroundColor = 'transparent'; };
    newPinCopyBtn.onclick = (e) => {
        e.stopPropagation();
        const rawCss = cssPopup.getAttribute('data-raw-css');
        if (rawCss) {
            copyCSS(rawCss, e.clientX, e.clientY);
      }
    }
  }

  // Cleanup function
  window.cssInspectorCleanup = function() {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handlePageElementClick, false);
    document.removeEventListener('keydown', handleKeyDown, false);

    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (cssPopup && cssPopup.parentNode) cssPopup.parentNode.removeChild(cssPopup);
    if (controlBar && controlBar.parentNode) controlBar.parentNode.removeChild(controlBar);
    if (copyNotification && copyNotification.parentNode) copyNotification.parentNode.removeChild(copyNotification);
    if (scrollbarStyle && scrollbarStyle.parentNode) scrollbarStyle.parentNode.removeChild(scrollbarStyle);
    
    if (hideTimeout) clearTimeout(hideTimeout);
    window.cssInspectorActive = false;
    delete window.cssInspectorCleanup; 
  };

  // Add main event listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handlePageElementClick, false);
  document.addEventListener('keydown', handleKeyDown, false);

  // Initial setup
  updateButtonStyles();
  renderCurrentView();
})();
        }
    };
    
    const newPinCloseBtn = document.createElement('button');
    newPinCloseBtn.id = 'css-inspector-pin-close';
    newPinCloseBtn.innerHTML = '✕';
    newPinCloseBtn.title = 'Close';
    newPinCloseBtn.style.cssText = `
        background: none;
        border: none;
        color: ${theme.pinnedActionsBtnColor};
        font-size: 16px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border-radius: 4px;
        transition: background-color 0.2s;
    `;
    newPinCloseBtn.onmouseenter = () => { newPinCloseBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };
    newPinCloseBtn.onmouseleave = () => { newPinCloseBtn.style.backgroundColor = 'transparent'; };
    newPinCloseBtn.onclick = (e) => {
        e.stopPropagation();
        unpinPopup();
    };
    
    pinnedActions.appendChild(newPinCopyBtn);
    pinnedActions.appendChild(newPinCloseBtn);
    popupHeader.appendChild(pinnedActions);

    // Build content
    tabContentContainer.innerHTML = formatCSSForDisplay(currentElement, inspectedData, dimensions, fontInfo);
    
    // Assemble popup
    cssPopup.innerHTML = '';
    cssPopup.appendChild(popupHeader);
    cssPopup.appendChild(tabContentContainer);

    cssPopup.style.cursor = isPinned ? 'default' : 'pointer';
    
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
      overlay.style.display = 'block';
      cssPopup.style.display = 'flex';
    } else if (isPaused) {
      overlay.style.display = 'none';
    }
  });

  viewToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentViewMode = currentViewMode === 'computed' ? 'authored' : 'computed';
    updateButtonStyles();
    if (currentElement) {
      renderCurrentView();
    }
  });

  stopBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.cssInspectorCleanup();
  });

  // Click on popup to copy CSS
  cssPopup.addEventListener('click', (e) => {
    if (isPinned || e.target.closest('#css-inspector-pinned-actions')) {
        return;
    }
    
    if (e.target === cssPopup || tabContentContainer.contains(e.target)) {
        const rawCss = cssPopup.getAttribute('data-raw-css');
        if (rawCss) {
            copyCSS(rawCss, e.clientX, e.clientY);
        }
    }
  });
  
  // Hide popup on mouse leave
  cssPopup.addEventListener('mouseleave', (e) => {
    if (isPinned || isPaused) return;
    
    if (e.relatedTarget && (
        controlBar.contains(e.relatedTarget) || 
        e.relatedTarget.id.startsWith('css-inspector-'))) {
        return;
    }
    
    hideTimeout = setTimeout(() => {
        overlay.style.display = 'none';
        cssPopup.style.display = 'none';
    }, 300);
  });
  
  cssPopup.addEventListener('mouseenter', () => {
      if (hideTimeout) clearTimeout(hideTimeout);
  });
  
  controlBar.addEventListener('mouseenter', () => {
      if (hideTimeout) clearTimeout(hideTimeout);
  });
  
  controlBar.addEventListener('mouseleave', (e) => {
    if (isPinned || isPaused) return;
    
    if (e.relatedTarget && (cssPopup.contains(e.relatedTarget) || e.relatedTarget.id.startsWith('css-inspector-'))) {
        return;
    }
    
    hideTimeout = setTimeout(() => {
        overlay.style.display = 'none';
        cssPopup.style.display = 'none';
    }, 300);
  });

  // Copy CSS to clipboard and show notification
  function copyCSS(cssText, x, y) {
    navigator.clipboard.writeText(cssText).then(() => {
      copyNotification.style.left = (x - copyNotification.offsetWidth / 2) + 'px';
      copyNotification.style.top = (y - copyNotification.offsetHeight - 10) + 'px';
      copyNotification.style.display = 'block';
      setTimeout(() => {
        copyNotification.style.transform = 'translateY(0)';
        copyNotification.style.opacity = '1';
      }, 10);

      setTimeout(() => {
        copyNotification.style.transform = 'translateY(-20px)';
        copyNotification.style.opacity = '0';
        setTimeout(() => {
          copyNotification.style.display = 'none';
        }, 300);
      }, 2000);
    }).catch(err => {
      console.error('CSS Inspector: Failed to copy CSS:', err);
      copyNotification.textContent = 'Error copying!';
      copyNotification.style.backgroundColor = 'red';
    });
  }

  // Handle keydown for pinning
  function handleKeyDown(e) {
    if (isPinned) return;
    
    if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.isContentEditable)) {
      return;
    }

    if (e.code === 'Space' && currentElement && !isPaused && cssPopup.style.display === 'flex') {
      e.preventDefault();
      pinPopup();
    }
  }

  // Handle clicks on page elements
  function handlePageElementClick(e) {
    if (isPaused || isPinned || !currentElement) {
      return;
    }

    if (e.target.id.startsWith('css-inspector-') ||
        (e.target.closest && e.target.closest('#css-inspector-popup')) ||
        (e.target.closest && e.target.closest('#css-inspector-controls'))) {
      return; 
    }

    if (currentElement.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      
      const rawCss = cssPopup.getAttribute('data-raw-css');
      if (rawCss) {
        copyCSS(rawCss, e.clientX, e.