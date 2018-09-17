const amazonS3 = require('awssum-amazon-s3');
const fs = require('fs.extra');
const fmt = require('fmt');
const path = require('path');

const s3 = new amazonS3.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  region: amazonS3.US_EAST_1,
});

const S3_BUCKET_NAME = process.env.NODE_ENV !== 'production' ? 'greg-pkgs-testing' : 'greg-pkgs-prod';
const mockBucket = './test/mock_bucket/';


function uploadToS3(req, pkg_data, guid, callback) {
  const objectName = guid + req.file.originalname;

  const options = {
    BucketName: S3_BUCKET_NAME,
    ObjectName: objectName,
    ContentLength: req.file.size,
    Body: req.file.buffer,
  };

  try {
    s3.PutObject(options, (err, data) => {
      fmt.dump(err, 'err');
      fmt.dump(data, 'data');

      if (err) {
        console.error(err);
        throw err;
      }

      // get the url
      pkg_data.url = `https://s3.amazonaws.com/${S3_BUCKET_NAME}/${objectName}`;
      callback();
    });
  } catch (e) {
    throw e;
  }
}

function saveToDisk(req, pkg_data, guid, callback) {
  const objectName = guid + req.file.originalname;

  const outfile = fs.createWriteStream(mockBucket + objectName);
  outfile.write(req.file.buffer);
  outfile.end();

  const resolved = path.resolve('../test/mock_bucket', `./${objectName}`);
  pkg_data.url = resolved;
  callback();
}

/**
 * Upload a package.
 *
 * For production, this will upload to S3. For development, packages
 * will be written to the /test/mock_bucket folder.
 */
exports.upload = (
  process.env.NODE_ENV === 'production'
  || process.env.NODE_ENV === 'development')
  ? uploadToS3 : saveToDisk;
