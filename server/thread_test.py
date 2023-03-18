import time
from threading import Thread


testvar = []

def go():
    global testvar
    while True:
        testvar.append(time.time())
        time.sleep(2)

t1 = Thread(target=go)
t1.start()

while True:
    print(f'testvar is {testvar}')
    time.sleep(2)