$(function(){
    const searchParams = new URLSearchParams(window.location.search)
    const address = searchParams.get('address');
    $('#address').text(address);
})