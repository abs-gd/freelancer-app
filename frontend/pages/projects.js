/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import toast from "react-hot-toast";

const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
      color
      isActive
      note
    }
  }
`;/*
const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
      color
      note
    }
  }
`;
*/
const SWITCH_ACTIVE_PROJECT = gql`
  mutation SwitchActiveProject($projectId: String!) {
    switchActiveProject(projectId: $projectId) {
      id
      isActive
    }
  }
`;

const ADD_PROJECT = gql`
  mutation AddProject(
    $name: String!
    $color: String
  ) {
    addProject(name: $name, color: $color) {
      id
      name
      color
      isActive
    }
  }
`;
/*
const ADD_PROJECT = gql`
  mutation AddProject($name: String!, $color: String) {
    addProject(name: $name, color: $color) {
      id
      name
      color
    }
  }
`;*/
const UPDATE_PROJECT = gql`
  mutation UpdateProject(
    $projectId: String!
    $name: String
    $color: String
    $note: JSON
  ) {
    updateProject(
      projectId: $projectId
      name: $name
      color: $color
      note: $note
    ) {
      id
      name
      color
      note
    }
  }
`;

const DELETE_PROJECT = gql`
  mutation DeleteProject($projectId: String!) {
    deleteProject(projectId: $projectId)
  }
`;

export default function Projects() {
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS);
  const [switchActiveProject] = useMutation(SWITCH_ACTIVE_PROJECT);
  const [addProject] = useMutation(ADD_PROJECT);
  const [updateProject] = useMutation(UPDATE_PROJECT);
  const [deleteProject] = useMutation(DELETE_PROJECT);
  const [newProject, setNewProject] = useState({
    name: "",
    color: "#ffffff",
  });
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({});
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const [infoProject, setInfoProject] = useState(null);

  useEffect(() => {
    let editor;

    if (editingProject) {
      (async () => {
        const EditorJS = (await import("@editorjs/editorjs")).default;
        const Header = (await import("@editorjs/header")).default;
        const List = (await import("@editorjs/list")).default;
        const Paragraph = (await import("@editorjs/paragraph")).default;
        const ImageTool = (await import("@editorjs/image")).default;
        const Checklist = (await import("@editorjs/checklist")).default;
        const Embed = (await import("@editorjs/embed")).default;
        const LinkTool = (await import("@editorjs/link")).default;
        editor = new EditorJS({
          holder: "editorjs",
          tools: {
            header: Header,
            list: List,
            paragraph: Paragraph,
            image: {
              class: ImageTool,
              config: {
                endpoints: {
                  byFile: `${process.env.NEXT_PUBLIC_API_URL}/api/uploadImage`,
                },
              },
            },
            checklist: Checklist,
            linkTool: {
              class: LinkTool,
              config: {
                endpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/fetchLink`,
                displayImage: true,
              },
            },
            embed: {
              class: Embed,
              config: {
                services: {
                  youtube: true,
                  codepen: true,
                  twitter: true,
                },
              },
            },
          },
          data: editForm.note || { blocks: [] },
          onReady: () => {
            editorInstanceRef.current = editor;
          },
        });
      })();
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
  }, [editForm.note, editingProject]);

  useEffect(() => {
    if (infoProject?.note) {
      (async () => {
        const EditorJS = (await import("@editorjs/editorjs")).default;
        const Header = (await import("@editorjs/header")).default;
        const List = (await import("@editorjs/list")).default;
        const Paragraph = (await import("@editorjs/paragraph")).default;
        const ImageTool = (await import("@editorjs/image")).default;
        const Checklist = (await import("@editorjs/checklist")).default;
        const Embed = (await import("@editorjs/embed")).default;
        const LinkTool = (await import("@editorjs/link")).default;

        const viewer = new EditorJS({
          holder: "info-note-viewer",
          readOnly: true,
          tools: {
            header: Header,
            list: List,
            paragraph: Paragraph,
            image: {
              class: ImageTool,
              config: {
                endpoints: {
                  byFile: `${process.env.NEXT_PUBLIC_API_URL}/api/uploadImage`,
                },
                field: "image",
                types: "image/*",
              },
            },
            checklist: Checklist,
            linkTool: {
              class: LinkTool,
              config: {
                endpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/fetchLink`,
                displayImage: true,
              },
            },
            embed: {
              class: Embed,
              config: {
                services: {
                  youtube: true,
                  codepen: true,
                  twitter: true,
                },
              },
            },
          },
          data: infoProject.note,
        });

        return () => {
          viewer.destroy();
        };
      })();
    }
  }, [infoProject]);

  if (loading) return <p>Loading projects...</p>;
  if (error) {
    console.log(error)
    return <p>Error loading projects.</p>;
  }

  const handleSwitchActiveProject = async (projectId) => {
    try {
      await switchActiveProject({ variables: { projectId } });
      toast.success("Active project changed!");
      refetch(); // Refresh project list
    } catch (err) {
      toast.error("Failed to switch active project.");
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name) {
      toast.error("Project name is required!");
      return;
    }

    try {
      await addProject({ variables: newProject });
      toast.success("New project added!");
      setNewProject({ name: "", color: "#ffffff" });
      refetch();
    } catch (err) {
      toast.error("Failed to add project.");
    }
  };

  return (
    <>
      <div className="md:p-6 p-3">
        <h1 className="text-4xl font-medium">💼 Your projects</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 [@media(min-width:2560px)]:grid-cols-8 md:gap-4 gap-2 mt-6">
          {data.getProjects.map((project) => (
            <div
              key={project.id}
              className="border-4 rounded-md"
              style={{ borderColor: project.color, color: project.color }}
            >
              <div className="text-2xl p-3 md:flex items-center justify-between">
                <div
                  className="md:w-2/3 md:flex md:items-center gap-1"
                  onClick={() => setInfoProject(project)}
                >
                  {project.name}
                  {project.isActive && (
                    <span className="text-green-500 text-xl pl-1 mt-[1px]">
                      🌟
                    </span>
                  )}
                </div>
                <div className="md:w-1/3">
                  <button
                    onClick={() => setInfoProject(project)}
                    className="cursor-pointer text-xl text-indigo-600 md:ml-1"
                    title="View Info"
                  >
                    ℹ️
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(project);
                      setEditForm({
                        name: project.name,
                        color: project.color,
                        note: project.note || { blocks: [] },
                      });
                    }}
                    className="cursor-pointer text-blue-600 text-xl md:ml-1"
                    title="Edit project"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={async () => {
                      const confirmDelete = confirm(
                        `Delete project "${project.name}"?`
                      );
                      if (!confirmDelete) return;

                      await deleteProject({
                        variables: { projectId: project.id },
                      });
                      toast.success("Project deleted");
                      refetch();
                    }}
                    className="cursor-pointer text-red-500 text-xl md:ml-1"
                    title="Delete project"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-medium mt-6">Add new project</h2>
        <div className="mt-2 md:flex md:justify-between w-full md:gap-2">
          <input
            type="text"
            placeholder="Name"
            value={newProject.name}
            onChange={(e) =>
              setNewProject({ ...newProject, name: e.target.value })
            }
            className="border p-2 w-full h-[50px] md:mb-0 mb-2"
          />
          <input
            type="color"
            value={newProject.color}
            onChange={(e) =>
              setNewProject({ ...newProject, color: e.target.value })
            }
            className="border p-2 cursor-pointer md:w-[50px] w-full h-[50px] md:mb-0 mb-2"
          />
          <button
            onClick={handleAddProject}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded cursor-pointer h-[50px] md:mb-0 mb-40 md:w-fit w-full"
          >
            Add
          </button>
        </div>
      </div>

      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white md:mt-0 mt-10 md:p-6 p-2 rounded-lg shadow-lg xl:w-5/6 sm:w-full w-full">
            <h2 className="text-xl font-semibold mb-4">
              Edit {editingProject.name}
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const noteData = await editorInstanceRef.current.save();
                await updateProject({
                  variables: {
                    projectId: editingProject.id,
                    name: editForm.name,
                    color: editForm.color,
                    note: noteData,
                  },
                });
                toast.success("Project updated");
                setEditingProject(null);
                setEditForm({});
                refetch();
              }}
              className="space-y-3 overflow-y-auto max-h-[95vh]"
            >
              <div className="flex items-center gap-4">
                <label className="block font-medium mb-1 w-1/12">Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full border p-2 rounded"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="block font-medium mb-1 w-1/12">Color</label>
                <input
                  type="color"
                  className="cursor-pointer w-10 h-10 border rounded ml-[-10px]"
                  value={editForm.color}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, color: e.target.value }))
                  }
                />
              </div>
              <div className="mt-4">
                <label className="block font-medium mb-1">Note</label>
                <div id="editorjs" className="border p-2 rounded bg-white" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="cursor-pointer px-4 py-2 bg-gray-300 rounded md:mb-0 mb-96"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded md:mb-0 mb-96"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {infoProject && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
          onClick={() => setInfoProject(null)}
        >
          <div className="bg-white rounded-xl shadow-xl xl:w-1/2 sm:w-full h-full relative overflow-y-auto max-h-[95vh]">
            {/* <button
              onClick={() => setInfoProject(null)}
              className="cursor-pointer absolute top-1 right-1 bg-white text-6xl rounded-full h-[36px] w-[36px]"
            >
              <p className="text-2xl text-red-600 mt-[-4px]">❌</p>
            </button> */}
            <div className="mb-4 p-6">
              <h2 className="text-2xl font-semibold mb-4">
                {infoProject.name}
              </h2>
              {infoProject.color && (
                <p className="flex items-center gap-2 mb-4">
                  <span className="font-semibold w-2/12">Color</span>
                  <span
                    className="w-6 h-6 ml-[-20px]"
                    style={{ backgroundColor: infoProject.color }}
                    title={`Color: ${infoProject.color}`}
                  ></span>
                </p>
              )}
            </div>
            <div className="prose max-w-none w-full">
              <div id="info-note-viewer" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
