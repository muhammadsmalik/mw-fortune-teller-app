# API Rate Limits Comparison

## 1. Google Sheets API

### Write Requests (like appending a new lead)
- 60 requests per minute per user per project
- 300 requests per minute per project

### Read Requests
- 60 requests per minute per user per project
- 300 requests per minute per project

### Overall
There's no daily limit mentioned, as long as you stay within the per-minute quotas. Exceeding these quotas will result in a 429: Too many requests error.

### Cost
Using the Google Sheets API within these limits is free. Exceeding limits doesn't incur charges; your requests will simply be denied until the quota refills.

### Additional Constraints
- **Payload Size**: While not a hard limit, Google recommends a 2MB maximum payload per API request for better performance.
- **Request Time Limit**: A single API request has a maximum processing time of 180 seconds before it times out.

For your lead generation app, where you're likely writing one row per submission, the "60 write requests per minute per user per project" is the most relevant. This is quite generous for typical lead capture scenarios.

## 2. Airtable API

### Rate Limits
- **General Rate Limit**: 5 requests per second per base (applies to all plans)
- **Personal Access Token Limit**: 50 requests per second for all traffic using personal access tokens from a given user or service account
- **Exceeding Limits**: If you exceed this, you'll get a 429 status code and need to wait 30 seconds before new requests succeed

### Batching
You can batch up to 10 records per request for creating, updating, or deleting, effectively allowing you to modify up to 50 records per second if you batch operations.

### Monthly Call Limits by Plan
- **Free Plan**: 1,000 calls per workspace per month. If exceeded, there's a one-time 30-day grace period. After that, calls over the limit are blocked until the month resets.
- **Team Plan**: 100,000 calls per workspace per month. If exceeded, API calls slow down to 2 requests per second until the month resets.
- **Business and Enterprise Plans**: Unlimited API calls (but still subject to the 5 requests/second rate limit)

For Airtable, if you're on the Free plan, the 1,000 calls per month might be a constraint if your app gets a lot of use (roughly 30 leads per day). The 5 requests per second is generally fine for individual lead submissions.
