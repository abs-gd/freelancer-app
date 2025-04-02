import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, gql } from "@apollo/client";
import toast from "react-hot-toast";
import { getAuthToken } from "../utils/auth";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Modal from "react-modal";

const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
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
      subtasks {
        title
        done
      }
    }
  }
`;

const ADD_TASK = gql`
  mutation AddKanbanTask($projectId: String!, $title: String!) {
    addKanbanTask(projectId: $projectId, title: $title) {
      id
      title
      status
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateKanbanTaskStatus($taskId: String!, $status: String!) {
    updateKanbanTaskStatus(taskId: $taskId, status: $status) {
      id
      status
    }
  }
`;

const DELETE_TASK = gql`
  mutation DeleteKanbanTask($taskId: String!) {
    deleteKanbanTask(taskId: $taskId)
  }
`;

const EDIT_TASK_TITLE = gql`
  mutation EditTaskTitle($taskId: String!, $title: String!) {
    updateKanbanTaskTitle(taskId: $taskId, title: $title) {
      id
      title
    }
  }
`;

const ADD_SUBTASK = gql`
  mutation AddSubtask($taskId: String!, $title: String!) {
    addSubtask(taskId: $taskId, title: $title) {
      subtasks {
        title
        done
      }
    }
  }
`;

const TOGGLE_SUBTASK = gql`
  mutation ToggleSubtask($taskId: String!, $subtaskIndex: Int!) {
    toggleSubtask(taskId: $taskId, subtaskIndex: $subtaskIndex) {
      subtasks {
        title
        done
      }
    }
  }
`;

const DELETE_SUBTASK = gql`
  mutation DeleteSubtask($taskId: String!, $subtaskIndex: Int!) {
    deleteSubtask(taskId: $taskId, subtaskIndex: $subtaskIndex) {
      subtasks {
        title
        done
      }
    }
  }
`;


export default function KanbanPage() {
  const router = useRouter();
  const columns = ["todo", "doing", "done"];
  const [activeProject, setActiveProject] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [tasks, setTasks] = useState({ todo: [], doing: [], done: [] });
  const [selectedTask, setSelectedTask] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  
  const { data: projectsData } = useQuery(GET_PROJECTS);
  const { data: tasksData, refetch } = useQuery(GET_KANBAN_TASKS, {
    variables: { projectId },
    skip: !projectId,
  });

  const [addTask] = useMutation(ADD_TASK);
  const [updateTask] = useMutation(UPDATE_TASK);
  const [deleteTask] = useMutation(DELETE_TASK);
  const [editTaskTitle] = useMutation(EDIT_TASK_TITLE);
  const [addSubtask] = useMutation(ADD_SUBTASK);
  const [toggleSubtask] = useMutation(TOGGLE_SUBTASK);
  const [deleteSubtask] = useMutation(DELETE_SUBTASK);
  
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const token = getAuthToken();
    if (!token) router.push("/login");
  }, [router]);
  
  useEffect(() => {
    if (projectsData) {
      const active = projectsData.getProjects.find((a) => a.isActive);
      if (active) {
        setActiveProject(active);
        setProjectId(active.id);
      }
    }
  }, [projectsData]);

  useEffect(() => {
    if (tasksData?.getKanbanTasks) {
      const grouped = { todo: [], doing: [], done: [] };
      tasksData.getKanbanTasks.forEach((task) => {
        grouped[task.status].push(task);
      });
      setTasks(grouped);
    }
  }, [tasksData]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return toast.error("Task title required");
    try {
      await addTask({ variables: { projectId, title: newTaskTitle } });
      setNewTaskTitle("");
      toast.success("Task added!");
      refetch();
    } catch {
      toast.error("Failed to add task");
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = findTaskById(active.id);
    const sourceCol = activeTask?.status;
    const targetCol = over?.data?.current?.column;

    if (sourceCol && targetCol && sourceCol !== targetCol) {
      try {
        await updateTask({
          variables: { taskId: active.id, status: targetCol },
        });
        toast.success(`Moved to ${targetCol}`);
        refetch();
      } catch {
        toast.error("Move failed");
      }
    }
  };

  const findTaskById = (id) =>
    [...tasks.todo, ...tasks.doing, ...tasks.done].find((t) => t.id === id);

  const handleDelete = async (taskId, projectId) => {
    if (confirm("Delete this task?")) {
      await deleteTask({ variables: { taskId } });
      toast.success("Task deleted");

      const { data } = await refetch({ projectId });

      // update the local state so the UI reflects the change
      if (data?.getKanbanTasks) {
        const grouped = { todo: [], doing: [], done: [] };
        data.getKanbanTasks.forEach((task) => {
          grouped[task.status].push(task);
        });
        setTasks(grouped); // force update
      }
    }
  };


  return (
    <>
      <div className="md:p-5 p-2">
        <div className="flex justify-start">
          <h1 className="text-2xl mb-4">
            {activeProject
              ? `Kanban board for ${activeProject.name}`
              : "Loading..."}
          </h1>

          <div className="md:mb-4 mb-2 w-full">
            <input
              type="text"
              placeholder="New task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="border p-2 text-base rounded md:w-1/3 w-4/5 mr-2 h-[50px]"
            />
            <button
              onClick={handleAddTask}
              className="bg-green-600 text-lg text-white px-4 py-2 rounded md:w-1/12 cursor-pointer h-[52px]"
            >
              Add
            </button>
          </div>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 md:gap-4 gap-2">
            {columns.map((col) => (
              <DroppableColumn key={col} column={col}>
                <SortableContext
                  items={tasks[col]}
                  strategy={verticalListSortingStrategy}
                >
                  {tasks[col].map((task) => (
                    <DraggableCard
                      key={task.id}
                      task={task}
                      column={col}
                      onDelete={() => handleDelete(task.id, projectId)}
                      onClick={() => setSelectedTask(task)}
                      onEditTitle={(taskId, newTitle) =>
                        editTaskTitle({
                          variables: { taskId, title: newTitle },
                        })
                      }
                    />
                  ))}
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      </div>
      <Modal
        isOpen={!!selectedTask}
        onRequestClose={() => setSelectedTask(null)}
        contentLabel="Task Details"
        className="bg-white p-6 rounded shadow max-w-lg mx-auto mt-20 relative"
        overlayClassName="fixed inset-0 bg-black/50 flex items-start justify-center"
      >
        <h2 className="text-2xl font-bold mb-2">{selectedTask?.title}</h2>

        <ul className="mb-4 space-y-2">
          {selectedTask?.subtasks?.map((subtask, index) => (
            <li key={index} className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subtask.done}
                  onChange={async () => {
                    await toggleSubtask({
                      variables: {
                        taskId: selectedTask.id,
                        subtaskIndex: index,
                      },
                    });
                    const { data } = await refetch({ projectId });
                    const updated = data.getKanbanTasks.find(
                      (t) => t.id === selectedTask.id
                    );
                    setSelectedTask(updated);
                  }}
                />
                <span className={subtask.done ? "line-through" : ""}>
                  {subtask.title}
                </span>
              </label>
              <button
                onClick={async () => {
                  await deleteSubtask({
                    variables: { taskId: selectedTask.id, subtaskIndex: index },
                  });
                  const { data } = await refetch({ projectId });
                  const updated = data.getKanbanTasks.find(
                    (t) => t.id === selectedTask.id
                  );
                  setSelectedTask(updated);
                }}
                className="text-lg text-red-500 cursor-pointer"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New subtask"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            className="border p-2 flex-1"
          />
          <button
            onClick={async () => {
              if (!newSubtaskTitle.trim()) return;
              await addSubtask({
                variables: { taskId: selectedTask.id, title: newSubtaskTitle },
              });
              setNewSubtaskTitle("");
              const { data } = await refetch({ projectId });
              const updated = data.getKanbanTasks.find(
                (t) => t.id === selectedTask.id
              );
              setSelectedTask(updated);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer"
          >
            Add
          </button>
        </div>

        <button
          onClick={() => setSelectedTask(null)}
          className="absolute top-0 right-2 text-gray-400 text-3xl cursor-pointer"
        >
          ×
        </button>
      </Modal>
    </>
  );
}

import { useSortable } from "@dnd-kit/sortable";
function DraggableCard({ task, column, onDelete, onClick, onEditTitle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { column },
    handle: true,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.title);

  const handleSave = async () => {
    if (!editText.trim()) return;
    await onEditTitle(task.id, editText);

    setIsEditing(false);
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-fuchsia-300 p-1 rounded shadow md:mb-2 mb-1 text-lg relative"
      data-column={column}
      onClick={!isEditing ? onClick : undefined}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 text-3xl mb-auto mt-auto"
          >
            🟰
          </span>
          {isEditing ? (
            <div className="flex gap-2">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="border p-1 flex-1 rounded text-lg"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="text-2xl text-green-600 cursor-pointer"
              >
                💾
              </button>
            </div>
          ) : (
            <p className="mt-auto mb-auto md:text-lg text-sm">{task.title}</p>
          )}
        </div>
        <div className="flex gap-2 mt-auto mb-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="text-xl text-blue-500 cursor-pointer"
            title="Edit task"
          >
            📝
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete();
            }}
            className="text-xl text-red-500 cursor-pointer"
            title="Delete task"
          >
            ❌
          </button>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ column, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { column },
  });
  {/*console.log(column);*/}

  const classes = ["md:p-3 p-1 rounded shadow transition-all duration-200"];
  if (column == 'todo') classes.push(" bg-yellow-200");
  if (column == "doing") classes.push(" bg-green-200");
  if (column == "done") classes.push(" bg-gray-200");

  return (
    <div
      ref={setNodeRef}
      className={classes}
      style={{ minHeight: "150px" }}
    >
      <div className="flex justify-between items-center md:mb-2 mb-1">
        <h2 className="text-lg font-semibold capitalize md:m-0 m-auto">{column}</h2>
        {/*<TaskCount column={column} />*/}
      </div>
      {children}
    </div>
  );
}
/*
function TaskCount({ column }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(document.querySelectorAll(`[data-column="${column}"]`).length);
  }, [column]);

  return <span className="text-sm text-gray-500">{count} tasks</span>;
}*/