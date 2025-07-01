Exporting resource configurations to stdout...
resource "google_apikeys_key" "a0418778_de23_4808_8800_a6f101cb5de1" {
  display_name = "Generative Language API Key"
  name         = "a0418778-de23-4808-8800-a6f101cb5de1"
  project      = "592101465286"
  restrictions {
    api_targets {
      service = "generativelanguage.googleapis.com"
    }
  }
}
# terraform import google_apikeys_key.a0418778_de23_4808_8800_a6f101cb5de1 projects/592101465286/locations/global/keys/a0418778-de23-4808-8800-a6f101cb5de1
resource "google_apikeys_key" "ceedff84_83d4_4db0_94de_496d0f558ab6" {
  display_name = "API key"
  name         = "ceedff84-83d4-4db0-94de-496d0f558ab6"
  project      = "592101465286"
}
# terraform import google_apikeys_key.ceedff84_83d4_4db0_94de_496d0f558ab6 projects/592101465286/locations/global/keys/ceedff84-83d4-4db0-94de-496d0f558ab6
resource "google_apikeys_key" "d6f351c0_a606_4786_b131_f32760249f1b" {
  display_name = "Generative Language API Key"
  name         = "d6f351c0-a606-4786-b131-f32760249f1b"
  project      = "592101465286"
  restrictions {
    api_targets {
      service = "generativelanguage.googleapis.com"
    }
  }
}
# terraform import google_apikeys_key.d6f351c0_a606_4786_b131_f32760249f1b projects/592101465286/locations/global/keys/d6f351c0-a606-4786-b131-f32760249f1b
resource "google_apikeys_key" "c89ee2f3_2efb_4470_9c39_4d855d885dc7" {
  display_name = "Generative Language API Key"
  name         = "c89ee2f3-2efb-4470-9c39-4d855d885dc7"
  project      = "592101465286"
  restrictions {
    api_targets {
      service = "generativelanguage.googleapis.com"
    }
  }
}
# terraform import google_apikeys_key.c89ee2f3_2efb_4470_9c39_4d855d885dc7 projects/592101465286/locations/global/keys/c89ee2f3-2efb-4470-9c39-4d855d885dc7
resource "google_project" "inbound_entity_461511_j4" {
  auto_create_network = true
  billing_account     = "016C38-BB0D9D-71C8C6"
  labels = {
    generative-language = "enabled"
  }
  name       = "My First Project"
  project_id = "inbound-entity-461511-j4"
}
# terraform import google_project.inbound_entity_461511_j4 projects/inbound-entity-461511-j4
resource "google_compute_firewall" "default_allow_rdp" {
  allow {
    ports    = ["3389"]
    protocol = "tcp"
  }
  description   = "Allow RDP from anywhere"
  direction     = "INGRESS"
  name          = "default-allow-rdp"
  network       = "https://www.googleapis.com/compute/v1/projects/inbound-entity-461511-j4/global/networks/default"
  priority      = 65534
  project       = "inbound-entity-461511-j4"
  source_ranges = ["0.0.0.0/0"]
}
# terraform import google_compute_firewall.default_allow_rdp projects/inbound-entity-461511-j4/global/firewalls/default-allow-rdp
resource "google_compute_firewall" "default_allow_icmp" {
  allow {
    protocol = "icmp"
  }
  description   = "Allow ICMP from anywhere"
  direction     = "INGRESS"
  name          = "default-allow-icmp"
  network       = "https://www.googleapis.com/compute/v1/projects/inbound-entity-461511-j4/global/networks/default"
  priority      = 65534
  project       = "inbound-entity-461511-j4"
  source_ranges = ["0.0.0.0/0"]
}
# terraform import google_compute_firewall.default_allow_icmp projects/inbound-entity-461511-j4/global/firewalls/default-allow-icmp
resource "google_compute_firewall" "default_allow_internal" {
  allow {
    ports    = ["0-65535"]
    protocol = "tcp"
  }
  allow {
    ports    = ["0-65535"]
    protocol = "udp"
  }
  allow {
    protocol = "icmp"
  }
  description   = "Allow internal traffic on the default network"
  direction     = "INGRESS"
  name          = "default-allow-internal"
  network       = "https://www.googleapis.com/compute/v1/projects/inbound-entity-461511-j4/global/networks/default"
  priority      = 65534
  project       = "inbound-entity-461511-j4"
  source_ranges = ["10.128.0.0/9"]
}
# terraform import google_compute_firewall.default_allow_internal projects/inbound-entity-461511-j4/global/firewalls/default-allow-internal
resource "google_compute_firewall" "default_allow_ssh" {
  allow {
    ports    = ["22"]
    protocol = "tcp"
  }
  description   = "Allow SSH from anywhere"
  direction     = "INGRESS"
  name          = "default-allow-ssh"
  network       = "https://www.googleapis.com/compute/v1/projects/inbound-entity-461511-j4/global/networks/default"
  priority      = 65534
  project       = "inbound-entity-461511-j4"
  source_ranges = ["0.0.0.0/0"]
}
# terraform import google_compute_firewall.default_allow_ssh projects/inbound-entity-461511-j4/global/firewalls/default-allow-ssh
resource "google_service_account" "592101465286_compute" {
  account_id   = "592101465286-compute"
  display_name = "Default compute service account"
  project      = "inbound-entity-461511-j4"
}
# terraform import google_service_account.592101465286_compute projects/inbound-entity-461511-j4/serviceAccounts/592101465286-compute@inbound-entity-461511-j4.iam.gserviceaccount.com
resource "google_logging_project_sink" "a_required" {
  destination            = "logging.googleapis.com/projects/inbound-entity-461511-j4/locations/global/buckets/_Required"
  filter                 = "LOG_ID(\"cloudaudit.googleapis.com/activity\") OR LOG_ID(\"externalaudit.googleapis.com/activity\") OR LOG_ID(\"cloudaudit.googleapis.com/system_event\") OR LOG_ID(\"externalaudit.googleapis.com/system_event\") OR LOG_ID(\"cloudaudit.googleapis.com/access_transparency\") OR LOG_ID(\"externalaudit.googleapis.com/access_transparency\")"
  name                   = "_Required"
  project                = "592101465286"
  unique_writer_identity = true
}
# terraform import google_logging_project_sink.a_required 592101465286###_Required
resource "google_project_service" "autoscaling_googleapis_com" {
  project = "592101465286"
  service = "autoscaling.googleapis.com"
}
# terraform import google_project_service.autoscaling_googleapis_com 592101465286/autoscaling.googleapis.com
resource "google_project_service" "analyticshub_googleapis_com" {
  project = "592101465286"
  service = "analyticshub.googleapis.com"
}
# terraform import google_project_service.analyticshub_googleapis_com 592101465286/analyticshub.googleapis.com
resource "google_project_service" "bigqueryconnection_googleapis_com" {
  project = "592101465286"
  service = "bigqueryconnection.googleapis.com"
}
# terraform import google_project_service.bigqueryconnection_googleapis_com 592101465286/bigqueryconnection.googleapis.com
resource "google_cloud_run_v2_service" "terraform_mcp_service" {
  client       = "cloud-console"
  ingress      = "INGRESS_TRAFFIC_ALL"
  launch_stage = "BETA"
  location     = "us-central1"
  name         = "terraform-mcp-service"
  project      = "inbound-entity-461511-j4"
  template {
    containers {
      image = "gcr.io/inbound-entity-461511-j4/terraform-mcp-sse:latest"
      ports {
        container_port = 8080
        name           = "http1"
      }
      resources {
        cpu_idle = true
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        startup_cpu_boost = true
      }
      startup_probe {
        failure_threshold     = 1
        initial_delay_seconds = 0
        period_seconds        = 240
        tcp_socket {
          port = 8080
        }
        timeout_seconds = 240
      }
    }
    max_instance_request_concurrency = 80
    scaling {
      max_instance_count = 40
    }
    service_account = "592101465286-compute@developer.gserviceaccount.com"
    timeout         = "300s"
  }
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
# terraform import google_cloud_run_v2_service.terraform_mcp_service projects/inbound-entity-461511-j4/locations/us-central1/services/terraform-mcp-service
resource "google_project_service" "artifactregistry_googleapis_com" {
  project = "592101465286"
  service = "artifactregistry.googleapis.com"
}
# terraform import google_project_service.artifactregistry_googleapis_com 592101465286/artifactregistry.googleapis.com
resource "google_project_service" "cloudapis_googleapis_com" {
  project = "592101465286"
  service = "cloudapis.googleapis.com"
}
# terraform import google_project_service.cloudapis_googleapis_com 592101465286/cloudapis.googleapis.com
resource "google_project_service" "bigqueryreservation_googleapis_com" {
  project = "592101465286"
  service = "bigqueryreservation.googleapis.com"
}
# terraform import google_project_service.bigqueryreservation_googleapis_com 592101465286/bigqueryreservation.googleapis.com
resource "google_project_service" "cloudtrace_googleapis_com" {
  project = "592101465286"
  service = "cloudtrace.googleapis.com"
}
# terraform import google_project_service.cloudtrace_googleapis_com 592101465286/cloudtrace.googleapis.com
resource "google_project_service" "bigquerymigration_googleapis_com" {
  project = "592101465286"
  service = "bigquerymigration.googleapis.com"
}
# terraform import google_project_service.bigquerymigration_googleapis_com 592101465286/bigquerymigration.googleapis.com
resource "google_project_service" "cloudasset_googleapis_com" {
  project = "592101465286"
  service = "cloudasset.googleapis.com"
}
# terraform import google_project_service.cloudasset_googleapis_com 592101465286/cloudasset.googleapis.com
resource "google_project_service" "cloudbuild_googleapis_com" {
  project = "592101465286"
  service = "cloudbuild.googleapis.com"
}
# terraform import google_project_service.cloudbuild_googleapis_com 592101465286/cloudbuild.googleapis.com
resource "google_project_service" "containerregistry_googleapis_com" {
  project = "592101465286"
  service = "containerregistry.googleapis.com"
}
# terraform import google_project_service.containerregistry_googleapis_com 592101465286/containerregistry.googleapis.com
resource "google_project_service" "containeranalysis_googleapis_com" {
  project = "592101465286"
  service = "containeranalysis.googleapis.com"
}
# terraform import google_project_service.containeranalysis_googleapis_com 592101465286/containeranalysis.googleapis.com
resource "google_project_service" "compute_googleapis_com" {
  project = "592101465286"
  service = "compute.googleapis.com"
}
# terraform import google_project_service.compute_googleapis_com 592101465286/compute.googleapis.com
resource "google_project_service" "containerfilesystem_googleapis_com" {
  project = "592101465286"
  service = "containerfilesystem.googleapis.com"
}
# terraform import google_project_service.containerfilesystem_googleapis_com 592101465286/containerfilesystem.googleapis.com
resource "google_project_service" "containerscanning_googleapis_com" {
  project = "592101465286"
  service = "containerscanning.googleapis.com"
}
# terraform import google_project_service.containerscanning_googleapis_com 592101465286/containerscanning.googleapis.com
resource "google_project_service" "bigquery_googleapis_com" {
  project = "592101465286"
  service = "bigquery.googleapis.com"
}
# terraform import google_project_service.bigquery_googleapis_com 592101465286/bigquery.googleapis.com
resource "google_project_service" "dataform_googleapis_com" {
  project = "592101465286"
  service = "dataform.googleapis.com"
}
# terraform import google_project_service.dataform_googleapis_com 592101465286/dataform.googleapis.com
resource "google_project_service" "datalineage_googleapis_com" {
  project = "592101465286"
  service = "datalineage.googleapis.com"
}
# terraform import google_project_service.datalineage_googleapis_com 592101465286/datalineage.googleapis.com
resource "google_project_service" "datastore_googleapis_com" {
  project = "592101465286"
  service = "datastore.googleapis.com"
}
# terraform import google_project_service.datastore_googleapis_com 592101465286/datastore.googleapis.com
resource "google_project_service" "customsearch_googleapis_com" {
  project = "592101465286"
  service = "customsearch.googleapis.com"
}
# terraform import google_project_service.customsearch_googleapis_com 592101465286/customsearch.googleapis.com
resource "google_project_service" "bigquerystorage_googleapis_com" {
  project = "592101465286"
  service = "bigquerystorage.googleapis.com"
}
# terraform import google_project_service.bigquerystorage_googleapis_com 592101465286/bigquerystorage.googleapis.com
resource "google_project_service" "bigquerydatapolicy_googleapis_com" {
  project = "592101465286"
  service = "bigquerydatapolicy.googleapis.com"
}
# terraform import google_project_service.bigquerydatapolicy_googleapis_com 592101465286/bigquerydatapolicy.googleapis.com
resource "google_project_service" "discoveryengine_googleapis_com" {
  project = "592101465286"
  service = "discoveryengine.googleapis.com"
}
# terraform import google_project_service.discoveryengine_googleapis_com 592101465286/discoveryengine.googleapis.com
resource "google_project_service" "cloudresourcemanager_googleapis_com" {
  project = "592101465286"
  service = "cloudresourcemanager.googleapis.com"
}
# terraform import google_project_service.cloudresourcemanager_googleapis_com 592101465286/cloudresourcemanager.googleapis.com
resource "google_project_service" "run_googleapis_com" {
  project = "592101465286"
  service = "run.googleapis.com"
}
# terraform import google_project_service.run_googleapis_com 592101465286/run.googleapis.com
resource "google_project_service" "deploymentmanager_googleapis_com" {
  project = "592101465286"
  service = "deploymentmanager.googleapis.com"
}
# terraform import google_project_service.deploymentmanager_googleapis_com 592101465286/deploymentmanager.googleapis.com
resource "google_project_service" "aiplatform_googleapis_com" {
  project = "592101465286"
  service = "aiplatform.googleapis.com"
}
# terraform import google_project_service.aiplatform_googleapis_com 592101465286/aiplatform.googleapis.com
resource "google_project_service" "dialogflow_googleapis_com" {
  project = "592101465286"
  service = "dialogflow.googleapis.com"
}
# terraform import google_project_service.dialogflow_googleapis_com 592101465286/dialogflow.googleapis.com
resource "google_project_service" "dataplex_googleapis_com" {
  project = "592101465286"
  service = "dataplex.googleapis.com"
}
# terraform import google_project_service.dataplex_googleapis_com 592101465286/dataplex.googleapis.com
resource "google_project_service" "monitoring_googleapis_com" {
  project = "592101465286"
  service = "monitoring.googleapis.com"
}
# terraform import google_project_service.monitoring_googleapis_com 592101465286/monitoring.googleapis.com
resource "google_project_service" "networkconnectivity_googleapis_com" {
  project = "592101465286"
  service = "networkconnectivity.googleapis.com"
}
# terraform import google_project_service.networkconnectivity_googleapis_com 592101465286/networkconnectivity.googleapis.com
resource "google_project_service" "gkebackup_googleapis_com" {
  project = "592101465286"
  service = "gkebackup.googleapis.com"
}
# terraform import google_project_service.gkebackup_googleapis_com 592101465286/gkebackup.googleapis.com
resource "google_storage_bucket" "export_2emvipe22ql72utfqfya" {
  force_destroy            = false
  location                 = "US"
  name                     = "export-2emvipe22ql72utfqfya"
  project                  = "inbound-entity-461511-j4"
  public_access_prevention = "inherited"
  storage_class            = "STANDARD"
}
# terraform import google_storage_bucket.export_2emvipe22ql72utfqfya export-2emvipe22ql72utfqfya
resource "google_storage_bucket" "run_sources_inbound_entity_461511_j4_us_east1" {
  cors {
    method = ["GET"]
    origin = ["https://*.cloud.google.com", "https://*.corp.google.com", "https://*.corp.google.com:*", "https://*.cloud.google", "https://*.byoid.goog"]
  }
  force_destroy               = false
  location                    = "US-EAST1"
  name                        = "run-sources-inbound-entity-461511-j4-us-east1"
  project                     = "inbound-entity-461511-j4"
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.run_sources_inbound_entity_461511_j4_us_east1 run-sources-inbound-entity-461511-j4-us-east1
resource "google_project_service" "iamcredentials_googleapis_com" {
  project = "592101465286"
  service = "iamcredentials.googleapis.com"
}
# terraform import google_project_service.iamcredentials_googleapis_com 592101465286/iamcredentials.googleapis.com
resource "google_project_service" "storage_api_googleapis_com" {

Export complete.
  project = "592101465286"
  service = "storage-api.googleapis.com"
}
# terraform import google_project_service.storage_api_googleapis_com 592101465286/storage-api.googleapis.com
resource "google_logging_project_sink" "a_default" {
  destination            = "logging.googleapis.com/projects/inbound-entity-461511-j4/locations/global/buckets/_Default"
  filter                 = "NOT LOG_ID(\"cloudaudit.googleapis.com/activity\") AND NOT LOG_ID(\"externalaudit.googleapis.com/activity\") AND NOT LOG_ID(\"cloudaudit.googleapis.com/system_event\") AND NOT LOG_ID(\"externalaudit.googleapis.com/system_event\") AND NOT LOG_ID(\"cloudaudit.googleapis.com/access_transparency\") AND NOT LOG_ID(\"externalaudit.googleapis.com/access_transparency\")"
  name                   = "_Default"
  project                = "592101465286"
  unique_writer_identity = true
}
# terraform import google_logging_project_sink.a_default 592101465286###_Default
resource "google_project_service" "servicemanagement_googleapis_com" {
  project = "592101465286"
  service = "servicemanagement.googleapis.com"
}
# terraform import google_project_service.servicemanagement_googleapis_com 592101465286/servicemanagement.googleapis.com
resource "google_project_service" "serviceusage_googleapis_com" {
  project = "592101465286"
  service = "serviceusage.googleapis.com"
}
# terraform import google_project_service.serviceusage_googleapis_com 592101465286/serviceusage.googleapis.com
resource "google_project_service" "logging_googleapis_com" {
  project = "592101465286"
  service = "logging.googleapis.com"
}
# terraform import google_project_service.logging_googleapis_com 592101465286/logging.googleapis.com
resource "google_project_service" "pubsub_googleapis_com" {
  project = "592101465286"
  service = "pubsub.googleapis.com"
}
# terraform import google_project_service.pubsub_googleapis_com 592101465286/pubsub.googleapis.com
resource "google_storage_bucket" "run_sources_inbound_entity_461511_j4_us_east4" {
  cors {
    method = ["GET"]
    origin = ["https://*.cloud.google.com", "https://*.corp.google.com", "https://*.corp.google.com:*", "https://*.cloud.google", "https://*.byoid.goog"]
  }
  force_destroy               = false
  location                    = "US-EAST4"
  name                        = "run-sources-inbound-entity-461511-j4-us-east4"
  project                     = "inbound-entity-461511-j4"
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.run_sources_inbound_entity_461511_j4_us_east4 run-sources-inbound-entity-461511-j4-us-east4
resource "google_project_service" "storage_googleapis_com" {
  project = "592101465286"
  service = "storage.googleapis.com"
}
# terraform import google_project_service.storage_googleapis_com 592101465286/storage.googleapis.com
resource "google_project_service" "oslogin_googleapis_com" {
  project = "592101465286"
  service = "oslogin.googleapis.com"
}
# terraform import google_project_service.oslogin_googleapis_com 592101465286/oslogin.googleapis.com
resource "google_storage_bucket" "export_czkghfu6w6pav2frsxyq" {
  force_destroy            = false
  location                 = "US"
  name                     = "export-czkghfu6w6pav2frsxyq"
  project                  = "inbound-entity-461511-j4"
  public_access_prevention = "inherited"
  storage_class            = "STANDARD"
}
# terraform import google_storage_bucket.export_czkghfu6w6pav2frsxyq export-czkghfu6w6pav2frsxyq
resource "google_project_service" "generativelanguage_googleapis_com" {
  project = "592101465286"
  service = "generativelanguage.googleapis.com"
}
# terraform import google_project_service.generativelanguage_googleapis_com 592101465286/generativelanguage.googleapis.com
resource "google_project_service" "storage_component_googleapis_com" {
  project = "592101465286"
  service = "storage-component.googleapis.com"
}
# terraform import google_project_service.storage_component_googleapis_com 592101465286/storage-component.googleapis.com
resource "google_storage_bucket" "export_7ea6nbf3rfxh7lc7hmdq" {
  force_destroy            = false
  location                 = "US"
  name                     = "export-7ea6nbf3rfxh7lc7hmdq"
  project                  = "inbound-entity-461511-j4"
  public_access_prevention = "inherited"
  storage_class            = "STANDARD"
}
# terraform import google_storage_bucket.export_7ea6nbf3rfxh7lc7hmdq export-7ea6nbf3rfxh7lc7hmdq
resource "google_project_service" "sql_component_googleapis_com" {
  project = "592101465286"
  service = "sql-component.googleapis.com"
}
# terraform import google_project_service.sql_component_googleapis_com 592101465286/sql-component.googleapis.com
resource "google_storage_bucket" "export_ag6yvqffmoie2rpocyha" {
  force_destroy            = false
  location                 = "US"
  name                     = "export-ag6yvqffmoie2rpocyha"
  project                  = "inbound-entity-461511-j4"
  public_access_prevention = "inherited"
  storage_class            = "STANDARD"
}
# terraform import google_storage_bucket.export_ag6yvqffmoie2rpocyha export-ag6yvqffmoie2rpocyha
resource "google_project_service" "dataflow_googleapis_com" {
  project = "592101465286"
  service = "dataflow.googleapis.com"
}
# terraform import google_project_service.dataflow_googleapis_com 592101465286/dataflow.googleapis.com
resource "google_project_service" "notebooks_googleapis_com" {
  project = "592101465286"
  service = "notebooks.googleapis.com"
}
# terraform import google_project_service.notebooks_googleapis_com 592101465286/notebooks.googleapis.com
resource "google_storage_bucket" "run_sources_inbound_entity_461511_j4_us_central1" {
  cors {
    method = ["GET"]
    origin = ["https://*.cloud.google.com", "https://*.corp.google.com", "https://*.corp.google.com:*", "https://*.cloud.google", "https://*.byoid.goog"]
  }
  force_destroy               = false
  location                    = "US-CENTRAL1"
  name                        = "run-sources-inbound-entity-461511-j4-us-central1"
  project                     = "inbound-entity-461511-j4"
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.run_sources_inbound_entity_461511_j4_us_central1 run-sources-inbound-entity-461511-j4-us-central1
resource "google_project_service" "visionai_googleapis_com" {
  project = "592101465286"
  service = "visionai.googleapis.com"
}
# terraform import google_project_service.visionai_googleapis_com 592101465286/visionai.googleapis.com
