import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { LABELS } from './constants.js';
import { router } from './routes.js';

interface Input {
    keyword: string;
}

await Actor.init();

const crawler = new CheerioCrawler({
    requestHandler: router,
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 50,
});

const searchResultsUrl = 'https://www.amazon.com/s?k=iphone&ref=nb_sb_noss' // BUGGED, so hardcoded instead of new URL(KEYWORD, BASE_URL).href;
await crawler.addRequests([{
	url: searchResultsUrl,
	label: LABELS.START,
}]);
await crawler.run();

await Actor.exit();
