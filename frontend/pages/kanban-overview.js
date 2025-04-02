import { useQuery, gql } from "@apollo/client";
import { useEffect, useState } from "react";
import { getAuthToken } from "../utils/auth";
import { useRouter } from "next/router";

const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
      color
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

export default function KanbanOverview() {
  const router = useRouter();
  const token = getAuthToken();
  const [boards, setBoards] = useState([]);
  const { data: projectsData, loading: loadingProjects } = useQuery(GET_PROJECTS);
  const [collapsedBoards, setCollapsedBoards] = useState({});

  useEffect(() => {
    if (!token) router.push("/login");
  }, [router, token]);

  useEffect(() => {
    if (!projectsData?.getProjects) return;

    const fetchBoards = async () => {
      const promises = projectsData.getProjects.map(async (project) => {
        const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `
              query GetKanbanTasks($projectId: String!) {
                getKanbanTasks(projectId: $projectId) {
                  id
                  title
                  status
                }
              }
            `,
            variables: { projectId: project.id },
          }),
        });

        const json = await res.json();
        return {
          project,
          tasks: json.data?.getKanbanTasks || [],
        };
      });

      const results = await Promise.all(promises);
      setBoards(results);
    };

    fetchBoards();
  }, [projectsData, token]);

  const toggleCollapse = (projectId) => {
    setCollapsedBoards((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  if (loadingProjects) return <p>Loading projects...</p>;

  return (
    <div className="pb-5">
      <h1 className="text-2xl font-bold mb-1">Kanban boards for all projects</h1>

      {boards.map(({ project, tasks }) => {
        const grouped = { todo: [], doing: [], done: [] };
        tasks.forEach((task) => grouped[task.status].push(task));
        const isCollapsed = collapsedBoards[project.id];

        return (
          <div key={project.id} className="rounded shadow-sm">
            <button
              onClick={() => toggleCollapse(project.id)}
              className="w-full text-left pl-3 pr-3 pb-1 bg-pink-100 hover:bg-gray-200 font-semibold text-lg flex justify-between items-center"
              style={{ color: project.color }}
            >
              {project.name}
              <span className="text-sm text-gray-500">
                {isCollapsed ? "▼ Show" : "▲ Hide"}
              </span>
            </button>

            {!isCollapsed && (
              <div className="pl-2 pr-2 bg-pink-100 pb-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-pink-100">
                  {["todo", "doing", "done"].map((status) => (
                    <div
                      key={status}
                      className="bg-gray-100 pt-3 pl-3 pr-3 pb-2 rounded shadow min-h-[20px]"
                    >
                      <h3 className="capitalize font-semibold">
                        {status}
                      </h3>
                      {grouped[status].length > 0 ? (
                        grouped[status].map((task) => (
                          <div
                            key={task.id}
                            className="bg-white pl-2 pr-2 pt-1 pb-1 mb-1 rounded shadow text-sm"
                          >
                            {task.title}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic pb-3">No tasks</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
