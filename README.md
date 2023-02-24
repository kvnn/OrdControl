
# OrdServer
This is a one-click AWS deployment to run a Bitcoin full-node and [Ord](https://github.com/casey/ord) instance.


## Quickstart
1. Have an AWS account set up with the cli : https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
2. `git clone git@github.com:kvnn/OrdServer.git`
3. `cd OrdServer`
4. `terraform init`
5. `terraform apply`
6. visit your server:
   1. copy / paste the `ssh_connection_string` (printed once #5 is complete) to connect to your instance
   2. in instance, run `tail -f /var/log/cloud-init-output.log` to see status of the post-deploy script
   3. wait until you see "ord-server init.tpl finished" in the above before taking any actions
   4. view bitcoind status: `sudo systemctl status bitcoin-for-ord.service`
   5. you can run ord commands via `/home/ubuntu/ord/target/release/ord --bitcoin-data-dir=/mnt/bitcoin-ord-data/bitcoin --data-dir=/mnt/bitcoin-ord-data/ord {CMD e.g. "info"}`
<!-- COMING SOON 6. run the visibility / control client:
   1. `python3 -m http.server -d client 8888`
   2. http://localhost:8888 -->



## Details
- this is currently set up to run on AWS `us-west-2`
- it sets up a volume at `/mnt/bitcoin-ord-data` with bitcoin and ord data dirs synced up to February 22 2013
- you can change regions, availability zones and instance types in `variables.tf`. Note that the data drive mount may fail for instances that use `nvme` type drives, and it may fail for other regions. If you have a use-case you need help with, feel free to create an Issue.
- the AMI used is a standard AWS AMI
- see `init.tpl` for the scripting done to your server (e.g. to make sure there are no backdoors here)
  

## TODO
- server
  - [ ] verify that `bitcoin-cli` works
  - [ ] include controller websocket server (VERY SOON)
    - [ ] add authentication token via terraform
  - [ ] implement Inscription functionality
    - [ ] resilient queueing
    - [ ] smart queue consumer
    - [ ] light database for managing queued Inscriptions
- client
  - [ ] release MVP (VERY SOON)
  - [ ] include `bitcoin-cli` controls
  - [ ] finish Ord controls
  - [ ] implement Inscription functionality
    - [ ] custom parameters (e..g fee_rate)
    - [ ] queue visbility
      - [ ] Inscription status
        - [ ] internal info
        - [ ] on-chain info
    - [ ] queue controls
      - [ ] cancel
      - [ ] prioritize / replace tx