Exporting resource configurations to stdout...
Usage:
  config-connector bulk-export [flags]
Flags:
      --filter-deleted-iam-members   specify whether to filter out deleted IAM members, options are 'true' or 'false', (default: 'false')
      --folder int                   an optional folder id for which a cloud asset inventory will be exported to a temporary bucket; use the 'storage-key' parameter to avoid the creation of a temporary bucket
  -h, --help                         help for bulk-export
      --iam-format string            specify the IAM resource format or disable IAM output, options are 'partialpolicy', 'policy', 'policymember', or 'none' (default "policy")
  -i, --input string                 an optional input file path containing an asset inventory export, cannot be used with piped input or 'storage-key'
      --oauth2-token string          an optional OAuth 2.0 access token to be used as the identity for communication with GCP services, can be obtained with 'gcloud auth print-access-token'
      --on-error string              control the behavior when a recoverable error occurs, options are 'continue', 'halt', or 'ignore' (default "halt")
      --organization int             an optional organization id for which a cloud asset inventory will be exported to a temporary bucket; use the 'storage-key' parameter to avoid the creation of a temporary bucket
      --output string                an optional output file path, disables standard output, when a file the result will contain all of the command output, when a directory, the directory will contain a new file for each resource in the output
      --project string               an optional project id for which a cloud asset inventory will be exported to a temporary bucket; use the 'storage-key' parameter to avoid the creation of a temporary bucket
  -s, --storage-key string           an optional cloud storage key where an asset inventory export will be stored, example: 'gs://your-bucket-name/your/prefix/path'
Global Flags:
  -v, --verbose   enable verbose logging (disabled by default)
error in 'config-connector' version 'v1.118.0-30-g9c18deb76': cannot supply input on stdin with the 'project' parameter
ERROR: (gcloud.beta.resource-config.bulk-export) The bulk-export command could not finish correctly.
