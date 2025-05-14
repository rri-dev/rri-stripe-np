import "dotenv/config";
import { StripeHelper } from "./src";

async function run() {
    const strHelper = new StripeHelper();
    const pi = process.env.TEST_PI || "test-pi";
    const isUSBankTransfer = await strHelper.isUSBankTransfer(pi);
    console.log(isUSBankTransfer);
}

run();