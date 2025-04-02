import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import toast from "react-hot-toast";

const GET_INCOME = gql`
  query GetIncome($page: Int, $limit: Int) {
    getIncome(page: $page, limit: $limit) {
      id
      date
      amount
      site_or_stream
      product
    }
  }
`;

const ADD_INCOME = gql`
  mutation AddIncome(
    $date: String!
    $amount: Float!
    $site_or_stream: String!
    $product: String!
  ) {
    addIncome(
      date: $date
      amount: $amount
      site_or_stream: $site_or_stream
      product: $product
    ) {
      id
    }
  }
`;

const DELETE_INCOME = gql`
  mutation DeleteIncome($id: String!) {
    deleteIncome(id: $id)
  }
`;

const UPDATE_INCOME = gql`
  mutation UpdateIncome(
    $id: String!
    $date: String!
    $amount: Float!
    $site_or_stream: String!
    $product: String!
  ) {
    updateIncome(
      id: $id
      date: $date
      amount: $amount
      site_or_stream: $site_or_stream
      product: $product
    ) {
      id
    }
  }
`;

export default function IncomePage() {
  const [form, setForm] = useState({
    date: "",
    amount: "",
    site_or_stream: "",
    product: "",
  });
  const [page, setPage] = useState(1);

  const { data, loading, refetch } = useQuery(GET_INCOME, {
    variables: { page, limit: 100 },
  });

  const [addIncome] = useMutation(ADD_INCOME);

  const [deleteIncome] = useMutation(DELETE_INCOME);

  const [updateIncome] = useMutation(UPDATE_INCOME);
  const [editing, setEditing] = useState(null); //

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addIncome({
        variables: {
          ...form,
          amount: parseFloat(form.amount),
        },
      });
      toast.success("Income added!");
      setForm({ date: "", amount: "", site_or_stream: "", product: "" });
      refetch();
    } catch (err) {
      toast.error("Failed to add income");
    }
  };

  return (
    <div className="md:p-5 p-1">
      <h1 className="text-2xl font-bold md:mb-4 mb-1">💶 Income Tracker</h1>

      <form
        onSubmit={handleSubmit}
        className="md:flex md:gap-4 md:mb-5 mb-2 w-full"
      >
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
          className="border p-2 rounded h-[50px] md:w-fit w-full md:mb-0 mb-2"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Amount (€)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          className="border p-2 rounded h-[50px] md:w-fit w-full md:mb-0 mb-2"
        />
        <select
          value={form.site_or_stream}
          onChange={(e) => setForm({ ...form, site_or_stream: e.target.value })}
          required
          className="border p-2 rounded h-[50px] md:w-fit w-full md:mb-0 mb-2"
        >
          <option value="">Platform or Stream</option>
          <option value="Udemy">Udemy</option>
          <option value="Patron">Patron</option>
          <option value="Freelance webdev">Freelance webdev</option>
          <option value="Linux consultancy">Linux consultancy</option>
          <option value="Affiliate">Affiliate</option>
        </select>
        <select
          value={form.product}
          onChange={(e) => setForm({ ...form, product: e.target.value })}
          required
          className="border p-2 rounded h-[50px] md:w-fit w-full md:mb-0 mb-2"
        >
          <option value="">Product</option>
          <option value="Course sale">Course sale</option>
          <option value="Subscription">Subscription</option>
          <option value="Recurring subscription">Recurring subscription</option>
          <option value="Website development">Website development</option>
          <option value="1 hour consultancy">Consultancy</option>
          <option value="Blog affiliate income">Blog affiliate income</option>
          <option value="Other">Other</option>
        </select>
        <button
          type="submit"
          className="col-span-1 md:col-span-4 bg-green-700 text-white py-2 px-10 rounded cursor-pointer h-[50px] md:w-fit w-full md:mb-0 mb-2"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p>Loading income data...</p>
      ) : (
        <>
          <table className="w-full border text-sm mb-4 md:max-w-fit">
            <thead className="bg-gray-200 text-left">
              <tr>
                <th className="md:p-2 p-1">Date</th>
                <th className="md:p-2 p-1">€</th>
                <th className="md:p-2 p-1">Income Stream</th>
                <th className="md:p-2 p-1">Product</th>
                <th className=""></th>
              </tr>
            </thead>
            <tbody>
              {data.getIncome.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-pink-200">
                  <td className="md:p-2 p-1">{entry.date}</td>
                  <td className="md:p-2 p-1">
                    €{Number(entry.amount).toFixed(2)}
                  </td>
                  <td className="md:p-2 p-1">{entry.site_or_stream}</td>
                  <td className="md:p-2 p-1">{entry.product}</td>
                  <td className="">
                    <button
                      onClick={() => setEditing(entry)}
                      className="text-blue-500 text-lg cursor-pointer"
                      title="Edit"
                    >
                      📝
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Delete this income entry?")) {
                          await deleteIncome({ variables: { id: entry.id } });
                          toast.success("Entry deleted");
                          refetch();
                        }
                      }}
                      className="text-red-500 text-lg cursor-pointer"
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-5 rounded shadow max-w-md w-full relative">
                <h2 className="text-xl font-bold mb-4">Edit Entry</h2>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await updateIncome({
                        variables: {
                          id: editing.id,
                          date: editing.date,
                          amount: parseFloat(editing.amount),
                          site_or_stream: editing.site_or_stream,
                          product: editing.product,
                        },
                      });
                      toast.success("Entry updated!");
                      setEditing(null);
                      refetch();
                    } catch {
                      toast.error("Update failed");
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    type="date"
                    value={editing.date}
                    onChange={(e) =>
                      setEditing({ ...editing, date: e.target.value })
                    }
                    required
                    className="border p-2 rounded w-full"
                  />
                  <input
                    type="number"
                    value={editing.amount}
                    onChange={(e) =>
                      setEditing({ ...editing, amount: e.target.value })
                    }
                    required
                    className="border p-2 rounded w-full"
                  />
                  <select
                    value={editing.site_or_stream}
                    onChange={(e) =>
                      setEditing({ ...editing, site_or_stream: e.target.value })
                    }
                    required
                    className="border p-2 rounded w-full"
                  >
                    <option value="">Platform or Stream</option>
                    <option value="Udemy">Udemy</option>
                    <option value="Patron">Patron</option>
                    <option value="Freelance webdev">Freelance webdev</option>
                    <option value="Linux consultancy">Linux consultancy</option>
                    <option value="Affiliate">Affiliate</option>
                  </select>
                  <select
                    value={editing.product}
                    onChange={(e) =>
                      setEditing({ ...editing, product: e.target.value })
                    }
                    required
                    className="border p-2 rounded w-full"
                  >
                    <option value="">Product</option>
                    <option value="Course sale">Course sale</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Recurring subscription">
                      Recurring subscription
                    </option>
                    <option value="Website development">
                      Website development
                    </option>
                    <option value="1 hour consultancy">
                      Consultancy
                    </option>
                    <option value="Blog affiliate income">
                      Blog affiliate income
                    </option>
                    <option value="Other">Other</option>
                  </select>

                  <div className="flex justify-between mt-4">
                    <button
                      type="submit"
                      className="bg-green-700 text-white py-2 px-4 rounded cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-gray-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded bg-gray-200 cursor-pointer"
            >
              ← Prev
            </button>
            <span className="py-2 px-3">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 rounded bg-gray-200 cursor-pointer"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
