import { OpenAPIHono, z } from "@hono/zod-openapi";
import { analyzeDocument, gql } from "graphql-request";
import { HTTPException } from "hono/http-exception";
import { JsonHelper } from "./common/json.helper.ts";

export const gql2http = new OpenAPIHono();

gql2http.openapi({
  method: "post",
  path: "/",
  summary: "Parse graphql string into json object for request",
  description: `
  * For simplicity in body you can send raw string (so omit content-type) or choose "other" option
  * One operation at a time (root query/mutation block)
  * How pass variables? (if you need)
    Wrap the variables object with special comments:
      * \`"""variables\`  before
      * \`variables"""\` after
  
  * Example:
    \`\`\`
    mutation Login($email: String!) {
      login(email: $email)
    }

    """variables
    {
      email: "test@mail.com"
    }
    variables"""
    \`\`\`
    P.S.
    > As you can see in example - it is possible to pass relaxed json like in javascript (without strict raw JSON rules)
  `,
  request: {
    body: {
      required: true,
      content: {
        "text/plain": {
          example: `
query Example($limit: Int!) {
  bla_bla_bla(limit: $limit) {
    answer
  }
}

"""variables

{
  limit: 4,
}

variables"""
          `,
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
  const endCandidate = startCandidate !== -1
    ? text.lastIndexOf('variables"""')
    : null;

  if (endCandidate === -1) {
    throw new HTTPException(400, {
      message: 'Check your usage of """variables ... variables""" comments',
      cause: "Unable to parse area for <variables>",
    });
  }

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
