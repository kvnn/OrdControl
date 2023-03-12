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

    if (data['bitcoind_status']) {
        setBitcoindStatus(data['bitcoind_status'])
    }

    if (data['ord_index_service_status']) {
        setOrdIndexServiceStatus(data['ord_index_service_status'])
    }    

    if (data['ord_wallet']) {
        setOrdWalletInfo(data['ord_wallet'])
    }

    if (data['boto3_credentials_not_found']) {
        setEc2BotoCredsError();
    }

    if (data['journalctl_alerts']) {
        setJournalCtlAlerts(data['journalctl_alerts']);
    }
}

socket.onopen = ()=>{
    socket.send(`token:${window.OrdServer.password}`);
    $('#status-websocket').removeClass('reconnecting').addClass('open')
}


window.socket = socket;