#!/bin/bash
echo "ord-server init.tpl starting"

# to view logs in instance: `cat /var/log/cloud-init-output.log`
# to view this script in instance: `sudo cat /var/lib/cloud/instances/{instance_id}/user-data.txt`

# set up a mount for our Bitcoin & Ord data dir
sudo mkdir /mnt/bitcoin-ord-data
sudo chown ubuntu.ubuntu /mnt/bitcoin-ord-data
echo "/dev/xvdh /mnt/bitcoin-ord-data xfs defaults 0 2" | sudo tee -a /etc/fstab
sudo mount /dev/xvdh /mnt/bitcoin-ord-data/

# set up bitcoin
cd ~
wget https://bitcoincore.org/bin/bitcoin-core-24.0.1/bitcoin-24.0.1-x86_64-linux-gnu.tar.gz
tar xvzf bitcoin-24.0.1-x86_64-linux-gnu.tar.gz
sudo mv bitcoin-24.0.1 /usr/local/bin/bitcoin
sudo mkdir /etc/bitcoin
sudo chmod 755 /etc/bitcoin
sudo cp /usr/local/bin/bitcoin/bitcoin.conf /etc/bitcoin/bitcoin.conf
sudo chown -R ubuntu.ubuntu /etc/bitcoin

# set up bitcoin service (TODO: lets separate this into a file transfer)
sudo tee -a /etc/systemd/system/bitcoin-for-ord.service <<EOF
[Unit]
Description=Bitcoin daemon
Documentation=https://github.com/bitcoin/bitcoin/blob/master/doc/init.md
# https://www.freedesktop.org/wiki/Software/systemd/NetworkTarget/
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/bitcoin/bin/bitcoind -txindex -pid=/mnt/bitcoin-ord-data/bitcoin/bitcoind.pid -conf=/etc/bitcoin/bitcoin.conf -datadir=/mnt/bitcoin-ord-data/bitcoin --daemon
Type=forking
Restart=on-failure
TimeoutStartSec=infinity
TimeoutStopSec=600
User=ubuntu
Group=ubuntu
PrivateTmp=true
ProtectSystem=full
EOF

# start bitcoind service
sudo /usr/bin/systemctl start bitcoin-for-ord.service

# install low level essentials for Ord
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get --assume-yes install libssl-dev
sudo DEBIAN_FRONTEND=noninteractive apt-get --assume-yes install build-essential

# install rust for Ord
cd /home/ubuntu
HOME=/home/ubuntu curl https://sh.rustup.rs -sSf | HOME=/home/ubuntu sh -s -- -y --no-modify-path --default-toolchain stable

# # fix ownership of new /home/ubuntu subdirectories
sudo chown ubuntu.ubuntu -R /home/ubuntu/.cargo /home/ubuntu/.rustup

# source paths for rust / cargo
source /home/ubuntu/.bashrc
source /home/ubuntu/.cargo/env

# build ord
git clone https://github.com/casey/ord.git
sudo chown ubuntu.ubuntu /home/ubuntu/ord
cd ord
sudo -H -u ubuntu /home/ubuntu/.cargo/bin/cargo build --release


# set up ord indexing service
sudo tee -a /etc/systemd/system/ord.service <<EOF
[Unit]
After=network.target
Description=Ord server
StartLimitBurst=120
StartLimitIntervalSec=10m

[Service]
AmbientCapabilities=CAP_NET_BIND_SERVICE
Environment=RUST_BACKTRACE=1
Environment=RUST_LOG=info
ExecStart=/home/ubuntu/ord/target/release/ord --bitcoin-data-dir=/mnt/bitcoin-ord-data/bitcoin --data-dir=/mnt/bitcoin-ord-data/ord index
Restart=on-failure
# bitcoind may need to finish syncing, so lets keep a long restart time
RestartSec=60s
TimeoutStopSec=3000m
Type=simple
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# # start ord service
sudo systemctl start ord.service

echo "ord-server init.tpl finished"