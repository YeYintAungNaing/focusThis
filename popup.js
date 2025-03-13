let isOn;
let currentMode;

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
    } else {
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


document.getElementById('getTime').addEventListener('click', () => {
  chrome.runtime.sendMessage(
    { action: 'getTime' },
    (response) => {
      if (response) {
        //console.log('Response from background:', response.data);
        const totalTime = document.getElementById('totalTime')
        const formatedTime = formatTime(response.data)
        totalTime.textContent = formatedTime

      } else {
        console.log('No response received or background error');
      }
    }
  );
});

document.getElementById('addExclusion').addEventListener('click', () => {
  chrome.runtime.sendMessage(
    { action: 'addExclusion' },
    (response) => {
      if (response) {
        console.log('Response from background');
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
  }
});

function updateModeSelectorState(isActive) {
  const radios = document.querySelectorAll('#mode-selector input[type="radio"]');
  radios.forEach(radio => {
    radio.disabled = !isActive;
  });
}


function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}