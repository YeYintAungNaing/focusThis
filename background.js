
//let currentTabId = null
// let tabTimers = {}
// let customTrackList = {}
// let exceptionTabIds = []
// let currentTabId = null;
// let currentDomain = null;
// let startTime = null;

let previousTabId = null
let currentTabId = null;
const tabTracker = {};
let WARNING_THRESHOLD_MS = 2000
let intervalRef
let notificationIds = []
let isActive = false


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


// function notifyPopup(domain, totalTime, isRunning) {
//   chrome.runtime.sendMessage({
//     type: 'TIMER_UPDATE',
//     domain,
//     totalTime,
//     isRunning
//   });
// }


function startCheckingInterval() {
  console.log('interval starts')
  intervalRef = setInterval(() => { 
    if (notificationIds.length > 0) return
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
  }, 3000);
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
      { title: 'Dismiss' },
      { title: 'Snooze' }
  ],
  }, (notificationId) => {notificationIds.push(notificationId)}
);
}

function checkActiveNoti() {
   chrome.notifications.getAll((notifications) => {
    if (Object.keys(notifications).length > 0) {
      console.log('active')
      return true
    } else {
      console.log('not active')
      return false
    }
  });
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
    console.log('User clicked Dismiss');
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
  if (tabTracker[previousTabId]) {
    clearInterval(intervalRef)
    //console.log('stop')
    const elapsed = Date.now() - tabTracker[previousTabId].lastStartTime;
    tabTracker[previousTabId].totalTime += elapsed;
    tabTracker[previousTabId].lastStartTime = null
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
      snoozeMuliplier : 1
    };
    //console.log('new one')
  } else {          // same tab id
    if (tabTracker[tabId].domain !== domain) {    // domain change on refresh, reset timer
      tabTracker[tabId] = {
        domain: domain,
        totalTime: 0,
        lastStartTime: Date.now(),
        warned : false,
        snoozeMuliplier : 1
      };
     // console.log('reset and create new one')
    } else {   
      //console.log('resume')                                   // resume previous one
      tabTracker[tabId] = {...tabTracker[tabId], lastStartTime : Date.now(), warned : false }
    }
  }
  startCheckingInterval()
  previousTabId = tabId;
  //notifyPopup(domain, tabTracker[tabId].totalTime, true);
}


chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!isActive) return
  clearAllNotifications()
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    currentTabId = activeInfo.tabId
    
    if (!tab || !tab.url || !isValidUrl(tab.url)) {
      //console.log('this1')
      stopTimer();
      return;
    }

    const domain = getDomainFromUrl(tab.url);
    stopTimer();
    startTimer(currentTabId, domain);
  });
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isActive) return
   if (!changeInfo.url) return;  // terminate early if onUpdate listener is not becuase of url change

   if (!tab || !tab.url || !isValidUrl(tab.url)) return;  // invalid url check
 
   if (!tab.active || tabId !== currentTabId) return;  // termiante on background tab update
   clearAllNotifications()
 
   const domain = getDomainFromUrl(tab.url);
   if (domain !== tabTracker[currentTabId]?.domain ) {  // reset timer and start new one of the updated domain is not the same on the focus tab
    console.log('wtf')
     stopTimer();
     currentTabId = tabId // note really needed
     startTimer(currentTabId, domain);
   }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTime') {
    //console.log('Message received in background:', message.message);
    const elapsed = Date.now() - tabTracker[currentTabId].lastStartTime;
    //tabTracker[currentTabId].totalTime += elapsed;
    console.log(tabTracker[currentTabId].totalTime + elapsed)
    console.log(tabTracker)
    sendResponse({ status: 'success', data: `total time : ${tabTracker[currentTabId].totalTime} ` });
  }
  if (message.action === 'active') {
    isActive = true
    sendResponse({ status: 'success' });
  }
});

// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   if (msg.type === 'GET_TIMER_STATE') {
//     const tracker = tabTracker[currentTabId];
//     if (tracker) {
//       sendResponse({
//         domain: tracker.domain,
//         totalTime: tracker.totalTime,
//         isRunning: tracker.lastStartTime !== null
//       });
//     } else {
//       sendResponse({ domain: null, totalTime: 0, isRunning: false });
//     }
//   }
//   if (msg.type === 'SYNC_TOTAL_TIME') {
//     const tracker = tabTracker[currentTabId];
//     if (tracker) {
//       tracker.totalTime = msg.totalTime;
//     }
//   }
// });

  
  