import { render, screen } from "@testing-library/react";

import { ActivityLog } from "@/components/dashboard/ActivityLog";

describe("ActivityLog", () => {
  it("renders the activity log heading and seeded entries", () => {
    render(<ActivityLog />);

    expect(screen.getByRole("heading", { name: "Activity Log" })).toBeInTheDocument();
    expect(screen.getByText("Scan started for production AWS account.")).toBeInTheDocument();
    expect(screen.getByText("12:58")).toBeInTheDocument();
  });
});
