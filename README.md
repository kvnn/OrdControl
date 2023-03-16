
# OrdServer
This is a one-click AWS deployment to run a Bitcoin full-node and [Ord](https://github.com/casey/ord) instance with a client-controller (which currently can restart the websocket server, restart bitcoind and start ord index).


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
7. EXPERIMENTAL: uncomment the websocket ingress in `main.tf` before step 5 and open the client's `index.html` in your browser (no need for an http server). E.g. file:///Users/kevin/Projects/OrdServer/client/index.html



## Details
- it sets up a volume at `/mnt/bitcoin-ord-data` with bitcoin and ord data dirs synced up to March 12 2023
- as of March 6 2023, this setup is costing me about $13 / day, which is almost entirely EC2 costs. I'll sometimes run `terraform --auto-approve destroy` when I know I won't be using it
- you can change regions, availability zones and instance types in `variables.tf`. Note that the data drive mount may fail for instances that use `nvme` type drives, and it may fail for other regions. If you have a use-case you need help with, feel free to create an Issue.
- the AMI used is a standard AWS AMI
- see `init.tpl` for the scripting done to your server (e.g. to make sure there are no backdoors here)
  

## TODO
- [ ] Rename to `OrdControl` and have Dall-e generate something dope
- [ ] Add mp4 to README
- server
  - [ ] wallet control
    - [x] create wallet
    - [x] delete wallet (note: see https://github.com/casey/ord/issues/1649)
    - [ ] instead of saving seed phrase to Dynamo table, save to a flate file on server and allow retrieval / deletion from client
    - [ ] generate receive addresses (save to Dynamo?)
  - [ ] implement Inscription functionality
    - [ ] resilient queueing
    - [ ] smart queue consumer
    - [ ] light database for managing queued Inscriptions
  - [x] alert UI if ec2/boto credentials error occurs, allow server restart
  - [ ] allow server restart regardless of the above
  - [x] show journalctl alerts / errors in UI 
  - [ ] verify that `bitcoin-cli` work, play with it
  - [x] include controller websocket server
    - [x] add authentication token via terraform
    - [x] actually *use* the auth token
  - [x] add "Name: OrdServer" tag to all aws resources
  - [x] add Dynamo table 
    - [ ] get fine-grained ord-index status (via strace?)
  - [ ] split controller.py into a module, split out the ord-indexing watcher / logger

- client
  - [x] release MVP
  - [x] clean up js / css
  - [ ] add feedback / hold mechanism for e.g. create-wallet
  - [ ] finish Ord controls
    - [x] create wallet
    - [x] disable wallet
  - [ ] implement Inscription functionality
    - [ ] custom parameters (e..g fee_rate)
    - [ ] queue visbility
      - [ ] Inscription status
        - [ ] internal info
        - [ ] on-chain info
    - [ ] queue controls
      - [ ] cancel
      - [ ] prioritize / replace tx
  - [ ] include `bitcoin-cli` controls?
