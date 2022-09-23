var cw = new Chatwork();
cw.setToken(requestParams.t);
cw.setMyID(requestParams.id);

$(async () => {
    await cw.initLoad();
    renderRoomsList(cw.getRooms())

    $('input[name="filter-room-name"]').keyup(onRoomNameFiltered);
    $('#btn-backup').click(onContinueButtonClicked);
    $('#btn-back').click(onBackButtonClicked);
    $('#wrapper-rooms').on('click', '#btn-copy', onCopyButtonClicked);
});