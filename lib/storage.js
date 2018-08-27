var error = require('./error')
	, users = require('./users')
	, async = require('async')
	, _ = require('underscore')
	, amazonS3 = require('awssum-amazon-s3')
	, UserModel = require('../models/user').UserModel
    , fs = require('fs.extra')
    , fmt = require('fmt')
	, crypto = require('crypto')
    , path = require('path');
    // for local debug, feed nonsense keys to aws api.
    process.env["AWSAccessKeyId"] = 100;
    process.env["AWSSecretKey"] = 100;
    
var s3 = new amazonS3.S3({
    'accessKeyId'     : process.env.AWSAccessKeyId,
    'secretAccessKey' : process.env.AWSSecretKey,
    'region'          : amazonS3.US_EAST_1,
});

var S3_BUCKET_NAME = process.env.NODE_ENV != "production" ? "greg-pkgs-testing" : "greg-pkgs-prod";

var mockBucket = './test/mock_bucket/';

/**
 * Upload a package.
 * 
 * For production, this will upload to S3. For development, packages
 * will be written to the /test/mock_bucket folder.
 */
exports.upload =    (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "development" )? uploadToS3 : saveToDisk;

function uploadToS3( req, pkg_data, guid, callback){

        var bodyStream = fs.createReadStream( req.files.pkg.path );

        var objectName = guid + req.files.pkg.name;

        var options = {
        BucketName    : S3_BUCKET_NAME,
        ObjectName    : objectName,
        ContentLength : req.files.pkg.size,
        Body          : bodyStream
        };

        try {
            s3.PutObject(options, function(err, data) {
                fmt.dump(err, 'err');
                fmt.dump(data, 'data');

                if (err){
                    console.error( err )
                    throw err;
                }

                // get the url
                pkg_data.url = "https://s3.amazonaws.com/" + S3_BUCKET_NAME + "/" + objectName;
                callback();
        });
        } catch (e) {
            throw e;
        }
};

function saveToDisk(req, pkg_data, guid, callback){
    
    var objectName = guid + req.files.pkg.name;
    
     fs.copy(req.files.pkg.path, mockBucket + objectName, function(err){
        if(err) {
            throw err;
        };
    });
    
    var resolved = path.resolve("../test/mock_bucket", "./" + objectName);
    pkg_data.url = resolved;
    callback();
};
    