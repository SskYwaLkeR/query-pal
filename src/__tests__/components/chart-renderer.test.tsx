import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChartRenderer } from "@/components/results/chart-renderer";
import { QueryResult, ChartRecommendation } from "@/types/query";

jest.mock("@/components/results/kpi-card", () => ({
  KPICard: () => <div data-testid="kpi-card">KPI</div>,
}));
jest.mock("@/components/results/bar-chart-view", () => ({
  BarChartView: () => <div data-testid="bar-chart">Bar</div>,
}));
jest.mock("@/components/results/line-chart-view", () => ({
  LineChartView: () => <div data-testid="line-chart">Line</div>,
}));
jest.mock("@/components/results/pie-chart-view", () => ({
  PieChartView: () => <div data-testid="pie-chart">Pie</div>,
}));
jest.mock("@/components/results/data-table", () => ({
  DataTable: () => <div data-testid="data-table">Table</div>,
}));

const mockData: QueryResult = {
  columns: ["name", "value"],
  rows: [{ name: "test", value: 100 }],
  rowCount: 1,
  truncated: false,
};

describe("ChartRenderer", () => {
  it("renders KPICard for kpi chart type", () => {
    const chart: ChartRecommendation = { type: "kpi", y_axis: "value", title: "Total" };
    render(<ChartRenderer data={mockData} chart={chart} />);
    expect(screen.getByTestId("kpi-card")).toBeInTheDocument();
  });

  it("renders BarChartView for bar chart type", () => {
    const chart: ChartRecommendation = { type: "bar", x_axis: "name", y_axis: "value", title: "By Name" };
    render(<ChartRenderer data={mockData} chart={chart} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("renders LineChartView for line chart type", () => {
    const chart: ChartRecommendation = { type: "line", x_axis: "name", y_axis: "value", title: "Trend" };
    render(<ChartRenderer data={mockData} chart={chart} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("renders PieChartView for pie chart type", () => {
    const chart: ChartRecommendation = { type: "pie", x_axis: "name", y_axis: "value", title: "Distribution" };
    render(<ChartRenderer data={mockData} chart={chart} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("renders DataTable for table chart type", () => {
    const chart: ChartRecommendation = { type: "table", title: "Results" };
    render(<ChartRenderer data={mockData} chart={chart} />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });
});
