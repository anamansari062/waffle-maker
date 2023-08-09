import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WaffleMaker } from "../target/types/waffle_maker";
import {encode} from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8";

describe("waffle-maker", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider)

  const program = anchor.workspace.WaffleMaker as Program<WaffleMaker>;

  it("Create Waffle!", async () => {
    const name = "nom-nom"

    // Deriving PDA for waffle
    const [wafflePda, _] = anchor.web3.PublicKey.findProgramAddressSync(
          [
              encode("waffle"),
              encode(name)              
          ],
          program.programId
      );

    // creates waffle
    const transactionSignature = await program.methods
        .createWaffle(name)
        .accounts({
            author: provider.wallet.publicKey,
            waffle: wafflePda,
            systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();

    // Fetching the created waffle account
    const waffleAccount = await program.account.waffle.fetch(wafflePda);
    console.log(waffleAccount)

  });

});
