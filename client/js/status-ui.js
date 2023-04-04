const MS_PER_MINUTE = 60000;

window.TX_FEES = null;
window.TX_FEES_UPDATED = null;
window.SAT_PRICE = null;
window.SAT_PRICE_UPDATED = null;


async function setFeeOptions() {
    if (
        !window.TX_FEES_UPDATED ||
        window.TX_FEES_UPDATED < new Date() - MS_PER_MINUTE
    ) {
        let data = await $.get('https://mempool.space/api/v1/fees/recommended');
        window.TX_FEES = data;
        window.TX_FEES_UPDATED = new Date();

        let feeHtml = '';
        let i = 0;
        $.each(window.TX_FEES, (key, val) =>{
            let attr = '';
            if (i==3) {
                attr = 'selected';
            }
            feeHtml += `<option ${attr} value="${val}">${key}: ${val} sat/vByte</option>`;
            i++;
        });

        $('#feeRate').html(feeHtml);
    }
}


async function setBtcPrice() {
    if (
        !window.SAT_PRICE_UPDATED ||
        window.SAT_PRICE_UPDATED < new Date() - MS_PER_MINUTE
    ) {
        // set price
        let data = await $.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        window.SAT_PRICE = parseFloat(data.bitcoin.usd) / (100 * 1000 * 1000);
        window.SAT_PRICE_UPDATED = new Date();
    }
}

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

    if (data.indexOf('Deactivated successfully') > -1) {
        $('#ord-indexing-service-status').addClass('finished');
    } else {
        $('#ord-indexing-service-status').removeClass('finished');
    }

    $('#ord-indexing-service-status-content').html(statusHtml);
    $('#ord-indexing-service-status').removeClass('waiting');
}

function printOrdInscriptions(content) {
    content =   `<code class="black">
                    <strong>inscribed:</strong>
                    <p>${content}</p>
                </code>`;
    $('#ord-inscribed-content').html(content);
    $('#ord-inscribed').removeClass('waiting');
}

function printOrdOutputs(content) {
    content =   `<code class="black">
                    <strong>outputs:</strong>
                    <p>${content}</p>
                </code>`;
    $('#ord-outputs-content').html(content);
    $('#ord-outputs').removeClass('waiting');
}

function printInscriptionQueue(content) {
    content = JSON.parse(content);
    let markup =    `<table class="table table-striped">
                        <thead>
                            <th scope="col">name</th>
                            <th scope="col">size</th>
                            <th scope="col">
                                cost estimate
                            </th>
                            <th scope="col"></th>
                        </thead>
                        <tbody>`;

    $.each(content, (idx, itm) => {
        let fees = window.SAT_PRICE && window.TX_FEES && Object.values(window.TX_FEES);
        let costs;

        costs = fees && fees.map(fee => {
            return (SAT_PRICE * (itm.bytes * fee / 4)).toFixed(2);
        })

        markup +=   `<tr>
                        <td>${itm.filename}</td>
                        <td>${itm.bytes/1000} kb</td>
                        <td>`;
        if (costs) {
            markup += `$${Math.min(...costs)} - $${Math.max(...costs)}`;
        } else {
            markup += 'working...';
        }
                        
        markup +=      `</td>
                        <td>
                            <a href="#" class="inscribe-btn"
                            data-filename="${itm.filename}" data-bytes="${itm.bytes}"
                            data-bs-toggle="modal" data-bs-target="#inscribe-modal">
                                inscribe
                            </a>
                        </td>
                    </tr>`;
        ;
    });

    $('#inscription-queue').removeClass('waiting');
    $('#inscription-queue-content').html(markup);
}

function printAddresses(data) {
    data = JSON.parse(data);
    let html = `<strong>addresses:</strong>
                <ul>`
    data.forEach(addressObj => {
        html += `<li class="${addressObj.amount > 0 ? 'spent' : 'unspent'}">`;
        html += addressObj.address;
        html += `</li>`;
    });
    html += `<a href="#" class="new-address pull-left icon-btn">
                <span class="material-symbols-outlined">
                add_box
                </span>
                <span>new</span>
            </a>`;
    html += '</ul>';
    $('#ord-addresses').html(html);
}

async function setOrdWalletInfo(data) {
    let walletHtml;

    await setBtcPrice();
    await setFeeOptions();

    if (data.file && data.file.length) {
        $('#ord-wallet').addClass('exists');

        filepath = data['file'].split(' ').slice(5).join(' ')
        walletHtml =   `
                        <p>
                            <strong>file: &nbsp;</strong>${filepath}
                        </p>`;
    } else {
        $('#ord-wallet').removeClass('exists');

        walletHtml = '<p>no wallet data</p>'
    }

    let balance = data['balance'];

    walletHtml += `<p id="balance-cardinal"><strong>balance: &nbsp;</strong>${balance}`

    if (balance && walletHtml.indexOf('cardinal') > -1) {
        let usdBalance = JSON.parse(balance);
        usdBalance = usdBalance.cardinal * window.SAT_PRICE;
        usdBalance = parseInt(usdBalance);

        walletHtml += `<span class="usdBalance">[ $${usdBalance} ]</span>`;
    }

    walletHtml += '</p>'


    $('#ord-wallet-file').html(walletHtml);
    $('#ord-wallet').removeClass('waiting');

    if ('inscriptions' in data)
        printOrdInscriptions(data['inscriptions'].replaceAll('\\n', '<br>'));

    if ('addresses' in data)
        printAddresses(data['addresses'])

    if ('outputs' in data)
        printOrdOutputs(data['outputs'])

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

function setCloudinitStatus(data){
    if (data.indexOf('finished') > -1 && data.indexOf('Cloud-init') > -1) {
        // TODO: this has already needed adjustment 1x, would be nice to find a more reliable / less mutable signal
        $('#ord-control-status').addClass('finished');
    }
    $('#ord-control-server-content').html(data.replaceAll('\n\n', '<br>').replaceAll('\n','<br>'));
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
                    <td><code class="black">${row.DateAdded.S}</code></td>
                    <td><code class="black">${row.Name.S}</code></td>
                    <td><code>${row.Details.S}</code></td>
                 </tr>`;
    })
    html += '</tbody></table>';
    $('#control-log-content').html(html);
    $('#control-log').removeClass('waiting');
}

function showSeedPhrase(phrase) {
    alert(phrase)
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

    $('#ord-wallet')
        .on('click', '.create', evt => {
            evt.preventDefault();
            window.socket.send('ord wallet create');
        })
        .on('click', '.disable', evt => {
            evt.preventDefault();
            let confirm = confirm('Delete your WALLET?!!!!?');
            if (confirm) {
                window.socket.send('ord wallet delete');
            }
        })
        .on('click', '.show-seed', evt => {
            evt.preventDefault();
            window.socket.send('ord wallet seed phrase');
        })
        .on('click', '.new-address', evt => {
            evt.preventDefault();
            window.socket.send('ord wallet new address');
        });
    
    function getInscriptionFeeRate(){
        return $('#feeRate').val();
    }

    function getInscriptionFilename() {
        return $('#inscribe-modal .filename').text();
    }

    function getInscriptionBytes() {
        return parseFloat($('#inscribe-modal .bytes').data('bytes'));
    }

    $('#inscription-queue').on('click', '.inscribe-btn', evt => {
        let $target = $(evt.target);
        let numBytes = $target.data('bytes');
        $('#inscribe-modal .filename').text($target.data('filename'));
        $('#inscribe-modal .bytes').text(`${numBytes / 1000} kb`);
        $('#inscribe-modal .bytes').data('bytes', numBytes);
        printInscriptionCost();
    });

    function printInscriptionCost() {
        let feeRate = getInscriptionFeeRate();
        let cost = (SAT_PRICE * (getInscriptionBytes() * feeRate / 4)).toFixed(2);
        $('#inscribe-modal .cost').text(`$${cost}`);
    }

    $('#feeRate').change(evt => {
        printInscriptionCost();
    });


    $('#inscribe-inscribe').click(evt => {
        evt.preventDefault();

        let cmd = `ord inscribe ${getInscriptionFilename()} ${getInscriptionBytes()} ${getInscriptionFeeRate()}`
        let btcAddress = $('#inscribe-address').val();

        // TODO: ensure this is a taproot address
        if (btcAddress.length > 40) {
            cmd = `${cmd} ${btcAddress}`
        }

        window.socket.send(cmd);
        $('#inscribe-modal').modal('hide');
        $('#executed-modal').modal('show');
        $('#inscribe-address').val('');
    })
})