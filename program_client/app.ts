import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
    burnSendAndConfirm,
    CslSplTokenPDAs,
    deriveSubmemMetadataPDA,
    getSubmemMetadata,
    initializeClient,
    mintSendAndConfirm,
    transferSendAndConfirm,
} from "./index";
import {getMinimumBalanceForRentExemptAccount, getMint, TOKEN_PROGRAM_ID,} from "@solana/spl-token";

async function main(feePayer: Keypair) {
    const args = process.argv.slice(2);
    const connection = new Connection("https://api.devnet.solana.com", {
        commitment: "confirmed"
    })

    const progId = new PublicKey(args[0]!);

    initializeClient(progId, connection);

    const mint = Keypair.generate();
    console.info("+==== Mint Address  ====+");
    console.info(mint.publicKey.toBase58());

    const johnDoeWallet = Keypair.generate();
    console.info("+==== John Doe Wallet ====+");
    console.info(johnDoeWallet.publicKey.toBase58());

    const janeDoeWallet = Keypair.generate();
    console.info("+==== Jane Doe Wallet ====+");
    console.info(janeDoeWallet.publicKey.toBase58());

    const rent = await getMinimumBalanceForRentExemptAccount(connection);
    await sendAndConfirmTransaction(
        connection,
        new Transaction()
            .add(
                SystemProgram.createAccount({
                    fromPubkey: feePayer.publicKey,
                    newAccountPubkey: johnDoeWallet.publicKey,
                    space: 0,
                    lamports: rent,
                    programId: SystemProgram.programId,
                })
            )
            .add(
                SystemProgram.createAccount({
                    fromPubkey: feePayer.publicKey,
                    newAccountPubkey: janeDoeWallet.publicKey,
                    space: 0,
                    lamports: rent,
                    programId: SystemProgram.programId
                })
            ),
            [feePayer, johnDoeWallet, janeDoeWallet]
    )

    const [submemPub] = deriveSubmemMetadataPDA(
        {
            mint: mint.publicKey,
        },
        progId
    )
    console.info("+==== Submem Metadata Address ====+");
    console.info(submemPub.toBase58());

    const [johnDoeATA] = CslSplTokenPDAs.deriveAccountPDA({
        wallet: johnDoeWallet.publicKey,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    })
    console.info("+==== John Doe ATA ====+");
    console.info(johnDoeATA.toBase58());

    const [janeDoeATA] = CslSplTokenPDAs.deriveAccountPDA({
        wallet: janeDoeWallet.publicKey,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    });
    console.info("+==== Jane Doe ATA ====+");
    console.info(janeDoeATA.toBase58());

    console.info("+==== Minting... ====+");
    const nowTimestamp = Math.floor(Date.now() / 1000);
    await mintSendAndConfirm({
        wallet: johnDoeWallet.publicKey,
        assocTokenAccount: johnDoeATA,
        level: "free tier",
        expiry: BigInt(nowTimestamp),
        shortDescription: "Free tier member subscription",
        signers: {
            feePayer: feePayer,
            funding: feePayer,
            mint: mint,
            owner: johnDoeWallet,
        }
    })
    console.info("+==== Minted ====+");

    let mintAccount = await getMint(connection, mint.publicKey);
    console.info("+==== Mint ====+");
    console.info(mintAccount);

    let submem = await getSubmemMetadata(submemPub);
    console.info("+==== Submem Metadata ====+");
    console.info(submem);
    console.assert(submem!.assocAccount!.toBase58(), johnDoeATA.toBase58());

    console.info("+==== Transferring... ====+");
    await transferSendAndConfirm({
        wallet: janeDoeWallet.publicKey,
        assocTokenAccount: janeDoeATA,
        mint: mint.publicKey,
        source: johnDoeATA,
        destination: janeDoeATA,
        signers: {
            feePayer: feePayer,
            funding: feePayer,
            authority: johnDoeWallet,
        },
    });
    console.info("+==== Transferred ====+");

    mintAccount = await getMint(connection, mint.publicKey);
    console.info("+==== Mint ====+");
    console.info(mintAccount);

    submem = await getSubmemMetadata(submemPub);
    console.info("+==== Submem Metadata ====+");
    console.info(submem);
    console.assert(submem!.assocAccount!.toBase58(), janeDoeATA.toBase58());

    console.info("+==== Burning... ====+");
    await burnSendAndConfirm({
        mint: mint.publicKey,
        wallet: janeDoeWallet.publicKey,
        signers: {
            feePayer: feePayer,
            owner: janeDoeWallet,
        },
    });
    console.info("+==== Burned ====+");

    mintAccount = await getMint(connection, mint.publicKey);
    console.info("+==== Mint ====+");
    console.info(mintAccount);

    submem = await getSubmemMetadata(submemPub);
    console.info("+==== Submem Metadata ====+");
    console.info(submem);
    console.assert(typeof submem!.assocAccount, "undefined");
}

fs.readFile(path.join(os.homedir(), ".config/solana/id.json")).then((file) =>
    main(Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())))),
);