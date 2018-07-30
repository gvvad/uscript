function script() {
    const LS_SCRIPT = "_uscript";
    let inFocus = true;
    let isNeedReload = false;

    let windowRefresh = function() {
        if (inFocus && isNeedReload) {
            window.location.reload();
        }
    };

    window.onfocus = function () {
        inFocus = true;
        windowRefresh();
    };
    window.onblur = function () {
        inFocus = false;
    };

    try {
        eval(localStorage[LS_SCRIPT] || "");
    } catch (e) {
        console.debug(`User Script execute: ${e}`);
    }

    let ws = new WebSocket("ws://localhost:8080");
    ws.onmessage = function(event) {
        let data = JSON.parse(event.data);
        localStorage[LS_SCRIPT] = data.script;
        isNeedReload = data.autoreload;
        windowRefresh();
    };
    ws.onerror = function(event) {
        console.debug(`User Script develop: ${event}`);
    };
}

let obj = {
    get devScriptStr() {
        return "(" + script.toString() + ")();";
    }
};
module.exports = obj.devScriptStr;
