var global =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof self !== 'undefined' && self) ||
    (typeof global !== 'undefined' && global) || {}

class Chatwork {
    constructor(token, myId) {
        this.baseUrl = `https://www.chatwork.com/gateway/`;
        this.endpoints = {
            'initLoad': `init_load.php?_v=1.80a&_av=5&ln=en&rid=0&with_unconnected_in_organization=1`,
            'loadChat': `load_chat.php?v=1.80a&_av=5&ln=en&desc=1`,
            'loadOldChat': `load_old_chat.php?v=1.80a&_av=5&ln=en&desc=1`,
        };
        this.token = token || null;
        this.myId = myId || null;
        this.rooms = null;
        this.contacts = null;
        this.messages = {};
    }
    setToken(token) {
        return this.token = token;
    }
    setMyID(myId) {
        return this.myId = myId;
    }
    getRooms() {
        return this.rooms;
    }
    getContacts() {
        return this.contacts;
    }
    getContactById(id) {
        return this.contacts.filter((c, _) => c[0] == id);
    }
    getMessageByRoomId(roomId) {
        if (!this.messages.hasOwnProperty(roomId)) {
            return [];
        }

        return this.messages[roomId];
    }
    async initLoad() {
        var res = await this.callAPI(this.endpoints.initLoad);

        this.rooms = $.grep(Object.entries(res.result.room_dat), function (n, _) {
            return n[1].hasOwnProperty('n');
        });

        this.contacts = Object.entries(res.result.contact_dat);
    }
    async loadChat(roomId, callback, firstChatID, messages) {
        messages = messages || {};
        firstChatID = firstChatID || 0;

        var chatKeyId = 'first_chat_id';
        var endpoint = this.endpoints.loadOldChat;

        if (firstChatID == 0) {
            this.messages[roomId] = {
                'messages': null,
                'description': null,
            };

            chatKeyId = 'last_chat_id';
            endpoint = this.endpoints.loadChat;
        }

        var res = await this.callAPI(`${endpoint}&room_id=${roomId}&${chatKeyId}=${firstChatID}`);

        var chatList = res.result.chat_list;
        if (chatList.length == 0) {
            messages = Object.entries(messages)
            messages.sort((a, b) => a[0] - b[0]);

            this.messages[roomId]['messages'] = messages;
            callback(messages);
            return;
        }

        var chatMessages = chatList.filter(item => item.msg != null);
        chatMessages.forEach(item => {
            var owner = this.getContactById(item.aid);
            item.owner = owner.length > 0 ? owner[0][1] : null;
            messages[item.id] = item;
        });

        if (res.result.hasOwnProperty('description')) {
            this.messages[roomId]['description'] = res.result.description;
        }

        var lastMsg = (chatList[chatList.length - 1]);
        setTimeout(async () => {
            return await this.loadChat(roomId, callback, lastMsg.id, messages);
        }, 100);
    }
    async callAPI(endpoint) {
        var formData = new FormData();
        formData.append("pdata", '{"load_file_version":"2", "_t":"' + this.token + '"}');

        return fetch(`https://www.chatwork.com/gateway/${endpoint}&myId=${this.myId}`, {
            method: 'POST',
            body: formData
        }).then(function (response) {
            return response.json();
        });
    }
}

if (!global.Chatwork) {
    global.Chatwork = Chatwork
}
