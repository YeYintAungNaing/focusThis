# TabWatch 

A productivity-focused Chrome extension to track and manage time spent on each website you are browsing daily.

## 🚀 Features

- ⏱️ Track active tab browsing time
- 🔔 Custom warning notifications after time threshold
- 🔒 Strict Mode: Only track specified websites
- 🔁 Snooze mechanism to get alerts at different interval
- 🧠 Background script logic with local storage support
- ⚙️ Easy-to-use settings/configuration page


## ⚙️ Setup Instructions

1. Clone the repo or download the source code.
2. Navigate to `chrome://extensions/` in your browser.
3. Enable **Developer Mode**.
4. Click **"Load unpacked"** and select the project directory.
5. You should now see the extension in your extension list.


## How exactly this extension works

- Turn off by default in initial state
- In normal mode, the extension starts tracking time on currently active tab
- Music playlist tabs which are automatically playing in the other background tabs will not be tracked
- Previous tab tracker will be paused automatically when the user switch/navigate to the other tab. Then, a new tracker related to that tab will be started
- Domains are specific to each browser Tab id and total time spent will not be accumulated. For instance, if you are using youtube on two different tabs, the time spent will not be shared and different for each tab.
- Strict Mode: Only track specified websites. You can manually add your desired domains in setting.
- Does not track invalid url, such as browser setting page, history, download page ect...
- User will get alerted if the time spent passes the threshold limit (Default limit is 4 mins), which can also be changed in the setting.
- Snoozing the alert will make it appear again in another interval. (4 mis -> 8 mis -> 12 mins ect....)
- Excluding the tab will remove all the upcoming alerts for that tab. 
- Time limit threshold and strict  domain list are saved inside localstorage for long time persistence.
- All the other tracking data are volatile and will be lost if the broswer is closed, the extension get reloaded or goes inactive


## Required permissions
```
"permissions": [
      "tabs",
      "notifications",
      "storage",
      "alarms"
]
```

## Challenges and lessions learned

- Coming soon



