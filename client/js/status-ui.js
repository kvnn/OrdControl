function getPsStatusHtml(data) {
    let statusHtml = '';

    if (data.length == 0) {
        statusHtml += '<div class="card"><code class="card-body row">';
        statusHtml += '<div class="col-sm-9">no processes found</div>';
        statusHtml += `
            <div class="col-sm-3 control">
                <a href="#" title="start" class="start material-symbols-outlined">
                    start
                </a>
            </div>`;
        statusHtml += '</div></div>';
    }

    data.forEach(row => {
        statusHtml += '<div class="card"><code class="card-body row">';
        statusHtml += '<div class="col-sm-9">'
        statusHtml += `<p class="black">${row['COMMAND']}</p>`;
        statusHtml += `<p>PID ${row['PID']} %MEM ${row['%MEM']} %CPU ${row['%CPU']} TIME ${row['TIME']}</p>`;

        getUnixStateCodeDetails(row['STAT']).forEach((stat) => {
            statusHtml += `<p>${stat}</p>`;
        })

        statusHtml += '</div>';
        statusHtml += `
            <div class="col-sm-3 control">
                <a href="#" data-pid="${row['PID']}" title="stop" class="stop material-symbols-outlined">
                    block
                </a>
                <a href="#" data-pid="${row['PID']}" title="restart" class="restart material-symbols-outlined">
                    restart_alt
                </a>
            </div>`;
        statusHtml += '</code></div>';
    });


    return statusHtml;
}

function setBitcoindStatus(data) {
    let statusHtml = getPsStatusHtml(data);

    $('#status-bitcoind').removeClass('restarting')

    $('#status-bitcoind .details').html(statusHtml);
}

function setOrdIndexServiceStatus(data) {
    // let statusHtml = getPsStatusHtml(data);
    let statusHtml = '<div class="card"><div class="card-body">';
    statusHtml += '<code>';
    statusHtml += data;
    statusHtml = statusHtml.replaceAll('\\n', '<br>');
    statusHtml += '</code>';
    statusHtml += '</div></div>';

    if (data.length == 0) {
        $('#ord-indexing-service-status').removeClass('started').addClass('stopped');
    } else {
        $('#ord-indexing-service-status').addClass('started').removeClass('stopped');
    }

    $('#ord-indexing-service-status .details').html(statusHtml);
}

function setOrdWalletInfo(data) {
    console.log('wallet', data);
}

function setEc2BotoCredsError() {
    let statusHtml = '<div class="card"><div class="card-body">';
    statusHtml += `  <p class="alert alert-danger">
                        <a href="https://boto3.amazonaws.com/v1/documentation/api/latest/index.html">boto3</a> could not get the ec2 instance's credentials.</p>
                    <p>This is an intermitent issue that I haven't found good solutions to. </p>
                    <p>It blocks the controller from saving status updates to the Dynamo database, which makes status more opaque.</p>
                    <p>It does not stop ord from indexing, or any of the basic functionality from working.</p>
                    <p>You can restart the server with the nearby button, which may solve this issue.</p>`;
    statusHtml +=  `<a href="#" title="restart server" class="pull-right restart material-symbols-outlined">
                        restart_alt
                    </a>`;
    statusHtml += '</div></div>';
    $('#system-wide-alerts .boto3').html(statusHtml);
}

function setJournalCtlAlerts(data) {
    let statusHtml = '<div class="card"><div class="card-body">';
    statusHtml += '<code>';
    statusHtml += data.replaceAll('\\n', '<br>');
    statusHtml += '</code>';
    statusHtml += '</div></div>';
    $('#system-wide-alerts .journalctl').html(statusHtml);
    return statusHtml
}

$(function(){
    $('#status-websocket').on('click', '.restart', evt=>{
        evt.preventDefault();
        window.socket.send('websocket restart');
    });

    $('#status-bitcoind').on('click', '.restart', evt=>{
        evt.preventDefault();
        window.socket.send('bitcoind restart');
        $('#status-bitcoind').addClass('restarting')
    });

    $('#ord-indexing-service-status').on('click', '.start', evt=>{
        evt.preventDefault();
        window.socket.send('ord index restart');
    });

    $('#ord-indexing-service-status stop').click(evt=>{
        evt.preventDefault();
        window.socket.send('ord stop');
    });

    $('#server').on('click', '.restart', evt=>{
        evt.preventDefault();
        window.socket.send('restart restart');
    });
})