let strictModeDomains = ["www.youtube.com", "www.reddit.com"]
let timeLimit
let timeLimitInput = document.getElementById("limitInput")
// have to send MS to background since comparing is done in MS

chrome.storage.local.get(['timeLimit', "strictModeDomains"], (result) => {
    timeLimit = result.timeLimit/ 60000 || 4;
    strictModeDomains = result.strictModeDomains || ["www.youtube.com", "www.reddit.com"]
    document.getElementById('showTimeLimit').textContent = `Current time limit: ${timeLimit} minutes`
    renderStrictModeList()
});


document.getElementById("changeLimit").addEventListener("click", () => {
    if (timeLimitInput.value) {
        timeLimit = timeLimitInput.value
        document.getElementById('showTimeLimit').textContent = `Current time limit: ${timeLimit} minutes`
        
        chrome.storage.local.set({ timeLimit : timeLimitInput.value * 60 * 1000 });
    }
});

function renderStrictModeList() {
    const listContainer = document.getElementById("stritModeList");
  
    listContainer.innerHTML = "";
  
    strictModeDomains.forEach(domain => {
      const li = document.createElement("li");
      li.textContent = domain;
      listContainer.appendChild(li);
    });
}


document.getElementById('addStrict').addEventListener("click", () => {
    const input = document.getElementById("urlInput");
    let newDomain = input.value.trim();
    newDomain = new URL(newDomain).hostname
    if (newDomain && !strictModeDomains.includes(newDomain)) {
      strictModeDomains.push(newDomain);
      renderStrictModeList(); 
      input.value = ""; 
      chrome.storage.local.set({ strictModeDomains });
  }
})

  