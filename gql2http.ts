import { OpenAPIHono, z } from "@hono/zod-openapi";
import { analyzeDocument, gql } from "graphql-request";
import { HTTPException } from "hono/http-exception";
import { JsonHelper } from "./common/json.helper.ts";

export const gql2http = new OpenAPIHono();

gql2http.openapi({
  method: "post",
  path: "/",
  summary:
    "Parse graphql string into valid json object that should be used for make POST request to your grq-server",
  description: `
  * One operation at a time (root query/mutation block)
  * How pass variables? (if you need)
    Wrap the variables object with special comments:
      * \`"""variables\`  before
      * \`variables"""\` after
    Example:
    \`\`\`
    """variables
    {
      hello: 'world'
    }
    variables"""
    \`\`\`
    P.S.
    > As you can see in example - it is possible to pass relaxed json like in javascript (without strict raw JSON rules)
  `,
  request: {
    body: {
      content: {
        "text/plain": {
          schema: z.string(),
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "JSON object with <query> and optional <variables> and <operationName> properties",
    },
  },
}, async (c) => {
  const text = await c.req.text();
  const jBody = parse_text(text);

  return c.json(jBody);
});

function parse_text(text: string) {
  const needle = '"""variables';
  const startCandidate = text.indexOf(needle);
  const endCandidate = startCandidate && text.lastIndexOf('variables"""');
  const candidate = endCandidate &&
    text.slice(startCandidate + needle.length, endCandidate);
  const variables = candidate
    ? (() => {
      try {
        return JsonHelper.parse(candidate);
      } catch {
        throw new HTTPException(400, {
          message: "Unable to parse <variables> object",
        });
      }
    })()
    : undefined;

  const query = candidate
    ? (() => {
      const textArr = text.split("");
      textArr.splice(
        startCandidate,
        candidate.length + needle.length * 2,
      );
      return textArr.join("");
    })()
    : text;
  const doc = analyzeDocument(gql`${query}`);

  return {
    variables,
    query: doc.expression,
    operationName: doc.operationName,
  };
}
