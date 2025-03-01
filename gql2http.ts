import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import * as graphql_http from "graphql-http";

export const gql2http = new OpenAPIHono();

gql2http.openapi({
  method: "post",
  path: "/",
  responses: {
    200: {
      description: "",
    },
  },
}, async (c) => {
  try {
    const maybeParams = await graphql_http.parseRequestParams<
      typeof c.req,
      typeof c
    >({
      body: await c.req.json(),
      context: c,
      headers: c.req.header(),
      method: c.req.method,
      raw: c.req,
      url: c.req.url,
    });

    if (!maybeParams) {
      return c.json(
        { error: "not a well-formatted GraphQL over HTTP request" },
        400,
      );
    }

    return c.json(maybeParams);
    // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    throw new HTTPException(400, err);
  }
});
