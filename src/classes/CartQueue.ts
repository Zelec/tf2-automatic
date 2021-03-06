import SteamID from 'steamid';

import Bot from './Bot';
import Cart from './Cart';

import log from '../lib/logger';

export = CartQueue;

class CartQueue {
    private readonly bot: Bot;

    private carts: Cart[] = [];

    private busy = false;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    enqueue(cart: Cart): number {
        // TODO: Priority queueing

        if (this.getPosition(cart.partner) !== -1) {
            // Already in the queue
            return -1;
        }

        const position = this.carts.length;

        this.carts.push(cart);

        setImmediate(() => {
            // Using set immediate so that the queue will first be handled when done with this event loop cycle
            this.handleQueue();
        });

        return position;
    }

    getPosition(steamID: SteamID): number {
        const steamID64 = steamID.toString();
        return this.carts.findIndex(cart => cart.partner.toString() === steamID64);
    }

    private handleQueue(): void {
        if (this.busy || this.carts.length === 0) {
            return;
        }

        this.busy = true;

        const cart = this.carts[0];

        cart.constructOffer()
            .then(alteredMessage => {
                if (alteredMessage) {
                    this.bot.sendMessage(cart.partner, 'Your offer has been altered: ' + alteredMessage + '.');
                }

                this.bot.sendMessage(cart.partner, 'Please wait while I process your offer! ' + cart.summarize() + '.');

                return cart.sendOffer();
            })
            .then(status => {
                if (status === 'pending') {
                    this.bot.sendMessage(
                        cart.partner,
                        'Your offer has been made, please wait while I accept the mobile confirmation.'
                    );
                }
            })
            .catch(err => {
                if (!(err instanceof Error)) {
                    this.bot.sendMessage(cart.partner, 'I failed to make the offer. Reason: ' + err);
                } else {
                    log.warn('Failed to make offer: ', err);
                    this.bot.sendMessage(
                        cart.partner,
                        'Something went wrong while trying to make the offer, try again later!'
                    );
                }
            })
            .finally(() => {
                // Remove cart from the queue
                this.carts.shift();

                // Now ready to handle a different cart
                this.busy = false;

                // Handle the queue
                this.handleQueue();
            });
    }
}
