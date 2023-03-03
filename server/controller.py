import asyncio
import json
import subprocess
from threading import Thread

import websockets


CLIENTS = set()

ord_wallet = {}

async def echo(websocket):
    async for message in websocket:
        await websocket.send(message)


async def exec(websocket):
    CLIENTS.add(websocket)
    async for message in websocket:
        print(f'websocket recvd {message}')
        output = None
        try:
            if message == 'websocket restart':
                subprocess.Popen(['sudo', 'systemctl', 'restart', 'ord-controller.service'])
            elif message == 'bitcoind restart':
                subprocess.Popen(['sudo','systemctl', 'restart', 'bitcoin-for-ord.service'])
            elif message == 'ord index restart':
                subprocess.Popen(['sudo','systemctl', 'restart', 'ord.service'])
            await websocket.send(output)
        except Exception as e:
            print(f'Exception: {e}')
            await websocket.send(f'Exception: {e}')


def get_ps_as_dicts(ps_output):
    output = []
    headers = [h for h in ' '.join(ps_output[0].decode('ascii').strip().split()).split() if h]
    if len(ps_output) > 1:
        for row in ps_output[1:]:
            values = row.decode('ascii').replace('\n', '').split(None, len(headers) - 1)
            output.append({headers[i]: values[i] for i in range(len(headers))})
    return output


ord_index_output = []

def get_ord_indexing_details():
    global ord_index_output
    ord_index_output.append('looking for ord index...')
    ps = subprocess.Popen(['ps aux | head -1; ps aux | grep "[/]home/ubuntu/ord/target/release/ord"'], stdout=subprocess.PIPE, shell=True).stdout.readlines()
    output = get_ps_as_dicts(ps)
    if len(output):
        pid = output[0]['PID']
        ord_index_output.append(f'found PID {pid}')
        # see https://stackoverflow.com/questions/54091396/live-output-stream-from-python-subprocess/54091788#54091788
        with subprocess.Popen([f'sudo strace -qfp  {pid} -e trace=write -e write=1,2'], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
            ord_index_output.append('running strace...')
            for line in process.stdout:
                ord_index_output.append(line.decode('ascii'))

def get_ord_indexing_output():
    global ord_index_output
    return json.dumps({"ord_index_output": ord_index_output})


def get_ord_processes():
    ps = subprocess.Popen(['ps aux | head -1; ps aux | grep "[o]rd"'], stdout=subprocess.PIPE, shell=True).stdout.readlines()
    output = get_ps_as_dicts(ps)
    output = [row for row in output if 'start ord-controller.service' not in row['COMMAND'] and '/usr/local/bin/bitcoin/bin/bitcoind' not in row['COMMAND']]
    return json.dumps({
        'processes-ord': output
    })


def get_bitcoind_status():
    pid = 99999999
    pid_search = subprocess.Popen(["systemctl status bitcoin-for-ord.service | grep 'Main PID' | awk '{print $3}'"], stdout=subprocess.PIPE, shell=True).stdout.readlines()
    if len(pid_search) == 1:
        pid = pid_search[0].decode('ascii').replace('\n', '')
    ps = subprocess.Popen([f'ps -p {pid} -o user,pid,ppid,%cpu,%mem,vsz,rss,tty,stat,start,time,command'], shell=True, stdout=subprocess.PIPE).stdout.readlines()
    output = {"status-bitcoind": get_ps_as_dicts(ps)}
    return json.dumps(output)


def get_ord_wallet():
    global ord_wallet

    # wallet help
    if 'help' not in ord_wallet:
        output = subprocess.run(['/home/ubuntu/ord/target/release/ord', 'wallet', 'help'], stdout=subprocess.PIPE)
        ord_wallet['help'] = output.stdout.decode('ascii')
    return json.dumps({"ord_wallet": ord_wallet})


async def broadcast(message):
    for websocket in CLIENTS.copy():
        try:
            await websocket.send(message)
        except websockets.ConnectionClosed:
            pass

async def broadcast_messages():
    global ord_index_output
    while True:
        await broadcast(get_bitcoind_status())
        await broadcast(get_ord_processes())
        await broadcast(get_ord_wallet())
        await broadcast(get_ord_indexing_output())
        print(f'ord_index_output is {ord_index_output}')
        await asyncio.sleep(5)


async def main():
    async with websockets.serve(exec, "0.0.0.0", 8765):
        # await asyncio.Future()  # run forever
        await broadcast_messages()  # runs forever


t1 = Thread(target=get_ord_indexing_details)
t1.start()

asyncio.run(main())
