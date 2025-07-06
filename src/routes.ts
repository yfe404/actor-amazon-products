import { createCheerioRouter } from 'crawlee';

import { LABELS } from './constants.js';

// function to parse the price in the forme '$valueInDollars' to a number
function parsePrice(price: string): number {
    const match = price.match(/^\$(\d+(,\d+)?(\.\d{1,2})?)$/);
    if (!match) {
        console.log(`Invalid price format: ${price}`);
        throw new Error(`Invalid price format: ${price}`);
    }
    return parseFloat(match[1].replace(',', '')); // handles prices >= 1000 like 1,000.00
}

export const router = createCheerioRouter();

router.addHandler(LABELS.START, async ({ request, enqueueLinks, $, log }) => {
    const { keyword } = request.userData;
    log.info(`Starting crawl for ${keyword}`, { url: request.loadedUrl });
    const title = $('title').text();
    log.info(`${title}`, { url: request.loadedUrl });

    const products = $('div[data-asin]:not([data-asin=""])');

    products.each((_, product) => {
        const href = $(product).find('a[href*="/dp/"]').attr('href');
        if (href) {
            const absoluteUrl = new URL(href, 'https://www.amazon.com').href;
            void enqueueLinks({
                urls: [absoluteUrl],
                label: LABELS.PRODUCT,
                userData: {
                    asin: $(product).attr('data-asin'),
                    keyword,
                },
            });
        }
    });
    log.info(`Enqueued ${products.length} products`);
});

router.addHandler(LABELS.PRODUCT, async ({ enqueueLinks, request, $, log }) => {
    const { asin, keyword } = request.userData;
    const title = $('title').text();
    log.info(`${asin}`, { url: request.loadedUrl });
    const description = $('div#productDescription').text().trim();

    const offersUrl = `https://www.amazon.com/gp/aod/ajax/ref=auto_load_aod?asin=${asin}`; // todo replace with BASE_URL + asin
    void enqueueLinks({
        urls: [offersUrl],
        label: LABELS.OFFERS,
        userData: {
            asin,
            itemUrl: request.loadedUrl,
            title,
            description,
            keyword,
        },
    });
});

router.addHandler(LABELS.OFFERS, async ({ request, $, log, pushData }) => {
    const { asin, keyword, title, description } = request.userData;

    log.info(`Offers for ${asin}`, { url: request.loadedUrl });
    const offers = $('#aod-offer');
    log.info(`Found ${offers.length} offers`);

    for (const offer of offers) {
        try {
            const offerElement = $(offer);
            const priceSymbol = offerElement.find('.a-price-symbol').text().trim();
            const priceWhole = offerElement.find('.a-price-whole').text().trim();
            const priceFraction = offerElement.find('.a-price-fraction').text().trim();
            const priceStr = `${priceSymbol}${priceWhole}${priceFraction}`;
            const sellerText = offerElement.find('#aod-offer-soldBy').text();
            const parsedPrice = parsePrice(priceStr);
            const regex = /Sold by\s*(.+)\s*Seller rating/gm;
            const match = regex.exec(sellerText);

            let sellerName = '';
            if (match) {
                sellerName = match[1].trim();
            } else {
                const regex2 = /Sold by\s*(.+)/gm;
                const match2 = regex2.exec(sellerText);
                if (match2) {
                    sellerName = match2[1].trim();
                }
            }
            log.info(`Seller: ${sellerName}, Price: ${priceStr}`, { url: request.loadedUrl });

            await pushData({
                title,
                asin,
                itemUrl: request.loadedUrl,
                description,
                keyword,
                sellerName,
                offer: priceStr,
                price: parsedPrice,
            });
        } catch (error) {
            if (error instanceof Error) {
                log.error(`Error processing offer for ${asin}: ${error.message}`, { url: request.loadedUrl });
            } else {
                log.error(`Unknown error processing offer for ${asin}`, { url: request.loadedUrl });
            }
        }
    }
});
