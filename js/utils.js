var global =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof self !== 'undefined' && self) ||
    (typeof global !== 'undefined' && global) || {}

const scrapeThePage = () => {
    // Keep this function isolated - it can only call methods you set up in content scripts
    var htmlCode = document.documentElement.outerHTML;
    return htmlCode;
}

// get chatwork token
const getCWToken = (scraped) => {
    var token = null;
    let m;
    const regex = /var ACCESS_TOKEN {1,}= {1,}'([a-zA-Z0-9]+)';/gm;
    while ((m = regex.exec(scraped.result)) !== null) {
        token = m[1];
    }

    return token;
}

// get chatwork my id
const getCWMyID = (scraped) => {
    var myid = null;
    let m;
    const regex = /var MYID {1,}= {1,}'([a-zA-Z0-9]+)';/gm;
    while ((m = regex.exec(scraped.result)) !== null) {
        myid = m[1];
    }

    return myid;
}

const copyHandler = (content, onCopiedDone, onCoppiedFailed) => {
    clipboard.writeText(content).then(onCopiedDone, onCoppiedFailed);
}

const requestParams = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
});

const renderRoomsList = (rooms) => {
    const wrapperRooms = $('#wrapper-rooms');

    if (rooms.length > 0) {
        wrapperRooms.html('');

        $(rooms).each(function (_, v) {
            var r = v[1];
            var roomId = v[0];
            var roomName = cw.getRoomNameById(roomId);

            var room = `
            <div class="position-relative">
                <div aria-status="${roomId}" class="position-absolute top-0 end-0 mt-1 me-3 zindex-2">
                    <button id="btn-loading" class="btn btn-primary d-none" type="button" disabled>
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span class="visually-hidden">Loading...</span>
                    </button>

                    <button id="btn-copy" aria-room-id="${roomId}" class="btn btn-success pt-0 d-none" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                        </svg>
                    </button>

                    <a id="btn-download" aria-room-id="${roomId}" class="btn btn-warning pt-0 d-none" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                        </svg>
                    </a>
                </div>
                <label aria-room-id="${roomId}" class="list-group-item d-flex gap-3">
                    <input name="chk-room-id[]" class="form-check-input flex-shrink-0" type="checkbox" value="${roomId}"
                        style="font-size: 1.375em;">
                    <span id="span-room-name" class="pt-1 form-checked-content col-9">
                        ${roomName}
                    </span>
                </label>
            </div>
            `;

            wrapperRooms.append(room);
        });
    }
}

const onRoomNameFiltered = (e) => {
    var keyword = ($(e.currentTarget).val()).toLowerCase();
    var state = $('#btn-backup').data('state');
    var elms = $('input[name^=chk-room-id]:checked');
    var filter = (_, v) => {
        var elm = $(v).closest('div').find('span[id="span-room-name"]');
        return ($.trim(elm.text())).toLowerCase().includes(keyword)
    }

    if (typeof state == 'undefined' || state == false) {
        elms = $('span[id="span-room-name"]');
        filter = (_, v) => {
            return ($.trim($(v).text())).toLowerCase().includes(keyword)
        }
    }

    elms.closest('div').addClass('d-none');
    elms.filter(filter).closest('div').removeClass('d-none');
}

const continueStateHandler = (e, roomIds) => {
    const roomIDElm = $('input[name^=chk-room-id]:checked');

    if (roomIds.length == 0) {
        $('#alert-danger').removeClass('d-none');
        $('#alert-danger').html('You must to choose one room.');

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    } else {
        $('#title-status').html('Confirm your room(s) before click on button backup now');
        $('#alert-danger').addClass('d-none');
        $('#alert-danger').html('');

        $('span[id="span-room-name"]')
            .closest('div').addClass('d-none');
        roomIDElm.closest('div').removeClass('d-none');

        $(e.currentTarget).data('state', true);
        $(e.currentTarget).addClass('btn-danger').removeClass('btn-outline-info')
        $(e.currentTarget).text('Backup Now')

        $('#btn-back').removeClass('d-none');
    }
}

const backupStateHandler = async (roomId) => {
    var wrapper = $('div[aria-status^=' + roomId + ']');
    var btnLoading = wrapper.find('#btn-loading').removeClass('d-none');
    var btnCopy = wrapper.find('#btn-copy').addClass('d-none');
    var btnDownload = wrapper.find('#btn-download').addClass('d-none');

    await cw.loadChat(roomId, (data) => {
        btnLoading.addClass('d-none');
        btnCopy.removeClass('d-none');
        btnDownload.removeClass('d-none');

        var roomName = cw.getRoomNameById(roomId);
        var content = `[Description]\r\n${data.description}\r\n\r\n`;

        content += data.messages.map((m, _) => {
            m = m[1];

            var owner = m.owner;
            var d = new Date(m.tm * 1000)

            return `[${d.toISOString()}][${m.id}]${(owner ? owner.nm : 'undefined')}\r\n${m.msg}\r\n`
        }).join("\r\n");

        var fileContent = window.URL.createObjectURL(new Blob([content], {
            type: 'octet/stream'
        }));

        var a = $('a[aria-room-id^=' + roomId + ']');
        a.attr('href', fileContent);
        a.attr('download', (roomName + '.txt'));
    });
}

const onContinueButtonClicked = (e) => {
    const roomIDElm = $('input[name^=chk-room-id]:checked');
    var state = $(e.currentTarget).data('state');
    var roomIds = roomIDElm.map((_, e) => $(e).val());

    if (typeof state == 'undefined' || state == false) {
        continueStateHandler(e, roomIds)
    } else {
        $(roomIds).each((_, roomId) => backupStateHandler(roomId));
    }
}

const onBackButtonClicked = (e) => {
    $('#title-status').html('Choose the room(s) then click on button continue');
    $('span[id="span-room-name"]')
        .closest('div').removeClass('d-none');

    $('#btn-backup').data('state', false);
    $('#btn-backup').addClass('btn-info').removeClass('btn-danger');
    $('#btn-backup').text('Continue');

    $(e.currentTarget).addClass('d-none');
}

const onCopyButtonClicked = (e) => {
    var roomId = $(e.currentTarget).attr('aria-room-id');
    var data = cw.getMessageByRoomId(roomId);
    var content = `[Description]\r\n${data.description}\r\n\r\n`;

    content += data.messages.map((m, _) => {
        m = m[1];

        var owner = m.owner;
        var d = new Date(m.tm * 1000)

        return `[${d.toISOString()}][${m.id}]${(owner ? owner.nm : 'undefined')}\r\n${m.msg}\r\n`
    }).join("\r\n");

    copyHandler(content, () => {
        $(e.currentTarget).html(`
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" fill="currentColor" class="bi bi-clipboard-check-fill" viewBox="0 0 16 16">
                    <path d="M6.5 0A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3Zm3 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3Z"/>
                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1A2.5 2.5 0 0 1 9.5 5h-3A2.5 2.5 0 0 1 4 2.5v-1Zm6.854 7.354-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708.708Z"/>
                </svg>
            `);

        setTimeout(async () => {
            $(e.currentTarget).html(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                    </svg>
                `);
        }, 2000);
    }, () => alert('Failure to copy. Check permissions for clipboard'))
}

global.scrapeThePage = scrapeThePage;
global.getCWToken = getCWToken;
global.getCWMyID = getCWMyID;
global.copyHandler = copyHandler;
global.requestParams = requestParams;
global.renderRoomsList = renderRoomsList;
global.onRoomNameFiltered = onRoomNameFiltered;
global.onContinueButtonClicked = onContinueButtonClicked;
global.onBackButtonClicked = onBackButtonClicked;
global.onCopyButtonClicked = onCopyButtonClicked;
