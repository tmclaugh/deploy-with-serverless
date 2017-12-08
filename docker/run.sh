#!/bin/bash

# FIXME: we should look at making stage and region configurable

aws configure set region us-east-1

# Clone repository and change directory
# FIXME: We might want to ensure a particular branch, tag, or revision.
git clone $REPO_URL src
cd src

SERVICE_NAME=$(python -c "import yaml; f = open('serverless.yml'); y = yaml.load(f); print(y.get('service'))")
CFN_TEMPLATE_NAME='cloudformation-template-update-stack.json'
ARTIFACT_PATH="${SERVICE_NAME}/$(date +%Y)/$(date +%m)/$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
ARTIFACT_NAME="${SERVICE_NAME}.zip"
ARTIFACT_KEY="${ARTIFACT_PATH}/${ARTIFACT_NAME}"

# Install dependencies
echo 'Installing dependencies...'
npm install

# FIXME: Remove from batch job if we're not going to use this. If we're going
# to use this then we need to ensure the handler.js lambda  has access
# controls.
# Apply optional build commands like babel or webpack
# eval $BEFORE_CMD

# Run `serverless package --stage dev`, this might be overriden
# eval $PACKAGE_CMD
serverless package --stage dev -v || exit 1

# FIXME: Remove from batch job if we're not going to use this. If we're going
# to use this then we need to ensure the handler.js lambda  has access
# controls.
# eval $AFTER_CMD

# Go to artifacts & compiled Cloudformation template path
cd .serverless

pwd

# Upload CFN Template
# change some values in template to what we're going to upload them to below.
python ../../change-deployment-bucket.py $CFN_TEMPLATE_NAME $BUCKET $ARTIFACT_KEY

echo 'Uploading CFN template...'
aws s3 cp $CFN_TEMPLATE_NAME s3://${BUCKET}/${ARTIFACT_PATH}/ --acl public-read
aws s3 cp $ARTIFACT_NAME s3://${BUCKET}/${ARTIFACT_PATH}/ --acl public-read


# Put dynamodb item
# FIXME: We can probably do way witn the repo name.
aws dynamodb put-item \
  --table-name serverless-projects  \
  --item '{
    "url": {"S": "'"$REPO_URL"'"},
    "name": {"S": "'"$REPO_NAME"'"},
    "service_name": {"S": "'"$SERVICE_NAME"'"},
    "bucket": {"S": "'"$BUCKET"'"},
    "template_url":{"S":"'"https://s3.amazonaws.com/${BUCKET}/${ARTIFACT_PATH}/${CFN_TEMPLATE_NAME}"'"},
    "inProgress": {"BOOL": false}
  }'
