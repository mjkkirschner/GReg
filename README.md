# Dynamo Package Manager

[![Build Status](https://master-5.jenkins.autodesk.com/buildStatus/icon?job=Dynamo/PackageManager/master)](https://master-5.jenkins.autodesk.com/job/Dynamo/job/PackageManager/job/master/)

## Running and testing locally

### Option 1 - Using docker-compose:

The first time:

```bash
$ docker-compose up
```

After making changes, run `build` before `up` to rebuild the GReg docker image.

```bash
$ docker-compose build; docker-compose up
```

### Option 2 - Mongo in a container, GReg on host:

```bash
$ npm install
$ npm run mongo
$ npm start
```

### Running tests
```bash
$ npm install
$ npm run mongo
$ npm test
```

### Populating a database with realistic data

TBD

# Deploying GReg

(Documentation in progress)

### The following keys can be set in the environment variables or an `.env` file.

 1. GREG_DB_NAME -  Database name 
 2. GREG_DB_URL - MongoDB URL
 3. AWSAccessKeyId - AWS access key
 4. AWSSecretKey - AWS secret key
 5. NODE_ENV - Node Environment [dev / production]
 6. GREG_USE_OXYGEN - specify true or false. if false, basic authentication will be used.
 7. PORT - Port where the server will run. default: 8080
 8. OXYGEN_VALIDATION_URL - Validation URL for oxygen authentication


# GReg Server API

## Response Format
All requests from the database are returned in JSON format with the following format:

```
    {
        "success": <Boolean>,
        "timestamp": <in ms since the Unix epoch>,
        "content": {
            <when success = true, the response payload>
        }
    }
```

## GET 

### User
#### /toc/

This returns the *terms of use* acceptance status for the current authenticated user. If the user is not found, this API returns `false` for `accepted` field:

    {
        user_id: String,
        accepted: Boolean
    }

### Package
#### /pkg/

This returns all of the package headers in the database.

#### /pkgs/

This also returns all of the package headers in the database.

#### /pkg/[id]

This returns the unique package header associated with that [id].

#### /pkg_engine/[engine]
Returns all the packages with the given engine name. (e.g. "dynamo" or "designscript")

#### /pkg_engine/[engine]/[name]

Returns the single package with the given engine name ([engine]) and package name ([name]).  This is guaranteed to be a single unique package.

### Package search

#### /pkg_search/[query]

Returns the list of packages returned by keyword search ([query]) over the packages

#### /pkg_search/[query]
Returns the of packages returned by keyword search ([query]) over the packages

## POST

#### /pkg/
Posts a new package.  Requires an oauth authorization header validated from Oxygen.

## PUT

### User
#### /toc/
Updates the *terms of use* acceptance status for the current authenticated user to `true`. If the call is successful, the following data is returned:

    {
        user_id: String,
        accepted: Boolean
    }

### Package
#### /pkg/
Posts a new package version.  Requires an oauth authorization header validated from Oxygen.

#### /pkg-vote/[id]
Votes for a package.  Only increments if the user is authorized and never voted for the package before.

### Whitelist
White-listing is used primarily in the context of Reach. When a package is white-listed, it will be downloaded and made available to Reach instances.

#### /whitelist/[pkg_id]
Add a package to the white list.

#### /unwhitelist/[pkg_id]
Remove a package from the white list.

#### /whitelist
Get all packages on the white list.



