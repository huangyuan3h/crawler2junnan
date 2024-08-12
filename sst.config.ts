import { SSTConfig } from "sst";
import { Bucket, NextjsSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "crawl-by-excel",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const bucket = new Bucket(stack, "excel");

      const site = new NextjsSite(stack, "site", {
        bind: [bucket],
        environment: {
          NEXT_PUBLIC_EXCEL_BUCKET: process.env.NEXT_PUBLIC_EXCEL_BUCKET ?? "",
        },
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
} satisfies SSTConfig;
