import json
import io
import sys

file_name = sys.argv[1]
bucket_name = sys.argv[2]
s3_key = sys.argv[3]

with open(file_name, 'r') as stream:
    data_loaded = json.load(stream)
    resources = data_loaded.get('Resources')
    for k in resources.keys():
        if resources.get(k).get('Type').upper() == 'AWS::Lambda::Function'.upper():
            code = {
                'S3Bucket': bucket_name,
                'S3Key': s3_key
            }
            resources.get(k).get('Properties').get('Code').update(code)

    data_loaded['Resources'] = resources

    with io.open(file_name, 'w', encoding="utf-8") as outfile:
        outfile.write(unicode(json.dumps(data_loaded, indent=2)))

