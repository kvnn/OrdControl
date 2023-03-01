UNIX_STATE_CODES = {
    'D':    'Uninterruptible sleep (usually IO)',
    'R':    'Running or runnable (on run queue)',
    'S':    'Interruptible sleep (waiting for an event to complete)',
    'T':    'Stopped, either by a job control signal or because it is being traced.',
    'W':    'paging (not valid since the 2.6.xx kernel)',
    'X':    'dead (should never be seen)',
    'Z':    'Defunct ("zombie") process, terminated but not reaped by its parent.',
    '<':    'high-priority (not nice to other users)',
    'N':    'low-priority (nice to other users)',
    'L':    'has pages locked into memory (for real-time and custom IO)',
    's':    'is a session leader',
    'l':    'is multi-threaded (using CLONE_THREAD, like NPTL pthreads do)',
    '+':    'is in the foreground process group',
}

function getUnixStateCodeDetails(code = []) {
    console.log('getUnixStateCodeDetails', code);
    let details = [];

    for (var i = 0; i < code.length; i++) {
        let char = code.charAt(i);
        details.push(`${char}: ${UNIX_STATE_CODES[char]}`)
    }
    console.log('returning', details);
    return details;
}