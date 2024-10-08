import "sst/node/config";
declare module "sst/node/config" {
  export interface ConfigTypes {
    APP: string;
    STAGE: string;
  }
}

import "sst/node/bucket";
declare module "sst/node/bucket" {
  export interface BucketResources {
    "public": {
      bucketName: string;
    }
  }
}

import "sst/node/table";
declare module "sst/node/table" {
  export interface TableResources {
    "JobStatusTable": {
      tableName: string;
    }
  }
}

import "sst/node/job";
declare module "sst/node/job" {
  export interface JobResources {
    "process": {
      functionName: string;
    }
  }
}

import "sst/node/site";
declare module "sst/node/site" {
  export interface NextjsSiteResources {
    "site": {
      url: string;
    }
  }
}

