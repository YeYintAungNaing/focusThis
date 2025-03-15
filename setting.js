let strictModeDomains = ["youtube.com", "reddit.com"]
let timeLimit
let timeLimitInput = document.getElementById("limitInput")
// have to send MS to background since comparing is done in MS

chrome.storage.local.get(['timeLimit'], (result) => {
    console.log(result)
    timeLimit = result.timeLimit || 4;
    document.getElementById('showTimeLimit').textContent = `Current time limit: ${timeLimit} minutes`
});
  
//  chrome.storage.onChanged.addListener((changes, area) => {
//      if (area === 'local' && changes.strictModeDomains) {
//        strictModeDomains = changes.strictModeDomains.newValue || [];
//       console.log('strictModeDomains updated:', strictModeDomains);
//      }
//  });


document.getElementById("changeLimit").addEventListener("click", () => {
    if (timeLimitInput.value) {
        timeLimit = timeLimitInput.value
        document.getElementById('showTimeLimit').textContent = `Current time limit: ${timeLimit} minutes`
        
        chrome.storage.local.set({ timeLimit : timeLimitInput.value * 60 * 1000 });
    }
});
  