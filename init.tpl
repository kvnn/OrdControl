#!/bin/bash
echo "ord-server init.tpl starting"

# to view logs in instance: `cat /var/log/cloud-init-output.log`
# to view this script in instance: `sudo cat /var/lib/cloud/instances/{instance_id}/user-data.txt`


# install OrdControl linux dependencies
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get --assume-yes install python3-pip

# wait for OrdControl file transfer to complete ... otherwise, on slow connections, we may get a "directory doesn't exist" error
while [ ! -d /home/ubuntu/OrdControl ]; do echo "waiting for /home/ubuntu/OrdControl to exist..." && sleep 1; done

# install OrdControl python dependencies
mkdir /home/ubuntu/OrdControl/inscriptions
cd /home/ubuntu/OrdControl
chown -R ubuntu.ubuntu /home/ubuntu/OrdControl
sudo -H -u ubuntu pip3 install -r requirements.txt


# set up a mount for our Bitcoin & Ord data dir
mkdir /mnt/bitcoin-ord-data
chown ubuntu.ubuntu /mnt/bitcoin-ord-data
echo "/dev/xvdh /mnt/bitcoin-ord-data xfs defaults 0 2" | tee -a /etc/fstab
mount /dev/xvdh /mnt/bitcoin-ord-data/

# set up bitcoin
echo "set up bitcoin"
cd /home/ubuntu
wget https://bitcoincore.org/bin/bitcoin-core-24.0.1/bitcoin-24.0.1-x86_64-linux-gnu.tar.gz
tar xvzf bitcoin-24.0.1-x86_64-linux-gnu.tar.gz
mv bitcoin-24.0.1 /usr/local/bin/bitcoin
mkdir /etc/bitcoin
chmod 755 /etc/bitcoin
cp /usr/local/bin/bitcoin/bitcoin.conf /etc/bitcoin/bitcoin.conf
chown -R ubuntu.ubuntu /etc/bitcoin

# set up OrdControl services
cd /home/ubuntu/OrdControl
chown -R root.root services
# chmod 755 -R services
mv services/* /etc/systemd/system
systemctl daemon-reload

# start ord-controller service
sudo /usr/bin/systemctl enable ord-controller.service
sudo /usr/bin/systemctl start ord-controller.service

# start bitcoind service
sudo /usr/bin/systemctl enable bitcoin-for-ord.service
sudo /usr/bin/systemctl start bitcoin-for-ord.service

# install low level essentials for Ord
DEBIAN_FRONTEND=noninteractive apt-get --assume-yes install libssl-dev
DEBIAN_FRONTEND=noninteractive apt-get --assume-yes install build-essential

# install rust for Ord
cd /home/ubuntu
HOME=/home/ubuntu curl https://sh.rustup.rs -sSf | HOME=/home/ubuntu sh -s -- -y --no-modify-path --default-toolchain stable

# # fix ownership of new /home/ubuntu subdirectories
chown ubuntu.ubuntu -R /home/ubuntu/.cargo /home/ubuntu/.rustup

# source paths for rust / cargo
source /home/ubuntu/.bashrc
source /home/ubuntu/.cargo/env

# build ord
git clone https://github.com/casey/ord.git
chown ubuntu.ubuntu /home/ubuntu/ord
cd ord
sudo -H -u ubuntu /home/ubuntu/.cargo/bin/cargo build --release

# # start ord service
/usr/bin/systemctl enable ord.timer
/usr/bin/systemctl start ord.timer

echo "ord-control init.tpl finished"