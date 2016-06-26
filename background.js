var storage = chrome.storage.local;
window.windowMap = [];

chrome.windows.onRemoved.addListener(function(id) {
    window.windowMap = window.windowMap.filter(function(value) {
        if (value.id == id) {
            storage.get(function(tabGroupData) {
                // Get window data from most recently closed window
                chrome.sessions.getRecentlyClosed(function(data) {
                    var closed = tabGroupData.filter(function(value) {
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


// All this function really does is map id's to group names
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
                    var equal = 0.0;
                    for (var i = 0; i < local_urls.length; i++) {
                        if (local_urls[i] == window_urls[i]) {
                            equal++;
                        }
                    }
                    if ((equal / local_urls.length) > .7) {
                        window.windowMap.push({
                            name: groupName,
                            id: value.id
                        });
                        return;
                    }
                }
            });
        });
    });
    // Add Context Menu Items
    window.addContextMenuItems();
};

window.addContextMenuItems = function() {
    chrome.contextMenus.removeAll();
    storage.get(function(tabGroupData) {
        for (var groupName in tabGroupData) {
            chrome.contextMenus.create({
                id: groupName,
                title: "Add to group " + groupName,
                contexts: ["page", "frame", "link"],
                onclick: function(info, tab) {
                    if (info.linkUrl != null)
                        addToTabGroup(info.menuItemId, info.linkUrl);
                    else
                        addToTabGroup(info.menuItemId, tab);
                }
            });
        }
    });
};

function addToTabGroup(groupName, tab) {
    storage.get(function(tabGroupData) {
        var match = window.windowMap.filter(function(window) {
            return window.name == groupName;
        });
        var windowOpen = (match && match[0]);
            
        chrome.tabs.create({
            url: (typeof(tab) == "string") ? tab : tab.url,
            windowId: (windowOpen) ? match[0].id : null,
            active: false,
            selected: false
        }, function(newTab) {
            tabGroupData[groupName].push(newTab);
            if (!windowOpen) {
                chrome.tabs.remove(newTab.id);
            }
            storage.set(tabGroupData, function() {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                }
            });
        });
    });
}

// Refresh map when new window opens
chrome.windows.onCreated.addListener(function(window) {
    initExtension();
});

initExtension();
