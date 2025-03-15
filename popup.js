let isOn;
let currentMode;
let stopWatchRef
let currentUrl
let strictModeDomains = ["www.youtube.com"]
let timeLimit
const totalTime = document.getElementById('totalTime')


document.addEventListener('DOMContentLoaded', () => {
  // Ask background for isActive
  chrome.runtime.sendMessage({ action: 'currentState' }, (response) => {
    if (response) {
      isOn = response.currentState
      const statusText = document.getElementById('statusText');
      statusText.textContent = isOn ? 'Focus Mode: ON' : 'Focus Mode: OFF';
      updateModeSelectorState(isOn);
      currentMode = response.mode
      document.getElementById(currentMode).checked = true
      if (response.isExcluded) {
        document.getElementById('message').textContent = "Excluded tab: You won't get alerted!"
        document.getElementById('addExclusion').disabled = true
      }
      else {
        if (isNaN(response.timeLimit)) {
          document.getElementById('message').textContent = `Failed to get time data , please close the popup to refresh`
        }
        else{
          timeLimit = response.timeLimit / 60000
          document.getElementById('message').textContent = `Current time limit: ${timeLimit} minutes`
        }
      }

      clearInterval(stopWatchRef)
      chrome.runtime.sendMessage(
          { action: 'getTime' },
          (response) => {
            if (response) {
            //console.log('Response from background:', response.data);
            let lapsedTime = response.data + 300
            totalTime.textContent = formatTime(lapsedTime)
            showStopWatch(lapsedTime)
        
          } else {
                console.log('No response received or background error');
          }
        }
      );
    } 
    else {
      console.log('Could not get isActive state');
    }
  });
}); 

document.getElementById('toggleActive').addEventListener('click', () => {
    chrome.runtime.sendMessage(
      { action: 'toggleActive' },
      (response) => {
        if (response) {
          isOn = response.data
          clearInterval(stopWatchRef)
          chrome.runtime.sendMessage(
            { action: 'getTime' },
            (response) => {
              if (response) {
                //console.log('Response from background:', response.data);
                let lapsedTime = response.data + 300
                totalTime.textContent = formatTime(lapsedTime)
                showStopWatch(lapsedTime)
        
              } else {
                console.log('No response received or background error');
              }
            }
          );
          const statusText = document.getElementById('statusText');
          statusText.textContent = isOn ? 'Focus Mode: ON' : 'Focus Mode: OFF';
          updateModeSelectorState(isOn)
          //button.textContent = isOn ? "On" : "Off"
        } else {
          console.log('No response received or background error');
        }
      }
    );
});



// document.getElementById('getTime').addEventListener('click', () => {
//   clearInterval(stopWatchRef)
//   chrome.runtime.sendMessage(
//     { action: 'getTime' },
//     (response) => {
//       if (response) {
//         //console.log('Response from background:', response.data);
//         let lapsedTime = response.data + 700
//         totalTime.textContent = formatTime(lapsedTime)
//         showStopWatch(lapsedTime)

//       } else {
//         console.log('No response received or background error');
//       }
//     }
//   );
// });

document.getElementById('addExclusion').addEventListener('click', () => {
  chrome.runtime.sendMessage(
    { action: 'addExclusion' },
    (response) => {
      if (response) {
        document.getElementById('message').textContent = "Excluded tab: You won't get alerted!"
      } else {
        console.log('No response received or background error');
      }
    }
  );
});

document.getElementById('mode-selector').addEventListener('change', (e) => {
  if (e.target.name === 'mode') {
    currentMode = e.target.value;
    chrome.runtime.sendMessage({ action: 'setTrackingMode', mode: currentMode });
    clearInterval(stopWatchRef)
    chrome.runtime.sendMessage(
      { action: 'getTime' },
      (response) => {
        if (response) {
          //console.log('Response from background:', response.data);
          let lapsedTime = response.data + 300
          totalTime.textContent = formatTime(lapsedTime)
          showStopWatch(lapsedTime)
  
        } else {
          console.log('No response received or background error');
        }
      }
    );
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'tabExcluded') {
    document.getElementById('message').textContent = "Excluded tab: You won't get alerted!";
    document.getElementById('addExclusion').disabled = true
  }
});

function updateModeSelectorState(isActive) {
  const radios = document.querySelectorAll('#mode-selector input[type="radio"]');
  radios.forEach(radio => {
    radio.disabled = !isActive;
  });
}


document.getElementById("openSetting").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('less-btn').addEventListener('click', () => {
  document.getElementById('hideContent').style.display = "none"
  document.getElementById('more-btn').style.display = "inline-block"
  document.getElementById('statusText').style.display = "none"
} )

document.getElementById('more-btn').addEventListener('click', () => {
  document.getElementById('hideContent').style.display = "flex"
  document.getElementById('more-btn').style.display = "none"
  document.getElementById('statusText').style.display = ""

} )


function getCurrentUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]?.url);
    });
  });
}

function isValidUrl_(url) {
  console.log(url)
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol;
    const hostname = parsed.hostname;
    console.log(hostname)
    console.log(protocol)

    const invalidProtocols = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'moz-extension:', 'view-source:', 'devtools:'];

    if (invalidProtocols.includes(protocol)) return false;

    
    const invalidHostnames = ['newtab', 'extensions', '', 'localhost'];
    if (invalidHostnames.includes(hostname)) return false;

    return true;
  } catch (e) {
    return false;
  }
}


function getDomainFromUrl_(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

 async function showStopWatch(lapsedTime) {
  if (!isOn) return
  currentUrl = await getCurrentUrl()

  if (!isValidUrl_(currentUrl)) {
    console.log('not valid')
    return
  }
  if (currentMode === "strict") {
    const currentDomainName = getDomainFromUrl_(currentUrl)
    if (!strictModeDomains.includes(currentDomainName)) {
      console.log('not included')
      return
    }
  }
 
  stopWatchRef = setInterval(() => {
    lapsedTime += 1000
    totalTime.textContent= formatTime(lapsedTime)
  }, 1000);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}