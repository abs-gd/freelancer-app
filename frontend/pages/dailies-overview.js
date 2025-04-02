import { gql, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";

const GET_ALL_DAILY_TASKS_AND_PROJECTS = gql`
  query {
    getAllDailyTasks {
      id
      title
      projectId
      completions {
        date
        done
      }
    }
    getProjects {
      id
      name
      color
    }
  }
`;

export default function DailyOverview() {
  const { data, loading } = useQuery(GET_ALL_DAILY_TASKS_AND_PROJECTS);
  const [tasksByProject, setTasksByProject] = useState({});

  useEffect(() => {
    if (data?.getAllDailyTasks && data?.getProjects) {
      const today = new Date().toISOString().slice(0, 10);
      const projectMap = Object.fromEntries(
        data.getProjects.map((a) => [a.id, { name: a.name, color: a.color }])
      );

      const grouped = {};

      for (const task of data.getAllDailyTasks) {
        const project = projectMap[task.projectId];
        if (!project) continue;

        if (!grouped[task.projectId]) {
          grouped[task.projectId] = {
            ...project,
            tasks: [],
          };
        }

        const todayStatus =
          task.completions.find((c) => c.date === today)?.done || false;

        grouped[task.projectId].tasks.push({
          ...task,
          doneToday: todayStatus,
        });
      }

      setTasksByProject(grouped);
    }
  }, [data]);

  if (loading) return <p className="p-5">Loading tasks...</p>;

  return (
    <div className="md:p-5 p-1">
      <h1 className="text-2xl font-bold md:mb-5 mb-2">🗓️ Daily Tasks Overview</h1>
      <div className="md:grid md:grid-cols-4 md:gap-6">
        {Object.entries(tasksByProject).map(
          ([projectId, { name, color, tasks }]) => (
            <div key={projectId} className="md:mb-6 mb-3">
              <h2
                className="text-lg font-semibold md:mb-2 mb-1"
                style={{ color: color || "#333" }}
              >
                🧠 {name}
              </h2>
              <ul className="md:space-y-2 space-y-1">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className={`p-3 border rounded ${
                      task.doneToday ? "bg-green-100" : "bg-white"
                    }`}
                  >
                    <span className={task.doneToday ? "line-through" : ""}>
                      {task.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
}
