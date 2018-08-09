#!/usr/bin/env node

if ((process.argv.length !== 4)
  || ((process.argv[2] !== 'add') && (process.argv[2] !== 'remove'))) {
  console.log("Usage: whitelist <add|remove> <package-name>");
  console.log("  Examples:");
  console.log("    White-list a package: whitelist add MyAwesomePackage");
  process.exit(1);
}

const newFieldValue = process.argv[2] === "add";
const packageName = process.argv[3];
const fieldName = "white_list";

const mongoose = require('mongoose');

const mongoDbName = process.env.GREG_DB_NAME;
const mongoDbUrl = process.env.GREG_DB_URL;
const mongoUri = mongoDbUrl + mongoDbName;

console.log("Connecting to " + mongoUri);
mongoose.connect(mongoUri);

mongoose.connection.on('error', () => {
  console.error('MongoDB Connection Error. Please make sure MongoDB is running.');
  process.exit(1);
});

const PackageModel = require('../models/package').PackageModel;

mongoose.connection.on('connected', () => {
  console.log("Looking up package with name " + packageName + "...");
  PackageModel.findOne({ name: packageName }, (err, pkg) => {
    if (err) {
      console.log('There was an error trying to look up that package.');
      process.exit(1);
    }

    if (!pkg) {
      console.log('That package does not exist.');
      process.exit(1);
    }

    pkg[fieldName] = newFieldValue;
    pkg.markModified(fieldName);

    pkg.save((saveErr) => {
      if (saveErr) {
        console.log('There was an error trying to save your changes.');
        process.exit(1);
      }

      if (pkg[fieldName]) {
        console.log('Package added to the white list.');
      } else {
        console.log('Package removed from the white list.');
      }

      process.exit(0);
    });
  });
});
