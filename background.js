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
                    tabGroupData[value.name] = closed.window.tabs;
                    storage.set(tabGroupData, function() {
                        if (chrome.runtime.lastError) {
                            console.log(chrome.runtime.lastError.message);
                        }
                    });
                });
            });
            return false;
        }
        return true;
    });
});

var saveTabsInWindow = function(id) {
    window.windowMap.forEach(function(value) {
        if (value.id == id) {            
            chrome.tabs.getAllInWindow(value.id, function(tabs) {
                var data = {};
                data[value.name] = tabs;
                storage.set(data, function() {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError.message);
                    }
                });
            });
        }
    });
};

// Tab event listeners 
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//     saveTabsInWindow(tab.windowId);
// });

chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
    saveTabsInWindow(moveInfo.windowId);
});

// chrome.tabs.onActivated.addListener(function(activeInfo) {
//     saveTabsInWindow(activeInfo.windowId);
// });

chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
    saveTabsInWindow(detachInfo.windowId);
});

chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
    saveTabsInWindow(attachInfo.windowId);
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    if (!removeInfo.isWindowClosing) {
        saveTabsInWindow(removeInfo.windowId);
    }
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
