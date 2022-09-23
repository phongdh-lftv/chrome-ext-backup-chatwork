document.addEventListener('DOMContentLoaded', () => {
    const btnAnalyze = document.querySelector('#btn-analyze');
    btnAnalyze.addEventListener('click', async () => {
        // Get the active tab
        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        const tab = tabs[0];

        if (/https:\/\/(www.)?chatwork.com\/.*/is.test(tab.url) == false) {
            $('#alert-danger').removeClass('d-none');
            $('#alert-danger').html('You must to move to chatwork tab.');
            return;
        } else {
            $('#alert-danger').addClass('d-none');
            $('#alert-danger').html('');
        }
        // Run the script in the context of the tab
        const scraped = await chrome.scripting.executeScript({
            target: {
                tabId: tab.id
            },
            func: scrapeThePage,
        });

        // get cwToken
        var token = getCWToken(scraped[0]);
        var myid = getCWMyID(scraped[0]);

        if (token == null && myid == null) {
            $('#alert-danger').removeClass('d-none');
            $('#alert-danger').html('You must to login first.');
        } else {
            var optionsUrl = chrome.runtime.getURL(`analyze.html?id=${myid}&t=${token}`);

            chrome.tabs.query({
                url: optionsUrl
            }, function (tabs) {
                if (tabs.length) {
                    chrome.tabs.update(tabs[0].id, {
                        active: true
                    });
                } else {
                    chrome.tabs.create({
                        url: optionsUrl
                    });
                }
            });
        }
    });
}, false);