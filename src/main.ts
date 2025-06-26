import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { BASE_URL, LABELS } from './constants.js';
import { router } from './routes.js';

interface Input {
    keyword: string;
}

await Actor.init();

const {keyword} = await Actor.getInput<Input>();
const crawler = new CheerioCrawler({
    requestHandler: router,
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 50,
});

const searchResultsUrl = new URL(BASE_URL + keyword).href;
await crawler.addRequests([{
	url: searchResultsUrl,
	label: LABELS.START,
    userData: {
        keyword,
    },
}]);
await crawler.run();

await Actor.exit();
