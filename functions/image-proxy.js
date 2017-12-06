"use strict";

const AWS = require("aws-sdk");
const DynamoDB = require("./services/dynamodb");
const response = require("./utils/responses");
const extractProjectName = require("./utils/extractProjectName");
const Lambda = new AWS.Lambda();
const S3 = new AWS.S3();

const createBucket = Bucket =>
  S3.createBucket({
    Bucket,
    ACL: "public-read"
  }).promise();

const returnReady = callback =>
  response.redirect(
    "https://s3.amazonaws.com/" + process.env.S3_BUCKET_NAME + "/button-ready.svg",
    callback
  );

module.exports.run = (event, context, callback) => {
  // TODO: Check if built project is up to date

  const timestamp = +new Date();
  const url = event.queryStringParameters.url;
  // Don't allow passing arbitrary pre commands to execute.
  const before = null;
  const pkg = event.queryStringParameters.package;
  // Don't allow passing arbitrary post commands to execute.
  const after = null;
  const bucket = `${extractProjectName(url)}-${timestamp}`;

  DynamoDB.get({
    url
  })
    .then(item => {
      if (!item) {
        console.log("Project not found, submitting job...");

        console.log(bucket);

        const processName = process.env.INVOKED_FUNCTION_NAME
        createBucket(bucket)
          .then(() => {
            return Lambda.invoke({
              FunctionName: processName,
              Payload: JSON.stringify({
                url,
                before,
                package: pkg,
                after,
                bucket
              })
            })
              .promise()
              .then(() => {
                DynamoDB.put({
                  inProgress: true,
                  url,
                  name: extractProjectName(url),
                  bucket
                }).then(data => {
                  console.log(data);
                  return returnReady(callback);
                });
              });
          })
          .catch(error => {
            console.error(error);
            return returnReady(callback);
          });
      }

      console.log("Project already built...");

      return returnReady(callback);
    })
    .catch(error => {
      console.error(error);
      return returnReady(callback);
    });
};
