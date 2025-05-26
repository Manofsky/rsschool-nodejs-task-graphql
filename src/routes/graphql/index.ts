import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, parse, validate } from 'graphql';
import { schema } from './schemas.js';
import depthLimit from 'graphql-depth-limit';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const source = req.body?.query;
      const variableValues = req.body?.variables ?? {};
      const currentUserId = req.headers['x-user-id'] as string | undefined;

      const document = parse(source);
      const validationErrors = validate(schema, document, [depthLimit(5)]);
      if (validationErrors.length > 0) {
        return { errors: validationErrors };
      }
      return graphql({
        schema,
        source,
        variableValues,
        contextValue: { prisma, currentUserId },
      });
    },
  });
};

export default plugin;
