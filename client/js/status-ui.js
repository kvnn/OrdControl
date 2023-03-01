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

function setOrdStatus(data) {
    let statusHtml = getPsStatusHtml(data);

    if (data.length == 0) {
        $('#status-ord').removeClass('started').addClass('stopped');
    } else {
        $('#status-ord').addClass('started').removeClass('stopped');
    }

    $('#status-ord .details').html(statusHtml);
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

    $('#status-ord').on('click', '.start', evt=>{
        evt.preventDefault();
        window.socket.send('ord start');
    });

    $('#status-ord stop').click(evt=>{
        evt.preventDefault();
        window.socket.send('ord stop');
    });
})