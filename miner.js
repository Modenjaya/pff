import { ethers } from "ethers";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config();

const CONTRACT = "0xEFAd2Eab7172dDEbE5Ce7a41f5Ddf8fCcE4Ca0CB";

const ABI = [
  "function freeMint(uint256 powNonce)",
  "function currentPowChallenge(address user) view returns(bytes32)",
  "function POW_TARGET() view returns(uint256)",
  "function currentPowStage() view returns(uint256)",
  "function totalMinted() view returns(uint256)",
  "function calculateActualMint(uint256 requested) view returns(uint256)",
]

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const contract = new ethers.Contract(CONTRACT, ABI, wallet);

  console.log("Wallet:", wallet.address);

  while (true) {
    try {
      const challenge = await contract.currentPowChallenge(wallet.address);
      const target = await contract.POW_TARGET();
      const stage = await contract.currentPowStage();

      console.log("Stage:", stage.toString());
      console.log("Target:", target.toString());

      const cmd = `./cuda/miner '${challenge}' '${target.toString()}'`;

      const result = execSync(cmd).toString().trim();

      const nonce = BigInt(result);

      console.log("VALID NONCE:", nonce.toString());

      const gasPrice = await provider.getFeeData();

      const tx = await contract.freeMint(nonce, {
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
        gasLimit: 300000,
      });

      console.log("TX:", tx.hash);

      const receipt = await tx.wait();

      console.log("SUCCESS:", receipt.hash);
    } catch (err) {
      console.log(err.message);
    }
  }
}

main();
