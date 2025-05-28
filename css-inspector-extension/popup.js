let isActive = false; // Global state for the popup

// Declare variables for DOM elements; will be assigned in DOMContentLoaded
let startBtn;
let stopBtn;
let status;

// This function is injected into the content page to get the inspector's status
function getInspectorStatus() {
  return typeof window.cssInspectorActive === 'boolean' ? window.cssInspectorActive : false;
}

// Updates the popup's UI elements based on the isActive state
function updateUIVisibility() {
  if (!startBtn || !stopBtn || !status) {
    // Elements not yet initialized
    return;
  }
  if (isActive) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block'; // Use 'block' or 'flex' as per your CSS for buttons
    status.style.display = 'block';  // Use 'block' or 'flex' for status message
    status.textContent = 'Inspector active - hover to see CSS';
    // status.className = 'status active'; // If you have specific CSS for active status
  } else {
    startBtn.style.display = 'block'; // Use 'block' or 'flex'
    stopBtn.style.display = 'none';
    status.style.display = 'none';
    // status.className = 'status';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Assign DOM elements
  startBtn = document.getElementById('startBtn');
  stopBtn = document.getElementById('stopBtn');
  status = document.getElementById('status');

  // Disable buttons initially to prevent clicks before status is known
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = true;

  let currentTab;
  try {
    // Query for the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      currentTab = tabs[0];
    }
  } catch (e) {
    // console.warn("CSS Inspector: Error querying tabs.", e);
    // Fallback to not active, UI will show start button if elements are available
  }

  // Check if the tab is accessible for scripting
  if (currentTab && currentTab.id && currentTab.url && !currentTab.url.startsWith('chrome://') && !currentTab.url.startsWith('https://chrome.google.com')) {
    try {
      // Execute script to get inspector status from the page
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: getInspectorStatus
      });

      if (injectionResults && injectionResults[0] && injectionResults[0].result === true) {
        isActive = true;
      } else {
        isActive = false;
      }
    } catch (e) {
      // console.warn(`CSS Inspector: Could not check status on page: ${currentTab.url}. Error: ${e.message}`);
      isActive = false; // Default to not active if status check fails
    }
  } else {
    // Tab is not queryable (e.g., chrome://newtab, about:blank) or restricted
    isActive = false;
    if (status && startBtn) { // Check if status and startBtn are available
      // status.textContent = "Unavailable on this page";
      // status.style.display = 'block';
      // startBtn.disabled = true; // Keep start button disabled on such pages
    }
  }
  
  // Update UI based on fetched status
  updateUIVisibility();

  // Enable buttons after status check
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = false;


  // Attach event listener for the Start button
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      // No need to set isActive here, content script sets its own state.
      // We assume injection will succeed; UI updates optimistically.
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          // After successfully initiating injection, update state and UI, then close.
          isActive = true; 
          updateUIVisibility();
          window.close();
        } catch (e) {
          // console.error("CSS Inspector: Error injecting content.js", e);
          // If injection fails, it might be good to reflect this in the UI,
          // but for now, popup closes. User might need to retry.
          // Consider reverting isActive and updating UI if an error message is shown instead of closing.
          window.close(); // Close to avoid inconsistent UI state if error is not handled more gracefully.
        }
      } else {
        // console.error("CSS Inspector: No active tab found to inject content.js");
        window.close(); // Close if no tab is found.
      }
    });
  }

  // Attach event listener for the Stop button
  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      // No need to set isActive here yet, actual cleanup happens in content script.
      // We assume cleanup will succeed; UI updates optimistically.

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              if (window.cssInspectorCleanup) {
                window.cssInspectorCleanup(); // This will set window.cssInspectorActive = false
              }
            }
          });
          // After successfully initiating cleanup, update state and UI.
          isActive = false;
          updateUIVisibility();
          // Optional: window.close(); if you want the popup to close after stopping.
        } catch (e) {
          // console.error("CSS Inspector: Error calling cleanup function", e);
          // UI already reflects intent to stop (isActive = false, updated UI).
        }
      } else {
        // console.error("CSS Inspector: No active tab found to call cleanup function");
      }
    });
  }
});