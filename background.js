let previousTabId = null
//let currentTabId = null
// let tabTimers = {}
// let customTrackList = {}
// let exceptionTabIds = []
// let currentTabId = null;
// let currentDomain = null;
// let startTime = null;

let currentTabId = null;


const tabTracker = {};

function isValidUrl(url) {
  try {
    const hostName =  new URL(url).hostname
    if (hostName === "extensions" || hostName === "newtab") {
      return false
    }
    else {
      return true
    }
  } catch (e) {
    return false;
  }
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

function stopTimer() {
  if (tabTracker[previousTabId]) {
    console.log('stop')
    const elapsed = Date.now() - tabTracker[previousTabId].lastStartTime;
    tabTracker[previousTabId].totalTime += elapsed;
    tabTracker[previousTabId].lastStartTime = Date.now()
    console.log(`⏸ Stopped timer for ${tabTracker[previousTabId].domain}. Total time: ${tabTracker[previousTabId].totalTime} ms`);
  }
}

function startTimer(tabId, domain) {
  if (!tabTracker[tabId]) {  // if it is a new one
    tabTracker[tabId] = {
      domain: domain,
      totalTime: 0,
      lastStartTime: Date.now()
    };
    console.log('new one')
  } else {          // same tab id
    if (tabTracker[tabId].domain !== domain) {    // domain change on refresh, reset timer
      tabTracker[tabId] = {
        domain: domain,
        totalTime: 0,
        lastStartTime: Date.now()
      };
      console.log('reset and create new one')
    } else {   
      console.log('resume')                                   // resume previous one
      tabTracker[tabId].lastStartTime = Date.now(); 
    }
  }
  previousTabId = tabId;
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    currentTabId = activeInfo.tabId
    
    if (!tab || !tab.url || !isValidUrl(tab.url)) {
      console.log('this1')
      stopTimer();
      return;
    }

    const domain = getDomainFromUrl(tab.url);
    stopTimer();
    startTimer(currentTabId, domain);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
   if (!changeInfo.url) return;  // terminate early if onUpdate listener is not becuase of url change

   if (!tab || !tab.url || !isValidUrl(tab.url)) return;  // invalid url check
 
   if (!tab.active || tabId !== currentTabId) return;  // termiante on background tab update
 
   const domain = getDomainFromUrl(tab.url);
   if (domain !== tabTracker[currentTabId]?.domain ) {  // reset timer and start new one of the updated domain is not the same on the focus tab
     stopTimer();
     currentTabId = tabId // note really needed
     startTimer(currentTabId, domain);
   }
});

  
  