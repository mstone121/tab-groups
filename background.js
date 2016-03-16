var storage = chrome.storage.local;
window.windowMap = [];

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
}

initExtension();
