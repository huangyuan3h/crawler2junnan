import { SSTConfig } from "sst";
import { Bucket, NextjsSite } from "sst/constructs";
import { Job } from "sst/constructs";
import { getTableConfig } from "./cdk/table";

export default {
  config(_input) {
    return {
      name: "crawl-by-excel",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const bucket = new Bucket(stack, "public");
      const { JobStatusTable } = getTableConfig(stack);

      const job = new Job(stack, "process", {
        handler: "functions/process.handler",
        bind: [bucket, JobStatusTable],
      });

      const site = new NextjsSite(stack, "site", {
        bind: [bucket, job, JobStatusTable],
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
} satisfies SSTConfig;
