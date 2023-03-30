
# OrdControl
This is a one-click AWS deployment to run a Bitcoin full-node and [Ord](https://github.com/casey/ord) instance with a client-controller. The client currently facilitates creating an ord wallet, viewing balance/address info and uploading / inscribing files.


![OrdControl server-built](https://raw.githubusercontent.com/kvnn/OrdControl/master/docs/example.png)


## Quickstart
1. Have an AWS account set up with the cli : https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
2. `git clone git@github.com:kvnn/OrdControl.git`
3. `cd OrdControl`
4. `terraform init`
5. `terraform apply`
6. open the visibility / control client by opening `index.html` in the browser (for me its at `file:///Users/kevin/Projects/OrdControl/client/index.html`)
7. visit your server [OPTIONAL]:
   1. copy / paste the `ssh_connection_string` (printed once #5 is complete) to connect to your instance
   2. in instance, run `tail -f /var/log/cloud-init-output.log` to see status of the post-deploy script
   3. wait until you see "ord-server init.tpl finished" in the above before taking any actions (the client will update you as well)
   4. you can manually run ord commands via `/home/ubuntu/ord/target/release/ord --bitcoin-data-dir=/mnt/bitcoin-ord-data/bitcoin --data-dir=/mnt/bitcoin-ord-data/ord {CMD e.g. "info"}`


## Details
- its taking me 5-10 minutes from `terraform apply` until Ord is successfully indexing. [A docker container might help.](https://github.com/kvnn/OrdControl/issues/4)
- it sets up a volume at `/mnt/bitcoin-ord-data` with bitcoin and ord data dirs synced up to March 16 2023
- as of March 6 2023, this setup is costing me about $13 / day, which is almost entirely EC2 costs. I'll sometimes run `terraform --auto-approve destroy` when I know I won't be using it
- you can change regions, availability zones and instance types in `variables.tf`. Note that the data drive mount may fail for instances that use `nvme` type drives, and it may fail for other regions. If you have a use-case you need help with, feel free to create an Issue.
- the AMI used is a standard AWS AMI
- see `init.tpl` for the scripting done to your server (e.g. to make sure there are no backdoors here)
  

## TODO
- [x] Rename to `OrdControl` and have Dall-e generate something dope
- [x] Add UI screenshot or **loop** to README
- server
  - [ ] wallet control
    - [x] create wallet
    - [x] delete wallet (note: see https://github.com/casey/ord/issues/1649)
    - [x] instead of saving seed phrase to Dynamo table, save to a flate file on server and allow retrieval
    - [ ] allow seed-phrase delete
    - [x] generate receive addresses
    - [ ] send funds
    - [ ] view txs
  - [ ] implement Inscription functionality
    - [x] basic functionality
    - [ ] resilient queueing
    - [ ] smart queue consumer
    - [ ] light database for managing queued Inscriptions
  - [x] alert UI if ec2/boto credentials error occurs, allow server restart
  - [ ] allow server restart regardless of the above
  - [x] show journalctl alerts / errors in UI 
  - [x] verify that `bitcoin-cli` work, play with it
  - [x] include controller websocket server
    - [x] add authentication token via terraform
    - [x] actually *use* the auth token
  - [x] add "Name: OrdControl" tag to all aws resources
  - [x] add Dynamo table 
    - [x] get fine-grained ord-index status (via strace?)
  - [ ] split controller.py into a module, split out the ord-indexing watcher / logger

- client
  - [x] release MVP
  - [x] clean up js / css
  - [ ] show ssh connection string
  - [ ] add feedback / hold mechanism for e.g. create-wallet, create-address
  - [ ] wallet UI
    - [x] create wallet
    - [x] disable wallet (note: see https://github.com/casey/ord/issues/1649)
    - [x] show seed phrase
    - [x] clean up initial state (when wallet doesn't exist)
    - [x] add address
    - [x] view addresses
  - [ ] implement Inscription functionality
    - [x] basic functionality
    - [ ] custom parameters (e..g fee_rate)
    - [ ] queue visbility
      - [ ] Inscription status
        - [ ] internal info
        - [ ] on-chain info
    - [ ] queue controls
      - [ ] cancel
      - [ ] prioritize / replace tx
  - [ ] include `bitcoin-cli` controls?
