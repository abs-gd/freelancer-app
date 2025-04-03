import { gql, useQuery } from "@apollo/client";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Tooltip as PieTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const GET_ALL_INCOME = gql`
  query {
    getIncome(page: 1, limit: 10000) {
      id
      date
      amount
      site_or_stream
      product
    }
  }
`;

export default function IncomeStatistics() {
  const { data, loading } = useQuery(GET_ALL_INCOME);
  const [view, setView] = useState("charts"); // default view

  const stats = useMemo(() => {
    if (!data?.getIncome) return null;

    const byPlatform = {};
    const byProduct = {};
    const byMonth = {};
    const byYear = {};
    const monthlyGrowth = {};

    data.getIncome.forEach((entry) => {
      const amount = parseFloat(entry.amount || 0);
      const date = new Date(entry.date);
      const year = date.getFullYear();
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const sortedMonths = Object.keys(byMonth).sort(); // Ascending order
      // Group by platform
      byPlatform[entry.site_or_stream] =
        (byPlatform[entry.site_or_stream] || 0) + amount;

      // Group by product
      byProduct[entry.product] = (byProduct[entry.product] || 0) + amount;

      // Group by month
      byMonth[month] = (byMonth[month] || 0) + amount;

      // Group by year
      byYear[year] = (byYear[year] || 0) + amount;

      // Monthly growth
      for (let i = 1; i < sortedMonths.length; i++) {
        const prev = byMonth[sortedMonths[i - 1]];
        const current = byMonth[sortedMonths[i]];
        const growth = prev === 0 ? 0 : ((current - prev) / prev) * 100;
        monthlyGrowth[sortedMonths[i]] = growth;
      }
    });

    return { byPlatform, byProduct, byMonth, byYear, monthlyGrowth };
  }, [data]);

  if (loading || !stats) return <p className="p-5">Loading stats...</p>;

  const renderTable = (title, dataMap, growthMap = null) => (
    <div className="mb-8 md:w-fit md:ml-auto md:mr-auto w-full">
      <h2 className="text-xl font-semibold mb-2 text-center">{title}</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200 text-left">
          <tr>
            <th className="p-2">Group</th>
            <th className="p-2">Total (€)</th>
            {growthMap && <th className="p-2">Change</th>}
          </tr>
        </thead>
        <tbody>
          {Object.entries(dataMap).map(([key, value]) => {
            const growth = growthMap?.[key];
            const growthText =
              growth != null
                ? `${growth > 0 ? "▲" : growth < 0 ? "▼" : "–"} ${Math.abs(
                    growth
                  ).toFixed(1)}%`
                : "";

            const growthColor =
              growth > 0
                ? "text-green-600"
                : growth < 0
                ? "text-red-500"
                : "text-gray-500";

            return (
              <tr key={key} className="border-t hover:bg-pink-200">
                <td className="p-2">{key}</td>
                <td className="p-2">€{value.toFixed(2)}</td>
                {growthMap && (
                  <td className={`p-2 font-medium ${growthColor}`}>
                    {growthText}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderChart = (title, dataMap) => {
    const chartData = Object.entries(dataMap).map(([key, value]) => ({
      name: key,
      total: Number(value.toFixed(2)),
    }));

    return (
      <div className="mb-10 w-full">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `€${value}`} />
              {/*<Legend />*/}
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#6366f1",
    "#ec4899",
    "#14b8a6",
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      return (
        <div className="bg-white border rounded px-3 py-2 shadow text-sm">
          <strong>{name}</strong>: €{value.toFixed(2)}
        </div>
      );
    }
    return null;
  };

  const renderPieChart = (title, dataMap) => {
    const chartData = Object.entries(dataMap).map(([key, value]) => ({
      name: key,
      value: Number(value.toFixed(2)),
    }));

    return (
      <div className="mb-10">
        <h2 className="text-xl md:text-center font-semibold mb-2">{title}</h2>
        <div className="w-full flex justify-center">
          <PieChart width={400} height={300}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              outerRadius={120}
              label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <PieTooltip content={<CustomTooltip />} />
          </PieChart>
        </div>
        {/* Color Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span>{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="md:p-6 p-3">
      <div className="flex justify-between">
        <h1 className="text-4xl font-medium mb-6">📊 Income Statistics</h1>
        <div className="mb-6 md:flex md:w-1/5 md:h-[50px] md:gap-4 gap-1">
          <button
            onClick={() => setView("charts")}
            className={`md:px-4 md:py-2 p-2 md:mb-0 w-full mb-2 rounded ${
              view === "charts"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 cursor-pointer"
            }`}
          >
            📊 Charts
          </button>
          <button
            onClick={() => setView("tables")}
            className={`md:px-4 md:py-2 p-2 w-full rounded ${
              view === "tables"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 cursor-pointer"
            }`}
          >
            📋 Tables
          </button>
        </div>
      </div>
      {view === "tables" && (
        <>
          <div className="md:flex md:m-auto md:gap-6 md:mb-0 mb-40">
            {renderTable("By Platform", stats.byPlatform)}
            {renderTable("By Product", stats.byProduct)}
            {renderTable("By Month", stats.byMonth, stats.monthlyGrowth)}
            {renderTable("By Year", stats.byYear)}
          </div>
        </>
      )}
      {view === "charts" && (
        <>
          <div className="md:flex md:w-full md:gap-6">
            {renderChart("Total by Platform", stats.byPlatform)}
            {renderChart("Total by Product", stats.byProduct)}
            {renderChart("Total by Year", stats.byYear)}
          </div>
          <div className="md:flex md:w-full md:gap-6">
            {renderChart("Total by Month", stats.byMonth)}
          </div>
          <div className="md:grid md:grid-cols-2 md:w-full md:gap-6 md:mb-0 mb-40">
            {renderPieChart("Total by Platform", stats.byPlatform)}
            {renderPieChart("Total by Product", stats.byProduct)}
          </div>
        </>
      )}
    </div>
  );
}
