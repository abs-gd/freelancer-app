import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery, gql, useMutation } from "@apollo/client";
import { getAuthToken } from "../utils/auth";

const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
      color
      isActive
    }
  }
`;

const GET_ACTIVE_TASKS = gql`
  query {
    getProjects {
      id
      isActive
    }
  }
`;

const GET_KANBAN_TASKS = gql`
  query GetKanbanTasks($projectId: String!) {
    getKanbanTasks(projectId: $projectId) {
      id
      title
      status
    }
  }
`;

const GET_DAILY_TASKS = gql`
  query GetDailyTasks($projectId: String!) {
    getDailyTasks(projectId: $projectId) {
      id
      title
      completions {
        date
        done
      }
    }
  }
`;

const ADD_DAILY_TASK = gql`
  mutation AddDailyTask($projectId: String!, $title: String!) {
    addDailyTask(projectId: $projectId, title: $title) {
      id
      title
    }
  }
`;

const TOGGLE_DAILY_TASK = gql`
  mutation ToggleDailyTask($taskId: String!) {
    toggleDailyTask(taskId: $taskId) {
      id
    }
  }
`;

const DELETE_DAILY_TASK = gql`
  mutation DeleteDailyTask($taskId: String!) {
    deleteDailyTask(taskId: $taskId)
  }
`;

const UPDATE_DAILY_TASK_TITLE = gql`
  mutation UpdateDailyTaskTitle($taskId: String!, $title: String!) {
    updateDailyTaskTitle(taskId: $taskId, title: $title) {
      id
      title
    }
  }
`;

const GET_INCOME = gql`
  query {
    getIncome(page: 1, limit: 10000) {
      date
      amount
    }
  }
`;

export default function Dashboard() {
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS);
  const [activeProject, setActiveProject] = useState(null);

  const { data: projectData } = useQuery(GET_ACTIVE_TASKS);
  const activeProjectTasks = projectData?.getProjects?.find((a) => a.isActive);
  const projectId = activeProjectTasks?.id;

  const {
    data: dailyTasksData,
    loading: dailyTasksLoading,
    refetch: dailyTasksRefetch,
  } = useQuery(GET_DAILY_TASKS, {
    variables: { projectId },
    skip: !projectId,
  });
  const [addDailyTask] = useMutation(ADD_DAILY_TASK);
  const [toggleDailyTask] = useMutation(TOGGLE_DAILY_TASK);
  const today = new Date().toISOString().slice(0, 10);
  const [newDailyTaskTitle, setNewDailyTaskTitle] = useState("");
  const dailyTasks = dailyTasksData?.getDailyTasks || [];
  const [deleteDailyTask] = useMutation(DELETE_DAILY_TASK);
  const [updateDailyTaskTitle] = useMutation(UPDATE_DAILY_TASK_TITLE);

  const { data: incomeData, loading: incomeLoading } = useQuery(GET_INCOME);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login"); // Redirect if not authenticated
      return;
    }
  }, [router]);

  useEffect(() => {
    if (data) {
      const active = data.getProjects.find((project) => project.isActive);
      setActiveProject(active);
    }
  }, [data]);

  const { data: taskData, loadingTasks } = useQuery(GET_KANBAN_TASKS, {
    variables: { projectId },
    skip: !projectId,
  });

  const doingTasks = taskData?.getKanbanTasks?.filter(
    (task) => task.status === "doing"
  );

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  function calculateStreak(completions) {
    const doneDates = completions
      .filter((c) => c.done && c.date)
      .map((c) => c.date)
      .sort()
      .reverse();

    let streak = 0;
    let currentDate = new Date();

    for (const dateStr of doneDates) {
      const date = new Date(dateStr);
      const expected = new Date(currentDate);
      expected.setDate(expected.getDate() - streak);

      const actual = date.toISOString().slice(0, 10);
      const expectStr = expected.toISOString().slice(0, 10);

      if (actual === expectStr) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  function calculateHistory(completions) {
    const today = new Date();
    const map = Object.fromEntries(completions.map((c) => [c.date, !!c.done]));

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      result.push(map[dateStr] || false);
    }

    return result;
  }

  const incomeStats = useMemo(() => {
    if (!incomeData?.getIncome) return null;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    let todayTotal = 0;
    let last7DaysTotal = 0;
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;

    incomeData.getIncome.forEach((entry) => {
      const date = new Date(entry.date);
      const amount = parseFloat(entry.amount || 0);
      const dateStr = entry.date;

      // Earned today
      if (dateStr === todayStr) todayTotal += amount;

      // Last 7 days
      const daysDiff = (today - date) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 7) last7DaysTotal += amount;

      // This month
      if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
        thisMonthTotal += amount;
      }

      // Previous month
      if (date.getMonth() === prevMonth && date.getFullYear() === prevYear) {
        lastMonthTotal += amount;
      }
    });

    return {
      todayTotal,
      last7DaysTotal,
      thisMonthTotal,
      lastMonthTotal,
    };
  }, [incomeData]);

  function StatBox({ label, value }) {
    return (
      <div className="bg-white shadow rounded md:mb-3 mb-2 p-2 grid grid-cols-2 gap-4 hover:bg-green-200">
        <h3 className="text-gray-600 text-lg">{label}</h3>
        <p className="text-2xl font-semibold mt-[-2px]">€{value.toFixed(2)}</p>
      </div>
    );
  }

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p>Error loading data.</p>;

  return (
    <div className="md:p-6 p-3">
      {activeProject ? (
        <>
          <div className="flex gap-1 items-center mb-6">
            <h1
              className="text-4xl font-medium"
              style={{ color: activeProject.color }}
            >
              🏢 {activeProject.name}
            </h1>
          </div>
          <div className="md:flex md:gap-5">
            <div className="md:w-3/5 w-full">
              <h2 className="md:text-2xl font-semibold md:mb-4 text-2xl mb-2 md:ml-0 ml-[-3px] md:block hidden">
                🗓️ Daily Tasks
              </h2>
              {dailyTasksLoading ? (
                <p>Loading daily tasks...</p>
              ) : (
                <>
                  <ul className="md:space-y-2 space-y-1 md:mb-4 mb-2">
                    {[...dailyTasks]
                      .sort((a) => {
                        const done = a.completions.find(
                          (c) => c.date === today
                        )?.done;
                        return done ? 1 : -1;
                      })
                      .map((task) => {
                        const todayCompletion = task.completions.find(
                          (c) => c.date === today
                        );
                        const isDone = todayCompletion?.done;

                        const isEditing = editingTaskId === task.id;

                        const streak = calculateStreak(task.completions);
                        const history = calculateHistory(task.completions);

                        return (
                          <li
                            key={task.id}
                            className={`flex items-center justify-between md:p-3 p-1 border rounded md:h-auto h-17 ${
                              isDone ? "bg-green-100" : "bg-white"
                            }`}
                          >
                            <div className="md:flex md:items-center md:gap-3 w-full">
                              <input
                                className="accent-green-500 cursor-pointer md:w-5 md:h-5 w-8 h-8 md:mt-0 md:inline block mt-[-30px]"
                                type="checkbox"
                                checked={isDone}
                                onChange={async () => {
                                  await toggleDailyTask({
                                    variables: { taskId: task.id },
                                  });
                                  dailyTasksRefetch();
                                }}
                              />

                              {isEditing ? (
                                <input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="border rounded p-1 text-lg flex-1 md:inline block md:ml-0 ml-0 md:h-full h-8 w-6/7"
                                />
                              ) : (
                                <>
                                  <span
                                    className={`md:flex-1 md:inline block md:mt-0 md:ml-0 ml-10 mt-[-28px] ${
                                      isDone ? "line-through" : ""
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                  <span className="md:mr-4 md:mt-0 mt-2 md:inline block md:ml-0 ml-[-3px]">
                                    🔥 Streak: <strong>{streak}</strong> day
                                    {streak !== 1 ? "s" : ""}
                                  </span>

                                  <div className="flex gap-1 md:mt-1 md:mr-4 md:ml-0 mt-[-20px] ml-50">
                                    {history.map((done, index) => (
                                      <span
                                        key={index}
                                        className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                                          done ? "bg-green-400" : "bg-gray-300"
                                        }`}
                                        title={`Day ${index + 1}`}
                                      >
                                        {done ? (
                                          <span className="mt-[-4px]">✔</span>
                                        ) : (
                                          <span className="mt-[-1px]">✘</span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              )}

                              {isEditing ? (
                                <button
                                  onClick={async () => {
                                    await updateDailyTaskTitle({
                                      variables: {
                                        taskId: task.id,
                                        title: editTitle,
                                      },
                                    });
                                    setEditingTaskId(null);
                                    setEditTitle("");
                                    dailyTasksRefetch();
                                  }}
                                  className="text-green-600 text-xl cursor-pointer md:inline block md:mt-0 mt-[-30px] md:ml-0 ml-75"
                                >
                                  💾
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditTitle(task.title);
                                  }}
                                  className="text-blue-500 text-xl cursor-pointer md:inline block md:ml-0 md:mt-0 mt-[-60px] ml-75"
                                  title="Edit task"
                                >
                                  📝
                                </button>
                              )}

                              <button
                                onClick={async () => {
                                  if (confirm("Delete this task?")) {
                                    await deleteDailyTask({
                                      variables: { taskId: task.id },
                                    });
                                    dailyTasksRefetch();
                                  }
                                }}
                                className="text-red-500 text-l cursor-pointer md:mt-[1px] md:inline block md:ml-[-10px] mt-[-25px] ml-82"
                                title="Delete task"
                              >
                                ❌
                              </button>
                            </div>
                          </li>
                        );
                      })}
                  </ul>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDailyTaskTitle}
                      onChange={(e) => setNewDailyTaskTitle(e.target.value)}
                      placeholder="New daily task"
                      className="border p-2 rounded flex-1"
                    />
                    <button
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded cursor-pointer"
                      onClick={async () => {
                        if (!newDailyTaskTitle.trim()) return;
                        await addDailyTask({
                          variables: {
                            projectId,
                            title: newDailyTaskTitle,
                          },
                        });
                        setNewDailyTaskTitle("");
                        dailyTasksRefetch();
                      }}
                    >
                      Add
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="md:w-1/5 md:mt-0 mt-10">
              <h2 className="md:text-2xl font-semibold md:mb-4 text-2xl mb-2 md:ml-0 ml-[-3px]">
                ✅ Tasks in doing
              </h2>
              {loadingTasks ? (
                <p>Loading...</p>
              ) : doingTasks?.length ? (
                <ul className="md:space-y-3 space-y-2">
                  {doingTasks.map((task) => (
                    <li
                      key={task.id}
                      className="bg-green-100 border-l-4 border-green-300 p-2 rounded hover:bg-green-200"
                    >
                      {task.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No tasks in progress</p>
              )}
            </div>
            {incomeStats && (
              <div className="md:w-1/5 md:mt-0 mt-10 md:mb-0 mb-40">
                <h2 className="md:text-2xl font-semibold md:mb-4 text-2xl mb-2 md:ml-0 ml-[-3px]">
                  💸 Global income
                </h2>
                <StatBox label="Today" value={incomeStats.todayTotal} />
                <StatBox label="7 Days" value={incomeStats.last7DaysTotal} />
                <StatBox label="Month" value={incomeStats.thisMonthTotal} />
                <StatBox
                  label="Prev month"
                  value={incomeStats.lastMonthTotal}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <p>Loading ...</p>
      )}
    </div>
  );
}
