# Submem - NFT for Membership subscription management

Submem is NFT for membership subscription developing with 3 level subscription

## Purpose
Now a days, many website, blog use membership subscription to receive donations from users, visitor. However, managing these subscriptions on the server side is susceptible to risks when the owner or hacker can interfere with the system. So instead of subscription information being kept by the manager, they will be held by the user themselves.

## How to use
Build project:
```sh
cargo build-sbf
```

Deploy program:
```sh
solana program deploy target/deploy/nft.so 
```

To interact with program, you can change code in program_client/app.ts then:
```sh
npx ts-node app.ts <YOUR_PROGRAM_ID>
```