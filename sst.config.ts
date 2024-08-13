import { SSTConfig } from "sst";
import { Bucket, NextjsSite } from "sst/constructs";
import { Job } from "sst/constructs";

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

      const job = new Job(stack, "process", {
        handler: "functions/process.handler",
        bind: [bucket],
      });

      const site = new NextjsSite(stack, "site", {
        bind: [bucket, job],
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
} satisfies SSTConfig;
