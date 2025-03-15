let previousTabId = null
let currentTabId = null;
const tabTracker = {};
let WARNING_THRESHOLD_MS;
let intervalRef
let notificationIds = []
let isActive = false
let exclusionTabs = []
let strictModeDomains = ["www.youtube.com"]
let currentMode = "normal"
let isTrackingTarget = true

// to test , whether triggering isActive and toggle mode is correctly clearing and resuming the normal flow of tracking
// to test , whether clearinterval and clearMessage are called correclty 
// make sure to stop timer for every distructive mode switch

chrome.storage.local.get(['timeLimit'], (result) => {
  WARNING_THRESHOLD_MS =  result.timeLimit || 4 * 20 * 1000;
  console.log(WARNING_THRESHOLD_MS)

});


chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.timeLimit) {
   WARNING_THRESHOLD_MS = changes.timeLimit.newValue || 4 * 20 * 1000;
   console.log(`updated limit : ${WARNING_THRESHOLD_MS}`)
  }
});

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol;
    const hostname = parsed.hostname;

    const invalidProtocols = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'moz-extension:', 'view-source:', 'devtools:'];

    if (invalidProtocols.includes(protocol)) return false;

    
    const invalidHostnames = ['newtab', 'extensions', '', 'localhost'];
    if (invalidHostnames.includes(hostname)) return false;

    return true;
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


// function notifyPopup(domain, totalTime, isRunning) {
//   chrome.runtime.sendMessage({
//     type: 'TIMER_UPDATE',
//     domain,
//     totalTime,
//     isRunning
//   });
// }


function startCheckingInterval() {
  if (exclusionTabs.includes(currentTabId)) return
  console.log('interval starts')
  intervalRef = setInterval(() => { 
    if (currentTabId && tabTracker[currentTabId]) {
      const tracker = tabTracker[currentTabId];
      //if (tracker.warned) return
      const elapsed = tracker.lastStartTime ? Date.now() - tracker.lastStartTime : 0;
      const currentTotalTime = tracker.totalTime + elapsed;
      if (currentTotalTime >= WARNING_THRESHOLD_MS * tracker.snoozeMuliplier) { 
        showWarning(tracker.domain, WARNING_THRESHOLD_MS * tracker.snoozeMuliplier);
        clearInterval(intervalRef)
      }
    }
  }, 5000);
}


function showWarning(domain, threshHold) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/warning.png',
    title: '⚠️ Time Limit Reached',
    message: `You've spent more than ${threshHold} MS ${domain}.`,
    priority: 2,
    requireInteraction : true,
    buttons: [
      { title: 'Exclude this tab' },
      { title: 'Snooze' }
  ],
  }, (notificationId) => {notificationIds.push(notificationId)}
);
}


function clearAllNotifications() {
  if (notificationIds.length < 1) return
  notificationIds.forEach((id) => chrome.notifications.clear(id));
  notificationIds = []; 
}

// this does not work for some reason zzzzz
// chrome.notifications.onClosed.addListener(function(notificationId, byUser) {
//   console.log('closed')
//   if (byUser) {
//     console.log('Notification closed by user');
//   } else {
//     console.log('Notification closed automatically');
//   }
// });


chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
  console.log('custom')
  if (buttonIndex === 0) {
    addExclusionTab()

  } else if (buttonIndex === 1) {
    //console.log('User clicked Snooze 5 min');
    if (currentTabId && tabTracker[currentTabId]) {
      tabTracker[currentTabId].snoozeMuliplier += 1
      startCheckingInterval()
    }
    else {
      console.log('error snoozing')
    } 
  }
});



function stopTimer() {
  clearInterval(intervalRef)
  if (tabTracker[previousTabId] && tabTracker[previousTabId].isTracking) {
    //console.log('stop')
    const elapsed = Date.now() - tabTracker[previousTabId].lastStartTime;
    tabTracker[previousTabId].totalTime += elapsed;
    tabTracker[previousTabId].lastStartTime = null
    tabTracker[previousTabId].isTracking = false
    console.log(`⏸ Stopped timer for ${tabTracker[previousTabId].domain}. Total time: ${tabTracker[previousTabId].totalTime} ms`);
    //notifyPopup(tabTracker[previousTabId].domain, tabTracker[previousTabId].totalTime, false);
  }  
}


function startTimer(tabId, domain) {
  if (!tabTracker[tabId]) {  // if it is a new one
    tabTracker[tabId] = {
      domain: domain,
      totalTime: 0,
      lastStartTime: Date.now(),
      warned : false,
      snoozeMuliplier : 1,
      isTracking : true
    };
    //console.log('new one')
  } else {   // same tab id       
    if (tabTracker[tabId].domain !== domain) {    // domain change on refresh, reset timer
      tabTracker[tabId] = {
        domain: domain,
        totalTime: 0,
        lastStartTime: Date.now(),
        warned : false,
        snoozeMuliplier : 1,
        isTracking : true
      };
     // console.log('reset and create new one')
    } else {   
      //console.log('resume')                                   // resume previous one
      tabTracker[tabId] = {...tabTracker[tabId], lastStartTime : Date.now(), warned : false, isTracking : true }
    }
  }
  startCheckingInterval()
  previousTabId = tabId;
  //notifyPopup(domain, tabTracker[tabId].totalTime, true);
}

function addExclusionTab() {
  if (currentTabId) {
    clearInterval(intervalRef)
    clearAllNotifications()
    exclusionTabs.push(currentTabId)
    chrome.runtime.sendMessage({ action: 'tabExcluded', currentTabId });
    console.log(currentTabId, "has been added to exclusion list")
  }
  else{
    console.log('failed to find the tabid, please refresh the browser')
  }
}


chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId
  console.log(currentTabId)
  if (!isActive) return
  clearAllNotifications()
  
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    
    if (!tab || !tab.url || !isValidUrl(tab.url)) {  // dont start timer if invalid url and termiante early
      stopTimer();
      return;
    }

    const domain = getDomainFromUrl(tab.url);
    stopTimer();

    if (currentMode === "strict") {  // determine whether to track next with domain
      if (!strictModeDomains.includes(domain)) {
        console.log('not included')
        return
      }
    }

    startTimer(currentTabId, domain);
  });
});

function simulateTabActivation() {
  if (!isActive) return
  clearAllNotifications()
  
  chrome.tabs.get(currentTabId, (tab) => {
    
    if (!tab || !tab.url || !isValidUrl(tab.url)) {  // dont start timer if invalid url and termiante early
      stopTimer();
      return;
    }

    const domain = getDomainFromUrl(tab.url);
    stopTimer();
    if (currentMode === "strict") {  // determine whether to track next with domain
      if (!strictModeDomains.includes(domain)) {
        console.log('not included')
        return
      }
    }
    startTimer(currentTabId, domain);
  });
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isActive) return
  
    if (!changeInfo.url) return;  // terminate early if onUpdate listener is not becuase of url change

    if (!tab || !tab.url || !isValidUrl(tab.url)) return;  // invalid url check
  
    if (!tab.active || tabId !== currentTabId) return;  // termiante on background tab update
    clearAllNotifications()
  
    const domain = getDomainFromUrl(tab.url);
    if (domain !== tabTracker[currentTabId]?.domain ) {  // reset timer and start new one of the updated domain is not the same on the focus tab
      stopTimer();
      currentTabId = tabId // note really needed
      if (currentMode === "strict") {  // determine whether to track next with domain
        if (!strictModeDomains.includes(domain)) return
      }
      startTimer(currentTabId, domain);
   }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTime') {

    if (tabTracker[currentTabId]) {  
      if (tabTracker[currentTabId].lastStartTime) {
        const elapsed = Date.now() - tabTracker[currentTabId].lastStartTime;
        sendResponse({ status: 'success', data: tabTracker[currentTabId].totalTime + elapsed});
      }
      else{
        sendResponse({ status: 'success', data: tabTracker[currentTabId].totalTime});
      }
      
    }
    else {   // if user call this fucntion when isActive is false (have not evoke startTimer yet)
      sendResponse({ status: 'success', data: 0});
    }
    
  }
  else if (message.action === 'toggleActive') {
    isActive = !isActive

    if (isActive){
      simulateTabActivation()   // this will always clear noti and interval
    }
    else {
      clearAllNotifications()   // manually clear noti and interval for 
      stopTimer()
      clearInterval(intervalRef)
    }
    sendResponse({ status: 'success', data : isActive });
  }

  else if (message.action === 'addExclusion') {
    addExclusionTab()
    sendResponse({ status: 'success' });
  }

  else if (message.action === "setTrackingMode") {
    if (message.mode === currentMode) {
      return // does not distrub current flow when the mode is the same
    }
    else {
      clearInterval(intervalRef)
      currentMode = message.mode
      console.log(currentTabId)
      simulateTabActivation()  // initiate the current tab with newly selected mode
    }
  }

  else if (message.action === "currentState") {
    let isExcluded
    if (exclusionTabs.includes(currentTabId)) {
      isExcluded = true
    }
    else {
      isExcluded = false  
    }
    sendResponse({ status: 'success', currentState : isActive , mode : currentMode, isExcluded, timeLimit : WARNING_THRESHOLD_MS });
  }
});


  
  