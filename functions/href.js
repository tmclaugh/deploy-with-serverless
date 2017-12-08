"use strict";

const DynamoDB = require("./services/dynamodb");
const responses = require("./utils/responses");

const return404 = callback =>
  responses.redirect(
    "https://s3.amazonaws.com/" + process.env.S3_BUCKET_NAME + "/404.html",
    callback
  );

// Redirects to latest CFN template
module.exports.run = (event, context, callback) => {
  DynamoDB.get({
    url: event.queryStringParameters.url
  })
    .then(item => {
      if (!item) {
        return return404(callback);
      }

      if (item.inProgress) {
        return responses.redirect(
          "https://s3.amazonaws.com/" + process.env.S3_BUCKET_NAME + "/in-progress.html",
          callback
        );
      }

      // FIXME: Make region variable.
      const url = [
        "https://console.aws.amazon.com/cloudformation/home?region=us-east-1",
        `#/stacks/new?stackName=${item.service_name}`,
        `&templateURL=${item.template_url}`
      ].join("");

      return responses.redirect(url, callback);
    })
    .catch(error => {
      console.error(error);
      return return404(callback);
    });
};
