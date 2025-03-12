document.getElementById('sendMessageButton').addEventListener('click', () => {
    chrome.runtime.sendMessage(
      { action: 'active', message: 'The button was clicked!' },
      (response) => {
        if (response) {
          console.log('Response from background:', response.data);
        } else {
          console.log('No response received or background error');
        }
      }
    );
  });