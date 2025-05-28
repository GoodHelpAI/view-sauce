let isActive = false;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');

startBtn.addEventListener('click', async () => {
  isActive = true;
  
  // Update UI
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  status.textContent = 'Inspector active - hover to see CSS';
  status.className = 'status active';
  status.style.display = 'flex';
  
  // Inject content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
  
  // Close the popup window
  window.close();
});

stopBtn.addEventListener('click', async () => {
  isActive = false;
  
  // Reset UI
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
  status.style.display = 'none';
  status.className = 'status';
  
  // Clean up content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (window.cssInspectorCleanup) {
        window.cssInspectorCleanup();
      }
    }
  });
});