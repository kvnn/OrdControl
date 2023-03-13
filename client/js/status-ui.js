function getPsStatusHtml(data) {
    let statusHtml = '';

    data.forEach(row => {
        statusHtml += '<code class="card-body row">';
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
        statusHtml += '</code>';
    });


    return statusHtml;
}

function setBitcoindStatus(data) {
    let statusHtml = '';

    if (data.length == 0) {
        statusHtml = '<p>process not found</p>';
        statusHtml += `
            <div class="col-sm-3 control">
                <a href="#" title="start" class="start material-symbols-outlined">
                    start
                </a>
            </div>`;
    } else {    
        statusHtml = getPsStatusHtml(data);
    }

    $('#bitcoind-status-content').html(statusHtml);
    $('#bitcoind-status').removeClass('waiting');
}

function setOrdIndexServiceStatus(data) {
    // let statusHtml = getPsStatusHtml(data);
    let statusHtml = '<code>';
    statusHtml += data;
    statusHtml = statusHtml.replaceAll('\\n', '<br>');
    statusHtml += '</code>';

    $('#ord-indexing-service-status-content').html(statusHtml);
    $('#ord-indexing-service-status').removeClass('waiting');
}

function printOrdInscriptions(content) {
    content =   `<code class="black">
                    <strong>inscriptions:</strong>
                    <p>${content}</p>
                </code>`;
    $('#ord-inscriptions').html(content);
}

function setOrdWalletInfo(data) {
    console.log('wallet', data);

    let walletHtml;
    if (data.file && data.file.length) {
        walletHtml = data['file'].split(' ').slice(5).join(' ')
        walletHtml = `<strong>file: &nbsp;</strong>${walletHtml}`;
        walletHtml +=   `<a href="#" class="delete-wallet" class="icon-btn">
                            <span class="material-symbols-outlined">
                            delete
                            </span>
                        </a>`;
        
    } else {
        walletHtml = 'no wallet data'
    }
    $('#ord-wallet-file').html(walletHtml);
    $('#ord-wallet').removeClass('waiting');

    if ('inscriptions' in data)
        printOrdInscriptions(data['inscriptions'].replaceAll('\\n', '<br>'));

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
    $('#boto3-alerts-content').html(statusHtml);
    $('#system-alerts').removeClass('waiting');
}

function setJournalCtlAlerts(data) {
    statusHtml = '<code>';
    statusHtml += data.replaceAll('\\n', '<br>');
    statusHtml += '</code>';
    $('#journalctl-content').html(statusHtml);
    $('#system-alerts').removeClass('waiting');
    return statusHtml
}

function setControlLog(data) {
    console.log('data', data);
    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">DateAdded</th>
                    <th scope="col">Name</th>
                    <th scope="col">Details</th>
                </tr>
            </thead>
            <tbody>`;
    data.forEach(row =>{
        html += `<tr>
                    <td>${row.DateAdded.S}</td>
                    <td>${row.Name.S}</td>
                    <td>${row.Details.S}</td>
                 </tr>`;
    })
    html += '</tbody></table>';
    $('#control-log-content').html(html);
    $('#control-log').removeClass('waiting');
}

$(function(){
    $('#status-websocket').on('click', '.restart', evt=>{
        evt.preventDefault();
        window.socket.send('websocket restart');
    });

    $('#bitcoind-status').on('click', '.restart', evt=>{
        evt.preventDefault();
        window.socket.send('bitcoind restart');
        $('#bitcoind-status').addClass('restarting')
    });

    // $('#ord-indexing-service-status').on('click', '.start', evt=>{
    //     evt.preventDefault();
    //     window.socket.send('ord index restart');
    // });

    // $('#ord-indexing-service-status stop').click(evt=>{
    //     evt.preventDefault();
    //     window.socket.send('ord stop');
    // });

    $('#server').on('click', '.restart', evt=>{
        evt.preventDefault();
        window.socket.send('restart restart');
    });

    $('#ord-wallet-new').click(evt => {
        evt.preventDefault();
        window.socket.send('ord wallet create');
    });

    $('#ord-wallet').on('click', '.delete-wallet', evt => {
        evt.preventDefault();
        window.socket.send('ord wallet delete');
    });
})