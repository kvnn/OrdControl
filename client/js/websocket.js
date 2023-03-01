console.log('window.OrdServer.wsurl', window.OrdServer.wsurl);

console.log('window.OrdServer.password', window.OrdServer.password);

const url = `ws://${window.OrdServer.wsurl}:8765`;

socket = new ReconnectingWebSocket(url);

socket.debug = true

socket.onclose = ()=>{
    $('#status-websocket').removeClass('open').addClass('reconnecting')
}

socket.onmessage = (msg)=>{
    console.log('msg', msg);
    let data = {};

    try {
        data = msg.data && JSON.parse(msg.data);
    } catch(err) {
        console.log('cannot parse websocket data', err);
    }

    if (data['status-bitcoind']) {
        setBitcoindStatus(data['status-bitcoind'])
    }

    if (data['status-ord']) {
        setOrdStatus(data['status-ord'])
    }
}

socket.onopen = ()=>{
    $('#status-websocket').removeClass('reconnecting').addClass('open')
}


window.socket = socket;