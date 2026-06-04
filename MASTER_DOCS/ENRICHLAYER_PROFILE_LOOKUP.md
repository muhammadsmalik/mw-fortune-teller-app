API v2
People
Person Lookup Endpoint GET
Person Lookup Endpoint
COST2 credits / successful request
Look up a person with a name and company information. Credits are charged by default even when no match is found; use similarity_checks=skip to avoid charges on null results.

Server URL
https://enrichlayer.com
GET
/
api
/
v2
/
profile
/
resolve
Send
Authorization
Query
Authorization
BearerAuth client
Authorization
Bearer <token>
In: header
Scope: client
Query Parameters

company_domain*
string
Company name or domain
first_name*
string
First name of the user
similarity_checks?
string
Controls whether the API endpoint performs similarity comparisons between the input parameters and the results or simply returns the closest match. For instance, if you are searching for a person named "Jane Smith", and the closest result we have is "Tom Garcia", our similarity checks will discard the obviously incorrect result and return null instead of a false positive.
Include similarity checks to eliminate false positives. However, be aware that this might yield fewer results as false positives are discarded. Credits will still be deducted even if we return null.
You can choose to skip similarity checks, in which case no credits will be charged if we return null.
This parameter accepts the following values:

include (default) - Perform similarity checks and discard false positives. Credits will be deducted even if we return null .
skip - Bypass similarity checks. No credits will be deducted if no results are returned.
enrich_profile?
string
Enrich the result with a cached profile of the lookup result.
The valid values are:

skip (default): do not enrich the results with cached profile data
enrich: enriches the result with cached profile data
Calling this API endpoint with this parameter would add 1 credit.
If you require fresh profile data, please chain this API call with the People Profile Endpoint with the use_cache=if-recent parameter.

location?
string
The location of this user. Name of country, city or state.
title?
string
Title that user is holding at his/her current job
last_name?
string
Last name of the user
Response Body

200
application/json
400
401
403
404
429
500
503
CURL
JAVASCRIPT
GO
PYTHON
JAVA
C#

fetch("https://enrichlayer.com/api/v2/profile/resolve?company_domain=gatesfoundation.org&first_name=Bill&similarity_checks=include&enrich_profile=enrich&location=Seattle&title=Co-chair&last_name=Gates", {
  method: "GET",
  headers: {
    "Authorization": ""
  }
})
200
400
401
403
404
429
500
503

{
  "url": "https://www.linkedin.com/in/kevinolearytv",
  "profile": {
    "public_identifier": "satyanadella",
    "profile_pic_url": "https://assets.enrichlayer.com/pp/profilepic/7d369850c9fe8c35e78a6a50c75334f5",
    "background_cover_image_url": "https://assets.enrichlayer.com/pp/profilepic/fe878f911fecd238e169a23b12103b0e",
    "first_name": "Satya",
    "last_name": "Nadella",
    "full_name": "Satya Nadella",
    "follower_count": 11888127,
    "occupation": "Chairman and CEO at Microsoft",
    "headline": "Chairman and CEO at Microsoft",
    "summary": "As chairman and CEO of Microsoft, I define my mission and that of my company as empowering every person and every organization on the planet to achieve more.",
    "country": "US",
    "country_full_name": "United States of America",
    "city": "Redmond",
    "state": "Washington",
    "experiences": [
      {
        "starts_at": {
          "day": 1,
          "month": 2,
          "year": 2014
        },
        "ends_at": null,
        "company": "Microsoft",
        "company_linkedin_profile_url": "https://www.linkedin.com/company/microsoft",
        "company_facebook_profile_url": null,
        "title": "Chairman and CEO",
        "description": null,
        "location": "Greater Seattle Area",
        "logo_url": "https://assets.enrichlayer.com/ll/D560BAQH32RJQCl3dDQ/company-logo_100_100/B56ZYQ0mrGGoAU-/0/1744038948046/microsoft_logo?e=2147483647&v=beta&t=rr_7_bFRKp6umQxIHErPOZHtR8dMPIYeTjlKFdotJBY"
      },
      {
        "starts_at": {
          "day": 1,
          "month": 1,
          "year": 2018
        },
        "ends_at": null,
        "company": "University of Chicago",
        "company_linkedin_profile_url": "https://www.linkedin.com/company/uchicago",
        "company_facebook_profile_url": null,
        "title": "Member Board Of Trustees",
        "description": null,
        "location": null,
        "logo_url": "https://assets.enrichlayer.com/pp/profilepic/f40c5f31ef246aeb1000ffb4e40f2991"
      },
      {
        "starts_at": {
          "day": 1,
          "month": 1,
          "year": 2017
        },
        "ends_at": {
          "day": 31,
          "month": 12,
          "year": 2024
        },
        "company": "Starbucks",
        "company_linkedin_profile_url": "https://www.linkedin.com/company/starbucks",
        "company_facebook_profile_url": null,
        "title": "Board Member",
        "description": null,
        "location": null,
        "logo_url": "https://assets.enrichlayer.com/ll/C4D0BAQEQxk9y2rk7Hw/company-logo_100_100/company-logo_100_100/0/1631316692276?e=2147483647&v=beta&t=itdoVXP3gnqtQ7Grar4B3YoPyw-Ors9bKMZlZpb0QcY"
      }
    ],
    "education": [
      {
        "starts_at": {
          "day": 1,
          "month": 1,
          "year": 1994
        },
        "ends_at": {
          "day": 31,
          "month": 12,
          "year": 1996
        },
        "field_of_study": null,
        "degree_name": null,
        "school": "The University of Chicago Booth School of Business",
        "school_linkedin_profile_url": "https://www.linkedin.com/company/universityofchicagoboothschoolofbusiness",
        "school_facebook_profile_url": null,
        "description": null,
        "logo_url": "https://assets.enrichlayer.com/pp/profilepic/88fa467a62fbfc5325394253f14e8700",
        "grade": null,
        "activities_and_societies": null
      },
      {
        "starts_at": {
          "day": null,
          "month": null,
          "year": null
        },
        "ends_at": null,
        "field_of_study": "Electrical Engineering",
        "degree_name": "Bachelor’s Degree",
        "school": "Manipal Institute of Technology, Manipal",
        "school_linkedin_profile_url": "https://www.linkedin.com/company/manipal-institute-of-technology",
        "school_facebook_profile_url": null,
        "description": null,
        "logo_url": "https://assets.enrichlayer.com/pp/profilepic/2aef6f72c73e3b40dbd56163897bdc04",
        "grade": null,
        "activities_and_societies": null
      },
      {
        "starts_at": {
          "day": null,
          "month": null,
          "year": null
        },
        "ends_at": null,
        "field_of_study": "Computer Science",
        "degree_name": "Master’s Degree",
        "school": "University of Wisconsin-Milwaukee",
        "school_linkedin_profile_url": "https://www.linkedin.com/company/uwmilwaukee",
        "school_facebook_profile_url": null,
        "description": null,
        "logo_url": "https://assets.enrichlayer.com/pp/profilepic/7916094135030c5846f34230e03dbaa2",
        "grade": null,
        "activities_and_societies": null
      }
    ],
    "accomplishment_organisations": [],
    "accomplishment_publications": [],
    "accomplishment_honors_awards": [],
    "accomplishment_patents": [],
    "accomplishment_courses": [],
    "accomplishment_projects": [],
    "accomplishment_test_scores": [],
    "volunteer_work": [],
    "certifications": [],
    "connections": 500,
    "people_also_viewed": [
      {
        "link": "https://www.linkedin.com/in/kevinolearytv",
        "name": "Kevin O'Leary",
        "summary": "Chairman, O’Leary Ventures and Beanstox",
        "location": "West Palm Beach"
      },
      {
        "link": "https://www.linkedin.com/in/aaronmartinfc",
        "name": "Aaron Martin",
        "summary": "Vice President Healthcare at Amazon",
        "location": "Seattle"
      },
      {
        "link": "https://www.linkedin.com/in/guthriescott",
        "name": "Scott Guthrie",
        "summary": "Executive Vice President at Microsoft",
        "location": "Bellevue"
      },
      {
        "link": "https://www.linkedin.com/in/toufisaliba",
        "name": "Toufi Saliba",
        "summary": "Author TODA/IP  .  | . CEO HyperCycle.AI  .  | . Chair - International Protocols for AI Security IEEE",
        "location": "San Francisco"
      },
      {
        "link": "https://www.linkedin.com/in/rajeshgopinathan",
        "name": "Rajesh Gopinathan",
        "summary": null,
        "location": "Mumbai"
      }
    ],
    "recommendations": [],
    "activities": [
      {
        "title": "Microsoft has been positioned as a Leader for the fourteenth consecutive year in the Gartner 2021 Magic Quadrant for Analytics and Business…",
        "link": null,
        "activity_status": null
      },
      {
        "title": "On March 17, we’re trying something we’ve never done before: Microsoft will host #Include2021, a free, global, digital event focused on diversity &…",
        "link": null,
        "activity_status": null
      },
      {
        "title": "I talked to Bill Gates about his important new book, which provides a framework to reduce our world’s greenhouse gas emissions to zero, including…",
        "link": null,
        "activity_status": null
      }
    ],
    "similarly_named_profiles": [],
    "articles": [],
    "groups": [],
    "meta": {
      "thin_profile": false,
      "last_updated": "2025-03-15T08:22:00Z"
    }
  },
  "last_updated": "2023-10-26T11:34:30Z"
}
Data Dictionary
Previous
COSTN/A
Person Profile Picture Endpoint
GET
Get the profile picture of a person. Returns profile pictures from cached people profiles.
COST0 credit / successful request
On this page
Authorization
Response Body