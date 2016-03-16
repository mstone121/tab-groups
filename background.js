var storage = chrome.storage.local;
window.windowMap = [];


chrome.windows.onRemoved.addListener(function(id) {
    window.windowMap = window.windowMap.filter(function(value) {
        if (value.id == id) {
            storage.get(function(tabGroupData) {
                // Get window data from most recently closed window
                chrome.sessions.getRecentlyClosed(function(data) {
                    var closed = data.filter(function(value) {
                        return value.hasOwnProperty('window');
                    })[0];
                    console.log(closed);
                    tabGroupData[value.name] = closed.window.tabs;
                    storage.set(tabGroupData)
                });
            });
            return false;
        }
        return true;
    });
});

var initExtension = function() {
    chrome.windows.getAll({populate: true}, function(windows) {
        windows.forEach(function(value) {
            storage.get(function(tabGroupData) {
                for (var groupName in tabGroupData) {
                    var local_urls = tabGroupData[groupName].map(function(tab) {
                        return tab.url;
                    }).sort();

                    var window_urls = value.tabs.map(function(tab) {
                        return tab.url;
                    }).sort();

                    // Check for same group of urls, if so then assign window id to group name
                    if (local_urls.length == window_urls.length) {
                        var equal = true;
                        for (var i = 0; i < local_urls.length; i++) {
                            if (local_urls[i] !== window_urls[i]) {
                                equal = false;
                                break;
                            }
                        }

                        if (equal) {
                            window.windowMap.push({
                                name: groupName,
                                id: value.id
                            });
                            return;
                        }
                    }
                }
            });
        });
    });
};

initExtension();
