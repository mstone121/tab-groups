document.addEventListener('DOMContentLoaded', function () {
    var storage = chrome.storage.local;
    var bgPage = chrome.extension.getBackgroundPage();
    var windowMap = bgPage.windowMap;
    var currentWindowName = false;
    var currentWindowId = false;

    // Get window data
    chrome.windows.getCurrent(function(window) {        
        currentWindowId = parseInt(window.id);
        var output = currentWindowId;
        windowMap.forEach(function(value) {
            if (value.id == currentWindowId) {
                currentWindowName = value.name;
                output = currentWindowName;
                return;
            }
        });
        document.getElementById("current-window").innerText = output;
    });

    // Group Funcs    
    var openTabGroup = function(event) {
        var groupName = getGroupNameFromEvent(event);
        var opened = false;
        
        windowMap.forEach(function(value) {
            if (value.name == groupName) {
                // Window already open, switch
                chrome.windows.update(value.id, {focused: true});
                opened = true;
                return;
            }
        });

        if (!opened) {
            storage.get(function(tabGroupData) {
                var urls = tabGroupData[groupName].map(function(tab) {
                    return tab.url;
                }).sort(function(a, b) {
                    return a.index - b.index;
                });

                chrome.windows.create({
                    url: urls,
                    focused: true,
                }, function(newWindow) {
                    // Update properties of new window
                    const props = ["selected", "highlighted", "active", "pinned"];
                    newWindow.tabs.forEach(function(tab) {
                        tabGroupData[groupName].forEach(function(info) {
                            if (tab.url == info.url) {
                                var updateProps = {};
                                props.forEach(function(prop) {
                                    updateProps[prop] = info[prop];
                                });
                                updateProps.muted = info.mutedInfo.muted;
                                chrome.tabs.update(tab.id, updateProps);
                                return;
                            }
                        });
                    });
                    
                    // Refer from bg page to update ON bg page
                    bgPage.windowMap.push({
                        name: groupName,
                        id: newWindow.id
                    });
                    location.reload();
                });
            });
        }
    };

    var closeTabGroup = function(event) {
        var groupName = getGroupNameFromEvent(event);
        bgPage.windowMap = windowMap.filter(function(value) {
            if (value.name == groupName) {
                chrome.windows.remove(value.id);
                return false;
            }
            return true;
        });
        location.reload();
    };

    var deleteTabGroup = function(event) {

        // Reset message
        var groupName = getGroupNameFromEvent(event);
        var msg = document.getElementById("delete-msg");
        msg.innerText = groupName;

        document.getElementById("delete-group").style.display = "block";
    };

    var createTabGroup = function() {
        var groupName = document.getElementById("group-name").value.trim();
        var errorElement = document.getElementById("error");

        // Check for blank name
        if (groupName == '') {
            errorElement.innerText = "Name cannot be blank.";
            return;
        }

        // Check if window is already a tab group
        if(currentWindowName) {
            errorElement.innerText =
                "Window already a tab group ("
                + currentWindowName
                + ").";
            return;
        }
        
        chrome.tabs.getAllInWindow(function(tabs) {
            storage.get(function(tabGroupData) {
                
                // If no data, create blank object
                if (!tabGroupData) {
                    tabGroupData = {};
                }

                // Check for existing group
                if (Object.keys(tabGroupData).includes(groupName)) {
                    errorElement.innerText = "Group already exists";
                    return;
                }

                // Set new tab group
                tabGroupData[groupName] = tabs;
                storage.set(tabGroupData, function() {
                    // Attach prop to current window
                    bgPage.windowMap.push({
                        name: groupName,
                        id: currentWindowId
                    });
                        
                    // Reload to update tablep
                    location.reload();
                });
            });
        });
    };

    var getGroupNameFromEvent = function(event) {
        return event.currentTarget.closest("tr").getAttribute("tab-group-name");
    };

    // Event Listeners
    document.getElementById("delete-yes").addEventListener('click', function() {
        var groupName = document.getElementById("delete-msg").innerText.trim();
        storage.remove(groupName, function() {
            // Remove from window map
            bgPage.windowMap = windowMap.filter(function(value) {
                return (window.name != groupName);
            });
            location.reload();
        });
    });

    document.getElementById("delete-no").addEventListener('click', function() {
        location.reload();
    });

    document.getElementById("create-new").addEventListener('click', createTabGroup);

    
    // Get Tab Data from Storage
    storage.get(function(tabGroupData) {
        if (tabGroupData) {
            var table = document.getElementById("tab-groups");
            var groupNames = windowMap.map(function(value) {
                return value.name;
            });
            for(var groupName in tabGroupData) {
                var row = document.createElement("tr");
                row.setAttribute("tab-group-name", groupName);
                
                // Status
                var td_status = document.createElement("td");
                td_status.className = "current-window";
                var image = document.createElement("img");
                if (groupName == currentWindowName) {
                    image.setAttribute("src", "media/current.png");
                    image.setAttribute("alt", "Current");
                    td_status.appendChild(image);
                } else if (groupNames.includes(groupName)) {
                    image.setAttribute("src", "media/open.png");
                    image.setAttribute("alt", "Open");
                    td_status.appendChild(image);
                }
                row.appendChild(td_status);

                // Name
                var td_name = document.createElement("td");
                td_name.innerText = groupName;
                td_name.className = "group-name";
                row.appendChild(td_name);

                // Open Link
                var td_open = document.createElement("td");
                td_open.className = "buttons";
                var td_open_link = document.createElement("a");
                if (groupName != currentWindowName) {
                    td_open_link.innerText = "Open";
                    td_open.addEventListener('click', openTabGroup);
                }
                td_open.appendChild(td_open_link);
                row.appendChild(td_open);

                // Close Link
                var td_close = document.createElement("td");
                td_close.className = "buttons";
                var td_close_link = document.createElement("a");
                if (groupNames.includes(groupName)) {
                    td_close_link.innerText = "Close";
                    td_close.addEventListener('click', closeTabGroup);
                }
                td_close.appendChild(td_close_link);
                row.appendChild(td_close);

                // Delete Link
                var td_delete = document.createElement("td");
                td_delete.className = "buttons";
                var td_delete_link = document.createElement("a");
                td_delete_link.innerText = "Delete";
                td_delete.addEventListener('click', deleteTabGroup);
                td_delete.appendChild(td_delete_link);
                row.appendChild(td_delete);

                table.appendChild(row);
            }
        }
    });
});


