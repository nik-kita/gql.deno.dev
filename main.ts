import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import deno_jsonc from "./deno.json" with { type: "json" };

const app = new OpenAPIHono();

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: (deno_jsonc as { version: string }).version,
    title: "TODO: name your project API",
  },
});

app.get(
  "/api",
  apiReference({
    spec: {
      url: "/doc",
    },
  }),
);

app.notFound((c) => {
  return c.redirect("/api");
});

Deno.serve({
  port: 3000,
}, app.fetch);
