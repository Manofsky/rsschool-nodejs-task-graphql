import { Type } from '@fastify/type-provider-typebox';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLEnumType,
} from 'graphql';
import { PrismaClient, User } from '@prisma/client';
import { UUIDType } from './types/uuid.js';

interface GqlContext {
  prisma: PrismaClient;
}

type UserSubscriptionWithAuthor = {
  author: User;
};

type UserSubscriptionWithSubscriber = {
  subscriber: User;
};

enum MemberTypeId {
  BASIC = 'BASIC',
  BUSINESS = 'BUSINESS',
}

export const gqlResponseSchema = Type.Partial(
  Type.Object({
    data: Type.Any(),
    errors: Type.Any(),
  }),
);

export const createGqlResponseSchema = {
  body: Type.Object(
    {
      query: Type.String(),
      variables: Type.Optional(Type.Record(Type.String(), Type.Any())),
    },
    {
      additionalProperties: false,
    },
  ),
};

const MemberTypeIdEnum = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    BASIC: { value: MemberTypeId.BASIC },
    BUSINESS: { value: MemberTypeId.BUSINESS },
  },
});

const MemberType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    discount: { type: new GraphQLNonNull(GraphQLFloat) },
    postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

const ProfileType = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    memberType: {
      type: new GraphQLNonNull(MemberType),
      resolve: async (parent: { memberTypeId: string }, _args, context: GqlContext) => {
        return context.prisma.memberType.findUnique({
          where: { id: parent.memberTypeId },
        });
      },
    },
  }),
});

const PostType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const UserType = new GraphQLObjectType<User, GqlContext>({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
    profile: {
      type: ProfileType,
      resolve: async (parent: User, _args, context: GqlContext) => {
        return context.prisma.profile.findUnique({
          where: { userId: parent.id },
        });
      },
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostType))),
      resolve: async (parent: User, _args, context: GqlContext) => {
        return context.prisma.post.findMany({
          where: { authorId: parent.id },
        });
      },
    },
    userSubscribedTo: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: async (parent: User, _args, context: GqlContext) => {
        const subscriptions = await context.prisma.subscribersOnAuthors.findMany({
          where: { subscriberId: parent.id },
          include: { author: true },
        }) as UserSubscriptionWithAuthor[];
        return subscriptions.map((sub) => sub.author);
      },
    },
    subscribedToUser: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: async (parent: User, _args, context: GqlContext) => {
        const subscribers = await context.prisma.subscribersOnAuthors.findMany({
          where: { authorId: parent.id },
          include: { subscriber: true },
        }) as UserSubscriptionWithSubscriber[];
        return subscribers.map((sub) => sub.subscriber);
      },
    },
  }),
});

const QueryType = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: () => ({
    memberTypes: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberType))),
      resolve: async (_source, _args, context: GqlContext) => {
        return context.prisma.memberType.findMany();
      },
    },
    memberType: {
      type: MemberType,
      args: {
        id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
      },
      resolve: async (_source, args: { id: MemberTypeId }, context: GqlContext) => {
        return context.prisma.memberType.findUnique({
          where: { id: args.id },
        });
      },
    },
    users: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: async (_source, _args, context: GqlContext) => {
        return context.prisma.user.findMany();
      },
    },
    user: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_source, args: { id: string }, context: GqlContext) => {
        return context.prisma.user.findUnique({
          where: { id: args.id },
        });
      },
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostType))),
      resolve: async (_source, _args, context: GqlContext) => {
        return context.prisma.post.findMany();
      },
    },
    post: {
      type: PostType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_source, args: { id: string }, context: GqlContext) => {
        return context.prisma.post.findUnique({
          where: { id: args.id },
        });
      },
    },
    profiles: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ProfileType))),
      resolve: async (_source, _args, context: GqlContext) => {
        return context.prisma.profile.findMany();
      },
    },
    profile: {
      type: ProfileType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_source, args: { id: string }, context: GqlContext) => {
        return context.prisma.profile.findUnique({
          where: { id: args.id },
        });
      },
    },
  }),
});
