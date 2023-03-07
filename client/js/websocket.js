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

    if (data['processes-ord']) {
        setOrdStatus(data['processes-ord'])
    }
}

socket.onopen = ()=>{
    socket.send(`token:${window.OrdServer.password}`);
    $('#status-websocket').removeClass('reconnecting').addClass('open')
}


window.socket = socket;