sol-modules-repo repo

## Local deployment
1) `npm i` - install dependencies
2) Copy `.env.example` to `.env` and set `PRIVATE_KEY` (your PK account in Metamask)
3) Run `nxp hardhat`, check that this command work
4) Run `npx hardhat node` - this command will start the local node. You should see the following message "Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/". The address of your Metamask account should be below. Don't close this terminal window.
5) RUN `npx hardhat run scripts/ecosystem/Ecosystem.deploy.js --network localhost` in another terminal window - this command will complete the local ecosystem deploy, in the process you just have to press `y`. The addresses of the contracts will appear at the bottom, for example 

```
DAPP: 0x8fC4532bE3003fb5A3A2f9afc7e95b3bfbD5fAAb
Factory: 0x266BbD2EC8Ed316aC6E7D8FA0AA56212938eB90e
Farming: 0x010B8A4790B3fa61762cd06c8b476194EDC1dE44
```
6) Copy the addresses from step 5 into the `.env` on the frontend
7) Create new Network in Metamask.
```
Name: Localhost 8545
RPC URL: http://localhost:8545 or http://127.0.0.1:8545/ or something else from step 4
Chain ID: 1337
Currency symbol: LocalETH
```

> In the future, you will only need to repeat step 4 and 5. The contract addresses will be the same if you do not change the contracts or the deplot scripts.