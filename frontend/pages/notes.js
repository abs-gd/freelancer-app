import { useEffect, useRef, useState } from "react";
import { gql, useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { getAuthToken } from "../utils/auth";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
      isActive
    }
  }
`;

const GET_NOTES = gql`
  query GetNotes($projectId: String!) {
    getNotes(projectId: $projectId) {
      id
      title
      category
      content
      updatedAt
      pinned
    }
  }
`;

const ADD_NOTE = gql`
  mutation AddNote($projectId: String!, $title: String!, $category: String!) {
    addNote(projectId: $projectId, title: $title, category: $category) {
      id
    }
  }
`;

const UPDATE_NOTE = gql`
  mutation UpdateNote($noteId: String!, $content: String!) {
    updateNote(noteId: $noteId, content: $content) {
      id
    }
  }
`;

const DELETE_NOTE = gql`
  mutation DeleteNote($noteId: String!) {
    deleteNote(noteId: $noteId)
  }
`;

const UPDATE_NOTE_META = gql`
  mutation UpdateNoteMeta(
    $noteId: String!
    $title: String!
    $category: String!
  ) {
    updateNoteMeta(noteId: $noteId, title: $title, category: $category) {
      id
      title
      category
    }
  }
`;

const TOGGLE_NOTE_PIN = gql`
  mutation ToggleNotePin($noteId: String!, $pinned: Boolean!) {
    toggleNotePin(noteId: $noteId, pinned: $pinned) {
      id
      pinned
    }
  }
`;

function NotesPage() {
  const router = useRouter();
  const editorRef = useRef(null);

  const [projectId, setProjectId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [form, setForm] = useState({ title: "", category: "" });

  const { data: projectsData } = useQuery(GET_PROJECTS);
  const [loadNotes, { data: notesData, refetch }] = useLazyQuery(GET_NOTES);
  const [addNote] = useMutation(ADD_NOTE);
  const [updateNote] = useMutation(UPDATE_NOTE);
  const [deleteNote] = useMutation(DELETE_NOTE);
  const [updateNoteMeta] = useMutation(UPDATE_NOTE_META);
  const [toggleNotePin] = useMutation(TOGGLE_NOTE_PIN);

  // Load active project
  useEffect(() => {
    if (!getAuthToken()) router.push("/login");

    if (projectsData?.getProjects) {
      const active = projectsData.getProjects.find((a) => a.isActive);
      if (active) {
        setProjectId(active.id);
        loadNotes({ variables: { projectId: active.id } });
      }
    }
  }, [projectsData, loadNotes, router]);

  // Group notes by category
  const grouped = {};
  const notes = notesData?.getNotes || [];
  notes.forEach((note) => {
    if (!grouped[note.category]) grouped[note.category] = [];
    grouped[note.category].push(note);
  });


  // Sort each group: pinned notes first
  Object.keys(grouped).forEach((cat) => {
    grouped[cat].sort((a, b) => {
      if (a.pinned === b.pinned)
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      return a.pinned ? -1 : 1; // pinned first
    });
  });
  const categories = Object.keys(grouped);

  // Load Editor.js when note is selected
  useEffect(() => {
    const loadEditor = async () => {
      if (
        typeof window === "undefined" ||
        !activeNote ||
        editorRef.current ||
        !document.getElementById("editorjs")
      )
        return;

      const EditorJS = (await import("@editorjs/editorjs")).default;
      const Header = (await import("@editorjs/header")).default;
      const List = (await import("@editorjs/list")).default;
      const Paragraph = (await import("@editorjs/paragraph")).default;
      const ImageTool = (await import("@editorjs/image")).default;
      const Checklist = (await import("@editorjs/checklist")).default;
      const Embed = (await import("@editorjs/embed")).default;
      const LinkTool = (await import("@editorjs/link")).default;

      const editor = new EditorJS({
        holder: "editorjs",
        autofocus: true,
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
        data: activeNote.content ? JSON.parse(activeNote.content) : undefined,
        onReady: () => {
          editorRef.current = editor;
        },
      });
    };

    loadEditor();

    return () => {
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [activeNote]);

  const handleSave = async () => {
    if (!editorRef.current || !activeNote) return;
    const content = await editorRef.current.save();
    await updateNote({
      variables: { noteId: activeNote.id, content: JSON.stringify(content) },
    });
    toast.success("Note saved");
    refetch({ projectId });
  };

  const handleAddNote = async () => {
    if (!form.title || !form.category || !projectId) {
      toast.error("All fields required");
      return;
    }
    await addNote({ variables: { ...form, projectId } });
    toast.success("Note created");
    setForm({ title: "", category: "" });
    setActiveCategory(form.category);
    refetch({ projectId });
  };

  const handleDelete = async (noteId) => {
    await deleteNote({ variables: { noteId } });
    toast.success("Note deleted");
    if (activeNote?.id === noteId) setActiveNote(null);
    refetch({ projectId });
  };

  const [editing, setEditing] = useState({});
  const [editForm, setEditForm] = useState({});

  return (
    <div className="md:p-5 p-1 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🗂 Notes</h1>

      {/* Tabs */}
      <div className="flex gap-2 md:mb-4 mb-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded ${
              activeCategory === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-200 cursor-pointer"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notes List */}
      {activeCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
          {grouped[activeCategory]?.map((note) => (
            <div
              key={note.id}
              className={`p-3 rounded shadow cursor-text border ${
                activeNote?.id === note.id
                  ? "border-blue-500"
                  : note.pinned
                  ? "border-yellow-400"
                  : "bg-white"
              }`}
              onClick={() => !editing[note.id] && setActiveNote(note)}
            >
              {editing[note.id] ? (
                <div className="space-y-1">
                  <input
                    value={editForm[note.id]?.title || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        [note.id]: { ...prev[note.id], title: e.target.value },
                      }))
                    }
                    className="w-full p-1 border rounded text-sm"
                  />
                  <input
                    value={editForm[note.id]?.category || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        [note.id]: {
                          ...prev[note.id],
                          category: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-1 border rounded text-sm"
                  />
                  <div className="flex gap-4 text-sm mt-1">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const { title, category } = editForm[note.id];
                        await updateNoteMeta({
                          variables: { noteId: note.id, title, category },
                        });
                        toast.success("Note updated");
                        setEditing((prev) => ({ ...prev, [note.id]: false }));
                        setEditForm((prev) => ({ ...prev, [note.id]: {} }));
                        refetch({ projectId });
                        if (category !== activeCategory) setActiveNote(null); // prevent mismatch
                      }}
                      className="text-green-600 cursor-pointer"
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing((prev) => ({ ...prev, [note.id]: false }));
                        setEditForm((prev) => ({ ...prev, [note.id]: {} }));
                      }}
                      className="text-red-700 cursor-pointer"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="">
                    <span className="font-medium">{note.title}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(note.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleNotePin({
                          variables: { noteId: note.id, pinned: !note.pinned },
                        });
                        await refetch({ projectId });
                        toast.success(
                          note.pinned ? "Unpinned note" : "Pinned note"
                        );
                      }}
                      title={note.pinned ? "Unpin" : "Pin"}
                      className="text-yellow-500 text-xl cursor-pointer"
                    >
                      {note.pinned ? "📌" : "📍"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing((prev) => ({ ...prev, [note.id]: true }));
                        setEditForm((prev) => ({
                          ...prev,
                          [note.id]: {
                            title: note.title,
                            category: note.category,
                          },
                        }));
                      }}
                      className="text-blue-500 text-xl cursor-pointer"
                      title="Edit"
                    >
                      📝
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      className="text-red-500 text-xl cursor-pointer"
                      title="Delete"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor.js */}
      {activeNote && (
        <>
          <div
            id="editorjs"
            className="prose max-w-none bg-white border rounded p-4 min-h-[300px]"
          />
          <button
            onClick={handleSave}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded cursor-pointer"
          >
            Save note
          </button>
        </>
      )}

      {/* Add New Note */}
      <div className="bg-gray-100 md:p-4 p-2 rounded w-full mt-10">
        <h2 className="text-lg font-semibold md:mb-4 mb-2 text-center">➕ New note</h2>
        <div className="md:flex md:justify-between w-full md:gap-2">
          <input
            type="text"
            placeholder="Title"
            className="w-full p-2 border rounded mb-2 h-[50px]"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Category"
            className="w-full p-2 border rounded mb-2 h-[50px]"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <button
            onClick={handleAddNote}
            className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer h-[52px] md:w-fit w-full"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(NotesPage), { ssr: false });
