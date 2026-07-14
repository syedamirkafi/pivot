document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: scrapeJobDescription,
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const resultDiv = document.getElementById('result');
      resultDiv.style.display = 'block';
      resultDiv.textContent = results[0].result;
      
      // Copy to clipboard
      navigator.clipboard.writeText(results[0].result);
      
      const btn = document.getElementById('scrapeBtn');
      btn.textContent = 'Copied to Clipboard!';
      setTimeout(() => { btn.textContent = 'Scrape Job Description'; }, 2000);
    }
  });
});

function scrapeJobDescription() {
  let text = '';
  // basic LinkedIn job description logic
  const linkedinDesc = document.querySelector('.jobs-description');
  // basic Indeed job description logic
  const indeedDesc = document.querySelector('#jobDescriptionText');
  
  if (linkedinDesc) text = linkedinDesc.innerText;
  else if (indeedDesc) text = indeedDesc.innerText;
  else text = document.body.innerText; // Fallback
  
  return text;
}
