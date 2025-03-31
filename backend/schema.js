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




/****************************************************************************************
 * TYPES                                                                                *
 ****************************************************************************************/
/* Type: User */
const UserType = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    id: { type: GraphQLString },
    email: { type: GraphQLString },
    isTwoFAEnabled: { type: GraphQLBoolean },
  }),
});

/* Type: Project */
const ProjectType = new GraphQLObjectType({
  name: "Project",
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    color: { type: GraphQLString },
    note: { type: GraphQLJSON },
    projectHistory: { type: new GraphQLList(GraphQLString) },
  }),
});

/* Type: Subtask (for KanbanTask) */
const SubtaskType = new GraphQLObjectType({
  name: "Subtask",
  fields: () => ({
    title: { type: GraphQLString },
    done: { type: GraphQLBoolean },
  }),
});

/* Type: KanbanTask */
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

/* Type: Favorite */
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

/* Type: Note */
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

/* Type: DailyCompletion (for DailyTask) */
const DailyCompletionType = new GraphQLObjectType({
  name: "DailyCompletion",
  fields: {
    date: { type: GraphQLString },
    done: { type: GraphQLBoolean },
  },
});

/* Type: DailyTask */
const DailyTaskType = new GraphQLObjectType({
  name: "DailyTask",
  fields: () => ({
    id: { type: GraphQLString },
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
    completions: { type: new GraphQLList(DailyCompletionType) },
  }),
});

/* Type: Income */
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




/****************************************************************************************
 * QUERIES                                                                              *
 ****************************************************************************************/
/* Get the logged in user */
const GetUserQuery = {
  type: UserType,
  async resolve(_, __, req) {
    const userId = authMiddleware(req);
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    return user;
  },
};

/* Get all projects for the logged in user */
const GetProjectsQuery = {
  type: new GraphQLList(ProjectType),
  async resolve(_, __, context) {
    const userId = authMiddleware(context);
    if (!userId) throw new Error("Authentication required");

    return await Project.find({ userId });
  },
};

/* Get all kanban tasks for the selected project */
const GetKanbanTasksQuery = {
  type: new GraphQLList(KanbanTaskType),
  args: {
    projectId: { type: GraphQLString },
  },
  async resolve(_, { projectId }, context) {
    authMiddleware(context);
    return await KanbanTask.find({ projectId }).sort({ createdAt: -1 });
  },
};

/* Get all favorites for the selected project */
const GetFavoritesQuery = {
  type: new GraphQLList(FavoriteType),
  args: {
    projectId: { type: GraphQLString },
  },
  async resolve(_, { projectId }, context) {
    authMiddleware(context);
    return await Favorite.find({ projectId }).sort({ category: 1, title: 1 });
  },
};

/* Get all notes for the selected project */
const GetNotesQuery = {
  type: new GraphQLList(NoteType),
  args: {
    projectId: { type: GraphQLString },
  },
  async resolve(_, { projectId }, context) {
    authMiddleware(context);
    return await Note.find({ projectId }).sort({
      category: 1,
      pinned: -1,
      updatedAt: -1,
    });
  },
};

/* Get all daily tasks for the selected project,
   create completions for today if they don't exist yet */
const GetDailyTasksQuery = {
  type: new GraphQLList(DailyTaskType),
  args: {
    projectId: { type: GraphQLString },
  },
  async resolve(_, { projectId }) {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await DailyTask.find({ projectId });

    // Ensure every task has a completion for today
    for (let task of tasks) {
      if (!task.completions.find((c) => c.date === today)) {
        task.completions.push({ date: today, done: false });
        await task.save();
      }
    }

    return tasks;
  },
};

/* Get all daily tasks in all projects */
const GetAllDailyTasksQuery = {
  type: new GraphQLList(DailyTaskType),
  async resolve() {
    return await DailyTask.find({});
  },
};

/* Get all income entries */
const GetIncomeQuery = {
  type: new GraphQLList(IncomeType),
  args: {
    page: { type: GraphQLInt },
    limit: { type: GraphQLInt },
  },
  async resolve(_, { page = 1, limit = 250 }) {
    return await Income.find({})
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  },
};




/****************************************************************************************
 * MUTATIONS                                                                            *
 ****************************************************************************************/
/* Register a new user */
const RegisterMutation = {
  type: UserType,
  args: {
    email: { type: GraphQLString },
    password: { type: GraphQLString },
  },
  async resolve(_, { email, password }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error("");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    return user;
  },
};

/* Login a user + rate limiting */
const loginAttempts = new Map();
const RATE_LIMIT_MAX = 5; // 5 login attempts
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const LoginMutation = {
  type: GraphQLString,
  args: {
    email: { type: GraphQLString },
    password: { type: GraphQLString },
    token: { type: GraphQLString }, // Add OTP token argument
  },
  async resolve(_, { email, password, token }, { req }) {
    /* RATE LIMITING LOGIC */
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      "unknown";
    // Clean old entries
    const now = Date.now();
    const entry = loginAttempts.get(ip);
    if (entry && now - entry.timestamp > RATE_LIMIT_WINDOW) {
      loginAttempts.delete(ip);
    }

    // Rate limiting
    const attempts = loginAttempts.get(ip) || { count: 0, timestamp: now };
    if (attempts.count >= RATE_LIMIT_MAX) {
      console.warn(`🚨 Rate limit exceeded for login: ${ip}`);
      throw new Error("Too many login attempts. Please try again later.");
    }

    /* LOGIN LOGIC */
    const user = await User.findOne({ email });
    if (!user) {
      /* RATE LIMIT: If login fails, increase count: */
      attempts.count++;
      attempts.timestamp = now;
      loginAttempts.set(ip, attempts);
      throw new Error("User not found");
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      /* RATE LIMIT: If login fails, increase count: */
      attempts.count++;
      attempts.timestamp = now;
      loginAttempts.set(ip, attempts);
      throw new Error("Invalid password");
    }

    // If 2FA is enabled, require OTP
    if (user.isTwoFAEnabled) {
      if (!token) throw new Error("2FA required");

      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: "base32",
        token,
      });

      if (!verified) {
        /* RATE LIMIT: If login fails, increase count: */
        attempts.count++;
        attempts.timestamp = now;
        loginAttempts.set(ip, attempts);
        throw new Error("Invalid 2FA code");
      }
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return jwtToken;
  },
};

/* Set up 2FA authentication with QR code */
const Setup2FAMutation = {
  type: GraphQLString,
  args: {},
  async resolve(_, __, context) {
    const userId = authMiddleware(context);
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const secret = speakeasy.generateSecret({
      name: `Freelancer-App (${user.email})`,
    });
    user.twoFASecret = secret.base32;
    await user.save();

    return new Promise((resolve, reject) => {
      QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) reject(err);
        resolve(data_url);
      });
    });
  },
};

/* Verify 2FA login */
const Verify2FAMutation = {
  type: GraphQLBoolean,
  args: { token: { type: GraphQLString } },
  async resolve(_, { token }, context) {
    const userId = authMiddleware(context);
    const user = await User.findById(userId);
    if (!user || !user.twoFASecret)
      throw new Error("2FA is not set up for this account");

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
    });

    if (!verified) throw new Error("Invalid 2FA code");

    user.isTwoFAEnabled = true;
    await user.save();

    return true;
  },
};

/* Add a new project */
const AddProjectMutation = {
  type: ProjectType,
  args: {
    name: { type: GraphQLString },
    color: { type: GraphQLString },
  },
  async resolve(_, { name, color }, context) {
    const userId = authMiddleware(context);
    if (!userId) throw new Error("Authentication required");

    const newProject = new Project({
      userId,
      name,
      color,
      isActive: false,
    });

    await newProject.save();
    return newProject;
  },
};

/* Edit an existing project */
const UpdateProjectMutation = {
  type: ProjectType,
  args: {
    projectId: { type: GraphQLString },
    name: { type: GraphQLString },
    color: { type: GraphQLString },
    avatar: { type: GraphQLString },
    note: { type: GraphQLJSON },
  },
  async resolve(
    _,
    {
      projectId,
      name,
      color,
      note,
    },
    context
  ) {
    authMiddleware(context);

    const update = {};
    if (name !== undefined) update.name = name;
    if (color !== undefined) update.color = color;
    if (note !== undefined) update.note = note;

    return await Project.findByIdAndUpdate(projectId, update, { new: true });
  },
};

/* Delete a project */
const DeleteProjectMutation = {
  type: GraphQLString,
  args: {
    projectId: { type: GraphQLString },
  },
  async resolve(_, { projectId }, context) {
    authMiddleware(context);
    await Project.findByIdAndDelete(projectId);
    return "Project deleted";
  },
};

/* Change the active project */
const SwitchActiveProjectMutation = {
  type: ProjectType,
  args: { projectId: { type: GraphQLString } },
  async resolve(_, { projectId }, context) {
    const userId = authMiddleware(context);
    if (!userId) throw new Error("Authentication required");

    const projects = await Project.find({ userId });

    // Remove active from all projects
    await Project.updateMany({ userId }, { isActive: false });

    // Set active for the selected project
    const newActiveProject = await Project.findByIdAndUpdate(
      projectId,
      {
        isActive: true,
        $push: { projectHistory: { timestamp: new Date() } },
      },
      { new: true }
    );

    return newActiveProject;
  },
};

/* Add a new kanban task */
const AddKanbanTaskMutation = {
  type: KanbanTaskType,
  args: {
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
  },
  async resolve(_, { projectId, title }, context) {
    authMiddleware(context);
    const task = new KanbanTask({ projectId, title });
    return await task.save();
  },
};

/* Update the status of a kanban task */
const UpdateKanbanTaskStatusMutation = {
  type: KanbanTaskType,
  args: {
    taskId: { type: GraphQLString },
    status: { type: GraphQLString },
  },
  async resolve(_, { taskId, status }, context) {
    authMiddleware(context);
    return await KanbanTask.findByIdAndUpdate(
      taskId,
      { status },
      { new: true }
    );
  },
};

/* Delete a kanban task */
const DeleteKanbanTaskMutation = {
  type: GraphQLString,
  args: {
    taskId: { type: GraphQLString },
  },
  async resolve(_, { taskId }, context) {
    authMiddleware(context);
    await KanbanTask.findByIdAndDelete(taskId);
    return "Deleted";
  },
};

/* Change the name of a kanban task */
const UpdateTaskTitleMutation = {
  type: KanbanTaskType,
  args: {
    taskId: { type: GraphQLString },
    title: { type: GraphQLString },
  },
  async resolve(_, { taskId, title }, context) {
    authMiddleware(context);
    return await KanbanTask.findByIdAndUpdate(taskId, { title }, { new: true });
  },
};

/* Add a subtask to a kanban task */
const AddSubtaskMutation = {
  type: KanbanTaskType,
  args: {
    taskId: { type: GraphQLString },
    title: { type: GraphQLString },
  },
  async resolve(_, { taskId, title }, context) {
    authMiddleware(context);
    return await KanbanTask.findByIdAndUpdate(
      taskId,
      { $push: { subtasks: { title } } },
      { new: true }
    );
  },
};

/* Mark a subtask of a kanban task as done or not done */
const ToggleSubtaskMutation = {
  type: KanbanTaskType,
  args: {
    taskId: { type: GraphQLString },
    subtaskIndex: { type: GraphQLInt },
  },
  async resolve(_, { taskId, subtaskIndex }, context) {
    authMiddleware(context);

    const task = await KanbanTask.findById(taskId);
    if (!task) throw new Error("Task not found");

    task.subtasks[subtaskIndex].done = !task.subtasks[subtaskIndex].done;
    await task.save();
    return task;
  },
};

/* Delete a subtask of a kanban task */
const DeleteSubtaskMutation = {
  type: KanbanTaskType,
  args: {
    taskId: { type: GraphQLString },
    subtaskIndex: { type: GraphQLInt },
  },
  async resolve(_, { taskId, subtaskIndex }, context) {
    authMiddleware(context);

    const task = await KanbanTask.findById(taskId);
    if (!task) throw new Error("Task not found");

    task.subtasks.splice(subtaskIndex, 1);
    await task.save();
    return task;
  },
};

/* Add a favorite */
const AddFavoriteMutation = {
  type: FavoriteType,
  args: {
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
    url: { type: GraphQLString },
    category: { type: GraphQLString },
  },
  async resolve(_, args, context) {
    authMiddleware(context);
    return await new Favorite(args).save();
  },
};

/* Delete a favorite */
const DeleteFavoriteMutation = {
  type: GraphQLString,
  args: {
    favoriteId: { type: GraphQLString },
  },
  async resolve(_, { favoriteId }, context) {
    authMiddleware(context);
    await Favorite.findByIdAndDelete(favoriteId);
    return "Deleted";
  },
};

/* Edit a favorite */
const UpdateFavoriteMutation = {
  type: FavoriteType,
  args: {
    favoriteId: { type: GraphQLString },
    title: { type: GraphQLString },
    url: { type: GraphQLString },
    category: { type: GraphQLString },
  },
  async resolve(_, { favoriteId, title, url, category }, context) {
    authMiddleware(context);

    return await Favorite.findByIdAndUpdate(
      favoriteId,
      { title, url, category },
      { new: true }
    );
  },
};

/* Add a note */
const AddNoteMutation = {
  type: NoteType,
  args: {
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
    category: { type: GraphQLString },
  },
  async resolve(_, args, context) {
    authMiddleware(context);
    return await new Note({ ...args }).save();
  },
};

/* Edit a note */
const UpdateNoteMutation = {
  type: NoteType,
  args: {
    noteId: { type: GraphQLString },
    content: { type: GraphQLString },
  },
  async resolve(_, { noteId, content }, context) {
    authMiddleware(context);
    return await Note.findByIdAndUpdate(
      noteId,
      { content, updatedAt: new Date() },
      { new: true }
    );
  },
};

/* Delete a note */
const DeleteNoteMutation = {
  type: GraphQLString,
  args: {
    noteId: { type: GraphQLString },
  },
  async resolve(_, { noteId }, context) {
    authMiddleware(context);
    await Note.findByIdAndDelete(noteId);
    return "Note deleted";
  },
};

/* Edit note title and category */
const UpdateNoteMetaMutation = {
  type: NoteType,
  args: {
    noteId: { type: GraphQLString },
    title: { type: GraphQLString },
    category: { type: GraphQLString },
  },
  async resolve(_, { noteId, title, category }, context) {
    authMiddleware(context);
    return await Note.findByIdAndUpdate(
      noteId,
      { title, category },
      { new: true }
    );
  },
};

/* Toggle the pinned status of a note */
const ToggleNotePinMutation = {
  type: NoteType,
  args: {
    noteId: { type: GraphQLString },
    pinned: { type: GraphQLBoolean },
  },
  async resolve(_, { noteId, pinned }, context) {
    authMiddleware(context);
    return await Note.findByIdAndUpdate(noteId, { pinned }, { new: true });
  },
};

/* Add a daily task */
const AddDailyTaskMutation = {
  type: DailyTaskType,
  args: {
    projectId: { type: GraphQLString },
    title: { type: GraphQLString },
  },
  async resolve(_, { projectId, title }) {
    const today = new Date().toISOString().slice(0, 10);

    const newTask = await DailyTask.create({
      projectId,
      title,
      completions: [{ date: today, done: false }],
    });

    return newTask;
  },
};

/* Toggle a daily task as done for today or not */
const ToggleDailyTaskMutation = {
  type: DailyTaskType,
  args: {
    taskId: { type: GraphQLString },
  },
  async resolve(_, { taskId }) {
    const today = new Date().toISOString().slice(0, 10);
    const task = await DailyTask.findById(taskId);

    const completion = task.completions.find((c) => c.date === today);
    if (completion) {
      completion.done = !completion.done;
    } else {
      task.completions.push({ date: today, done: true });
    }

    await task.save();
    return task;
  },
};

/* Delete a daily task */
const DeleteDailyTaskMutation = {
  type: GraphQLString,
  args: {
    taskId: { type: GraphQLString },
  },
  async resolve(_, { taskId }) {
    await DailyTask.findByIdAndDelete(taskId);
    return "Task deleted";
  },
};

/* Edit the name of a daily task */
const UpdateDailyTaskTitleMutation = {
  type: DailyTaskType,
  args: {
    taskId: { type: GraphQLString },
    title: { type: GraphQLString },
  },
  async resolve(_, { taskId, title }) {
    return await DailyTask.findByIdAndUpdate(taskId, { title }, { new: true });
  },
};

/* Add a new income entry */
const AddIncomeMutation = {
  type: IncomeType,
  args: {
    date: { type: GraphQLString },
    amount: { type: GraphQLFloat },
    site_or_stream: { type: GraphQLString },
    product: { type: GraphQLString },
  },
  async resolve(_, args) {
    return await Income.create(args);
  },
};

/* Delete an income entry */
const DeleteIncomeMutation = {
  type: GraphQLBoolean,
  args: {
    id: { type: GraphQLString },
  },
  async resolve(_, { id }) {
    await Income.findByIdAndDelete(id);
    return true;
  },
};

/* Update an income entry */
const UpdateIncomeMutation = {
  type: IncomeType,
  args: {
    id: { type: GraphQLString },
    date: { type: GraphQLString },
    amount: { type: GraphQLFloat },
    site_or_stream: { type: GraphQLString },
    product: { type: GraphQLString },
  },
  async resolve(_, args) {
    const { id, ...updates } = args;
    return await Income.findByIdAndUpdate(id, updates, { new: true });
  },
};
