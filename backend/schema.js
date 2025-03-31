const {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLInt,
  GraphQLFloat,
} = require("graphql");
const { GraphQLJSON } = require("graphql-type-json");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const User = require("./models/User");
const Project = require("./models/Project");
const KanbanTask = require("./models/KanbanTask");
const Favorite = require("./models/Favorite");
const Note = require("./models/Note");
const DailyTask = require("./models/DailyTask");
const Income = require("./models/Income");

const authMiddleware = require("./middleware/auth");


/*
 * TYPES
 ****************************************************************************************/
const UserType = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    id: { type: GraphQLString },
    email: { type: GraphQLString },
    isTwoFAEnabled: { type: GraphQLBoolean },
  }),
});

const AlterType = new GraphQLObjectType({
  name: "Alter",
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    color: { type: GraphQLString },
    note: { type: GraphQLJSON },
  }),
});

const SubtaskType = new GraphQLObjectType({
  name: "Subtask",
  fields: () => ({
    title: { type: GraphQLString },
    done: { type: GraphQLBoolean },
  }),
});

const KanbanTaskType = new GraphQLObjectType({
  name: "KanbanTask",
  fields: () => ({
    id: { type: GraphQLString },
    title: { type: GraphQLString },
    status: { type: GraphQLString },
    projectId: { type: GraphQLString },
    subtasks: { type: new GraphQLList(SubtaskType) },
    createdAt: { type: GraphQLString },
  }),
});

const FavoriteType = new GraphQLObjectType({
  name: "Favorite",
  fields: () => ({
    id: { type: GraphQLString },
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
    url: { type: GraphQLString },
    category: { type: GraphQLString },
    createdAt: { type: GraphQLString },
  }),
});

const NoteType = new GraphQLObjectType({
  name: "Note",
  fields: () => ({
    id: { type: GraphQLString },
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
    category: { type: GraphQLString },
    content: { type: GraphQLString },
    pinned: { type: GraphQLBoolean },
    updatedAt: {
      type: GraphQLString,
      resolve: (note) => note.updatedAt?.toISOString(),
    },
  }),
});

const DailyCompletionType = new GraphQLObjectType({
  name: "DailyCompletion",
  fields: {
    date: { type: GraphQLString },
    done: { type: GraphQLBoolean },
  },
});

const DailyTaskType = new GraphQLObjectType({
  name: "DailyTask",
  fields: () => ({
    id: { type: GraphQLString },
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
    completions: { type: new GraphQLList(DailyCompletionType) },
  }),
});

const IncomeType = new GraphQLObjectType({
  name: "Income",
  fields: {
    id: { type: GraphQLString },
    date: { type: GraphQLString },
    amount: { type: GraphQLFloat },
    site_or_stream: { type: GraphQLString },
    product: { type: GraphQLString },
  },
});

