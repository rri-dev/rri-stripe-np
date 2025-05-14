export class StripeHelper {

    stripe: any;
    debug = process.env.DEBUG === 'true';

    constructor() {
        if (!process.env.STRIPE_API_KEY) throw new Error("Missing env var: STRIPE_API_KEY");
        this.stripe = require('stripe')(process.env.STRIPE_API_KEY);
    }

    async isUSBankTransfer(chargeId: string): Promise<boolean> {

        const logPrefix = '::isUSBankTransfer::';
        if(this.debug) console.log(`${logPrefix}checking charge id: ${chargeId} to see if it is a US Bank transfer`);

        try {
            let derivedPi: string | undefined = undefined;
            if (chargeId.startsWith("pi_")) derivedPi = chargeId;
            if (chargeId.startsWith("py_")) {

                const charge = await this.stripe.charges.retrieve(chargeId);
                if (charge.payment_intent) derivedPi = charge.payment_intent;

            }
            if (!derivedPi) {
                if(this.debug) console.log(`${logPrefix}unable to derive pi id from ${chargeId}`);
                return false
            }

            if(this.debug) console.log(`${logPrefix}checking whether ${derivedPi} is a us bank transfer`);
            const pi = await this.stripe.paymentIntents.retrieve(derivedPi) as PaymentIntent;
            //if(this.debug) console.log(pi);
            if (!pi.charges && !pi.latest_charge) return false;
            let latestCharge = pi.charges?.data.find(c => c.id === pi.latest_charge);
            if (!latestCharge) {
                if(this.debug) console.log(`${logPrefix}retrieving latest_charge: ${pi.latest_charge}`);
                latestCharge = await this.stripe.charges.retrieve(pi.latest_charge);
            }
            if(this.debug) console.log('latestCharge.payment_method_details:', latestCharge?.payment_method_details);
            if (!latestCharge || !latestCharge.payment_method_details) return false;
            return latestCharge.payment_method_details.type === "us_bank_account"
        } catch (err: any) {
            if(this.debug) console.log(`${logPrefix}error retrieving pi with id ${chargeId}; error was: ${err.message}`);
            return false;
        }
    }

    async isPiUsBankTransfer(paymentIntent: PaymentIntent): Promise<boolean> {

        const logPrefix = '::isPiUsBankTransfer::';
        if (!paymentIntent.id || !paymentIntent.id.startsWith("pi_")) return false;
        if (!paymentIntent.charges) return false;
        if(this.debug) console.log(`${logPrefix}checking pi id: ${paymentIntent.id} to see if it is a US Bank transfer`);

        try {

            const latestCharge = paymentIntent.charges.data.find(c => c.id === paymentIntent.latest_charge);
            if (!latestCharge || !latestCharge.payment_method_details) return false;
            return latestCharge.payment_method_details.type === "us_bank_account"
        } catch (err: any) {
            if(this.debug) console.log(`${logPrefix}error determining if ${paymentIntent.id} is a bank transfer; error was: ${err.message}`);
            return false;
        }

    }

    async getCustomersByEmail(email: string): Promise<any[] | undefined> {

        const logPrefix = '::getCustomerByEmail::';
        try {
            const searchResult = await this.stripe.customers.search({
                query: `email:"${email}"`
            });
            if(this.debug) console.log(searchResult);
            return searchResult.data;
            
        } catch (err: any) {
            if(this.debug) console.log(err);
            return undefined;
        }
        

    }
}

// DEV NOTE
// these types are intentionally sparse on the properties - just sticking to the ones we care about
// more properties can be added as needed - type checking is just for compile time/dev time anyway
// for a full definition of all the types, see: https://docs.stripe.com/api/

export type StripeEvent = {
    id: string;
    object: "event";
    api_version: "2019-02-19" | string;
    data: {
        object: PaymentIntent | CheckoutSession | Customer;
    },
    type: "payment_intent.processing" | "payment_intent.succeeded" 
        | "payment_intent.payment_failed" | "checkout.session.completed" 
        | "customer.created" | "customer.updated";
}

export type PaymentIntent = {
    id: string;
    object: "payment_intent";
    metadata?: any;
    latest_charge: string;
    charges?: {
        object: "list";
        data: Charge[];
    };
    status?: string;
}

export type CheckoutSession = {
    id: string;
    object: "checkout.session";
    metadata?: any;
    payment_intent?: string;
    latest_charge?: string;
}

export type Customer = {
    id: string;
    email: string;
    metadata?: any;
}

export type CreatePaymentLinkRequest = {
    line_items: LineItem[];
    metadata?: any;
    payment_method_types?: string[];
    customer_creation?: "always" | "if_required";
}

export type LineItem = {
    price: string;
    quantity: number;
    name?: string;
}

export type Charge = {
    id: string;
    object: "charge";
    payment_method_details: {
        type: "us_bank_account" | string;
    }
}