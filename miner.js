import { ethers } from "ethers";
import dotenv from "dotenv";
import { execFileSync } from "child_process";

dotenv.config();

const CONTRACT =
  "0xEFAd2Eab7172dDEbE5Ce7a41f5Ddf8fCcE4Ca0CB";

const ABI = [
  "function freeMint(uint256 powNonce)",
  "function currentPowChallenge(address user) view returns(bytes32)",
  "function POW_TARGET() view returns(uint256)",
  "function currentPowStage() view returns(uint256)",
];

async function main() {

  const provider =
    new ethers.JsonRpcProvider(
      process.env.RPC_URL
    );

  const wallet =
    new ethers.Wallet(
      process.env.PRIVATE_KEY,
      provider
    );

  const contract =
    new ethers.Contract(
      CONTRACT,
      ABI,
      wallet
    );

  console.log(`
=================================
PFFT GPU MINER
=================================
Wallet : ${wallet.address}
=================================
`);

  while (true) {

    try {

      const challenge =
        await contract.currentPowChallenge(
          wallet.address
        );

      const target =
        await contract.POW_TARGET();

      const stage =
        await contract.currentPowStage();

      console.log(`
Stage : ${stage}
Starting GPU mining...
`);

      const result = execFileSync(
        "./cuda/miner",
        [challenge, target.toString()],
        {
          encoding: "utf8"
        }
      );

      const lines =
        result.trim().split("\n");

      const nonce =
        lines[0].trim();

      console.log(`
VALID NONCE : ${nonce}
`);

      const tx =
        await contract.freeMint(
          nonce,
          {
            gasLimit: 300000
          }
        );

      console.log(`TX SENT : ${tx.hash}`);

      const receipt =
        await tx.wait();

      console.log(`
SUCCESS : ${receipt.hash}
`);

    } catch (err) {

      console.log(err.message);

      console.log("Retrying...");
    }
  }
}

main();
