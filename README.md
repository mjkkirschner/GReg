# Graph Registry (GReg)

## Current state
> Stable

## Installation
Run the command ```npm install ``` to get the latest packages
### The following keys must be set in the environment variables. 
[note that this is not set in config file. This has to be in environment variables]
 1. GREG_DB_NAME -  Database name. 
 2. GREG_DB_URL - mongodb URL
 3. AWSAccessKeyId - AWS access key
 4. AWSSecretKey - AWS secret key.
 5. NODE_ENV - Node Environment [dev / production]
 6. GREG_USE_OXYGEN - specify true or false. if false, basic authentication will be used.
 7. PORT - Port where the server will run. default: 8080
 8. OXYGEN_VALIDATION_URL - Validation URL for oxygen authentication

 Once the enviornment variables are set, run ``` node app.js ```

## Response Format
All requests from the database are returned in JSON format with the following format:

    {
        success: Boolean,
        timestamp: ms since the Unix epoch,
        contents: {
                    ... If success, whatever it is you requested ...
                  }
    }

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

####/pkg_search/[query]
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

#### /whitelist/:pkg_id
Add a package to the white list.

#### /unwhitelist/:pkg_id
Remove a package from the white list.

#### /whitelist
Get all packages on the white list.

# Starting and Stopping the Server
- To start the server `./start-server`
- To stop the server `./stop-server`

## GDPR

All the required keys for GDPR is in S3. contact ``` dynamo.reach@autodesk.com``` for details.

# Log Files
The package manager `./start-server` script uses [foreverjs](https://github.com/foreverjs/forever). It is configured to write three log files to `/logs`, `ERR`,`OUT`, and `LOG`. These log files are rotated weekly using [logrotate](http://www.linuxcommand.org/man_pages/logrotate8.html). The logrotate configuration file, and a cron job for running logrotate can be found in `/logrotate`.

# Current Node Version
V4.4.7 LTS (Recommended for most users at https://nodejs.org/en/)
