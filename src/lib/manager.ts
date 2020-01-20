import TradeOfferManager from 'steam-tradeoffer-manager';

import log from './logger';
import client from './client';
import community from './community';

const manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: 'en',
    pollInterval: 1000,
    cancelTime: 5 * 60 * 1000,
    pendingCancelTime: 10 * 1000
});

manager.on('newOffer', newOfferEvent);
manager.on('receivedOfferChanged', offerChangedEvent);
manager.on('sentOfferChanged', offerChangedEvent);
manager.on('pollData', pollDataEvent);
manager.on('debug', debugEvent);

function pollDataEvent () {
    require('../app/trade').onPollData(manager.pollData);
}

function newOfferEvent (offer) {
    require('../app/trade').newOffer(offer);
}

function offerChangedEvent (offer, oldState) {
    require('../app/trade').offerChanged(offer, oldState);
}

function debugEvent (message) {
    if (!message.startsWith('Doing trade offer poll ')) {
        // Ignore poll messages
        log.debug(message, { event: 'debug', from: 'steam-tradeoffer-manager' });
    }
}

export default manager;
