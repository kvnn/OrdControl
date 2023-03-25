


$(async function(){
    $('#upload').on('change', async evt => {
        evt.preventDefault();

        await setFeeOptions();

        file = evt.target.files[0];

        let name =  file.name;
        let fileSizeBytes = file.size;
        let fileType = file.type;

        if (fileSizeBytes > 360 * 1000) {
            return alert('Sorry, file must be less than 360kb')
        }

        window.socket.send(`inscription_name:${name}`)
        window.socket.send(file);
    });
});