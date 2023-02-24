import asyncio
import json
import subprocess

import websockets


CLIENTS = set()


async def echo(websocket):
    async for message in websocket:
        await websocket.send(message)


async def exec(websocket):
    CLIENTS.add(websocket)
    async for message in websocket:
        print(f'websocket recvd {message}')
        output = None
        try:
            if message == 'bitcoind restart':
                p1 = subprocess.Popen(['sudo','systemctl', 'restart', 'bitcoin-for-ord.service'])
                p1.wait()
                output = get_bitcoind_status()
            elif message == 'ord start':
                p1 = subprocess.Popen(['ord', '--bitcoin-data-dir=/var/lib/bitcoind', 'index'])
                # p1.wait()
                output = get_ord_status()
            elif message == 'ord stop':
                # output = subprocess.run(['shutdown', '-r', 'now'], capture_output=True)
                print('ord stop')
            # else:
            #     cmds = message.split(' ')
            #     if cmds[0] != 'ord':
            #         cmds.insert(0, 'ord')
            #     if cmds[1] != '--bitcoin-data-dir=/var/lib/bitcoind':
            #         cmds.insert(1, '--bitcoin-data-dir=/var/lib/bitcoind')
            #     output = subprocess.Popen(cmds)
            #     print(f'output is {output}')
            await websocket.send(output)
        except Exception as e:
            print(f'Exception: {e}')
            await websocket.send(f'Exception: {e}')


def get_ps_as_dict(ps_output):
    output = []
    headers = [h for h in ' '.join(ps_output[0].decode('ascii').strip().split()).split() if h]
    if len(ps_output) > 1:
        for row in ps_output[1:]:
            values = row.decode('ascii').replace('\n', '').split(None, len(headers) - 1)
            output.append({headers[i]: values[i] for i in range(len(headers))})
    return output


def get_ord_status():
    ps = subprocess.Popen(['ps aux | head -1; ps aux | grep "[o]rd"'], stdout=subprocess.PIPE, shell=True).stdout.readlines()
    output = {"status-ord": get_ps_as_dict(ps)}
    return json.dumps(output)


def get_bitcoind_status():
    pid = 99999999
    pid_search = subprocess.Popen(["systemctl status bitcoin-for-ord.service | grep 'Main PID' | awk '{print $3}'"], stdout=subprocess.PIPE, shell=True).stdout.readlines()
    if len(pid_search) == 1:
        pid = pid_search[0].decode('ascii').replace('\n', '')
    ps = subprocess.Popen([f'ps -p {pid} -o user,pid,ppid,%cpu,%mem,vsz,rss,tty,stat,start,time,command'], shell=True, stdout=subprocess.PIPE).stdout.readlines()
    output = {"status-bitcoind": get_ps_as_dict(ps)}
    return json.dumps(output)


async def broadcast(message):
    for websocket in CLIENTS.copy():
        try:
            await websocket.send(message)
        except websockets.ConnectionClosed:
            pass


async def broadcast_messages():
    while True:
        await broadcast(get_bitcoind_status())
        await broadcast(get_ord_status())
        await asyncio.sleep(5)


async def main():
    async with websockets.serve(exec, "0.0.0.0", 8765):
        # await asyncio.Future()  # run forever
        await broadcast_messages()  # runs forever


asyncio.run(main())